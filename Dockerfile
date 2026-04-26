# Next.js standalone + uAgent client (needs Python bridge — see Fetch Innovation Lab)
# https://innovationlab.fetch.ai/resources/docs/examples/integrations/nodejs-client-integration
#
# Debian slim (not Alpine): uagent-client expects Python 3 + `uagents` on PATH.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_BACKEND_URL=http://backend:8080
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Python + build deps for pip wheels (uagents / uagents-core)
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
    --default-timeout=120 --retries 5 \
    uagents \
    uagents-core \
    requests \
  && rm -rf /root/.cache/pip

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Standalone output may omit non-JS files; bridge_agent.py must exist for the CMD below.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/uagent-client ./node_modules/uagent-client

USER nextjs
EXPOSE 3000
# Default bridge port used by uagent-client (override with UAGENT_BRIDGE_PORT)
EXPOSE 8000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV UAGENT_BRIDGE_PORT=8000

# Start Python bridge when present (same pattern as Fetch docs), then Next standalone server.
CMD ["sh", "-c", "if [ -f node_modules/uagent-client/bridge_agent.py ]; then python3 node_modules/uagent-client/bridge_agent.py & fi; exec node server.js"]
