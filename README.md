# LittleJS + esbuild

A LittleJS game template with a dev server and production build.

## Commands

```
lua tools.lua dev             # dev server with live reload on :8000
                              # + Chrome with remote debugging (CDP) on :9222,
                              #   reused if a CDP browser is already running
lua tools.lua build           # minified production build to dist/
lua tools.lua serve           # serve an existing dist/ build
lua tools.lua install         # install/update
```

## Layout

- `src/state.js` — pure game state: `initialState()` and `step(state, dt)`. Imports nothing from LittleJS.
- `src/fp.js` — small Functional-Light helpers (`pipe`, `compose`, `curry`, `partial`, `unary`).
- `src/main.js` — the engine shell: the five LittleJS callbacks, state wiring, all side effects.
- `src/sprite.js` — entity classes extending `EngineObject3D`.
- `ref/littlejs.md` — LittleJS API quick reference (grep it before hand-rolling anything).

Game rules live in `state.js` as pure functions; `main.js` applies results to engine objects.
See `AGENTS.md` for the full conventions.
