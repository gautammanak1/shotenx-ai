# shotenx_ai_backend

Express API for ShotenX: **agents**, **L402 payments**, **market / LLM search**, **premium** routes.

## Quick start

```bash
cp .env.example .env
npm ci && npm run dev
```

Health: `GET http://localhost:8080/health`

## Docker

```bash
docker build -t shotenx-backend .
docker run --rm -p 8080:8080 -e ALLOWED_ORIGINS=http://localhost:3000 shotenx-backend
```

Compose for **frontend + backend** lives in the sibling repo **`ShotenX_AI/docker-compose.yml`**.

## CI

GitHub Actions: `.github/workflows/ci.yml` (typecheck + build).  
Render: root **`render.yaml`** (Docker Web Service). Optional manual deploy: `.github/workflows/deploy-render.yml` + secret **`RENDER_DEPLOY_HOOK_URL`** (Render → service → Deploy Hook).

## Env

See `.env.example` — at minimum set **`ALLOWED_ORIGINS`** for your frontend origin in production.
