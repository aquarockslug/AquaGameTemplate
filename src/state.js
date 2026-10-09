import * as l from "../vendor/littlejs.esm.js";
import { curry, pipe } from "./fp.js";

// biome-ignore format: un-prefix frequently used littlejs functions
const { vec3 } = l;

// Movement constants. These MUST match server/room.lua: the server integrates
// the same input at the same speed, so any disagreement shows up as the server
// constantly dragging the predicted avatar and fighting the player's input.
export const SPEED = 6; // world units per second
export const ARENA_RADIUS = 14; // players are kept inside this radius on the XZ plane

// Server reconciliation: prediction is eased toward the server's authoritative
// position. The deadzone ignores the small offset that network latency always
// creates, so correction never fights the controls during normal play.
const CORRECTION_RATE = 10; // fraction of the remaining error closed per second
const CORRECTION_DEADZONE = 0.5; // XZ distance (world units) left uncorrected

export function initialState() {
	return { time: 0, player: { pos: vec3(0, 1, 0) } };
}

/** Advance the clock by dt seconds. Curried so it composes in a pipeline. */
const advanceClock = curry(function advanceClock(dt, state) {
	return { ...state, time: state.time + dt };
});

/** Move the local player from input, clamped to the arena. */
const movePlayer = curry(function movePlayer(input, dt, state) {
	const pos = clampToArena(
		state.player.pos.add(direction3(input.direction).scale(SPEED * dt)),
	);
	return { ...state, player: { ...state.player, pos } };
});

/**
 * Ease prediction toward the server's position for this player. `input.server`
 * is null until the first snapshot carries our id, and while offline, in which
 * case standalone prediction stands on its own.
 */
const reconcilePlayer = curry(function reconcilePlayer(input, dt, state) {
	const server = input.server;
	if (!server) return state;

	const pos = state.player.pos;
	const errorX = server.x - pos.x;
	const errorZ = server.z - pos.z;
	const error = Math.hypot(errorX, errorZ);
	if (error <= CORRECTION_DEADZONE) return state;

	const pull =
		((1 - Math.exp(-CORRECTION_RATE * dt)) * (error - CORRECTION_DEADZONE)) /
		error;
	return {
		...state,
		player: {
			...state.player,
			pos: vec3(pos.x + errorX * pull, pos.y, pos.z + errorZ * pull),
		},
	};
});

export function step(state, input, dt) {
	return pipe(
		advanceClock(dt),
		movePlayer(input, dt),
		reconcilePlayer(input, dt),
	)(state);
}

/** Key direction (a y-up vec2) as an XZ vector, normalized like the server. */
function direction3(direction) {
	const length = Math.hypot(direction.x, direction.y);
	const scale = length > 1 ? 1 / length : 1; // same rule as server/room.lua
	return vec3(direction.x * scale, 0, -direction.y * scale);
}

/** Clamp a position to the arena circle without touching its height. */
function clampToArena(pos) {
	const radius = Math.hypot(pos.x, pos.z);
	if (radius <= ARENA_RADIUS) return pos;
	return vec3(
		(pos.x * ARENA_RADIUS) / radius,
		pos.y,
		(pos.z * ARENA_RADIUS) / radius,
	);
}

export function freezeState(state) {
	Object.freeze(state);
	return state;
}
