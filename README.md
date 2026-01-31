# VS Code Maze Extension

A maze game generator and player for Visual Studio Code. This extension is a VS Code variation of the Python `py_maze` command-line game.

## Features

- **Generate Random Mazes**: Creates solvable mazes using the recursive backtracking algorithm
- **Interactive Gameplay**: Play the maze game directly in VS Code using a webview panel
- **Configurable Dimensions**: Set custom maze width and height through VS Code settings
- **Multiple Control Options**: Use arrow keys, WASD, or on-screen buttons to navigate

## Commands

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and search for:

- **Maze: Generate New Maze** - Generates a new maze and displays it in the output channel
- **Maze: Play Maze Game** - Opens the interactive maze game panel

## Settings

Configure the extension in VS Code settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `vscode-py_maze.width` | 9 | Width of the maze in cells (3-25) |
| `vscode-py_maze.height` | 11 | Height of the maze in cells (3-25) |

## How to Play

1. Run the **Maze: Play Maze Game** command
2. Use **Arrow Keys** or **WASD** to move the player (`o`)
3. Navigate from **start** (top) to **end** (bottom)
4. Reach the exit (`E`) to win!

### Controls

| Key | Action |
|-----|--------|
| ↑ / W | Move Up |
| ↓ / S | Move Down |
| ← / A | Move Left |
| → / D | Move Right |

## Symbols

- `*` - Wall
- ` ` - Path
- `o` - Player
- `E` - Exit

## Development

### Building the Extension

```bash
cd vscode-py_maze-extension
npm install
npm run compile
```

### Running in Debug Mode

1. Open this folder in VS Code
2. Press `F5` to launch the Extension Development Host
3. Run the maze commands in the new window

## License

MIT

---

*Based on the Python `py_maze` command-line maze game.*
