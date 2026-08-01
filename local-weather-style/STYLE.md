# Local Weather Style Guide

How the `render_weather` MCP tool restyles this application. Read this file first
on every later call, then apply the directives to the current render.

## 1. Application architecture

| Aspect | Finding |
| --- | --- |
| Type | VS Code extension (TypeScript, compiled to `out/` by `tsc -p ./`) |
| Entry | `src/extension.ts` registers two commands |
| GUI surface | A single webview panel, `src/mazeGamePanel.ts` |
| Markup source | `MazeGamePanel._getHtmlForWebview()` returns one HTML template string |
| Styling location | An inline `<style>` block inside that template string |
| Game-like | Yes. It is a playable maze, so the SVG assets apply. |

There is no stylesheet file. All CSS lives in the template string, so style
changes are edits to that one block.

## 2. Current styling analysis

The webview inherits the editor theme through `var(--vscode-*)` tokens rather
than hardcoded colors:

- `--vscode-editor-background` for the page and maze background
- `--vscode-foreground` for body text
- `--vscode-textLink-foreground` for the start and end labels
- `--vscode-terminal-ansiBlue` for walls, `ansiGreen` for the player,
  `ansiYellow` for the exit
- `--vscode-button-background` and `--vscode-button-hoverBackground` for buttons
- `--vscode-panel-border` for the maze frame

**Rule to preserve:** never replace a `--vscode-*` token with a literal color.
Weather styling is layered on top as a separate set of custom properties, so a
user who disables the feature falls straight back to their editor theme.

## 3. Weather custom properties

All weather styling flows through these properties on `:root`. To restyle, set
these and nothing else:

| Property | Purpose |
| --- | --- |
| `--weather-sky` | Backdrop behind the maze |
| `--weather-haze` | Overlay wash across the panel |
| `--weather-wall` | Maze wall color |
| `--weather-accent` | Labels and the player marker |
| `--weather-glyph-opacity` | Opacity of the corner sky glyph |

### Background: `day` or `night`

Chosen from the local hour. Day is 08:00 up to 20:00, night is everything else.

| Value | `--weather-sky` | `--weather-haze` | Sky glyph |
| --- | --- | --- | --- |
| `day` | `#bfe3f5` | `rgba(255, 249, 219, 0.16)` | `sun.svg` |
| `night` | `#10192e` | `rgba(24, 34, 66, 0.42)` | `moon.svg` |

### Tone: `hot`, `medium`, or `cold`

Bucketed from the forecast temperature. Hot is 80F and above, cold is below
32F, medium is in between.

| Value | `--weather-accent` | `--weather-wall` |
| --- | --- | --- |
| `hot` | `#ff9d4d` | `#c2571f` |
| `medium` | `#7fd4c1` | `#3f8f7d` |
| `cold` | `#9fd8ff` | `#3f7fae` |

### Precipitation: `sunny`, `cloudy`, or `stormy`

Matched from the period's `shortForecast`. Storm terms win over wet terms,
which tie with cloud terms into `cloudy`. This value drives **cloud cover
only**.

| Value | Cloud layer | Notes |
| --- | --- | --- |
| `sunny` | none | Sky stays clear, tint toward blue |
| `cloudy` | `cloud.svg` | One drifting cloud band |
| `stormy` | `cloud.svg` | Same band, reached through storm terms |

### Precipitating: a separate boolean

Whether anything is **falling** is decided independently of cloud cover, so an
overcast day does not draw rain. The falling layer is drawn only when this is
true.

| Signal | Rule |
| --- | --- |
| Reported probability | `probabilityOfPrecipitation.value` is at or above **50**, and a wet term is present |
| No probability reported | A wet term is present and the summary is not hedged by "slight chance", "chance", "isolated", or "patchy" |

Wet terms are `rain`, `shower`, `drizzle`, `snow`, `sleet`, `freezing`, `hail`,
plus any storm term.

**`precipitation` is deliberately absent from the wet terms.** NWS puts
"Chance of precipitation is 20%." in `detailedForecast` on dry days, so
matching that word marks clear weather as rain. For the same reason the match
runs against `shortForecast`, the terse summary, and only falls back to
`detailedForecast` when no summary exists.

The falling asset follows tone, not precipitation: `cold` gets `snow.svg` and
every other tone gets `rain.svg`.

The two values are independent, which gives these combinations:

| Forecast | Precipitation | Precipitating | Drawn |
| --- | --- | --- | --- |
| Mostly Cloudy, 3% | `cloudy` | no | Cloud band only |
| Rain Likely, 70% | `cloudy` | yes | Cloud band and rain |
| Slight Chance Rain Showers, 20% | `cloudy` | no | Cloud band only |
| Showers And Thunderstorms, 77% | `stormy` | yes | Cloud band and rain |
| Snow, 90%, 25F | `cloudy` | yes | Cloud band and snow |

## 4. Auto refresh

**Possible: yes.** The panel is created with `enableScripts: true` and
`retainContextWhenHidden: true`, so webview scripts run on a timer and repaint
by writing CSS custom properties. No window reload and no extension restart is
needed, which is why this project takes the plan-initial route rather than the
backup plan.

The refresh function is hardcoded in the webview script as `refreshWeather()`.
It polls `https://api.weather.gov` every **60 seconds**:

1. `GET {NWS_API_BASE}/points/{lat},{lon}` to resolve the forecast grid
2. `GET` the `properties.forecast` URL from that response
3. Read `periods[0]`, the current period
4. Bucket it with the same thresholds as section 3, which yields the three
   category values plus the `precipitating` boolean
5. Apply the values through `applyWeather()`

Coordinates come from the `vscode-py_maze.weatherLatitude` and
`vscode-py_maze.weatherLongitude` settings. A failed request is swallowed and
the previous style is kept, so a dropped network does not blank the maze.

## 5. Toggle

This extension already contributes a settings section, so the toggle lives
there rather than in a config file:

**Settings -> Extensions -> VS Code Maze -> Local Weather Styling**
(`vscode-py_maze.localWeather`, default `false`)

Turn it on to style the maze from local conditions and start the 60 second
poll. Turn it off to stop the poll and keep whatever style was last rendered,
which leaves the maze exactly as the final refresh drew it rather than snapping
back to the plain theme. An `onDidChangeConfiguration` listener repaints the
panel as soon as the setting or either coordinate changes, so there is no need
to reopen it.

Because the settings menu exists, `local-weather-style/local-weather.config.json`
is not read by this project. It is kept only as a record of the default state.

## 6. Applying a later render_weather call

1. Read this file.
2. Map the three directive values to the tables in section 3, and decide
   `precipitating` from the reported probability.
3. Edit only the `:root` block, the `WEATHER_STYLES` lookup, and
   `CURRENT_RENDER` in `src/mazeGamePanel.ts`.
4. Recompile with `npm run compile`.
5. Commit on the `local-weather` branch.

Note that `render_weather` returns only the three category values. The
`precipitating` flag is derived here from the period's
`probabilityOfPrecipitation`, because the server's vocabulary cannot express
the difference between an overcast sky and rain that is falling.
