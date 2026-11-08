import favicon from "../assets/favicon.png";
import textureDataURL from "../assets/textures.json";
import textureURL from "../assets/textures.png";
import * as l from "../vendor/littlejs.esm.js";
import { Player } from "./sprites.js";
import { freezeState, initialState, step } from "./state.js";

// biome-ignore format: un-prefix frequently used littlejs functions
const { vec2, vec3, hsl } = l;

/** Tile used for the player avatar (frame name in the loaded atlas). */
const AVATAR_TILE = "000";

let textures; // frame name -> TileInfo
let state = initialState(); // state.js owns the game rules
let player; // engine view of the single player

window.onload = () => {
	if (!PRODUCTION) {
		l.setDebugWatermark(false);
		window.l = l;
		Object.defineProperty(window, "state", { get: () => state });
		new EventSource("/esbuild").addEventListener("change", () => location.reload()); // reload on rebuild
	}
	// favicon can't be referenced from index.html, so it's imported and injected here
	const link = document.createElement("link");
	link.rel = "icon";
	link.href = favicon;
	document.head.append(link);
};

async function gameInit() {
	textures = l.loadAtlas(textureURL, textureDataURL);
	await l.spritesReady();

	new l.Render3DPlugin();
	l.render3D.setSky(hsl(0.65, 0.5, 0.15), hsl(0.8, 0.4, 0.3), hsl(0.65, 0.4, 0.1));
	l.render3D.setFog(15, 40);
	l.render3D.ambientColor = hsl(0.6, 0.2, 0.5);
	new l.CameraControl3D(vec3(), 15, 0.5);
	new l.EngineObject3D(vec3(), l.buildGrid(vec2(30), 1, hsl(0.8, 0.2, 0.3))); // floor

	player = new Player(vec3(0, 1, 0), textures[AVATAR_TILE], hsl(0, 0, 1));
}

function gameUpdate() {
	const input = { direction: l.keyDirection() };

	state = step(state, input, l.timeDelta);
	if (!PRODUCTION) freezeState(state); // catch accidental writes in dev

	player.setPos(state.player.pos.x, state.player.pos.z);
}

function gameUpdatePost() {}
function gameRender() {}
function gameRenderPost() {}

l.engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost);
