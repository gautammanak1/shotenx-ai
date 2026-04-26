# Default image for hosts that only look for ./Dockerfile at repo root (Render “Docker”
# without Blueprint rootDir, Railway, etc.). Monorepo: canonical files live in frontend/.
# Prefer: Render Blueprint (render.yaml) with rootDir: frontend, dockerfilePath: ./Dockerfile

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ .
RUN mkdir -p public
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_BACKEND_URL=http://backend:8080
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ca-certificates \
    gcc \
    g++ \
  && ln -sf /usr/bin/python3 /usr/bin/python \
  && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir --break-system-packages \
    --default-timeout=120 --retries=5 \
    uagents \
    uagents-core \
    requests \
  && rm -rf /root/.cache/pip

RUN groupadd --gid 1001 nodejs \
  && useradd --uid 1001 --gid nodejs --no-create-home --home-dir /nonexistent nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/uagent-client ./node_modules/uagent-client

USER nextjs
EXPOSE 3000
EXPOSE 8000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV UAGENT_BRIDGE_PORT=8000

CMD ["sh", "-c", "if [ -f node_modules/uagent-client/bridge_agent.py ]; then python3 node_modules/uagent-client/bridge_agent.py & fi; exec node server.js"]
