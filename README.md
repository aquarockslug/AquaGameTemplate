# LittleJS + esbuild

A LittleJS game template with a dev server and production build.

## Commands

```
lua tools.lua dev             # dev server with live reload on :8000
lua tools.lua build           # minified production build to dist/
lua tools.lua serve           # serve an existing dist/ build
lua tools.lua install         # install/update esbuild + the LittleJS engine
```

Each command runs from anywhere — the script switches to the repo root itself.
Pass a port or version as the second argument: `lua tools.lua dev 8080` or
`lua tools.lua install 0.29.0`.

## How it works

`tools.lua` bundles `src/main.js` with the vendored esbuild binary and its
configured game asset loaders (`.png .jpg .mp3 .ogg .wasm`). In dev it serves
`dist/` with `--serve --servedir=dist --watch`; esbuild pushes a `change` event
over SSE (`/esbuild`) that `src/main.js` listens for to trigger a full page
reload — LittleJS owns global state, so full reloads are what it wants anyway.
A `PRODUCTION` define makes minified builds drop that reload code entirely.
Builds are minified with source maps, hashed assets (`assets/[name]-[hash]`),
and a `.nojekyll` marker for GitHub Pages, with relative output paths so they
work from any subdirectory.
