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

export class Player extends Sprite {
	constructor(pos, tileInfo) {
		super(pos, tileInfo);
	}
	update() {}
}
