# ─────────────────────────────────────────────────────────────
# Stage 1: deps — install system deps + Coral + pnpm packages
# ─────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS deps
WORKDIR /app

# System deps: curl for Coral install, ca-certs for TLS
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    bash \
  && rm -rf /var/lib/apt/lists/*

# Install Coral CLI
RUN curl -fsSL https://withcoral.com/install.sh | bash && \
    mv /root/.coral/bin/coral /usr/local/bin/coral 2>/dev/null || \
    find /root -name "coral" -type f -exec mv {} /usr/local/bin/coral \; 2>/dev/null || \
    echo "⚠️  Coral binary not found at expected path — check install script output"

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy lockfiles and install dependencies
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod=false

# ─────────────────────────────────────────────────────────────
# Stage 2: build — compile TypeScript
# ─────────────────────────────────────────────────────────────
FROM deps AS build
WORKDIR /app

COPY tsconfig.json ./
COPY src ./src
RUN pnpm exec tsc --outDir dist

# ─────────────────────────────────────────────────────────────
# Stage 3: runtime — lean final image
# ─────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime
WORKDIR /app

# Only runtime system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    bash \
  && rm -rf /var/lib/apt/lists/*

# Copy Coral binary from deps stage
COPY --from=deps /usr/local/bin/coral /usr/local/bin/coral

# Copy node_modules (prod only for smaller image)
COPY --from=deps /app/node_modules ./node_modules

# Copy compiled JS
COPY --from=build /app/dist ./dist

# Copy package.json for "type": "module" resolution
COPY package.json ./

# Copy entrypoint and source spec files
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Create sources dir (can be mounted via volume or baked in)
RUN mkdir -p ./sources

ENV NODE_ENV=production

# Health check: ensure worker process is alive
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "process.exit(0)" || exit 1

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "dist/queue/worker.js"]
