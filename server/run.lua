#!/usr/bin/env lua5.4
-- Launch the multiplayer WebSocket server (replaces server/run.sh).
--
-- Must run on Lua 5.4: lua-pegasus-websocket assigns to a for-loop variable,
-- which Lua 5.5 makes const, so the plugin fails to load there. If started by
-- whatever `lua` is on PATH (often 5.5), we re-exec under `lua5.4` first.
--
-- Also preloads a pure-Lua `bit` into package.loaded before anything else,
-- because luabitop will not compile against these Lua headers and
-- lua-websockets requires `bit`.
--
-- Before starting, stale servers are killed: anything already listening on our
-- TCP port (the usual cause of "address already in use" on a restart) plus any
-- other instance of this same server script, whichever port it picked. Neither
-- ourselves nor the parent that re-exec'd us into 5.4 is ever touched.

-- ---------------------------------------------------------------------------
-- process identity + paths (needed before the 5.5 -> 5.4 re-exec below)

local function selfPid()
  local f = io.open("/proc/self/stat")
  if not f then return "" end
  local line = f:read("*l") or ""
  f:close()
  return line:match("^%d+") or ""
end

local SELF = selfPid()

--- Parent PID from /proc/<pid>/stat (field 4, after the "(comm)" token).
local function parentPid(pid)
  local f = io.open("/proc/" .. pid .. "/stat")
  if not f then return "" end
  local stat = f:read("*l") or ""
  f:close()
  local commEnd = select(2, stat:find("%)%s"))
  local rest = commEnd and stat:sub(commEnd + 1) or ""
  local i = 0
  for tok in rest:gmatch("%S+") do
    i = i + 1
    if i == 2 then return tok end -- fields after comm: state, ppid, ...
  end
  return ""
end

local PARENT = parentPid(SELF)

local script = arg[0] or "server/run.lua"
local cwd = (io.popen("pwd"):read("*l") or "")
local absScript = script:sub(1, 1) == "/" and script or (cwd .. "/" .. script)
local serverDir = absScript:match("^(.*)[/\\][^/\\]*$") or cwd
local root = serverDir:match("^(.*)[/\\][^/\\]*$") or cwd -- repo root

-- Must be Lua 5.4 (see header); relay into `lua5.4` when it isn't.
if _VERSION ~= "Lua 5.4" then
  if not (os.execute("command -v lua5.4 >/dev/null 2>&1") == true) then
    io.stderr:write("server/run.lua needs Lua 5.4; install it, then run: lua5.4 server/run.lua [port]\n")
    os.exit(1)
  end
  local q = function(s) return '"' .. s:gsub("\\", "\\\\"):gsub('"', '\\"') .. '"' end
  local args = { q(absScript) }
  for i = 1, #arg do args[#args + 1] = q(arg[i]) end
  os.execute("lua5.4 " .. table.concat(args, " "))
  os.exit() -- the child is the real server; we are just a 5.5->5.4 relay
end

local function shok(ok) return ok == true or ok == 0 end

-- ---------------------------------------------------------------------------
-- LuaRocks + the two Lua sources expected beside this repo (see tools.lua's
-- `install`). Override with PEGASUS_DIR / WSPLUGIN_DIR.

local pegasusDir  = os.getenv("PEGASUS_DIR")  or root .. "/../pegasus.lua"
local wspluginDir = os.getenv("WSPLUGIN_DIR") or root .. "/../lua-pegasus-websocket"

for _, dir in ipairs { pegasusDir, wspluginDir } do
  if not shok(os.execute("test -d '" .. dir .. "'")) then
    io.stderr:write("multiplayer server: missing Lua source " .. dir .. "\n")
    io.stderr:write("set PEGASUS_DIR and WSPLUGIN_DIR, or clone them beside this repo\n")
    os.exit(1)
  end
end

local f = io.popen("luarocks path --lua-version=5.4")
local rocks = f and (f:read("*a") or "") or ""
if f then f:close() end

package.path = root .. "/?.lua;" .. pegasusDir .. "/src/?.lua;" ..
  pegasusDir .. "/src/?/init.lua;" .. wspluginDir .. "/src/?.lua;" ..
  (rocks:match("LUA_PATH='([^']*)'") or package.path)
package.cpath = rocks:match("LUA_CPATH='([^']*)'") or package.cpath

-- ---------------------------------------------------------------------------
-- kill any other server, then take over the port

local port = tonumber(arg[1]) or 8080

local function killOtherServers()
  local pids = {}

  -- everything already listening on our port (the usual restart failure:
  -- a stale server still bound, so socket.bind would report address in use)
  local f = io.popen("lsof -tiTCP:" .. port .. " -sTCP:LISTEN 2>/dev/null")
  local out = f and (f:read("*a") or "") or ""
  if f then f:close() end
  if out ~= "" then
    for pid in out:gmatch("%d+") do pids[pid] = true end
  else -- lsof missing or empty: parse `ss` instead
    f = io.popen("ss -ltnp 'sport = :" .. port .. "' 2>/dev/null")
    out = f and (f:read("*a") or "") or ""
    if f then f:close() end
    for pid in out:gmatch("pid=(%d+)") do pids[pid] = true end
  end

  -- any other instance of this same server script, on whichever port
  f = io.popen("pgrep -f 'server/run\\.lua|server/main\\.lua' 2>/dev/null")
  out = f and (f:read("*a") or "") or ""
  if f then f:close() end
  for pid in out:gmatch("%d+") do pids[pid] = true end

  -- never ourselves, and never the parent that re-exec'd us into 5.4
  pids[SELF] = nil
  pids[PARENT] = nil

  local killed = {}
  for pid in pairs(pids) do
    if shok(os.execute("kill -KILL " .. pid .. " 2>/dev/null")) then
      killed[#killed + 1] = pid
    end
  end
  if #killed > 0 then
    table.sort(killed)
    print("killed stale server(s) on port " .. port .. ": " .. table.concat(killed, ","))
  end
end

killOtherServers()

-- ---------------------------------------------------------------------------
-- start the server (mirrors the old run.sh exec line, in-process this time)

package.loaded["bit"] = require("pegasus.plugins.websocket.bit")
dofile(root .. "/server/main.lua")