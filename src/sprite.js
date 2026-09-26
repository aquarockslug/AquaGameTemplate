import * as l from "../vendor/littlejs.esm.js";

// biome-ignore format: un-prefix frequently used littlejs functions
const { vec3, rand, PI, sin } = l;

/** A bobbing billboard sprite from a tile */
export class Sprite extends l.EngineObject3D {
	constructor(pos, tileInfo, color) {
		super(pos, undefined, tileInfo, color); // billboard with no mesh
		this.size3D = vec3(2);
		this.softShadow = 2;
		this.phase = rand(2 * PI);
		this.pixelated = true;
		this.bob = true;
	}
	update() {
		if (this.bob) this.pos3D.y = 2 + sin((l.time + this.phase) * 2) * 0.5; // bob up and down
	}
}
