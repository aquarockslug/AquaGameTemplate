// Multiplayer transport — the impure half of the online layer.
//
// This is the only file that touches WebSocket, so the rest of the game stays
// pure and testable (see AGENTS.md). It owns the socket and nothing else knows
// it exists: the shell reads a snapshot with consumeSnapshot() and pushes the
// local input out with sendInput().
//
// Protocol (JSON text frames):
//   server -> client  {"t":"welcome","id":3}
//   client -> server  {"t":"in","x":0.5,"z":-0.3}
//   server -> all     {"t":"s","tick":120,"p":[[id,x,z],...]}

const PORT = 8080;
const SUBPROTOCOL = "game";

let socket = null;
let selfId = null;
let connected = false;
// "connecting" is tracked separately from "connected" so a retry does not
// stack up sockets while the previous attempt is still pending.
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
			// replace, never mutate: the snapshot is treated as an immutable value
			snapshot = { tick: msg.tick, players: msg.p };
		}
	};

	socket.onclose = () => {
		connected = false;
		connecting = false;
		socket = null;
		// the server owns the id, so a reconnect is assigned a new one
		selfId = null;
		snapshot = null;
	};

	socket.onerror = () => {
		// onclose always follows, so retry policy lives in the caller
	};
}

/** @returns {boolean} whether a connection attempt is in flight */
export function isConnecting() {
	return connecting;
}

/** @returns {boolean} whether the socket is open */
export function isConnected() {
	return connected;
}

/** @returns {number|null} this client's player id, or null before welcome */
export function id() {
	return selfId;
}

/**
 * Send the local player's input direction. The server integrates the *latest*
 * direction once per tick, so the rate this is called at does not change how
 * fast the player moves.
 * @param {number} x direction x in [-1, 1]
 * @param {number} z direction z in [-1, 1]
 */
export function sendInput(x, z) {
	if (!socket || socket.readyState !== WebSocket.OPEN) return;
	socket.send(JSON.stringify({ t: "in", x, z }));
}

/**
 * Take the most recent snapshot and clear it, so a frame that runs faster than
 * the server's tick rate cannot apply the same snapshot twice.
 * @returns {?{tick: number, players: Array<[number, number, number]>}}
 */
export function consumeSnapshot() {
	const taken = snapshot;
	snapshot = null;
	return taken;
}
