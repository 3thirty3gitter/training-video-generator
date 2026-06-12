#!/bin/sh
# Container entrypoint: fixed virtual display + VNC streaming + Next.js
#
# - Xvfb on :99 (fixed, matches browser-session.ts ensureDisplay)
# - x11vnc exposes the display so the interactive wizard browser can be
#   seen and controlled remotely
# - websockify serves noVNC on :6080 (proxied by nginx at /vnc/, behind auth)
set -e

export DISPLAY=:99

# Clear stale Chromium profile locks: the profile lives in a persistent
# volume, and a previous container's Chrome leaves SingletonLock stamped
# with the old hostname, blocking launches in the new container.
rm -f /app/.puppeteer_data/Singleton* 2>/dev/null || true

Xvfb :99 -screen 0 1920x1080x24 -ac &

# Wait for the display to accept connections
i=0
while [ $i -lt 20 ]; do
    if xdpyinfo -display :99 >/dev/null 2>&1; then
        break
    fi
    i=$((i + 1))
    sleep 0.5
done

# VNC server attached to the virtual display (internal only; auth at nginx)
x11vnc -display :99 -nopw -forever -shared -rfbport 5900 -quiet -bg

# noVNC web client + websocket bridge
websockify --web /usr/share/novnc 6080 localhost:5900 &

exec node node_modules/next/dist/bin/next start -p 3456
