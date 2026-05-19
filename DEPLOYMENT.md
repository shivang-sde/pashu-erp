# Deployment Guide for PashuCare ERP

## Overview
This repository now includes Docker support for the full-stack app:
- `backend` runs the Node.js API on port `5000`
- `frontend` builds the React app and serves it via Nginx Alpine on port `80`
- `docker-compose.yml` ties both services together on a dedicated network
- `.env` stores environment variables for production deployment
- `scripts/deploy.sh` and `scripts/monitor.sh` automate build, runtime, and monitoring tasks

> Nginx reverse proxy configuration is intentionally excluded from this repository so you can integrate it manually.

## Files Added
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `docker-compose.yml`
- `.env`
- `scripts/deploy.sh`
- `scripts/monitor.sh`
- `DEPLOYMENT.md`

## Docker Architecture

### Backend
- Multi-stage build using `node:20-alpine`
- Installs production dependencies only
- Runs as the non-root `node` user
- Exposes port `5000`
- Includes a health check for `/health`
- Uses `.env` mounted read-only inside the container

### Frontend
- Multi-stage build using `node:20-alpine`
- Builds React app with Vite
- Serves static files with `nginx:1.27-alpine`
- Runs as the non-root `nginx` user
- Exposes port `80`
- Build arguments and environment variable injection for `VITE_API_URL` and `VITE_API_SECRET`

### Compose
- Uses a dedicated `pashu_erp_net` bridge network
- Ensures `frontend` waits for `backend` health before starting
- Uses named volumes and read-only configuration mounts where appropriate

## Environment Variables

The repository root `.env` file contains shared deployment values. Update these values before deploying.

```dotenv
DOMAIN=example.com
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://example.com
VITE_API_URL=https://example.com/api/v1
VITE_API_SECRET=replace_with_a_strong_secret

DB_HOST=mysql
DB_PORT=3306
DB_NAME=pashu_erp
DB_USER=pashu_user
DB_PASSWORD=replace_with_strong_password

JWT_SECRET=replace_with_strong_jwt_secret
SKIP_SIGNATURE=false

GMAIL_USER=your-email@example.com
GMAIL_APP_PASSWORD=your_gmail_app_password

ORG_NAME=PashuCare ERP
```

### Important Notes
- `DB_HOST=mysql` is a placeholder for the MySQL hostname. If you run MySQL outside this compose stack, set the correct host.
- `VITE_API_URL` is baked into the frontend during build time.
- Keep secrets like `JWT_SECRET`, `DB_PASSWORD`, and `GMAIL_APP_PASSWORD` secure and do not commit them to source control.

## Deploying

From the repository root:

```bash
bash ./scripts/deploy.sh build
bash ./scripts/deploy.sh start
```

Check running containers:

```bash
bash ./scripts/deploy.sh status
```

Stop containers:

```bash
bash ./scripts/deploy.sh stop
```

Cleanup resources:

```bash
bash ./scripts/deploy.sh cleanup
```

## Monitoring

Show container status:

```bash
bash ./scripts/monitor.sh status
```

Tail logs:

```bash
bash ./scripts/monitor.sh logs
```

Follow live logs:

```bash
bash ./scripts/monitor.sh follow
```

Health summary:

```bash
bash ./scripts/monitor.sh health
```

## Security and Best Practices
- Run containers under non-root users
- Use `NODE_ENV=production`
- Do not expose secrets in image layers
- Use health checks and restart policies
- Keep `.env` out of source control if you deploy to public repos

## Manual Nginx Integration
This stack exposes the frontend on port `80` and backend on port `5000`.
For production with `example.com`, configure your external Nginx reverse proxy to:
- route `/api/*` traffic to `http://localhost:5000`
- route all other traffic to `http://localhost:80`

Because Nginx configuration is excluded, you can insert your own proxy rules safely.
