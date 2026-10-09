-- Authoritative player state. The server owns positions and nothing else: how
-- they are drawn is a pure function of each client's own clock, so it is never
-- sent over the wire.
--
-- Input is stored per player and integrated once per tick, never per message:
-- the client sends its current input direction as often as it likes (every
-- frame, say) and the rate at which it sends must not affect how fast it moves.
--
-- SPEED and ARENA_RADIUS MUST match src/state.js. If they drift, the server
-- keeps pulling the client's predicted avatar back and correction visibly
-- fights input.

local json = require "dkjson"

local Room = {}
Room.__index = Room

local TICK_RATE = 20
local SPEED = 6          -- world units per second
local ARENA_RADIUS = 14  -- players are clamped to this radius on the XZ plane

function Room:new()
  return setmetatable({
    players = {},   -- [id] = { id = n, x = 0, z = 0, ix = 0, iz = 0 }
    nextId = 1,
    tick = 0,
  }, self)
end

function Room:add()
  local id = self.nextId
  self.nextId = id + 1
  self.players[id] = { id = id, x = 0, z = 0, ix = 0, iz = 0 }
  return self.players[id]
end

function Room:remove(id)
  self.players[id] = nil
end

function Room:count()
  local n = 0
  for _ in pairs(self.players) do
    n = n + 1
  end
  return n
end

--- Record the client's latest input direction. Applied on the next tick.
-- @param player table the player table
-- @param x number input direction x, expected in [-1, 1]
-- @param z number input direction z, expected in [-1, 1]
function Room:setInput(player, x, z)
  local len = math.sqrt(x * x + z * z)
  if len > 1 then
    x, z = x / len, z / len
  end
  player.ix, player.iz = x, z
end

--- Integrate every player by one tick of its stored input.
function Room:advance()
  local dt = 1 / TICK_RATE
  for _, player in pairs(self.players) do
    player.x = player.x + player.ix * SPEED * dt
    player.z = player.z + player.iz * SPEED * dt

    -- keep players on the XZ plane inside the arena
    local r = math.sqrt(player.x * player.x + player.z * player.z)
    if r > ARENA_RADIUS then
      player.x = player.x * ARENA_RADIUS / r
      player.z = player.z * ARENA_RADIUS / r
    end
  end
end

--- Advance one tick and return the snapshot payload for that tick.
-- @return string a JSON snapshot message
function Room:snapshot()
  self:advance()
  self.tick = self.tick + 1
  local list = {}
  for id, player in pairs(self.players) do
    list[#list + 1] = { id, player.x, player.z }
  end
  return json.encode({ t = "s", tick = self.tick, p = list })
end

return Room
