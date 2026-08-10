# Hush

Sensory-aware walking routes for Melbourne CBD — scores paths by nearby pedestrian sensor load so neurodivergent commuters can choose quieter options.

## Requirements

- Python 3.12+
- Node.js 20+
- Optional: [OpenRouteService](https://account.heigit.org) API key (`ORS_API_KEY`) for live routing
- Optional: Postgres connection string (`DATABASE_URL`, e.g. Neon) for persisted readings / landmarks

## Environment

Copy each `.env.example` to `.env` (never commit `.env`):

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**`backend/.env`**

| Variable | Required | Notes |
|---|---|---|
| `ORS_API_KEY` | for live routing | Free at https://account.heigit.org. Without it, only the baked fallback route pair works. |
| `DATABASE_URL` | no | Neon/Postgres (`psycopg` URI). Without it, API uses the live feed / bundled snapshot. |
| `CORS_ORIGINS` | no | Default `*`. e.g. `http://localhost:5173` |

**`frontend/.env`**

| Variable | Required | Notes |
|---|---|---|
| `VITE_API_URL` | yes (local) | Use `http://127.0.0.1:8000` (not `localhost` — on Windows that can hit IPv6 and fail silently). |
| `VITE_MAP_STYLE` | no | Defaults to OpenFreeMap Positron. |

## Run locally

**Backend** (port 8000):

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Frontend** (port 5173):

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.
