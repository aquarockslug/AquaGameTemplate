/** Multiplayer transport — the only file that touches WebSocket (see AGENTS.md). */

const PORT = 8080;
const SUBPROTOCOL = "game";

let socket = null;
let selfId = null;
let connected = false;
let connecting = false;
/** Latest snapshot, replaced (never mutated) whenever one arrives; null once consumed. */
let snapshot = null;
/** Called with the server-assigned player id once the connection is live. */
let onWelcome = () => {};

/**
 * Open the connection to the multiplayer server.
 * @param {Function} [welcome] called with this client's player id
 */
export function connect(welcome) {
	if (welcome) onWelcome = welcome;
	if (connecting || connected) return;

	connecting = true;
	socket = new WebSocket(`ws://${location.hostname}:${PORT}/ws`, SUBPROTOCOL);

	socket.onopen = () => {
		connecting = false;
		connected = true;
	};

	socket.onmessage = (event) => {
		let msg;
		try {
			msg = JSON.parse(event.data);
		} catch {
			return; // ignore anything that is not our protocol
		}
		if (msg.t === "welcome") {
			selfId = msg.id;
			onWelcome(selfId);
		} else if (msg.t === "s") {
			snapshot = { tick: msg.tick, players: msg.p };
		}
	};

	socket.onclose = () => {
		// the server owns the id, so a reconnect is assigned a new one
		connected = connecting = false;
		socket = snapshot = selfId = null;
	};
}

/** @returns {boolean} whether a connection attempt is in flight */
export const isConnecting = () => connecting;

/** @returns {boolean} whether the socket is open */
export const isConnected = () => connected;

/** @returns {number|null} this client's player id, or null before welcome */
export const id = () => selfId;

/**
 * Send the local player's input direction. The server integrates the latest
 * direction once per tick, so the call rate does not change movement speed.
 * @param {number} x direction x in [-1, 1]
 * @param {number} z direction z in [-1, 1]
 */
export function sendInput(x, z) {
	if (!socket || socket.readyState !== WebSocket.OPEN) return;
	socket.send(JSON.stringify({ t: "in", x, z }));
}

/**
 * Take the most recent snapshot and clear it, so a frame faster than the server's
 * tick rate cannot apply the same snapshot twice.
 * @returns {?{tick: number, players: Array<[number, number, number]>}}
 */
export function consumeSnapshot() {
	const taken = snapshot;
	snapshot = null;
	return taken;
}
