#!/bin/sh
# Start the multiplayer WebSocket server.
#
# Must run on Lua 5.4: lua-pegasus-websocket assigns to a for-loop variable,
# which Lua 5.5 makes const, so the plugin fails to load there.
#
# Also preloads a pure-Lua `bit` into package.loaded before anything else,
# because luabitop will not compile against these Lua headers and
# lua-websockets requires `bit`.

set -e
cd "$(dirname "$0")/.."

eval "$(luarocks path --lua-version=5.4)"

# The two Lua sources this server needs are expected beside this repo by
# default (e.g. ~/Projects/online/pegasus.lua). Override with PEGASUS_DIR /
# WSPLUGIN_DIR if they live somewhere else.
REPOS="$(cd .. && pwd)"
PEGASUS_DIR="${PEGASUS_DIR:-$REPOS/pegasus.lua}"
WSPLUGIN_DIR="${WSPLUGIN_DIR:-$REPOS/lua-pegasus-websocket}"

for dir in "$PEGASUS_DIR" "$WSPLUGIN_DIR"; do
  if [ ! -d "$dir" ]; then
    echo "multiplayer server: missing Lua source $dir" >&2
    echo "set PEGASUS_DIR and WSPLUGIN_DIR, or clone them beside this repo" >&2
    exit 1
  fi
done

LUA_PATH="$PWD/?.lua;$PEGASUS_DIR/src/?.lua;$PEGASUS_DIR/src/?/init.lua;$WSPLUGIN_DIR/src/?.lua;$LUA_PATH"
export LUA_PATH LUA_CPATH

exec lua5.4 -e "package.loaded['bit'] = require('pegasus.plugins.websocket.bit'); dofile('server/main.lua')" "$@"
