# Express API + uAgent client (direct-chat / Agentverse) — Python 3 + uagents required on PATH
# https://innovationlab.fetch.ai/resources/docs/examples/integrations/nodejs-client-integration

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production

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

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
COPY src/agents/registry.json ./src/agents/registry.json
COPY public ./public
RUN mkdir -p data

EXPOSE 8080
EXPOSE 8000
ENV UAGENT_BRIDGE_PORT=8000

CMD ["node", "dist/index.js"]
