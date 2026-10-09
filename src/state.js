import * as l from "../vendor/littlejs.esm.js";
import { curry, pipe } from "./fp.js";

// biome-ignore format: un-prefix frequently used littlejs functions
const { vec2, vec3, hsl } = l;

const TAU = Math.PI * 2;

export function initialState() {
	return { time: 0, player: { pos: vec3(0, 1, 0) } };
}

/** Advance the clock by dt seconds. Curried so it composes in a pipeline. */
const advanceClock = curry(function advanceClock(dt, state) {
	return { ...state, time: state.time + dt };
});

const movePlayer = curry(function movePlayer(input, state) {
	let velocity = vec3(input.direction.x, 0, -input.direction.y).scale(0.1);
	return {
		...state,
		player: {
			...state.player,
			pos: state.player.pos.add(velocity),
		},
	};
});

export function step(state, input, dt) {
	return pipe(advanceClock(dt), movePlayer(input))(state);
}

export function freezeState(state) {
	Object.freeze(state);
	return state;
}
