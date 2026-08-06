# VS Code Maze Extension

A maze game generator and player for Visual Studio Code. This extension is a VS Code variation of the Python `py_maze` command-line game.

**This tool runs completely independently without requiring any external agent, model, or AI assistance.** The core maze generation and gameplay functionality works offline with zero external dependencies.

## Features

- **Generate Random Mazes**: Creates solvable mazes using the recursive backtracking algorithm
- **Interactive Gameplay**: Play the maze game directly in VS Code using a webview panel
- **Configurable Dimensions**: Set custom maze width and height through VS Code settings
- **Multiple Control Options**: Use arrow keys, WASD, or on-screen buttons to navigate
- **Optional Local Weather Styling**: Optionally restyle the maze from real conditions at your location, refreshed every 60 seconds (requires internet connection and works only in the US)

## Independence & Requirements

### Core Functionality (Always Works)
✅ **100% Independent** - No external dependencies
- Maze generation algorithm (recursive backtracking)
- Interactive gameplay with keyboard/button controls
- Configurable dimensions
- Win detection and notifications
- All core features work offline

### Optional Weather Feature
⚠️ **Optional Enhancement** - Requires internet connection
- Fetches weather data from `https://api.weather.gov` (US National Weather Service)
- Only works for US locations
- Gracefully degrades if unavailable (keeps current styling)
- Can be completely disabled in settings
- **The maze game works perfectly without this feature**

## Commands

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and search for:

- **Maze: Generate New Maze** - Generates a new maze and displays it in the output channel
- **Maze: Play Maze Game** - Opens the interactive maze game panel

## Settings

Configure the extension in VS Code settings:

| Setting | Default | Description |
| --- | --- | --- |
| `vscode-py_maze.width` | 9 | Width of the maze in cells (3-25) |
| `vscode-py_maze.height` | 11 | Height of the maze in cells (3-25) |
| `vscode-py_maze.localWeather` | `false` | **[OPTIONAL]** Refresh the maze styling from local weather every 60 seconds (requires internet) |
| `vscode-py_maze.weatherLatitude` | 40.7128 | **[OPTIONAL]** Latitude used for the weather lookup (-90 to 90) |
| `vscode-py_maze.weatherLongitude` | -74.006 | **[OPTIONAL]** Longitude used for the weather lookup (-180 to 180) |

## How to Play

1. Run the **Maze: Play Maze Game** command
2. Use **Arrow Keys** or **WASD** to move the player (`o`)
3. Navigate from **start** (top) to **end** (bottom)
4. Reach the exit (`E`) to win!

### Controls

| Key | Action |
| --- | --- |
| ↑ / W | Move Up |
| ↓ / S | Move Down |
| ← / A | Move Left |
| → / D | Move Right |

## Symbols

- `*` - Wall
- ` ` - Path
- `o` - Player
- `E` - Exit

## Local Weather Styling (Optional Feature)

The maze can optionally restyle itself from real conditions at your location. Sky, wall,
and accent colors follow the forecast, and a sun or moon, cloud band, and rain
or snow layer are drawn behind the maze.

**Important Notes:**
- This feature is **completely optional** and **disabled by default**
- The maze game works perfectly without weather styling
- Requires an active internet connection
- Only works for US locations (uses National Weather Service API)
- If the API is unavailable, the maze keeps its current style
- Network failures are handled gracefully (non-critical)

### Turning it on

1. Open **Settings** and go to **Extensions > VS Code Maze**
2. Tick **Local Weather Styling**
3. Set **Weather Latitude** and **Weather Longitude** to your location

The panel repaints as soon as the setting changes, so there is no need to
reopen it.

Conditions come from the United States National Weather Service at
`https://api.weather.gov`, which only covers US locations. The panel polls it
every 60 seconds. A failed request keeps the style already on screen, so a
dropped connection never blanks the maze.

### What each condition changes

| Category | Values | Effect |
| --- | --- | --- |
| Time of day | `day` (08:00 to 20:00), `night` | Sky color and the sun or moon glyph |
| Temperature | `hot` (80F and up), `medium`, `cold` (below 32F) | Wall and accent colors, and whether falling weather is rain or snow |
| Cloud cover | `sunny`, `cloudy`, `stormy` | Whether the cloud band is drawn |
| Falling weather | yes or no | Whether rain or snow is drawn |

Cloud cover and falling weather are judged separately, so an overcast sky draws
clouds without rain. Rain or snow appears only when the forecast reports a
probability of precipitation of 50% or higher. A forecast hedged as a "slight
chance" leaves the sky dry.

| Forecast | Drawn |
| --- | --- |
| Mostly Cloudy, 3% | Clouds only |
| Slight Chance Rain Showers, 20% | Clouds only |
| Rain Likely, 70% | Clouds and rain |
| Showers And Thunderstorms, 77% | Clouds and rain |
| Snow, 90%, 25F | Clouds and snow |

Turning the setting off stops the refresh and leaves the maze at the style it
last drew, rather than reverting to the plain editor theme. Weather colors
layer on top of your theme, so any color the weather does not set still comes
from your active VS Code theme.

Full details of the color values and how the styling is regenerated live in
[local-weather-style/STYLE.md](local-weather-style/STYLE.md).

## Development

### Building the Extension

```bash
cd vscode-py_maze
npm install
npm run compile
```

### Running in Debug Mode

1. Open this folder in VS Code
2. Press `F5` to launch the Extension Development Host
3. Run the maze commands in the new window

### Testing Independence

The core functionality can be tested completely offline:
1. Disconnect from the internet
2. Ensure `vscode-py_maze.localWeather` is set to `false` (default)
3. Run the "Maze: Play Maze Game" command
4. The maze should generate and play perfectly

### Project Layout

| Path | Contents |
| --- | --- |
| `src/extension.ts` | Command registration and activation |
| `src/mazeGenerator.ts` | Recursive backtracking maze generation (100% independent) |
| `src/mazeGamePanel.ts` | Webview panel, styling, and the optional weather refresh |
| `media/weather/` | Sun, moon, cloud, rain, and snow SVGs used by the optional weather layer |
| `local-weather-style/` | Weather styling guide and recorded defaults |

All webview markup and CSS live in `MazeGamePanel._getHtmlForWebview()` as a
single template string. There is no separate stylesheet, so style changes are
edits to that method.

## Architecture

### Core Components (Always Independent)
```
extension.ts ──> mazeGenerator.ts (Pure algorithm, no dependencies)
     │
     └──> mazeGamePanel.ts (Webview rendering)
               │
               ├──> Core maze display (Always works)
               └──> Optional weather styling (Can fail gracefully)
```

### Dependency Management
- **Zero runtime dependencies** for core functionality
- Weather API is treated as an optional enhancement
- All external calls are wrapped in try-catch blocks
- Failed API calls never break the game
- Status indicator shows weather availability

## License

MIT

---

*Based on the Python `py_maze` command-line maze game.*
