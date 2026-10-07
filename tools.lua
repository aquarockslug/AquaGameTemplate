#!/usr/bin/env lua
-- lua tools.lua <dev|build|serve|install> [port|version]
-- dev starts esbuild + Chrome with remote debugging (CDP)

local cfg = {
	port = "8000",
	cdp = "9222",         -- Chrome DevTools port
	esbuild = "0.28.2",   -- pinned esbuild version
	littlejs = "v1.25.0", -- fallback LittleJS tag when GitHub is unreachable
	entry = "src/main.js",
	out = "dist",
	html = "index.html",
	vendor = "vendor",
	exts = "png jpg mp3 ogg wasm json", -- bundled as files
	target = "",         -- optional esbuild target, e.g. "es2020"
	chrome = "google-chrome-stable --no-first-run --no-default-browser-check",
	profile = "/tmp/opencode/aquagametemplate-chrome",
}

local a    = arg
local root = (a[0] or "tools.lua"):match("^(.*)[/\\]") or "."
local sh   = function(c) return "cd '" .. root .. "' && " .. c end
local function run(c, m)
	local r = os.execute(c)
	if not (r == true or r == 0) then io.stderr:write((m or "command failed") .. "\n") os.exit(1) end
end
local function get(u)
	local f = io.popen("curl -s --max-time 20 '" .. u .. "'")
	local t = f and f:read "*a" or ""
	if f then f:close() end
	return t
end

local bin, loaders = cfg.vendor .. "/esbuild", ""
for e in cfg.exts:gmatch "%S+" do loaders = loaders .. " --loader:." .. e .. "=file" end
local E = "test -x " .. bin .. " || { echo 'esbuild missing; run: lua tools.lua install' >&2; exit 1; }; " .. bin
local B = E .. " " .. cfg.entry .. " --bundle --format=esm --sourcemap --asset-names=assets/[name]-[hash]"
	.. loaders .. (cfg.target ~= "" and " --target=" .. cfg.target or "")
local copy = "cp " .. cfg.html .. " " .. cfg.out .. "/" .. cfg.html

local function build() -- minified production bundle
	run(sh("rm -rf " .. cfg.out .. " && " .. B .. " --minify --define:PRODUCTION=true --outdir=" .. cfg.out ..
		" && " .. copy .. " && touch " .. cfg.out .. "/.nojekyll"), "build failed")
	print("Build complete -> " .. cfg.out .. "/")
end

local function dev(p) -- live-reload dev server + Chrome DevTools (CDP)
	run(sh("rm -rf " .. cfg.out .. " && mkdir -p " .. cfg.out .. " && " .. copy), "setup failed")
	os.execute("curl -sf localhost:" .. cfg.cdp .. "/json/version >/dev/null 2>&1 || " .. cfg.chrome ..
		" --remote-debugging-port=" .. cfg.cdp .. " --remote-allow-origins=* --user-data-dir=" .. cfg.profile ..
		" http://localhost:" .. p .. " >/dev/null 2>&1 &")
	print("Dev server http://localhost:" .. p .. "  |  DevTools http://localhost:" .. cfg.cdp)
	run(sh(B .. " --define:PRODUCTION=false --outdir=" .. cfg.out .. " --serve=" .. p ..
		" --servedir=" .. cfg.out .. " --watch=forever"), "dev failed")
end

local function serve(p) -- serve an existing build
	run(sh("test -d " .. cfg.out), cfg.out .. "/ missing; run: lua tools.lua build first")
	run(sh(E .. " --servedir=" .. cfg.out .. " --serve=" .. p))
end

local function install(v) -- download esbuild + LittleJS into vendor/
	v = v or cfg.esbuild
	local s, m = (io.popen "uname -s"):read "*l", (io.popen "uname -m"):read "*l"
	local plat = ({ Linux = "linux", Darwin = "darwin" })[s]
	local arch = ({ x86_64 = "x64", amd64 = "x64", arm64 = "arm64", aarch64 = "arm64" })[m]
	local pkg = s:match "^[MCY]" and "win32-x64" or plat and arch and plat .. "-" .. arch
	if not pkg then io.stderr:write("Unsupported platform: " .. s .. " " .. m .. "\n") os.exit(1) end
	local tag = (get "https://api.github.com/repos/KilledByAPixel/LittleJS/releases/latest")
		:match('"tag_name"%s*:%s*"([^"]+)"') or cfg.littlejs
	local eu = "https://registry.npmjs.org/@esbuild/" .. pkg .. "/-/" .. pkg .. "-" .. v .. ".tgz"
	local lu = "https://github.com/KilledByAPixel/LittleJS/releases/download/" .. tag ..
		"/LittleJS-" .. tag:gsub("^[Vv]", "") .. ".zip"
	print("Downloading esbuild " .. v .. " + LittleJS " .. tag)
	run(sh("mkdir -p " .. cfg.vendor .. " && cd " .. cfg.vendor ..
		" && curl -Lsf -o e.tgz " .. eu .. " && tar -xzf e.tgz --strip-components=2 package/" ..
		(pkg:match "^win" and "esbuild.exe" or "bin/esbuild") ..
		" && curl -Lsf -o lj.zip " .. lu ..
		" && unzip -p lj.zip dist/littlejs.esm.js > littlejs.esm.js" ..
		" && chmod +x esbuild && rm -f e.tgz lj.zip"), "install failed")
end

local c, p = a[1], a[2]
if c == "dev" then dev(p or cfg.port)
elseif c == "build" then build()
elseif c == "serve" then serve(p or cfg.port)
elseif c == "install" then install(p)
else print "Usage: lua tools.lua <dev|build|serve|install> [port|version]" os.exit(c and 1 or 0) end
