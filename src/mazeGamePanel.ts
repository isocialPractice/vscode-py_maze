import * as vscode from 'vscode';
import { MazeGenerator } from './mazeGenerator';

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
                retainContextWhenHidden: true
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

    private _getHtmlForWebview(): string {
        const mazeJson = JSON.stringify(this._maze);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Maze Game</title>
    <style>
        body {
            padding: 20px;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .maze-container {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .label {
            font-size: 14px;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
            margin: 5px 0;
        }
        #maze {
            font-family: monospace;
            font-size: 16px;
            line-height: 1;
            white-space: pre;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            padding: 10px;
        }
        .wall {
            color: var(--vscode-terminal-ansiBlue);
        }
        .path {
            color: var(--vscode-editor-background);
        }
        .player {
            color: var(--vscode-terminal-ansiGreen);
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
        })();
    </script>
</body>
</html>`;
    }
}
