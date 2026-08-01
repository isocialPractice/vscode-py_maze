import * as vscode from 'vscode';
import { MazeGenerator } from './mazeGenerator';

/** Root of the National Weather Service API used by the local weather refresh. */
const NWS_API_BASE = 'https://api.weather.gov';

/** How often the webview repolls local conditions, in milliseconds. */
const REFRESH_INTERVAL_MS = 60000;

/**
 * Style values each weather category maps to, as recorded in
 * local-weather-style/STYLE.md. The webview reapplies these on a timer, so the
 * tables are injected into the panel script rather than kept only in CSS.
 */
const WEATHER_STYLES = {
    background: {
        day: { sky: '#bfe3f5', haze: 'rgba(255, 249, 219, 0.16)', glyph: 'sun', glyphOpacity: '0.9' },
        night: { sky: '#10192e', haze: 'rgba(24, 34, 66, 0.42)', glyph: 'moon', glyphOpacity: '0.75' }
    },
    tone: {
        hot: { accent: '#ff9d4d', wall: '#c2571f' },
        medium: { accent: '#7fd4c1', wall: '#3f8f7d' },
        cold: { accent: '#9fd8ff', wall: '#3f7fae' }
    }
};

/**
 * Conditions from the most recent render_weather call. These are baked into the
 * first paint so the maze is already styled before the timer fires, and they
 * remain in place when the refresh toggle is off.
 */
const CURRENT_RENDER = {
    background: 'night',
    tone: 'medium',
    precipitation: 'stormy',
    // The recorded forecast was "Slight Chance Showers And Thunderstorms then
    // Partly Cloudy", so the sky is stormy but nothing is falling yet. Clouds
    // draw, rain does not, until a refresh reports a real chance.
    precipitating: false
};

/**
 * MazeGamePanel
 * Manages a webview panel for playing the maze game interactively.
 */
export class MazeGamePanel {
    public static currentPanel: MazeGamePanel | undefined;
    public static readonly viewType = 'mazeGame';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _maze: boolean[][] = [];
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, maze?: boolean[][]) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (MazeGamePanel.currentPanel) {
            MazeGamePanel.currentPanel._panel.reveal(column);
            if (maze) {
                MazeGamePanel.currentPanel._maze = maze;
                MazeGamePanel.currentPanel._update();
            }
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            MazeGamePanel.viewType,
            'Maze Game',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        );

        MazeGamePanel.currentPanel = new MazeGamePanel(panel, extensionUri, maze);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, maze?: boolean[][]) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        if (maze) {
            this._maze = maze;
        } else {
            // Generate a default maze
            const config = vscode.workspace.getConfiguration('vscode-py_maze');
            const width = config.get<number>('width', 9);
            const height = config.get<number>('height', 11);
            const generator = new MazeGenerator(width, height);
            this._maze = generator.generate();
        }

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Repaint when the local weather toggle or its coordinates change, so
        // the refresh can be turned on and off without reopening the panel.
        vscode.workspace.onDidChangeConfiguration(
            event => {
                if (
                    event.affectsConfiguration('vscode-py_maze.localWeather') ||
                    event.affectsConfiguration('vscode-py_maze.weatherLatitude') ||
                    event.affectsConfiguration('vscode-py_maze.weatherLongitude')
                ) {
                    this._update();
                }
            },
            null,
            this._disposables
        );

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'newMaze':
                        const config = vscode.workspace.getConfiguration('vscode-py_maze');
                        const width = config.get<number>('width', 9);
                        const height = config.get<number>('height', 11);
                        const generator = new MazeGenerator(width, height);
                        this._maze = generator.generate();
                        this._update();
                        return;
                    case 'win':
                        vscode.window.showInformationMessage('🎉 Congratulations! You solved the maze! 🎉');
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public dispose() {
        MazeGamePanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    private _update() {
        this._panel.webview.html = this._getHtmlForWebview();
    }

    /** Resolve a bundled weather asset to a URI the webview is allowed to load. */
    private _assetUri(name: string): string {
        return this._panel.webview
            .asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'weather', `${name}.svg`))
            .toString();
    }

    private _getHtmlForWebview(): string {
        const mazeJson = JSON.stringify(this._maze);

        const config = vscode.workspace.getConfiguration('vscode-py_maze');
        const weatherEnabled = config.get<boolean>('localWeather', false);
        const latitude = config.get<number>('weatherLatitude', 40.7128);
        const longitude = config.get<number>('weatherLongitude', -74.006);

        // Initial paint comes from the recorded render_weather directives.
        const background = WEATHER_STYLES.background[
            CURRENT_RENDER.background as keyof typeof WEATHER_STYLES.background
        ];
        const tone = WEATHER_STYLES.tone[
            CURRENT_RENDER.tone as keyof typeof WEATHER_STYLES.tone
        ];

        // Cloud cover rides on precipitation, the falling layer rides on whether
        // anything is actually falling, and its asset rides on tone.
        const showClouds = CURRENT_RENDER.precipitation !== 'sunny';
        const showFalling = CURRENT_RENDER.precipitating;
        const fallingAsset = CURRENT_RENDER.tone === 'cold' ? 'snow' : 'rain';

        const assets = {
            sun: this._assetUri('sun'),
            moon: this._assetUri('moon'),
            cloud: this._assetUri('cloud'),
            rain: this._assetUri('rain'),
            snow: this._assetUri('snow')
        };

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Maze Game</title>
    <style>
        /* Weather layer. Unset properties fall back to the editor theme. */
        :root {
            --weather-sky: ${background.sky};
            --weather-haze: ${background.haze};
            --weather-accent: ${tone.accent};
            --weather-wall: ${tone.wall};
            --weather-glyph-opacity: ${background.glyphOpacity};
        }
        body {
            padding: 20px;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--weather-sky, var(--vscode-editor-background));
            position: relative;
            min-height: 100vh;
            box-sizing: border-box;
            overflow-x: hidden;
        }
        /* Overlay wash, held behind the maze so text stays legible. */
        #weather-haze {
            position: fixed;
            inset: 0;
            background-color: var(--weather-haze, transparent);
            pointer-events: none;
            z-index: 0;
        }
        #weather-glyph {
            position: fixed;
            top: 18px;
            right: 22px;
            width: 64px;
            height: 64px;
            opacity: var(--weather-glyph-opacity, 0);
            pointer-events: none;
            z-index: 0;
        }
        #weather-clouds {
            position: fixed;
            top: 0;
            left: 0;
            width: 200%;
            height: 130px;
            background-repeat: repeat-x;
            background-size: 260px auto;
            opacity: 0.28;
            pointer-events: none;
            z-index: 0;
            animation: drift 90s linear infinite;
        }
        #weather-fall {
            position: fixed;
            inset: 0;
            background-repeat: repeat;
            background-size: 34px 150px;
            opacity: 0.22;
            pointer-events: none;
            z-index: 0;
            animation: fall 1.1s linear infinite;
        }
        #weather-clouds[hidden], #weather-fall[hidden] {
            display: none;
        }
        @keyframes drift {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
        }
        @keyframes fall {
            from { background-position: 0 -150px; }
            to { background-position: 0 0; }
        }
        /* Respect a reduced motion preference by holding the layers still. */
        @media (prefers-reduced-motion: reduce) {
            #weather-clouds, #weather-fall { animation: none; }
        }
        /* Game content sits above every weather layer. */
        .maze-container, .controls {
            position: relative;
            z-index: 1;
        }
        .maze-container {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .label {
            font-size: 14px;
            font-weight: bold;
            color: var(--weather-accent, var(--vscode-textLink-foreground));
            margin: 5px 0;
        }
        #maze {
            font-family: monospace;
            font-size: 16px;
            line-height: 1;
            white-space: pre;
            background-color: color-mix(in srgb, var(--weather-sky, var(--vscode-editor-background)) 72%, transparent);
            border: 1px solid var(--weather-wall, var(--vscode-panel-border));
            padding: 10px;
        }
        .wall {
            color: var(--weather-wall, var(--vscode-terminal-ansiBlue));
        }
        .path {
            color: transparent;
        }
        .player {
            color: var(--weather-accent, var(--vscode-terminal-ansiGreen));
            font-weight: bold;
        }
        .exit {
            color: var(--vscode-terminal-ansiYellow);
        }
        .controls {
            margin-top: 20px;
            text-align: center;
        }
        .controls p {
            margin: 5px 0;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            margin: 5px;
            cursor: pointer;
            font-size: 14px;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .move-buttons {
            display: grid;
            grid-template-columns: repeat(3, 50px);
            grid-template-rows: repeat(3, 50px);
            gap: 5px;
            justify-content: center;
            margin-top: 15px;
        }
        .move-btn {
            width: 50px;
            height: 50px;
            font-size: 20px;
            padding: 0;
        }
        .move-btn:disabled {
            opacity: 0.3;
            cursor: not-allowed;
        }
    </style>
</head>
<body>
    <div id="weather-haze"></div>
    <img id="weather-glyph" src="${assets[background.glyph as keyof typeof assets]}" alt="">
    <div id="weather-clouds" style="background-image: url('${assets.cloud}');"${showClouds ? '' : ' hidden'}></div>
    <div id="weather-fall" style="background-image: url('${assets[fallingAsset as keyof typeof assets]}');"${showFalling ? '' : ' hidden'}></div>

    <div class="maze-container">
        <div class="label">start</div>
        <div id="maze"></div>
        <div class="label">end</div>
    </div>
    <div class="controls">
        <button id="newMaze">New Maze</button>
        <p>Use arrow keys or WASD to move</p>
        <div class="move-buttons">
            <div></div>
            <button class="move-btn" id="up">↑</button>
            <div></div>
            <button class="move-btn" id="left">←</button>
            <button class="move-btn" id="down">↓</button>
            <button class="move-btn" id="right">→</button>
        </div>
    </div>

    <script>
        (function() {
            const vscode = acquireVsCodeApi();
            const maze = ${mazeJson};
            const height = maze.length;
            const width = maze[0].length;

            // Find starting position (first open space from top)
            let playerX = 1;
            let playerY = 0;
            for (let y = 0; y < height; y++) {
                if (!maze[y][playerX]) {
                    playerY = y;
                    break;
                }
            }

            // Find end position (last open space at bottom)
            const endX = width - 2;
            let endY = height - 1;
            for (let y = height - 1; y >= 0; y--) {
                if (!maze[y][endX]) {
                    endY = y;
                    break;
                }
            }

            function render() {
                let html = '';
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        if (x === playerX && y === playerY) {
                            html += '<span class="player">o</span>';
                        } else if (x === endX && y === endY) {
                            html += '<span class="exit">E</span>';
                        } else if (maze[y][x]) {
                            html += '<span class="wall">*</span>';
                        } else {
                            html += ' ';
                        }
                    }
                    html += '\\n';
                }
                document.getElementById('maze').innerHTML = html;
            }

            function movePlayer(dx, dy) {
                const newX = playerX + dx;
                const newY = playerY + dy;

                // Check bounds and wall collision
                if (newX >= 0 && newX < width && newY >= 0 && newY < height && !maze[newY][newX]) {
                    playerX = newX;
                    playerY = newY;
                    render();
                    checkWin();
                }
            }

            function checkWin() {
                if (playerX === endX && playerY === endY) {
                    vscode.postMessage({ command: 'win' });
                }
            }

            // Keyboard controls
            document.addEventListener('keydown', (e) => {
                switch(e.key) {
                    case 'ArrowUp':
                    case 'w':
                    case 'W':
                        movePlayer(0, -1);
                        e.preventDefault();
                        break;
                    case 'ArrowDown':
                    case 's':
                    case 'S':
                        movePlayer(0, 1);
                        e.preventDefault();
                        break;
                    case 'ArrowLeft':
                    case 'a':
                    case 'A':
                        movePlayer(-1, 0);
                        e.preventDefault();
                        break;
                    case 'ArrowRight':
                    case 'd':
                    case 'D':
                        movePlayer(1, 0);
                        e.preventDefault();
                        break;
                }
            });

            // Button controls
            document.getElementById('up').addEventListener('click', () => movePlayer(0, -1));
            document.getElementById('down').addEventListener('click', () => movePlayer(0, 1));
            document.getElementById('left').addEventListener('click', () => movePlayer(-1, 0));
            document.getElementById('right').addEventListener('click', () => movePlayer(1, 0));

            document.getElementById('newMaze').addEventListener('click', () => {
                vscode.postMessage({ command: 'newMaze' });
            });

            // Initial render
            render();

            // ---- Local weather refresh -------------------------------------
            // Polls the NWS API every 60 seconds and repaints the weather layer
            // by rewriting CSS custom properties, so no restart is needed.
            // Documented in local-weather-style/STYLE.md.
            const WEATHER = ${JSON.stringify({
                enabled: weatherEnabled,
                latitude,
                longitude,
                apiBase: NWS_API_BASE,
                intervalMs: REFRESH_INTERVAL_MS,
                styles: WEATHER_STYLES,
                assets
            })};

            const STORM_TERMS = ['thunder', 'storm', 'squall', 'hail', 'blizzard', 'torrential'];
            // Terms that mean something is actually falling. "precipitation" is
            // deliberately absent: it appears in the "Chance of precipitation is
            // 20%" boilerplate that NWS puts in detailedForecast even on dry days.
            const WET_TERMS = ['rain', 'shower', 'drizzle', 'snow', 'sleet', 'freezing', 'hail'];
            const CLOUD_TERMS = ['cloud', 'overcast', 'fog', 'haze', 'mist'];
            // A forecast hedged this way is not rain falling now.
            const HEDGE_TERMS = ['slight chance', 'chance', 'isolated', 'patchy'];
            // Minimum probability of precipitation, in percent, that counts as wet.
            const WET_PROBABILITY = 50;

            function toFahrenheit(value, unit) {
                const degrees = Number(value);
                if (!isFinite(degrees)) { return null; }
                return String(unit).trim().toUpperCase().charAt(0) === 'C'
                    ? degrees * 9 / 5 + 32
                    : degrees;
            }

            // Temperature thresholds match utils/categorize_local_weather.py on
            // the server. Precipitation is decided here rather than there,
            // because only the period's probability separates rain that is
            // falling from cloud cover that merely might produce some.
            function categorize(period) {
                const degrees = toFahrenheit(period.temperature, period.temperatureUnit || 'F');
                let tone = 'medium';
                if (degrees !== null && degrees >= 80) { tone = 'hot'; }
                else if (degrees !== null && degrees < 32) { tone = 'cold'; }

                // Conditions come from shortForecast, which is the terse summary
                // ("Mostly Cloudy", "Rain Likely"). detailedForecast is prose and
                // carries probability boilerplate that misreads as active rain.
                const summary = String(period.shortForecast || period.detailedForecast || '').toLowerCase();
                const has = (terms) => terms.some((term) => summary.indexOf(term) !== -1);

                let precipitation = 'sunny';
                if (has(STORM_TERMS)) { precipitation = 'stormy'; }
                else if (has(WET_TERMS) || has(CLOUD_TERMS)) { precipitation = 'cloudy'; }

                // Whether anything is falling is a separate question from cloud
                // cover. Trust the reported probability when there is one, and
                // fall back to an unhedged wet term when there is not.
                const probability = period.probabilityOfPrecipitation
                    ? Number(period.probabilityOfPrecipitation.value)
                    : NaN;
                const wetTerm = has(WET_TERMS) || has(STORM_TERMS);
                const precipitating = isFinite(probability)
                    ? wetTerm && probability >= WET_PROBABILITY
                    : wetTerm && !has(HEDGE_TERMS);

                const hour = new Date().getHours();
                const background = (hour >= 8 && hour < 20) ? 'day' : 'night';

                return { background, tone, precipitation, precipitating };
            }

            function applyWeather(state) {
                const background = WEATHER.styles.background[state.background];
                const tone = WEATHER.styles.tone[state.tone];
                if (!background || !tone) { return; }

                const root = document.documentElement.style;
                root.setProperty('--weather-sky', background.sky);
                root.setProperty('--weather-haze', background.haze);
                root.setProperty('--weather-accent', tone.accent);
                root.setProperty('--weather-wall', tone.wall);
                root.setProperty('--weather-glyph-opacity', background.glyphOpacity);

                document.getElementById('weather-glyph').src = WEATHER.assets[background.glyph];

                const clouds = document.getElementById('weather-clouds');
                clouds.hidden = state.precipitation === 'sunny';

                // Rain and snow are drawn only when something is actually
                // falling. Cloud cover alone leaves the falling layer hidden.
                const falling = document.getElementById('weather-fall');
                falling.hidden = !state.precipitating;
                if (!falling.hidden) {
                    const asset = state.tone === 'cold' ? WEATHER.assets.snow : WEATHER.assets.rain;
                    falling.style.backgroundImage = "url('" + asset + "')";
                }
            }

            async function refreshWeather() {
                try {
                    const headers = { 'Accept': 'application/geo+json' };
                    const pointsUrl = WEATHER.apiBase + '/points/' + WEATHER.latitude + ',' + WEATHER.longitude;
                    const pointsResponse = await fetch(pointsUrl, { headers });
                    if (!pointsResponse.ok) { return; }

                    const points = await pointsResponse.json();
                    const forecastResponse = await fetch(points.properties.forecast, { headers });
                    if (!forecastResponse.ok) { return; }

                    const forecast = await forecastResponse.json();
                    const periods = forecast.properties.periods;
                    if (!periods || !periods.length) { return; }

                    applyWeather(categorize(periods[0]));
                } catch (error) {
                    // A failed poll keeps the last rendered style rather than
                    // blanking the maze, so a dropped network is harmless.
                }
            }

            // The toggle only gates the poll. When it is off the maze keeps the
            // style baked in by the most recent render_weather call.
            if (WEATHER.enabled) {
                refreshWeather();
                setInterval(refreshWeather, WEATHER.intervalMs);
            }
        })();
    </script>
</body>
</html>`;
    }
}
