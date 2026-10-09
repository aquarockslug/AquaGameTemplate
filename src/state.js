import * as l from "../vendor/littlejs.esm.js";
import { curry, pipe } from "./fp.js";

// biome-ignore format: un-prefix frequently used littlejs functions
const { vec3 } = l;

/** Movement — must match server/room.lua, or the server drags the avatar and fights the input. */
export const SPEED = 6;
/** Players are kept inside this radius on the XZ plane. */
export const ARENA_RADIUS = 14;

/** Reconciliation toward the server: rate = fraction of remaining error closed per second, deadzone = XZ distance (world units) left uncorrected. */
const CORRECTION_RATE = 10;
const CORRECTION_DEADZONE = 0.5;

export const initialState = () => ({ time: 0, player: { pos: vec3(0, 1, 0) } });

/** Advance the clock by dt seconds (curried so it composes in a pipeline). */
const advanceClock = curry((dt, state) => ({ ...state, time: state.time + dt }));

/** Move the local player by input, clamped to the arena. */
const movePlayer = curry((input, dt, state) => {
	const pos = clampToArena(state.player.pos.add(direction3(input.direction).scale(SPEED * dt)));
	return { ...state, player: { ...state.player, pos } };
});

/**
 * Ease prediction toward the server's position. `input.server` is null until the
 * first snapshot carries our id and while offline, so standalone prediction
 * stands on its own.
 */
const reconcilePlayer = curry((input, dt, state) => {
	const { server } = input;
	if (!server) return state;

	const pos = state.player.pos;
	const errorX = server.x - pos.x;
	const errorZ = server.z - pos.z;
	const error = Math.hypot(errorX, errorZ);
	if (error <= CORRECTION_DEADZONE) return state;

	const pull = ((1 - Math.exp(-CORRECTION_RATE * dt)) * (error - CORRECTION_DEADZONE)) / error;
	return {
		...state,
		player: { ...state.player, pos: vec3(pos.x + errorX * pull, pos.y, pos.z + errorZ * pull) },
	};
});

/** Run one frame of prediction: clock, input, then reconciliation. */
export const step = (state, input, dt) =>
	pipe(advanceClock(dt), movePlayer(input, dt), reconcilePlayer(input, dt))(state);

/** Key direction (a y-up vec2) as a normalized XZ vector, like server/room.lua. */
function direction3({ x, y }) {
	const length = Math.hypot(x, y);
	const scale = length > 1 ? 1 / length : 1;
	return vec3(x * scale, 0, -y * scale);
}

/** Clamp a position to the arena circle without touching its height. */
function clampToArena(pos) {
	const radius = Math.hypot(pos.x, pos.z);
	return radius <= ARENA_RADIUS
		? pos
		: vec3((pos.x * ARENA_RADIUS) / radius, pos.y, (pos.z * ARENA_RADIUS) / radius);
}

/** Deep-freeze a state so accidental writes throw (dev builds only). */
export const freezeState = (state) => Object.freeze(state);
