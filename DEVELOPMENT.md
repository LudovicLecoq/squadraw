# Local development

Open `index.html` directly, or serve this folder with a static HTTP server.
There is no build step, dependency, framework, fetch request or module loader.
Classic scripts deliberately keep direct file opening compatible with browsers.

- `index.html`: interface and responsive styles.
- `i18n.js`: language catalogue, full French/English dictionaries, interpolation.
- `sports.js`: presets, sport/format definitions, validation and save migrations.
- `graphics.js`: unchanged football shirts, crests, football/rugby pitch SVGs.
- `app.js`: DOM rendering, interactions, storage, JSON and PNG exports.

## Add a language

Add a code, short label and native name to `LANGUAGES`, then a dictionary with
the same keys to `TRANSLATIONS`. The language button appears automatically.
Templates use `data-i18n`, `data-i18n-aria`, `data-i18n-title` and
`data-i18n-placeholder`. Dynamic messages use `t(key, params)`; missing keys
fall back to French. Names and team names are user data and are never translated.
The language preference is separate from lineup backups.

## Add a sport or format

Define its player count, default bench size, kit, pitch height and position list
in `SPORTS`. Add its position translations and a pitch renderer, then expose a
selector in the interface. The roster, drag interactions, bulk-name limits,
substitution logic and PNG dimensions already derive from the active definition.
Goalkeeper handling applies only to football.

## Saved data

Keep `onze-foot-composition-v1` and `onze-language` as localStorage keys (legacy
name from ONZE) to preserve existing users.
The new workspace envelope is version 3 with `active`, `lastRugby` and four
independent `compositions`. Each composition is version 3 with a `mode` field.
`validateWorkspace` migrates old single-lineup saves. `validateState` accepts
v1/v2 football JSON and v3 football/rugby JSON; bench players now carry `keeper`.
Unreadable saved data is preserved instead of overwritten.

JSON download contains the active composition; normal browser storage retains
all four. Switching formats closes the current edit and resets undo history.
Exports derive from the model, so collapsing the bench never hides substitutes
from the exported image. Text is escaped before inclusion in exported SVG.

## Checks

From the repository root, run `node tests/check.cjs` for legacy
migration, sport counts, goalkeeper swaps, JSON validation/round-trips,
translation parity, unchanged shirt rendering and script syntax.
Browser verification also covers drag/undo, FR/EN switching, all four modes,
JSON import, exported images with goalkeepers/substitutes and 320px layouts.

## Rugby references

The layouts are editable starting points, not official on-field formations.
Sevens shirt numbers are editable and are not tied to fixed position numbers.

- [World Rugby: ground markings](https://passport.world.rugby/laws-of-the-game/laws-by-number/1-the-ground/)
- [HSBC SVNS: player positions](https://www.svns.com/en/news/897019/explained-player-positions-in-rugby-sevens)
- [NRL: team lists and positions](https://www.nrl.com/news/2026/10/20/world-cup-team-lists-mens-round-2/)
