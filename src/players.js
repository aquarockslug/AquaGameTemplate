// Pure multiplayer state: no engine calls, no sockets, and no mutation of
// received values — the same conventions state.js follows (see AGENTS.md).
//
// The server is authoritative over positions and sends them at a fixed tick
// rate. This module turns that stream of discrete snapshots into smooth motion:
// every remote is held slightly in the past and interpolated between the two
// most recent snapshots, so a 20 Hz feed draws smoothly at any framerate.

const lerp = (a, b, t) => a + (b - a) * t;

// How far behind the newest snapshot remotes are drawn, in seconds. One server
// tick of slack absorbs jitter in when snapshots actually arrive.
export const INTERP_DELAY = 1 / 20;

export function initialPlayers() {
	return { time: 0, remotes: {} };
}

/**
 * Fold a server snapshot into the remote roster: unknown ids appear, departed
 * ids are dropped, survivors keep their previous target so interpolation has a
 * "from". Times are in this module's own clock (seconds), never server ticks,
 * so the client and server clocks are never mixed.
 * @param {object} players current remote state
 * @param {{tick: number, players: Array<[number, number, number]>}} snapshot
 * @param {number|null} selfId this client's id, which is predicted not interpolated
 * @returns {object} the next remote state
 */
export function applySnapshot(players, snapshot, selfId) {
	const now = players.time;
	const remotes = {};
	for (const [id, x, z] of snapshot.players) {
		if (id === selfId) continue; // our own avatar is predicted in state.js
		const key = String(id); // object keys are strings; use one type everywhere
		const existing = players.remotes[key];
		remotes[key] = {
			key,
			id,
			fromX: existing ? existing.toX : x,
			fromZ: existing ? existing.toZ : z,
			toX: x,
			toZ: z,
			fromTime: existing ? existing.toTime : now,
			toTime: now,
			renderX: existing ? existing.renderX : x,
			renderZ: existing ? existing.renderZ : z,
		};
	}
	return { ...players, remotes };
}

/** Advance the clock and interpolate every remote toward its latest snapshot. */
export function stepPlayers(players, dt) {
	const time = players.time + dt;
	const remotes = {};
	for (const key of Object.keys(players.remotes)) {
		const remote = players.remotes[key];
		const span = remote.toTime - remote.fromTime;
		const elapsed = time - INTERP_DELAY - remote.fromTime;
		const t = span > 0 ? Math.min(Math.max(elapsed / span, 0), 1) : 1;
		remotes[key] = {
			...remote,
			renderX: lerp(remote.fromX, remote.toX, t),
			renderZ: lerp(remote.fromZ, remote.toZ, t),
		};
	}
	return { time, remotes };
}

/**
 * A stable, well-spread color per player id, so every client agrees on who is
 * who without the server having to send colors.
 * @param {number|string} id
 * @param {Function} hsl the engine's hsl color constructor
 * @returns {object} an hsl color
 */
export function playerColor(id, hsl) {
	// golden-ratio hue stepping keeps consecutive ids far apart on the wheel
	return hsl(((Number(id) * 0.618033988749895) % 1 + 1) % 1, 0.8, 0.7);
}
