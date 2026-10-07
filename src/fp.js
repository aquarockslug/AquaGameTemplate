// Small Functional-Light helpers — the project's standard FP kit.
// Inspired by "Functional-Light JavaScript" by Kyle Simpson, but written fresh
// (the book is CC BY-NC-ND). Used by state.js; available to all game code.
// Conventions: use these in moderation, prefer readability (see AGENTS.md).

/**
 * Left-to-right function composition: pipe(f, g)(x) === g(f(x))
 * @param {...Function} fns
 * @returns {Function}
 */
export function pipe(...fns) {
	return function piped(value) {
		// copy so a later push/spread on fns can't change a composed function (book ch6)
		const list = [...fns];
		let result = value;
		for (const fn of list) result = fn(result);
		return result;
	};
}

/**
 * Right-to-left function composition: compose(f, g)(x) === f(g(x))
 * @param {...Function} fns
 * @returns {Function}
 */
export function compose(...fns) {
	return function composed(value) {
		const list = [...fns];
		let result = value;
		for (let i = list.length - 1; i >= 0; i--) result = list[i](result);
		return result;
	};
}

/**
 * Curry a function: collect arguments one at a time until arity is reached.
 * curry(f)(a)(b) === f(a, b)
 * @param {Function} fn
 * @param {number} [arity=fn.length]
 * @returns {Function}
 */
export function curry(fn, arity = fn.length) {
	return function curried(...args) {
		return args.length >= arity
			? fn(...args)
			: (...moreArgs) => curried(...args, ...moreArgs);
	};
}

/**
 * Partial application: fix leading arguments, supply the rest later.
 * partial(f, a)(b) === f(a, b)
 * @param {Function} fn
 * @param {...*} presetArgs
 * @returns {Function}
 */
export function partial(fn, ...presetArgs) {
	return function partiallyApplied(...laterArgs) {
		return fn(...presetArgs, ...laterArgs);
	};
}

/**
 * Adapt a function to exactly one argument (e.g. pass it to map safely).
 * @param {Function} fn
 * @returns {Function}
 */
export function unary(fn) {
	return function onlyOneArg(value) {
		return fn(value);
	};
}
