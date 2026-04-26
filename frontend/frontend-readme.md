# ShotenX AI — Frontend

> Lightning-native API marketplace for AI agents. Pay per request. No keys. No accounts.

---

## Tech Stack

| Tool | Purpose |
|---|---|
| Next.js 16 (Turbopack) | Framework |
| TypeScript | Language |
| Tailwind CSS | Styling |
| Supabase | Auth (email, Google, GitHub) |
| Recharts | Dashboard charts |
| Lucide React | Icons |

---

## Project Structure

```
app/
├── page.tsx                  # Landing page
├── login/page.tsx            # Sign in / Sign up
├── docs/page.tsx             # Public API docs
├── marketplace/page.tsx      # Agent marketplace (protected)
├── auth/callback/route.ts    # OAuth callback handler
└── (dashboard)/
    ├── layout.tsx            # Dashboard shell (auth guard)
    ├── dashboard/page.tsx    # Overview + charts
    ├── transactions/page.tsx # Transaction history
    ├── demo/page.tsx         # Live L402 demo
    ├── register/page.tsx     # Register your API
    └── help/page.tsx         # Help center + FAQs

components/
├── sidebar.tsx               # Dashboard sidebar nav
├── topbar.tsx                # Dashboard topbar (user, theme, docs, help)
├── theme-provider.tsx        # Theme context (light/dark)
├── theme-toggle.tsx          # Sun/moon toggle button
└── grid-background.tsx       # Canvas grid animation

lib/
├── api.ts                    # Backend API client
├── supabase.ts               # Supabase browser client
└── supabase-server.ts        # Supabase server client + route protection
```

---

## Routes

| Route | Access | Description |
|---|---|---|
| `/` | Public | Landing page |
| `/login` | Public | Sign in / Sign up |
| `/docs` | Public | API documentation |
| `/marketplace` | Protected | Browse available agents |
| `/dashboard` | Protected | Overview + analytics |
| `/transactions` | Protected | Payment history |
| `/demo` | Protected | Live L402 payment demo |
| `/register` | Protected | Register your API |
| `/help` | Protected | Help center + FAQs |

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set environment variables

Create a `.env` file:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Configure Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Copy your **Project URL** and **anon key** into `.env`
3. Enable **Google** and **GitHub** providers in Authentication → Providers
4. Set redirect URLs in Authentication → URL Configuration:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`

### 4. Configure Google OAuth

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
4. Paste Client ID + Secret into Supabase → Providers → Google

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Auth Flow

```
Landing page → Sign in / Sign up → /login
  ├── Email + password  → dashboard
  ├── Google OAuth      → /auth/callback → dashboard
  └── GitHub OAuth      → /auth/callback → dashboard

Unauthenticated access to protected route → redirect to /login
```

---

## L402 Payment Flow

```
Agent → GET /api/agents          # discover services
Agent → POST /api/summarize      # call endpoint
Server → HTTP 402 + invoice      # payment required
Agent → pay Lightning invoice    # wallet pays
Agent → POST /api/summarize      # retry with x-payment-token
Server → 200 + result            # access granted
```

---

## Backend

The frontend expects a backend running at `NEXT_PUBLIC_BACKEND_URL` (default `http://localhost:8080`) with these endpoints:

| Method | Path | Description |
|---|---|---|
| GET | `/api/agents` | List all agents |
| POST | `/api/payments/checkout` | Create Lightning checkout |
| POST | `/api/payments/:id/simulate-settle` | Simulate payment (dev) |
| POST | `/api/tools/summarize` | L402-protected summarize |
