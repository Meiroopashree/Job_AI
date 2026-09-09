# JobAI

JobAI is a job-hunting assistant that scrapes jobs from **LinkedIn** and **Indeed** (via JobSpy), matches them against your resume with an ML-based scorer, and runs ATS checks that generate an ATS-friendly version of your resume.

## Architecture

```
job-ai-frontend/   Next.js 16 (App Router) + React 19 + Tailwind CSS v4  -> Vercel
backend/           FastAPI + SQLAlchemy + PostgreSQL                      -> Render
```

The Next.js app proxies `/api/*` to the backend using a rewrite. Locally it targets `http://127.0.0.1:8000`; in production set the `BACKEND_URL` env var to your Render service URL.

## Local development

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

Create `backend/.env`:

```
DATABASE_URL=postgresql://postgres:root@localhost:5432/job_ai
MISTRAL_API_KEY=your_mistral_key
JWT_SECRET=your_secret
```

Run:

```bash
venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Tables are created automatically on startup.

### Frontend

```bash
cd job-ai-frontend
npm install
npm run dev
```

Open http://localhost:3000. `npm run lint`, `npx tsc --noEmit`, and `npm run build` should all pass.

## Deployment

### Backend -> Render

Repo layout is a blueprint (`render.yaml`) with a web service + free Postgres:

1. Push this repo to GitHub.
2. In Render: **New -> Blueprint**, pick the repo. Render proposes `jobai-api` (web) + `jobai-db` (Postgres).
3. Fill in the sync env vars when prompted:
   - `JWT_SECRET` — any long random string.
   - `MISTRAL_API_KEY` — your Mistral API key.
4. `CORS_ORIGINS` — add your Vercel frontend URL if you ever call the API directly (the proxy is same-origin, so this is optional).
5. After deploy, copy the service URL (e.g. `https://jobai-api.onrender.com`).

### Frontend -> Vercel

1. Import this repo in Vercel; set **Root Directory** to `job-ai-frontend`.
2. Add env var `BACKEND_URL` with your Render URL (no trailing slash), e.g. `https://jobai-api.onrender.com`.
3. Deploy. All `/api/*` calls on the frontend domain are proxied to the backend.

> Note: The production Postgres starts empty (no users/jobs). Register a user, upload a resume, then use the **Scrape Jobs** form to pull LinkedIn/Indeed listings. JobSpy scraping from datacenter IPs on Render can sometimes be rate-limited or blocked by the job boards.