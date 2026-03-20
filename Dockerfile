FROM node:20-slim AS base

# Install system dependencies for Puppeteer, FFmpeg, and Python (Kokoro TTS)
RUN apt-get update && apt-get install -y \
    chromium \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libgbm1 \
    libasound2 \
    libxss1 \
    libgtk-3-0 \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NEXT_TELEMETRY_DISABLED=1

# ---- deps stage ----
FROM base AS deps
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm ci --legacy-peer-deps

# ---- build stage ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- production stage ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built artifacts
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/src/lib/export-template.html ./src/lib/export-template.html
COPY --from=builder /app/src/lib/tts-worker.js ./src/lib/tts-worker.js
COPY --from=builder /app/generate_kokoro.py ./generate_kokoro.py

# Create writable directories for runtime artifacts
RUN mkdir -p public/audio/narration public/audio/recordings public/recordings public/exports/videos public/music && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000
ENV PORT=3000 \
    HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
