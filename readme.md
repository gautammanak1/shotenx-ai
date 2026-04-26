# ShotenX AI (monorepo)

Lightning-native **agent marketplace MVP**: **Next.js** frontend in `frontend/` and **Express** API in `backend/`. Same-origin UI with **`/backend/*`** proxy, L402 / invoices, builder + Agentverse flows.

---

## Layout

```text
./
  frontend/     Next.js 16 app (pages, API routes, Supabase, Bitcoin Connect)
  backend/      Express API (agents, payments, ASI1 builders)
  docker-compose.yml
  render.yaml     optional Render Blueprint (two Web Services)
```

---

## Architecture

```mermaid
flowchart LR
  subgraph Browser
    U[User]
  end
  subgraph Next["Next.js :3000"]
    P[Pages / API routes]
    RW["/backend/* rewrite"]
  end
  subgraph Express["Express :8080"]
    B[REST /api/*]
    L[Payments + L402]
    A[Agents + registry]
  end
  U --> P
  P --> RW
  RW --> B
  P --> P
  B --> L
  B --> A
```

---

## Local development

**Backend**

```bash
cd backend
cp .env.example .env
npm ci && npm run dev
```

**Frontend**

```bash
cd frontend
cp .env.example .env   # NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
npm ci && npm run dev
```

---

## Docker Compose (full stack)

From **repository root**:

```bash
docker compose up --build
```

- **Frontend**: http://localhost:3000  
- **Backend**: http://localhost:8080  
- **Persistence**: volume `shotenx_backend_data` → backend `/app/data`.

Compose reads **`.env`** at the repo root for frontend substitution; backend uses **`backend/.env`** (`env_file`).

**uAgent (Fetch)** — Docker images include Python + `uagents` / `uagents-core` / `requests` per the [Node.js Client Integration](https://innovationlab.fetch.ai/resources/docs/examples/integrations/nodejs-client-integration) guide. Optional host ports **8000** (frontend bridge) and **8001** → backend bridge.

---

## Environment variables

| Location | Purpose |
|----------|---------|
| `frontend/.env` | `NEXT_PUBLIC_*`, server route secrets — see `frontend/.env.example` |
| `backend/.env` | `PORT`, `ALLOWED_ORIGINS`, Agentverse, ASI1, Alby — see `backend/.env.example` |

---

## Render

Root **`render.yaml`** defines two Docker Web Services (`rootDir: backend` / `rootDir: frontend`). After first deploy, set real URLs: **`NEXT_PUBLIC_BACKEND_URL`** on the frontend service and **`ALLOWED_ORIGINS`** on the backend to your frontend URL.

Optional **GitHub Actions** `/.github/workflows/deploy-render.yml`: add **`RENDER_DEPLOY_HOOK_URL`** (and a second workflow or secret if you use separate hooks per service).

---

## CI (GitHub Actions)

| Workflow | When |
|----------|------|
| `ci.yml` | Push / PR — jobs **frontend** and **backend** (typecheck + build) |
| `deploy-render.yml` | Manual; optional deploy hook POST |

---

## Scripts

| Command | Where |
|---------|--------|
| `npm run dev` / `build` / `start` | `frontend/` |
| `npm run dev` / `build` / `start` | `backend/` (`node dist/index.js`) |

---

## New private GitHub repository (monorepo)

GitHub UI: **New repository** → name e.g. `shotenx-ai` → **Private** → create **without** README, then:

```bash
cd /path/to/this-monorepo
git remote rename origin old-origin   # optional, if you already had origin
git remote add origin git@github.com:YOUR_USER/shotenx-ai.git
git push -u origin main
```

Or with [GitHub CLI](https://cli.github.com/) after `gh auth login`:

```bash
gh repo create YOUR_USER/shotenx-ai --private --source=. --remote=origin --push
```

---

## License

Private / team use unless stated otherwise.
