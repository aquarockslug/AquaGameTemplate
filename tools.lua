#!/usr/bin/env lua
-- lua tools.lua <dev|build|serve|install> [port|version]  (defaults: 8000, 0.28.2)

local a = arg
local here = ((a[0] or "tools.lua"):match("^(.*)[/\\]") or "."):gsub("/%.$", "")
if here:sub(1, 1) ~= "/" then here = (io.popen "pwd"):read("*l") .. "/" .. here:gsub("^%./", "") end
here = here:gsub("/+$", ""); if here == "" then here = "/" end
local sh        = function(c) return "cd '" .. here:gsub("'", "'\\''") .. "' && " .. c end -- always run from repo root
local run       = function(c)
	local r = os.execute(c)
	return r == true or r == 0
end
local die       = function(c, m)
	if not run(c) then
		io.stderr:write(m .. "\n")
		os.exit(1)
	end
end
local E         = sh "vendor/esbuild"
local require_e = function() die(sh "test -x vendor/esbuild", "esbuild missing; run: lua tools.lua install") end
local FLAGS     = " src/main.js --bundle --format=esm --sourcemap --asset-names=assets/[name]-[hash]" ..
    " --loader:.png=file --loader:.jpg=file --loader:.mp3=file --loader:.ogg=file --loader:.wasm=file"

-- build: minified production bundle in dist/
local function build()
	require_e()
	die(sh("rm -rf dist && " .. E .. FLAGS .. " --minify --define:PRODUCTION=true --outdir=dist" ..
		" && cp index.html dist/index.html && touch dist/.nojekyll"), "build failed")
	print "Build complete -> dist/"
end

-- dev: live-reload dev server
local function dev(p)
	require_e()
	die(sh("rm -rf dist && mkdir -p dist && cp index.html dist/index.html"), "setup failed")
	os.execute(E .. FLAGS .. " --define:PRODUCTION=false --outdir=dist --serve=" .. p ..
		" --servedir=dist --watch=forever")
end

-- serve: serve an existing build
local function serve(p)
	die(sh "test -d dist", "dist/ missing; run: lua tools.lua build first")
	os.execute(E .. " --servedir=dist --serve=" .. p)
end

-- install [v]: download dependencies
local function install(esb_v)
	esb_v = esb_v or "0.28.2"
	local s, m = (io.popen "uname -s"):read("*l"), (io.popen "uname -m"):read("*l")
	local pkg = s == "Darwin" and (m == "arm64" and "darwin-arm64" or "darwin-x64")
	    or s == "Linux" and (m == "x86_64" or m == "amd64") and "linux-x64"
	    or s == "Linux" and (m == "aarch64" or m == "arm64") and "linux-arm64"
	    or (s:match "^MINGW" or s:match "^MSYS" or s:match "^CYGWIN") and "win32-x64"
	if not pkg then
		io.stderr:write("Unsupported platform: " .. s .. " " .. m .. "\n")
		os.exit(1)
	end
	local exe = pkg:match "^win" and "esbuild.exe" or "bin/esbuild"
	local eu = "https://registry.npmjs.org/@esbuild/" .. pkg .. "/-/" .. pkg .. "-" .. esb_v .. ".tgz"
	-- latest LittleJS release tag (fall back to a known version if the API call fails)
	local f = io.popen "curl -s --max-time 20 https://api.github.com/repos/KilledByAPixel/LittleJS/releases/latest"
	local tag = (f and f:read "*a" or ""):match('"tag_name"%s*:%s*"([^"]+)"') or "v1.19.3"
	if f then f:close() end
	local lu = "https://github.com/KilledByAPixel/LittleJS/releases/download/" .. tag ..
	    "/LittleJS-" .. tag:gsub("^[Vv]", "") .. ".zip"
	print("Downloading esbuild " .. esb_v .. " + LittleJS " .. tag)
	die(sh("mkdir -p vendor && curl -L --fail -o /tmp/esbuild.tgz " .. eu ..
		" && tar -xzf /tmp/esbuild.tgz -C vendor --strip-components=2 package/" .. exe ..
		" && curl -L --fail -o /tmp/littlejs.zip " .. lu ..
		" && unzip -p /tmp/littlejs.zip dist/littlejs.esm.js > /tmp/littlejs.esm.js" ..
		" && mv -f /tmp/littlejs.esm.js vendor/littlejs.esm.js" ..
		" && chmod +x vendor/esbuild && rm -f /tmp/esbuild.tgz /tmp/littlejs.zip"), "install failed")
end

local c, p = a[1], a[2]
if c == "dev" then
	dev(p or "8000")
elseif c == "build" then
	build()
elseif c == "serve" then
	serve(p or "8000")
elseif c == "install" then
	install(p)
else
	print "Usage: lua tools.lua <dev|build|serve|install> [port|version]"
	os.exit(c and 1 or 0)
end

