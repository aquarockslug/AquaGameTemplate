import * as l from "../vendor/littlejs.esm.js";
import favicon from "../assets/favicon.png";
import textureURL from "../assets/textures.png";
import textureDataURL from "../assets/textures.json";
import { Player } from "./sprite.js";
import { freezeState, initialState, step } from "./state.js";

// biome-ignore format: un-prefix frequently used littlejs functions
const { vec2, vec3, hsl } = l;

// a map of frame name to TileInfo
let textures;

// the visual representation of the player
let player;

// the pure game state and the engine objects that view it
let state = initialState();

window.onload = () => {
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
};

// -----------------------------------------------------------------------------------------------------
// the engine shell: state.js owns WHAT happens, this file owns applying it to LittleJS

async function gameInit() {
	textures = l.loadAtlas(textureURL, textureDataURL);
	await l.spritesReady();

	new l.Render3DPlugin();
	l.render3D.setSky(hsl(0.65, 0.5, 0.15), hsl(0.8, 0.4, 0.3), hsl(0.65, 0.4, 0.1));
	l.render3D.setFog(15, 40);
	l.render3D.ambientColor = hsl(0.6, 0.2, 0.5);
	new l.CameraControl3D(vec3(), 15, 0.5);
	new l.EngineObject3D(vec3(), l.buildGrid(vec2(30), 1, hsl(0.8, 0.2, 0.3))); // floor

	player = new Player(vec3(0, 1, 0), textures.logo);
}

async function gameUpdate() {
	let input = { direction: l.keyDirection() };

	state = step(state, input, l.timeDelta);
	if (!PRODUCTION) freezeState(state); // catch accidental writes to receive;d alues

	player.pos3D = state.player.pos;
}
function gameUpdatePost() {}
function gameRender() {}
function gameRenderPost() {}

l.engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost);
