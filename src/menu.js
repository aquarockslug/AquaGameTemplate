/** HTML menu shell — the only file that touches the menu DOM (see AGENTS.md). */

/** Longest username the menu accepts; server/room.lua clamps to the same. */
export const USERNAME_MAX = 16;

const element = (id) => document.getElementById(id);

let open = true;

/** @returns {boolean} whether the menu overlay is currently shown. */
export const isOpen = () => open;

/** Show or hide the menu overlay. Opening it focuses the username field. */
export function setOpen(value) {
	open = value;
	element("menu").style.visibility = value ? "visible" : "hidden";
	if (value) element("input_username").focus();
}

/** Collapse whitespace and clamp a raw username, so an empty field still yields a playable name. */
export function cleanUsername(raw) {
	const name = String(raw ?? "")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, USERNAME_MAX);
	return name || "Player";
}

/**
 * Wire the menu's controls and show it.
 * @param {{username: string, onStart: (username: string) => void}} config
 */
export function initMenu({ username, onStart }) {
	const input = element("input_username");
	input.value = username;

	element("button_start").onclick = () => {
		const name = cleanUsername(input.value);
		input.value = name;
		setOpen(false);
		onStart(name);
	};

	// Enter in the field is the same as clicking Play
	input.onkeydown = (event) => {
		if (event.key === "Enter") element("button_start").click();
	};

	setOpen(true);
}
