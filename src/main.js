import * as l from "../vendor/littlejs.esm.js";
import favicon from "../assets/favicon.png";
import textureURL from "../assets/textures.png";
import textureDataURL from "../assets/textures.json";

// biome-ignore format: un-prefix frequently used littlejs functions
const { vec2, vec3, hsl, rand, PI, sin, drawTile, drawText } = l;

// a map of frame name to TileInfo
let textures;

if (!PRODUCTION) {
	l.setDebugWatermark(false);
	window.l = l;
	// reload on rebuild when developing
	new EventSource("/esbuild").addEventListener("change", () => location.reload());
}

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
		this.bob = true;
	}
	update() {
		if (this.bob) this.pos3D.y = 2 + sin((l.time + this.phase) * 2) * 0.5; // bob up and down
	}
}

// -----------------------------------------------------------------------------------------------------

async function gameInit() {
	textures = l.loadAtlas(textureURL, textureDataURL);
	await l.spritesReady();

	new l.Render3DPlugin();
	l.render3D.setSky(hsl(0.65, 0.5, 0.15), hsl(0.8, 0.4, 0.3), hsl(0.65, 0.4, 0.1));
	l.render3D.setFog(15, 40);
	l.render3D.ambientColor = hsl(0.6, 0.2, 0.5);
	new l.CameraControl3D(vec3(), 15, 0.5, 0.003);
	new l.EngineObject3D(vec3(), l.buildGrid(vec2(30), 1, hsl(0.8, 0.2, 0.3))); // floor
	new l.EngineObject3D(vec3(0, 2, 0), l.buildBox(2).setColor(hsl(0, 0, 0.7))); // cube

	const frames = ["000", "001", "002"].map((name) => textures[name]);
	for (let i = 12; i--; ) {
		const frame = frames[i % frames.length];
		new Sprite(vec3(7, 2).rotateY((i / 12) * 2 * PI), frame, hsl(i / 12, 0.8, 0.7));
	}

	const logo = new Sprite(vec3(0, 6), textures.logo, hsl(0, 0, 1));
	logo.size3D = vec3(4, (4 * 100) / 132, 2); // keep the 132x100 frame's aspect ratio
	logo.softShadow = 0;
	logo.bob = false;
}

function gameUpdate() {}
function gameUpdatePost() {}
function gameRender() {}
function gameRenderPost() {}

l.engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost);
