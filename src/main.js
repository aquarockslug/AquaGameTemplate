import favicon from "../assets/favicon.png";
import textureDataURL from "../assets/textures.json";
import textureURL from "../assets/textures.png";
import * as l from "../vendor/littlejs.esm.js";
import * as net from "./net.js";
import { applySnapshot, initialPlayers, playerColor, stepPlayers } from "./players.js";
import { Player } from "./sprites.js";
import { freezeState, initialState, step } from "./state.js";

// biome-ignore format: un-prefix frequently used littlejs functions
const { vec2, vec3, hsl } = l;

/** Tile used for every player avatar (frame name in the loaded atlas). */
const AVATAR_TILE = "000";
/** Reconnect backoff, in seconds of engine time. */
const RETRY_DELAY = 2;

let textures; // frame name -> TileInfo
let state = initialState(); // state.js owns the predicted local player
let players = initialPlayers(); // players.js owns the remotes
let selfAvatar;
const remoteAvatars = new Map(); // remote id -> engine view
let nextRetryAt = 0;

window.onload = () => {
	if (!PRODUCTION) {
		l.setDebugWatermark(false);
		window.l = l;
		Object.defineProperty(window, "state", { get: () => state });
		Object.defineProperty(window, "players", { get: () => players });
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

	// the local avatar exists immediately, so the game still plays with no server
	selfAvatar = new Player(vec3(0, 1, 0), textures[AVATAR_TILE], hsl(0, 0, 1));
	connectWithRetry();
}

/** Called with the server-assigned id once welcome arrives. */
function assignSelfId(id) {
	selfAvatar.playerId = id;
	selfAvatar.color = playerColor(id, hsl);
}

/** Reconnect no faster than once per RETRY_DELAY while offline. */
function connectWithRetry() {
	if (net.isConnected() || net.isConnecting()) return;
	if (l.time < nextRetryAt) return;
	nextRetryAt = l.time + RETRY_DELAY;
	net.connect(assignSelfId);
}

async function gameUpdate() {
	const direction = l.keyDirection();
	net.sendInput(direction.x, -direction.y);

	const snapshot = net.consumeSnapshot();
	if (snapshot) players = applySnapshot(players, snapshot, net.id());
	players = stepPlayers(players, l.timeDelta);

	state = step(state, { direction, server: findSelf(snapshot, net.id()) }, l.timeDelta);
	if (!PRODUCTION) freezeState(state); // catch accidental writes in dev

	applyPoses();
	connectWithRetry();
}

function gameUpdatePost() {}

function gameRender() {}

function gameRenderPost() {
	const remotes = Object.keys(players.remotes).length;
	const status = net.isConnected()
		? `player ${net.id()}  ·  ${remotes + 1} online`
		: net.isConnecting()
			? "connecting…"
			: "offline — start server/run.sh  (retrying)";
	l.drawTextScreen(status, vec2(12, 20), 24, hsl(0, 0, 1), 2, hsl(0, 0, 0), "left");
}

/** Copy pure player positions onto engine objects, creating/destroying avatars. */
function applyPoses() {
	selfAvatar.pos3D = state.player.pos;

	for (const [key, remote] of Object.entries(players.remotes)) {
		let avatar = remoteAvatars.get(key);
		if (!avatar) {
			avatar = new Player(
				vec3(remote.renderX, 1, remote.renderZ),
				textures[AVATAR_TILE],
				playerColor(remote.id, hsl),
			);
			avatar.playerId = remote.id;
			remoteAvatars.set(key, avatar);
		}
		avatar.setPose(remote.renderX, remote.renderZ);
	}

	for (const [key, avatar] of remoteAvatars) {
		if (!(key in players.remotes)) {
			avatar.destroy();
			remoteAvatars.delete(key);
		}
	}
}

/** Find this client's own [x, z] in a snapshot, or null when absent/offline. */
function findSelf(snapshot, id) {
	if (!snapshot || id == null) return null;
	for (const [playerId, x, z] of snapshot.players) {
		if (playerId === id) return { x, z };
	}
	return null;
}

l.engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost);
