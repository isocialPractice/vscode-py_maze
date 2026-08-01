# VS Code Maze Extension

A maze game generator and player for Visual Studio Code. This extension is a VS Code variation of the Python `py_maze` command-line game.

## Features

- **Generate Random Mazes**: Creates solvable mazes using the recursive backtracking algorithm
- **Interactive Gameplay**: Play the maze game directly in VS Code using a webview panel
- **Configurable Dimensions**: Set custom maze width and height through VS Code settings
- **Multiple Control Options**: Use arrow keys, WASD, or on-screen buttons to navigate
- **Local Weather Styling**: Optionally restyle the maze from real conditions at your location, refreshed every 60 seconds

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
| `vscode-py_maze.localWeather` | `false` | Refresh the maze styling from local weather every 60 seconds |
| `vscode-py_maze.weatherLatitude` | 40.7128 | Latitude used for the weather lookup (-90 to 90) |
| `vscode-py_maze.weatherLongitude` | -74.006 | Longitude used for the weather lookup (-180 to 180) |

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

## Local Weather Styling

The maze can restyle itself from real conditions at your location. Sky, wall,
and accent colors follow the forecast, and a sun or moon, cloud band, and rain
or snow layer are drawn behind the maze.

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

### Project Layout

| Path | Contents |
| --- | --- |
| `src/extension.ts` | Command registration and activation |
| `src/mazeGenerator.ts` | Recursive backtracking maze generation |
| `src/mazeGamePanel.ts` | Webview panel, styling, and the weather refresh |
| `media/weather/` | Sun, moon, cloud, rain, and snow SVGs used by the weather layer |
| `local-weather-style/` | Weather styling guide and recorded defaults |

All webview markup and CSS live in `MazeGamePanel._getHtmlForWebview()` as a
single template string. There is no separate stylesheet, so style changes are
edits to that method.

## License

MIT

---

*Based on the Python `py_maze` command-line maze game.*
