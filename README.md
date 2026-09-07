# Hunar Hire — AI Hiring Assistant

A full-stack AI hiring assistant built using the Hunar Voice AI Agents API. The application helps recruiters configure AI interview agents, initiate candidate screening calls, and review structured hiring results.

## What it does

- Create AI hiring agents for specific roles.
- Configure the agent's personality, objective, introduction, and evaluation criteria.
- Initiate voice screening calls with candidates.
- Pass candidate/job information to the AI agent.
- Receive call status, recordings, summaries, and structured evaluation results.
- Store hiring data in PostgreSQL.
- View candidates and interview results through a recruiter dashboard.

## Architecture

```text
Recruiter
    |
    v
Next.js Frontend
    |
    v
FastAPI Backend
    |              |
    v              v
PostgreSQL     Hunar Voice AI
                   |
                   v
             Candidate Call
                   |
                   v
              Webhooks
                   |
                   v
             FastAPI Backend
````

## Tech Stack

* **Frontend:** Next.js, TypeScript, Tailwind CSS
* **Backend:** FastAPI, Python
* **Database:** PostgreSQL, SQLAlchemy, Alembic
* **Voice AI:** Hunar Voice AI Agents API
* **Deployment:** Vercel

## Hunar Integration

The backend integrates with Hunar's external API to:

1. Create and configure voice agents.
2. Initiate candidate calls.
3. Pass structured candidate information through `custom_data`.
4. Process asynchronous call updates through webhooks.

Supported webhook events include:

```text
call_status_updated
call_recording_done
call_result_done
call_summary
```

Webhook requests are validated using Hunar's HMAC-SHA256 signature mechanism.

## Local Setup

### Backend

```bash
uv sync
uv run alembic upgrade head
uv run uvicorn backend.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Configure the backend `.env`:

```env
DATABASE_URL=...
HUNAR_API_KEY=...
HUNAR_BASE_URL=https://api.voice.hunar.ai/external/v1
APP_BASE_URL=https://your-public-backend-url
```

For local webhook testing, `APP_BASE_URL` must be a public HTTPS URL.

## Deployment

The frontend and backend are deployed as separate Vercel projects:

* **Backend:** repository root
* **Frontend:** `frontend/`

Configure the required environment variables in the respective Vercel projects.

## Key API Endpoints

```text
GET  /api/health
GET  /api/agents
POST /api/agents
PUT  /api/agents/{id}
POST /api/calls
GET  /api/calls
POST /api/webhooks/hunar/*
```

## Design Approach

The application keeps the responsibilities separated:

* **Next.js** provides the recruiter interface.
* **FastAPI** handles API orchestration and webhook processing.
* **Hunar** handles the conversational voice interview.
* **PostgreSQL** stores candidates, calls, and evaluation results.

The design can be extended with authentication, background job processing, interview scheduling, richer candidate pipelines, and hiring analytics.

