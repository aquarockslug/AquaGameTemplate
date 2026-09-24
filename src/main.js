import * as l from "../vendor/littlejs.esm.js";
import favicon from "../assets/favicon.png";
import tilesURL from "../assets/tiles.png";

// biome-ignore format: un-prefix frequently used littlejs functions
const { vec2, vec3, tile, hsl, rand, PI, sin, drawTile, drawText } = l;

// reload on rebuild when developing
if (!PRODUCTION) new EventSource("/esbuild").addEventListener("change", () => location.reload());

// favicon can't be referenced from index.html, so it's imported and injected here
const link = document.createElement("link");
link.rel = "icon";
link.href = favicon;
document.head.append(link);

// -----------------------------------------------------------------------------------------------------

class Sprite extends l.EngineObject3D {
	constructor(pos, tileInfo, color) {
		super(pos, undefined, tileInfo, color); // billboard with no mesh
		this.size3D = vec3(2);
		this.softShadow = 2;
		this.phase = rand(2 * PI);
		this.pixelated = true;
	}
	update() {
		// l.time is a live binding that changes every frame; read it at use time
		this.pos3D.y = 2 + sin((l.time + this.phase) * 2) * 0.5; // bob up and down
	}
}

// -----------------------------------------------------------------------------------------------------

function gameInit() {
	new l.Render3DPlugin();
	l.render3D.setSky(hsl(0.65, 0.5, 0.15), hsl(0.8, 0.4, 0.3), hsl(0.65, 0.4, 0.1));
	l.render3D.setFog(15, 40);
	l.render3D.ambientColor = hsl(0.6, 0.2, 0.5);
	new l.CameraControl3D(vec3(), 15, 0.5, 0.003);
	new l.EngineObject3D(vec3(), l.buildGrid(vec2(30), 1, hsl(0.8, 0.2, 0.3))); // floor
	new l.EngineObject3D(vec3(0, 2, 0), l.buildBox(2).setColor(hsl(0, 0, 0.7))); // cube
	for (
		let i = 12;
		i--; // ring of sprites from the tile sheet
	)
		new Sprite(vec3(7, 2).rotateY((i / 12) * 2 * PI), tile(i % 4, 16), hsl(i / 12, 0.8, 0.7));
}

function gameUpdate() {}
function gameUpdatePost() {}
function gameRender() {}
function gameRenderPost() {}

l.engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, [tilesURL]);
