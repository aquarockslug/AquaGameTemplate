# AGENTS.md

Guidance for AI agents working in this repo. Scope: how to use the LittleJS engine
and how this project structures game code. Project commands live in `README.md`.
Full API reference: `ref/littlejs.md` (grep it before hand-rolling anything).

## Code layout — functional core, engine shell

- `src/state.js` — pure game logic. `initialState()` and `step(state, dt)`: takes a
  state value in, returns the next state value out. **Imports nothing from LittleJS**,
  makes no engine calls, mutates no received values. Game rules go here.
- `src/fp.js` — the project's FP helper kit (`pipe`, `compose`, `curry`, `partial`,
  `unary`). It is the only utility library — do not add Ramda/lodash/other deps.
- `src/main.js` — the impure shell: the five LittleJS callbacks, spawning engine
  objects, copying state poses onto them. Side effects live here, kept obvious.
- `src/sprite.js` and future entity files — thin views (EngineObject subclasses)
  with visual config only; no game rules in `update()`.
- Naming: stages read as data flow (`advanceClock`, `computeBobPoses`), so
  `step = pipe(advanceClock(dt), computeBobPoses)` shows the frame pipeline.

## Functional-Light conventions (from "Functional-Light JavaScript")

- Every frame: `state = step(state, dt)` in `gameUpdate`, then apply the result to
  engine objects. Never read engine globals (`l.time`, `keyIsDown`, ...) inside
  `state.js` — pass what it needs in as arguments.
- Treat received values as immutable: return new objects (`{ ...state, time }`)
  instead of mutating. Local mutation of function-local arrays is fine (book ch6).
- Dev builds call `freezeState(state)` after each step — accidental writes throw.
- Randomness and other side effects are injected as function arguments
  (`initialState({ random })`) or confined to `main.js` (book ch5, "containing effects").
- Point-free / curry in moderation: only where it improves readability; if the
  point-free version needs explaining, use the plain version (book ch3's own warning).
- No transducers, monads, or observable streams — plain `pipe` of small stages is
  the abstraction level for this project.
- New game systems start as a pure module (`src/<system>.js`) with its own
  `initialState`/`step`-style functions, then get wired into the shell.

## How LittleJS is loaded here

- Engine: `vendor/littlejs.esm.js` (LittleJS 1.25.0, ESM build). There are no engine globals —
  everything is imported:
  `import * as l from "../vendor/littlejs.esm.js"` then `l.engineInit(...)`, `l.vec2(...)`, or
  destructure the few you use like `src/main.js` does.
- esbuild bundles `src/` into `main.js`; dev server + build are in `README.md`.
- Before assuming a symbol exists, grep the `export { ... }` block at the end of
  `vendor/littlejs.esm.js`. This build exports `particleEffect`, tweakables (`tweak`), and
  `levelEditor`, unlike older LittleJS versions.

## Startup and structure

- Start the engine with
  `l.engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost)`; define all
  five callbacks even if some are empty. `gameInit` may be `async` — the engine awaits it.
- Model entities as classes extending `EngineObject` — the engine updates, moves, collides and
  renders them every frame:

```javascript
// destructure what you use, or write l.verb everywhere — see src/main.js
const { EngineObject, vec2, tile, keyDirection, CYAN } = l;

class Player extends EngineObject
{
    constructor(pos)
    {
        super(pos, vec2(1), tile(0), 0, CYAN); // pos, size, tileInfo, angle, color
    }
    update()
    {
        this.velocity = keyDirection().scale(.2); // arrows/WASD move the player
        // engine applies physics (velocity, gravity, collision) after update()
        // no super.update() call is needed
    }
}
```

- Spawn once in `gameInit`; it draws itself — no manual draw call. Customize via
  `this.tileInfo` / `this.color` / `this.angle`, or override `render()`.
- Persisted settings/stats: `readSaveData` / `writeSaveData` (localStorage-backed) — don't
  hand-roll localStorage. The default must be an **object**: `readSaveData('save', {best:0}).best`,
  never `readSaveData('best', 0)` (that returns `{}` and turns into `NaN` silently; debug builds
  assert).

## Use the engine's built-ins — don't reinvent

- `keyDirection()` for ALL arrow/WASD directional input (returns a vec2) — never write manual
  arrow-key OR chains; WASD emulation is already on. `keyIsDown()` is for non-directional actions
  (jump, interact).
- `gamepadStick(0)` for analog movement/aim; `mousePos` (world-space), `mouseWasPressed(0)` /
  `mouseIsDown(0)` for the mouse.
- `isOverlapping(posA, sizeA, posB, sizeB)` for AABB hit tests; `isOnScreen()` for culling;
  `screenToWorld()` / `worldToScreen()` for coordinate conversion; `Timer` for timed events.
- Math: `clamp`, `lerp`, `percent`, `rand`, `randInt`, and `Vector2`/`Vector3` methods
  (`add`, `scale`, `distance`, `normalize`, `rotate`, ...) — don't rewrite them.
- Sound: `Sound` / `zzfx()` (ZzFX) — never write custom WebAudio code.
- FX: `particleEffect()` ready-made effects and `ParticleEmitter` for custom particles;
  `postProcessBloom(threshold, strength, size)` in `gameInit` for glow — never a
  hand-written bloom shader. Only one post-process is active at a time.
- Tile-based collision: `TileCollisionLayer` and the engine's tile-collision flow; put tile
  reactions in `collideWithTile(tileData, pos)`. Don't build a custom tile-collision engine.
- Prefer world-space drawing (`drawTile`, `drawRect`, `drawCircle`, `drawText`); most draw
  functions take a `screenSpace` parameter if you need pixels.

## 3D (this game is 3D — built into the engine, not three.js)

- Setup is one line at the top of `gameInit`: `new l.Render3DPlugin;`. It creates `render3D` and
  draws the scene automatically each frame. Do NOT declare `render3D` in game code, and never
  call `setGLEnable(false)` — the 3D scene draws on the engine's WebGL canvas, with 2D and HUD
  draws over it (HUD text goes in `gameRenderPost` with `drawTextScreen`).
- Coordinates: right handed, Y is up, -Z is forward, the ground is the XZ plane. Map 2D input
  onto it as `vec3(move.x, 0, -move.y)` where `move = keyDirection()`.
- Objects: `new EngineObject3D(pos3D, mesh, tileInfo, color)` with `pos3D`, `rotation3D`
  (pitch, yaw, roll in radians), `scale3D`, `velocity3D`. It extends `EngineObject`, so
  `update()`, `destroy()`, timers, children and `setCollision()` work the same. The 2D fields
  (`pos`, `angle`, `angleVelocity`, `mirror`, `drawSize`) do nothing on a 3D object — use
  `pos3D`, `rotation3D`, `angleVelocity3D`, `scale3D`.
- Meshes come from builders (`buildBox`, `buildSphere`, `buildCylinder`, `buildCone`,
  `buildGrid`, `buildText3D`, ...) or the shared `render3D.boxMesh` / `sphereMesh` / `planeMesh`
  scaled with `scale3D`. A `tileInfo` with no mesh draws a billboard sprite. Builders take FULL
  sizes (diameters), like `drawCircle`; `Light3D` and the 3D collision helpers take a radius.
- 3D draw calls (`render3D.drawMesh` and friends) only work inside the 3D pass: an object's
  `render3D()` method, or `render3D.onRenderOpaque` / `onRenderTransparent`. Calling them from
  `gameRender` asserts.
- Cameras: `render3D.camera.orbit(target, distance, yaw, pitch)`, `.lookAt(target)`, or
  `.follow(target, offset, percent)` called every frame from `gameUpdatePost`; or
  `new CameraControl3D(target, distance, pitch, idleSpin)` /
  `new FirstPersonCamera3D(...)`.
- Off by default — turn on what the game needs: `render3D.gravity = vec3(0, -.01, 0)` (objects
  also need a `mass` to fall), `render3D.shadows = true`, `render3D.setSky(...)`,
  `render3D.setFog(start, end)`. `postProcessBloom()` after the plugin makes bright things glow.

## Pitfalls (each of these causes silent bugs)

- `drawCircle` / `drawEllipse` size is the **diameter**, not the radius.
- `lerp(valueA, valueB, percent)` — percent comes **last**, not first.
- `ParticleEmitter` speed values are **per frame**, not per second (typical range 0.1–0.5).
- Angles: **clockwise is positive** in LittleJS (Box2D is the opposite — counterclockwise).
- Y-axis is **up-positive** in world space: falling gravity is negative Y.
- `drawText` is world-space (size ~3 is normal); `drawTextScreen` is pixel/screen-space
  (size ~80 is normal). Don't mix them up.
- Spin uses `angleVelocity` / `angleDamping` — the standard-sounding `angularVelocity` is a
  silent no-op.
- Tile collision is the `collideLevel` flag (third argument of `setCollision`,
  `setCollision(collideSolidObjects, isSolid, collideLevel, collideRaycast)`; older
  LittleJS versions call it `collideTiles`).
- Bounciness is `restitution` (0 to 1); the old name `elasticity` no longer exists.
- To handle a collision yourself, return `false` from `collideWithObject(other)` — that skips
  the engine's position/velocity resolution for the pair. Returning `true` (the default) lets
  the engine resolve it.
- The canvas can be any aspect ratio. To keep a fixed playfield fully visible, set the scale
  each frame in `gameUpdatePost`:
  `setCameraScale(min(mainCanvasSize.x / viewW, mainCanvasSize.y / viewH))`.
- For additive glow, the `additiveColor` argument needs **alpha 0** (e.g. `new Color(1,1,0,0)`);
  non-zero alpha thickens the silhouette.
- Keep `\n` as a two-character escape inside string literals; don't convert to real line breaks.
- A typical view is roughly 35x20 world units at the default camera scale. Set framing
  explicitly with `setCameraScale` rather than guessing entity sizes.
- Engine plugins that ship in the bundle and need no import: 3D (`render3D`), the light system,
  tweens, scenes, pathfinding, post-process (`postProcessBloom`), the UI system. Check
  `ref/littlejs.md` before hand-rolling any of these.
