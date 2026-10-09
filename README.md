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
./server/run.sh               # multiplayer WebSocket server on :8080
```

## Layout

- `src/state.js` — pure game state: `initialState()` and `step(state, input, dt)`. Imports nothing from LittleJS.
- `src/players.js` — pure remote-player state: folds server snapshots and interpolates them.
- `src/net.js` — the only file that touches WebSocket: connect, send input, receive snapshots.
- `src/fp.js` — small Functional-Light helpers (`pipe`, `compose`, `curry`, `partial`, `unary`).
- `src/main.js` — the engine shell: the five LittleJS callbacks, state wiring, all side effects.
- `src/sprites.js` — entity classes extending `EngineObject3D`.
- `server/` — the Lua Pegasus WebSocket game server (`run.sh`, `main.lua`, `room.lua`).
- `ref/littlejs.md` — LittleJS API quick reference (grep it before hand-rolling anything).

Game rules live in `state.js` as pure functions; `main.js` applies results to engine objects.
See `AGENTS.md` for the full conventions.

## Multiplayer

The game runs in the client and is synced by a server-authoritative model: `server/`
owns every player's position and broadcasts them at 20 Hz, while each client predicts
its own movement locally and interpolates everyone else. Open the game in two tabs to
see both players.

Start the server with `./server/run.sh`. It needs Lua 5.4, `dkjson`, and the
`pegasus.lua` / `lua-pegasus-websocket` sources (found beside this repo by default;
override with `PEGASUS_DIR` and `WSPLUGIN_DIR`).

Protocol — JSON text frames over `ws://<host>:8080/ws`, subprotocol `game`:

| direction | message |
| --- | --- |
| server → client | `{"t":"welcome","id":3}` |
| client → server | `{"t":"in","x":0.5,"z":-0.3}` |
| server → all | `{"t":"s","tick":120,"p":[[id,x,z],...]}` |

`SPEED` and `ARENA_RADIUS` in `src/state.js` **must** match `server/room.lua`; if they
drift, the server keeps correcting client prediction and movement feels wrong. The dev
server (`:8000`) and the multiplayer server (`:8080`) are separate processes.
