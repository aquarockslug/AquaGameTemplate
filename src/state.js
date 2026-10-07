// Pure game state — the functional core.
// No LittleJS imports, no engine calls: step(state, dt) takes a state value in
// and returns the next state value out, nothing else (see AGENTS.md).
import { curry, pipe } from "./fp.js";

const TAU = Math.PI * 2;

/**
 * Starting state: a ring of sprites, each with a static layout position, a
 * base height, and a random bob phase.
 *
 * Randomness is a side effect, so it's injected: the caller may pass a
 * `random` function (book ch5, "containing effects"). Default is Math.random.
 *
 * @param {object} [options]
 * @param {number} [options.count=12]   number of sprites in the ring
 * @param {number} [options.radius=7]   ring radius in world units
 * @param {number} [options.baseY=2]    height sprites bob around
 * @param {Function} [options.random]   returns a number in [0, 1)
 * @returns {object} the initial game state
 */
export function initialState({ count = 12, radius = 7, baseY = 2, random = Math.random } = {}) {
	// local mutation of a function-local array is fine (book ch6)
	const sprites = [];
	for (let i = 0; i < count; i++) {
		const angle = (i / count) * TAU;
		sprites.push({
			angle,
			x: radius * Math.cos(angle),
			z: -radius * Math.sin(angle), // matches littlejs vec3.rotateY
			baseY,
			phase: random() * TAU,
			y: baseY,
		});
	}
	return { time: 0, sprites };
}

/** Advance the clock by dt seconds. Curried so it composes in a pipeline. */
const advanceClock = curry(function advanceClock(dt, state) {
	return { ...state, time: state.time + dt };
});

/** Derive each sprite's bob height from the clock. */
function computeBobPoses(state) {
	return {
		...state,
		sprites: state.sprites.map((sprite) => ({
			...sprite,
			y: bobY(state.time, sprite.phase, sprite.baseY),
		})),
	};
}

/** Pure: one sprite's height at a given time. */
function bobY(time, phase, baseY) {
	return baseY + Math.sin((time + phase) * 2) * 0.5;
}

/**
 * Run one frame: advance the clock, then derive bob poses from it.
 * @param {object} state
 * @param {number} dt seconds since the last step
 * @returns {object} the next state
 */
export function step(state, dt) {
	return pipe(advanceClock(dt), computeBobPoses)(state);
}

/**
 * Freeze the state (and its sprites) so accidental writes throw.
 * Call on every state in dev builds to enforce value immutability (book ch6).
 * @param {object} state
 * @returns {object} the same state, frozen
 */
export function freezeState(state) {
	Object.freeze(state);
	Object.freeze(state.sprites);
	state.sprites.forEach((sprite) => Object.freeze(sprite));
	return state;
}
