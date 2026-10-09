-- Multiplayer WebSocket server for the AquaGameTemplate game.
--
-- Speaks JSON text frames (see README / the protocol table below):
--   server -> client  {"t":"welcome","id":3}
--   client -> server  {"t":"in","x":0.5,"z":-0.3}
--   server -> all     {"t":"s","tick":120,"p":[[id,x,z],...]}
--
-- Protocol notes that are easy to get wrong with this stack:
--
--  * pegasus master has no request:is_upgrade() / response:upgrade(), which
--    the lua-pegasus-websocket README assumes, so the upgrade is driven here
--    by hand: detect the header, then call the plugin's processUpgrade.
--
--  * Response:sendOnlyHeaders() is broken for upgrades in this pegasus
--    version. It sends the headers and then calls write('\r\n'), and write()
--    with no stayOpen closes the client socket -- so the socket dies right
--    after the 101. Even with that fixed, the stray '\r\n' arrives at the
--    browser as a bogus 0x0D frame and it drops the connection with
--    "Invalid opcode received". The override below sends the headers only.

local socket        = require "socket"
local copas         = require "copas"
local json          = require "dkjson"
local Handler       = require "pegasus.handler"
local WebSocketBase = require "pegasus.plugins.websocket"
local WebSocketSync = require "websocket.client_copas"
local Room          = require "server.room"

local PORT = tonumber(arg and arg[1]) or 8080
local SUBPROTOCOL = "game"
local TICK_RATE = 20

local room = Room:new()
local clients = {} -- [ws] = player

local plugin = WebSocketBase:new { protocols = { SUBPROTOCOL } }

--- Wrap a raw upgraded socket as a server-side WebSocket.
local function wrap(client)
  local ws = WebSocketSync()
  ws.sock = client
  ws.state = "OPEN"
  ws.is_server = true
  return ws
end

--- pegasus Response:sendOnlyHeaders() replacement, safe for a 101 upgrade.
local function upgradeSafeSendOnlyHeaders(self)
  self:sendHeaders(false, "")
  self._headersSended = true
  self._isClosed = false
  return self
end

--- Send a JSON message, dropping the client if the socket has gone away.
local function send(ws, message)
  local ok, err = ws:send(message)
  if not ok then
    clients[ws] = nil
    return false, err
  end
  return true
end

--- Per-connection coroutine: read input until the socket closes.
local function serve(ws)
  local player = room:add()
  clients[ws] = player
  print(string.format("join  id=%d  clients=%d", player.id, room:count()))

  send(ws, json.encode { t = "welcome", id = player.id })

  while true do
    local frame, opcode = ws:receive()
    if not frame then
      break
    end
    if opcode == 1 then -- TEXT
      local msg = json.decode(frame)
      if type(msg) == "table" and msg.t == "in" then
        room:setInput(player, tonumber(msg.x) or 0, tonumber(msg.z) or 0)
      end
    end
  end

  clients[ws] = nil
  room:remove(player.id)
  print(string.format("leave id=%d  clients=%d", player.id, room:count()))
end

--- Broadcast a snapshot every tick. A separate coroutine so that reading a
--- client's input never delays the tick loop.
copas.addthread(function()
  while true do
    copas.sleep(1 / TICK_RATE)
    local snapshot = room:snapshot()
    for ws, player in pairs(clients) do
      if not send(ws, snapshot) then
        -- send() already dropped the client; finish removing the player here
        -- because its own coroutine is blocked reading a dead socket
        clients[ws] = nil
        room:remove(player.id)
      end
    end
  end
end)

local handler = Handler:new(function(request, response)
  request:headers()
  request:receiveBody()
  response.sendOnlyHeaders = upgradeSafeSendOnlyHeaders

  local headers = request:headers()
  local upgrade = headers["Upgrade"]
  if upgrade and upgrade:lower():find("websocket", 1, true) then
    local protocol, client = plugin:processUpgrade(request, response)
    if protocol == "websocket" and client then
      return serve(wrap(client))
    end
    if client then
      client:close()
    end
    return
  end

  response:addHeader("Content-Type", "text/plain")
  response:write("multiplayer server; connect with a websocket\n")
end, '') -- no static file serving: esbuild's dev server owns the game itself

local server = assert(socket.bind("*", PORT))
copas.addserver(server, copas.handler(function(skt)
  handler:processRequest(PORT, skt)
end))

print(string.format("Multiplayer server on ws://localhost:%d/ws (subprotocol %q, %d Hz)",
  PORT, SUBPROTOCOL, TICK_RATE))
copas.loop()
