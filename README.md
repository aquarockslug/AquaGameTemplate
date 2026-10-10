# LittleJS + esbuild

A LittleJS game template with a dev server and production build. Code conventions live in `AGENTS.md`.

## Commands

```
lua tools.lua dev             # dev server with live reload on :8000
                              # + Chrome with remote debugging (CDP) on :9222,
                              #   reused if a CDP browser is already running
lua tools.lua build           # minified production build to dist/
lua tools.lua serve           # serve an existing dist/ build
lua tools.lua install         # client toolchain + multiplayer server deps
lua tools.lua server          # multiplayer WebSocket server on :8080
```

## Multiplayer

The game runs in the client and is synced by a server-authoritative model: `server/`
owns every player's position and broadcasts them at 20 Hz, while each client predicts
its own movement locally and interpolates everyone else. Open the game in two tabs to
see both players.

Set up once with `lua tools.lua install`: the multiplayer server needs Lua 5.4 + LuaRocks,
and it installs its rocks into your user LuaRocks tree while cloning `pegasus.lua` and
`lua-pegasus-websocket` **beside** this repo (`PEGASUS_DIR` / `WSPLUGIN_DIR` override the
locations) — nothing is installed inside the repo. Then start it with `lua tools.lua server`
(equivalent to `./server/run.sh`, but installs missing deps first).

Protocol — JSON text frames over `ws://<host>:8080/ws`, subprotocol `game`:

| direction | message |
| --- | --- |
| server → client | `{"t":"welcome","id":3}` |
| client → server | `{"t":"in","x":0.5,"z":-0.3}` |
| server → all | `{"t":"s","tick":120,"p":[[id,x,z],...]}` |

`SPEED` and `ARENA_RADIUS` in `src/state.js` **must** match `server/room.lua`; if they
drift, the server keeps correcting client prediction and movement feels wrong. The dev
server (`:8000`) and the multiplayer server (`:8080`) are separate processes.
