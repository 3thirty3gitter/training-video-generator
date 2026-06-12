# =========================================================================
# Training Video Generator - VPS/Web deployment image
#
# Includes:
#   - Chromium (system) for Puppeteer capture/recording
#   - FFmpeg/FFprobe (system) for video stitching and TTS post-processing
#   - Xvfb virtual display so non-headless browser launches don't crash
#
# NOT included (optional features):
#   - Python + kokoro_onnx (Kokoro TTS voices) - Google/Edge TTS still work
# =========================================================================

# ---------- Build stage ----------
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Puppeteer: don't download Chrome during npm install (we use system Chromium)
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    FFMPEG_PATH=/usr/bin/ffmpeg \
    FFPROBE_PATH=/usr/bin/ffprobe

# System deps: browser, video tooling, virtual display + VNC streaming, fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
        chromium \
        ffmpeg \
        xvfb \
        xauth \
        x11-utils \
        x11vnc \
        novnc \
        websockify \
        ca-certificates \
        fonts-liberation \
        fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

# Production node_modules only
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev && npm cache clean --force

# Built app + runtime files
COPY --from=builder /app/.next ./.next
COPY public ./public
COPY src ./src
COPY next.config.js ./
COPY generate_kokoro.py ./
COPY project_data.json ./
COPY deploy/entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 3456 6080

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3456').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Fixed display :99 + x11vnc/noVNC streaming + Next.js (see deploy/entrypoint.sh)
CMD ["/entrypoint.sh"]
