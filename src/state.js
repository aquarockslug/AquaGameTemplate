import { curry, pipe } from "./fp.js";

/** Movement speed in world units per second. */
export const SPEED = 6;
/** Players are kept inside this radius on the XZ plane. */
export const ARENA_RADIUS = 14;

export const initialState = () => ({ time: 0, player: { pos: { x: 0, y: 1, z: 0 } } });

/** Advance the clock by dt seconds (curried so it composes in a pipeline). */
const advanceClock = curry((dt, state) => ({ ...state, time: state.time + dt }));

/** Move the local player by input, clamped to the arena. */
const movePlayer = curry((input, dt, state) => {
	const direction = direction3(input.direction);
	const pos = clampToArena({
		x: state.player.pos.x + direction.x * SPEED * dt,
		y: state.player.pos.y,
		z: state.player.pos.z + direction.z * SPEED * dt,
	});
	return { ...state, player: { ...state.player, pos } };
});

/** Run one frame of simulation: clock, then input. */
export const step = (state, input, dt) => pipe(advanceClock(dt), movePlayer(input, dt))(state);

/** Key direction (a y-up vec2) as a normalized XZ vector. */
function direction3({ x, y }) {
	const length = Math.hypot(x, y);
	const scale = length > 1 ? 1 / length : 1;
	return { x: x * scale, y: 0, z: -y * scale };
}

/** Clamp a position to the arena circle without touching its height. */
function clampToArena(pos) {
	const radius = Math.hypot(pos.x, pos.z);
	return radius <= ARENA_RADIUS
		? pos
		: {
				x: (pos.x * ARENA_RADIUS) / radius,
				y: pos.y,
				z: (pos.z * ARENA_RADIUS) / radius,
			};
}

/** Freeze a state so accidental writes throw (dev builds only). */
export const freezeState = (state) => Object.freeze(state);
