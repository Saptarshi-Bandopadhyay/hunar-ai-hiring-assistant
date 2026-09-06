# Hunar Hire — AI Hiring Assistant

A production-oriented FDE assignment implementation for **Application 1: AI Hiring Assistant** using Hunar Voice Agents.

## What this application does

1. Recruiter enters candidate information and a job description.
2. Recruiter selects a Hunar voice agent.
3. Backend creates a real outbound Hunar call.
4. Job/candidate context is passed through Hunar `custom_data`.
5. The application registers a `call_summary_callback_url`.
6. Hunar sends the signed summary webhook after the call lifecycle reaches a terminal state.
7. FastAPI verifies the HMAC signature and stores the result.
8. Recruiter sees call status, duration, engagement, recording link and structured screening answers in the dashboard.

It also includes an **Agent Manager** that can create a Hunar screening agent using the documented agent-creation fields.

## Architecture

```text
┌──────────────────────────── Next.js / React / TypeScript ────────────────────────────┐
│ Recruiter workspace                                                                  │
│  New screening  │  Call activity  │  Voice agents                                   │
└───────────────────────────────────────┬─────────────────────────────────────────────┘
                                        │ /api/*
                                        ▼
┌────────────────────────────────── FastAPI / Python ──────────────────────────────────┐
│ Hunar client │ webhook verification │ persistence │ validation                      │
└───────────────┬──────────────────────────────┬──────────────────────────────────────┘
                │                              │
                │ X-API-Key                    │ signed HTTPS webhook
                ▼                              ▲
        ┌────────────────┐             ┌───────┴────────┐
        │ Hunar Voice AI │────────────►│ /api/webhooks  │
        └────────────────┘             └────────────────┘
                │
                ▼
          Candidate phone

PostgreSQL is used in production; SQLite is available for local development.
```

## Important Hunar details implemented

- API key stays server-side.
- E.164 phone-number validation on our API.
- `custom_data` carries company, job role and job description.
- `call_summary_callback_url` is registered per call.
- Hunar webhook `X-Hunar-Timestamp` and `X-Hunar-Signature` are verified.
- Timestamp replay window defaults to 300 seconds.
- Webhook processing is idempotent.
- Provider call results are persisted locally and the dashboard can fall back to stored records if Hunar is temporarily unavailable.
- The UI exposes the documented recording URL when Hunar provides one.
- Agent result schema is configurable.

## Environment variables


Required:

```bash
HUNAR_API_KEY=...
```

Production:

```bash
DATABASE_URL=postgresql://...
APP_BASE_URL=https://your-project.vercel.app
```

`HUNAR_WEBHOOK_API_KEYS` defaults to `HUNAR_API_KEY`. If the Hunar organization has multiple active keys that may sign webhooks, put them in a comma-separated list.


## Local development

This project uses **uv** for Python dependency/environment management and **Alembic** for database migrations.

### Python backend

Install uv if needed, then from the project root:

```bash
uv sync
```

Run the initial migration:

```bash
uv run alembic upgrade head
```

Start FastAPI:

```bash
uv run uvicorn backend.main:app --reload --port 8000
```

Useful Alembic commands:

```bash
# Show current migration
uv run alembic current

# Create a migration after changing SQLAlchemy models
uv run alembic revision --autogenerate -m "describe change"

# Apply pending migrations
uv run alembic upgrade head

# Roll back one migration
uv run alembic downgrade -1
```

### Frontend

In a second terminal:

```bash
npm install
npm run dev
```

For a simple local split setup, either change the frontend fetch base to your backend URL or run through a local reverse proxy. For webhook testing, expose the backend with a public HTTPS tunnel and set `APP_BASE_URL` to the tunnel URL.



## Hunar API assumptions that are explicitly documented

Hunar's external API documents:

- `GET /agents/`
- `POST /agents/`
- `GET /numbers/`
- `POST /calls/`
- `GET /calls/`
- `GET /calls/{call_id}/`
- call summary webhooks
- signed webhook verification
- structured `result` generation
- recording URLs