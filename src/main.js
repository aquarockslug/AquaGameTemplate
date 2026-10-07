import * as l from "../vendor/littlejs.esm.js";
import favicon from "../assets/favicon.png";
import textureURL from "../assets/textures.png";
import textureDataURL from "../assets/textures.json";
import { Sprite } from "./sprite.js";
import { freezeState, initialState, step } from "./state.js";

// biome-ignore format: un-prefix frequently used littlejs functions
const { vec2, vec3, hsl } = l;

// a map of frame name to TileInfo
let textures;

// the pure game state and the engine objects that view it
let state = initialState();
let ringSprites = [];

if (!PRODUCTION) {
	l.setDebugWatermark(false);
	window.l = l;
	// current state, live (dev only)
	Object.defineProperty(window, "state", { get: () => state });
	// reload on rebuild when developing
	new EventSource("/esbuild").addEventListener("change", () => location.reload());
}

// favicon can't be referenced from index.html, so it's imported and injected here
const link = document.createElement("link");
link.rel = "icon";
link.href = favicon;
document.head.append(link);

// -----------------------------------------------------------------------------------------------------
// the engine shell: state.js owns WHAT happens, this file owns applying it to LittleJS

async function gameInit() {
	textures = l.loadAtlas(textureURL, textureDataURL);
	await l.spritesReady();

	new l.Render3DPlugin();
	l.render3D.setSky(hsl(0.65, 0.5, 0.15), hsl(0.8, 0.4, 0.3), hsl(0.65, 0.4, 0.1));
	l.render3D.setFog(15, 40);
	l.render3D.ambientColor = hsl(0.6, 0.2, 0.5);
	new l.CameraControl3D(vec3(), 15, 0.5, 0.003);
	new l.EngineObject3D(vec3(), l.buildGrid(vec2(30), 1, hsl(0.8, 0.2, 0.3))); // floor
	new l.EngineObject3D(vec3(0, 2, 0), l.buildBox(2).setColor(hsl(0, 0, 0.7))); // cube

	// spawn one view per sprite in the state
	const frames = ["000", "001", "002"].map((name) => textures[name]);
	ringSprites = state.sprites.map(
		(sprite, i) =>
			new Sprite(
				vec3(sprite.x, sprite.y, sprite.z),
				frames[i % frames.length],
				hsl(i / state.sprites.length, 0.8, 0.7),
			),
	);

	const logo = new Sprite(vec3(0, 6), textures.logo, hsl(0, 0, 1));
	logo.size3D = vec3(4, (4 * 100) / 132, 2); // keep the 132x100 frame's aspect ratio
	logo.softShadow = 0;
}

function gameUpdate() {
	state = step(state, l.timeDelta);
	if (!PRODUCTION) freezeState(state); // catch accidental writes to received values

	// side effect: copy the state's poses onto the engine objects
	for (const [i, sprite] of state.sprites.entries()) ringSprites[i].pos3D.set(sprite.x, sprite.y, sprite.z);
}
function gameUpdatePost() {}
function gameRender() {}
function gameRenderPost() {}

l.engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost);
