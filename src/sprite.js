import * as l from "../vendor/littlejs.esm.js";

// biome-ignore format: un-prefix frequently used littlejs functions
const { vec3 } = l;

/** A billboard sprite from a tile. A pure view: game state drives where it is (see state.js) */
export class Sprite extends l.EngineObject3D {
	constructor(pos, tileInfo, color) {
		super(pos, undefined, tileInfo, color); // billboard with no mesh
		this.size3D = vec3(2);
		this.softShadow = 2;
		this.pixelated = true;
	}
}

/**
 * A player's avatar. Used for both the local player and every remote one; the
 * shell only ever repositions it from pure state (state.js / players.js), so
 * update() stays empty. `playerId` is the server-assigned id, or null offline.
 */
export class Player extends Sprite {
	constructor(pos, tileInfo, color) {
		super(pos, tileInfo, color);
		this.playerId = null;
	}

	/** Place the avatar at an XZ position, keeping its height. */
	setPose(x, z) {
		this.pos3D = vec3(x, this.pos3D.y, z);
	}

	update() {}
}
