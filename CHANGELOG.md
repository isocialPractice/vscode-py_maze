# Changelog

All notable changes to the VS Code Maze extension are recorded here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.0-dev] - Unreleased

Working version. Nothing has been published yet, so everything below is the
state of the tree rather than a shipped release.

### Status

| Item | State |
| --- | --- |
| Branch | `local-weather` |
| Commits ahead of `main` | 0. All work is staged and uncommitted. |
| Build | `npm run compile` passes with no TypeScript errors |
| Tests | 14 categorization cases and 14 render assertions pass |
| Published | No |

### Added

- Local weather styling for the maze panel. Sky, wall, and accent colors follow
  the current forecast, with a sun or moon glyph, a drifting cloud band, and a
  rain or snow layer drawn behind the maze.
- A 60 second refresh that polls the National Weather Service at
  `https://api.weather.gov` from inside the webview and repaints by rewriting
  CSS custom properties, so no reload or extension restart is needed.
- Three settings: `vscode-py_maze.localWeather` to enable the refresh, plus
  `vscode-py_maze.weatherLatitude` and `vscode-py_maze.weatherLongitude` for the
  lookup location.
- An `onDidChangeConfiguration` listener so the toggle and coordinates take
  effect immediately instead of waiting for the panel to be reopened.
- Weather art in `media/weather/`: `sun.svg`, `moon.svg`, `cloud.svg`,
  `rain.svg`, and `snow.svg`.
- `local-weather-style/STYLE.md`, which records the application architecture,
  the color values each weather category maps to, the refresh function, and how
  to apply a later styling pass.
- `local-weather-style/local-weather.config.json`, kept as a record of the
  defaults. The live toggle is the VS Code setting, not this file.
- README sections covering the weather feature and the project layout.
- `icon.png`, a 128x128 extension icon. Three concentric maze walls with
  staggered openings around a center goal, drawn in the same night sky and
  accent colors the weather styling uses. Registered through the `icon` field
  in `package.json`.
- An `author` field in `package.json`.

### Fixed

- Rain and snow were drawn only for thunderstorms. Every other wet forecast was
  bucketed as `cloudy`, so a plain "Rain Likely" period rendered a dry sky.
  Cloud cover and falling weather are now judged separately, and the falling
  layer keys off a `precipitating` flag derived from the period's
  `probabilityOfPrecipitation` at a 50 percent threshold.
- Condition matching read `detailedForecast`, which carries the NWS boilerplate
  "Chance of precipitation is 20%." on dry days, while `precipitation` was one
  of the terms searched. Clear weather therefore matched a wet term. Matching
  now runs against the terse `shortForecast` and the offending term is gone.
- `vscode-py_maze.localWeather` defaulted to `true`, which would have called a
  third party API on first run with no opt in. It now defaults to `false`.
- The README build step named a folder that does not exist,
  `vscode-py_maze-extension`. Corrected to `vscode-py_maze`.

### Known issues

- `npm run lint` fails before it reaches any source file. The parent directory
  config at `isocialPractice/.eslintrc.js` sets `"no-console": "no"`, which is
  not a valid severity. The file is outside this repository and the failure
  predates this work, reproducing on `main`.
- `.vscodeignore` excludes `out/**`, but `package.json` points `main` at
  `./out/extension.js`. A `vsce package` build would ship without its compiled
  code. This predates this work. `media/` is not excluded, so the weather art
  packages correctly.
- `package.json` is set to `0.0.0-dev` to match this entry. That is valid
  semver, but `vsce` is stricter than npm about prerelease tags, so the version
  will need to become a plain `x.y.z` before the extension can be packaged.
- Weather coverage is United States only, because the National Weather Service
  API does not serve other regions. There is no fallback provider.
- The default coordinates are `40.7128, -74.006`. Users outside that area must
  set their own before the styling reflects local conditions.
- `render_weather` on the MCP server returns only `sunny`, `cloudy`, and
  `stormy`. It cannot express whether precipitation is actually falling, so the
  extension derives that itself. The server and the extension will disagree
  until the server vocabulary grows a matching signal.
