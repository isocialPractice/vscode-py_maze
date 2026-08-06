# Quick Start Guide

## For Users

### Install & Use
1. Install the extension from VS Code Marketplace
2. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
3. Run: **"Maze: Play Maze Game"**
4. Use arrow keys or WASD to navigate
5. Reach the exit to win!

**No internet required!** The game works completely offline.

## For Developers

### Build & Test
```bash
# Clone repository
git clone https://github.com/isocialPractice/vscode-py_maze.git
cd vscode-py_maze

# Install dependencies (build-time only)
npm install

# Compile TypeScript
npm run compile

# Open in VS Code
code .

# Press F5 to launch Extension Development Host
# Run commands in the new window
```

### Test Independence (Offline)
```bash
# 1. Disconnect internet
# 2. Open VS Code settings
# 3. Ensure: "vscode-py_maze.localWeather" = false
# 4. Run: "Maze: Play Maze Game"
# 5. Verify: Game works perfectly
```

## Key Files

| File | Purpose | Independent? |
|------|---------|--------------|
| `src/extension.ts` | Command registration | ✅ Yes |
| `src/mazeGenerator.ts` | Maze algorithm | ✅ Yes |
| `src/mazeGamePanel.ts` | Game panel & optional weather | ✅ Core game / ⚠️ Weather optional |
| `README.md` | User documentation | N/A |
| `INDEPENDENCE.md` | Independence verification | N/A |

## Settings

```json
{
  // Core settings (always work offline)
  "vscode-py_maze.width": 9,         // Maze width
  "vscode-py_maze.height": 11,       // Maze height
  
  // Optional feature (requires internet, US only)
  "vscode-py_maze.localWeather": false,      // Disabled by default
  "vscode-py_maze.weatherLatitude": 40.7128,
  "vscode-py_maze.weatherLongitude": -74.006
}
```

## Common Tasks

### Generate a Maze
```
Ctrl+Shift+P → "Maze: Generate New Maze"
```

### Play the Game
```
Ctrl+Shift+P → "Maze: Play Maze Game"
```

### Change Maze Size
```
Settings → Extensions → VS Code Maze → Width/Height
```

### Enable Weather Styling (Optional)
```
Settings → Extensions → VS Code Maze → Local Weather → ✓
```

## Architecture

```
User Input
    ↓
Extension Commands (extension.ts)
    ↓
Maze Generator (mazeGenerator.ts) ← 100% Independent
    ↓
Game Panel (mazeGamePanel.ts)
    ├─→ Core Game Logic ← 100% Independent
    └─→ Weather Styling ← Optional (fails gracefully)
```

## Independence Guarantee

✅ **Core Features (Always Work):**
- Maze generation
- Interactive gameplay
- Keyboard/mouse controls
- Win detection
- Settings management

⚠️ **Optional Features (May Fail):**
- Weather-based styling (requires internet + US location)
- Gracefully degrades when unavailable

## Support

**Issue:** Maze won't generate
- **Check:** Is VS Code working?
- **Check:** Is extension activated?
- **Not needed:** Internet, external services

**Issue:** Weather feature not working
- **This is normal if:** Offline, outside US, API down
- **Game still works:** Yes, perfectly!
- **Solution:** Disable in settings or ignore

## Documentation

- **User Guide:** `README.md`
- **Independence Analysis:** `INDEPENDENCE.md`
- **Change Log:** `CHANGES_FOR_INDEPENDENCE.md`
- **Quick Start:** This file

## License

MIT - See LICENSE file
