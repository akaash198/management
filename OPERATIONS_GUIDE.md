# FlowTeam — Operations Guide (Dev/Deploy)

This doc is for developers/operators running FlowTeam (not end users).

## Backend environment variables

### Database configuration precedence

The backend reads `flowteam_backend/.env` **if present**, but it treats it as a *fallback*.

Effective precedence:
1. If `DATABASE_URL` is already set in the process environment (Docker/CI/shell), it is used.
2. Otherwise, if all DB parts are set, the backend uses:
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
3. Otherwise it falls back to `DATABASE_URL` (including one that may come from `.env`).

This prevents a common Docker issue where `.env` contains `DATABASE_URL=...@localhost:5432/...` and the container tries to connect to `localhost` instead of the `postgres` service.

### Startup behavior

`flowteam_backend/start.sh` supports:
- `RUN_MIGRATIONS` (default `1`): run `python manage.py migrate --noinput` at container start.
- `RUN_SEED_MESSAGING` (default `0`): run `python manage.py seed_messaging` at container start.
- `USE_SQLITE=True` skips Postgres wait logic.

Recommended:
- Local/dev: `RUN_MIGRATIONS=1`, optionally `RUN_SEED_MESSAGING=1` (one-time), then set it back to `0`.
- Prod: run migrations as a separate release step/job (not on every restart).

Auth / Security:
- `TOTP_ISSUER` (default `FlowTeam`) — shown in authenticator apps for 2FA.

## Production serving (ASGI)

Default container start uses `daphne`. For multi-worker deployments, set:
- `USE_UVICORN=1`
- `UVICORN_WORKERS=2` (or more)
- `PORT=8000` (optional)

## Real-time (WebSockets) reliability knobs

- `CHANNEL_LAYER_CAPACITY` (default `1000`) — Redis channel layer buffer size for bursty events.
- `CHANNEL_LAYER_EXPIRY` (default `60`) — seconds before channel messages expire in Redis.

Chat WebSocket improvements (backend is backwards-compatible with existing clients):
- `message.send` now supports idempotent retry via `client_id` (server dedupes per channel+sender+client_id).
- Server assigns a strictly increasing `seq` per channel for resumable delivery.
- Server sends `message.ack` back to the sender: `{ client_id, message_id, seq }`.
- On connect, server emits `history.cursor`: `{ latest_seq }`.
- Client can request missed messages after reconnect via `history.sync` with `last_seq` (preferred) or `since` / `after_message_id`.

## Security (production)

- Axes lockouts are enabled in `config.settings.production` (failed login throttling/lockout).
- Optional: set `REQUIRE_EMAIL_VERIFICATION=True` to block login until email is verified.

## Maintenance

Audit log retention:
- `AUDIT_LOG_RETENTION_DAYS` (default `365`)
- Manual purge: `python manage.py purge_audit_logs --days 365`
- Celery task: `apps.audit.tasks.purge_old_audit_logs` (schedule via `django-celery-beat`)

## Docker Compose (local dev)

From `d:\management`:
- Start backend dependencies: `docker compose up -d postgres redis`
- Start backend: `docker compose up -d backend`
- Start frontend: `docker compose up -d frontend`

If you want to seed messaging channels once:
- `docker compose exec backend python manage.py seed_messaging`

Health check endpoint:
- `GET /api/health/` returns DB + cache status (200 if healthy, 503 if unhealthy).

Metrics endpoint:
- `GET /api/metrics/` exposes Prometheus metrics (HTTP, WebSockets, outbox).

### Frontend auth redirects

On Next.js 16+, request-time auth redirects are implemented via Next "Proxy" in `flowteam_frontend/src/proxy.ts` (this replaces the deprecated `middleware.ts` convention).

If you see unexpected `404` responses for routes that exist (for example `/login` or `/dashboard`), restart the frontend and clear its cache:
- `docker compose restart frontend`
- If running outside Docker: stop `next dev`, delete `flowteam_frontend/.next`, then start `npm run dev` again.

## Hetzner Cloud deployment (GitHub CI/CD)

This repo includes GitHub Actions workflows to build/push Docker images to GHCR and deploy to a Hetzner VM via SSH.

### Server setup (one-time)

On your Hetzner Ubuntu VM:
- Install Docker + Docker Compose plugin.
- Create a deploy directory: `/opt/flowteam`
- Create `/opt/flowteam/.env.prod` from `deploy/.env.prod.example` and fill in secrets (`POSTGRES_PASSWORD`, `SECRET_KEY`, `ALLOWED_HOSTS`, etc).
- The deployment uses Caddy as a reverse proxy, so only port `80` needs to be exposed publicly.

After deploy, access the app at:
- `http://<server-ip>/`

### GitHub repository secrets

Add these GitHub Actions secrets:
- `HETZNER_HOST` (server IP / DNS)
- `HETZNER_USER` (e.g. `root` or `deploy`)
- `HETZNER_SSH_KEY` (private key for SSH)
- `GHCR_USERNAME` (user that can pull packages)
- `GHCR_TOKEN` (PAT with `read:packages` for GHCR)

### Firewall (recommended)

Expose only SSH and HTTP:
- Allow `22/tcp` (SSH)
- Allow `80/tcp` (HTTP)
- Do not expose `3000` or `8000` publicly (they are internal behind Caddy)

### Paramiko deploy

The deploy workflow uses Paramiko (Python SSH) to:
- Upload `deploy/docker-compose.prod.yml` + `deploy/Caddyfile` to `/opt/flowteam`
- Create `/opt/flowteam/.env.prod` from `deploy/.env.prod.example` if missing (and fills `ALLOWED_HOSTS` with the server IP)
- Configure UFW to allow only `22/tcp` + `80/tcp`
- `docker compose pull`, run migrations, and `docker compose up -d`

### Workflows

- `.github/workflows/build-images.yml` builds and pushes:
  - `ghcr.io/<owner>/<repo>-backend:<sha>` and `:latest`
  - `ghcr.io/<owner>/<repo>-frontend:<sha>` and `:latest`
- `.github/workflows/deploy-hetzner.yml` runs `scripts/deploy_hetzner_paramiko.py` to deploy to Hetzner.

### Rollback (manual)

On the server, previous releases are tracked in `/opt/flowteam/releases.log`.

To roll back, pick an older SHA from `releases.log` and re-run with that tag:
- `IMAGE_BACKEND=ghcr.io/<owner>/<repo>-backend:<sha> IMAGE_FRONTEND=ghcr.io/<owner>/<repo>-frontend:<sha> docker compose --env-file .env.prod -f docker-compose.prod.yml up -d`
