/** Pure remote-player state: remotes are held one tick in the past and interpolated between snapshots, so a 20 Hz feed draws smoothly at any framerate. */

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(Math.max(v, 0), 1);

/** How far behind the newest snapshot remotes are drawn, in seconds (one tick of slack). */
export const INTERP_DELAY = 1 / 20;

export const initialPlayers = () => ({ time: 0, remotes: {} });

/**
 * Fold a server snapshot into the remote roster: unknown ids appear, departed ids
 * are dropped, survivors keep their previous target so interpolation has a "from".
 * Times are this module's own clock (seconds), never server ticks.
 * @param {{time: number, remotes: Object}} players current remote state
 * @param {{tick: number, players: Array<[number, number, number]>}} snapshot
 * @param {number|null} selfId this client's id, which is predicted not interpolated
 * @returns {{time: number, remotes: Object}} the next remote state
 */
export function applySnapshot(players, snapshot, selfId) {
	const now = players.time;
	const remotes = {};
	for (const [id, x, z] of snapshot.players) {
		if (id === selfId) continue; // our own avatar is predicted in state.js
		const key = String(id); // object keys are strings; use one type everywhere
		const prev = players.remotes[key];
		remotes[key] = {
			key,
			id,
			toX: x,
			toZ: z,
			toTime: now,
			fromX: prev?.toX ?? x,
			fromZ: prev?.toZ ?? z,
			fromTime: prev?.toTime ?? now,
			renderX: prev?.renderX ?? x,
			renderZ: prev?.renderZ ?? z,
		};
	}
	return { ...players, remotes };
}

/** Advance the clock and interpolate every remote toward its latest snapshot. */
export function stepPlayers(players, dt) {
	const time = players.time + dt;
	const remotes = {};
	for (const [key, remote] of Object.entries(players.remotes)) {
		const span = remote.toTime - remote.fromTime;
		const t = span > 0 ? clamp01((time - INTERP_DELAY - remote.fromTime) / span) : 1;
		remotes[key] = {
			...remote,
			renderX: lerp(remote.fromX, remote.toX, t),
			renderZ: lerp(remote.fromZ, remote.toZ, t),
		};
	}
	return { time, remotes };
}

/**
 * A stable, well-spread color per player id (golden-ratio hue stepping), so every
 * client agrees on who is who without the server sending colors.
 * @param {number|string} id
 * @param {Function} hsl the engine's hsl color constructor
 * @returns {object} an hsl color
 */
export const playerColor = (id, hsl) =>
	hsl((((Number(id) * 0.618033988749895) % 1) + 1) % 1, 0.8, 0.7);
