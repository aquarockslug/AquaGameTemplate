/** Functional-Light helpers — the project's FP kit (use in moderation, see AGENTS.md). */

/**
 * Left-to-right composition: pipe(f, g)(x) === g(f(x)).
 * @param {...Function} fns
 * @returns {Function}
 */
export const pipe =
	(...fns) =>
	(value) =>
		fns.reduce((result, fn) => fn(result), value);

/**
 * Right-to-left composition: compose(f, g)(x) === f(g(x)).
 * @param {...Function} fns
 * @returns {Function}
 */
export const compose =
	(...fns) =>
	(value) =>
		fns.reduceRight((result, fn) => fn(result), value);

/**
 * Curry a function: collect arguments until arity is reached.
 * curry(f)(a)(b) === f(a, b)
 * @param {Function} fn
 * @param {number} [arity=fn.length]
 * @returns {Function}
 */
export const curry = (fn, arity = fn.length) =>
	function curried(...args) {
		return args.length >= arity ? fn(...args) : (...more) => curried(...args, ...more);
	};

/**
 * Partial application: fix leading arguments, supply the rest later.
 * partial(f, a)(b) === f(a, b)
 * @param {Function} fn
 * @param {...*} presetArgs
 * @returns {Function}
 */
export const partial =
	(fn, ...presetArgs) =>
	(...laterArgs) =>
		fn(...presetArgs, ...laterArgs);

/**
 * Adapt a function to exactly one argument (e.g. pass it to map safely).
 * @param {Function} fn
 * @returns {Function}
 */
export const unary = (fn) => (value) => fn(value);
