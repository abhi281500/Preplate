# Preplate — Production Deployment & DevOps Architecture

**Version:** 1.0.0-PROD  
**Target Environments:** Staging / Production (Docker, Nginx, MongoDB Atlas)  

---

## 1. Container Architecture & Multi-Stage Builds

Preplate uses isolated, multi-stage Docker container builds to minimize production image footprints, eliminate build tools from runtime containers, and enforce non-root security principles.

### 1.1. Backend API Container (`server/Dockerfile`)
- **Base Image:** `node:22-alpine`
- **Build Stage:** Installs devDependencies, compiles TypeScript into `dist/` via `tsc`.
- **Runtime Stage:** Copies production `dist/` and production `node_modules` (`npm ci --omit=dev`), drops privileges to non-root user `node`.
- **Healthcheck:** Probes `GET http://localhost:5000/health` every 30s.

### 1.2. Frontend Web Container (`client/Dockerfile`)
- **Base Image:** `node:22-alpine` for building, `nginx:1.27-alpine` for serving.
- **Build Stage:** Compiles Vite React SPA with tree-shaking into optimized static assets.
- **Runtime Stage:** Nginx serves static assets with Gzip compression, SPA fallback routing (`try_files $uri $uri/ /index.html;`), and strict browser security headers.

---

## 2. Docker Compose Orchestration

For local staging or single-node VPS deployment:

```bash
# 1. Clone repository
git clone https://github.com/abhi281500/Preplate.git
cd Preplate

# 2. Configure production environment
cp .env.example .env
# Edit .env with secure production secrets

# 3. Build and launch containers
docker compose up -d --build

# 4. Verify running health status
docker compose ps
```

### Services Spawned:
1. `preplate-mongodb`: Mongo 7.0 database bound to persistent volume `preplate-mongo-data`.
2. `preplate-api`: Node.js 22 REST API listening on port 5000 with auto-restart.
3. `preplate-web`: Nginx web server serving customer storefront & restaurant portal on port 3000 (mapped to port 80).

---

## 3. Production Environment Variables Reference

| Variable Name | Required | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Yes | `production` | Enables production optimizations and disables debug logs |
| `PORT` | Yes | `5000` | HTTP port for the Express API |
| `API_PREFIX` | Yes | `/api/v1` | URL routing prefix for all REST endpoints |
| `MONGODB_URI` | Yes | `mongodb+srv://user:pass@cluster.mongodb.net/preplate` | Production MongoDB Atlas connection URI |
| `CLIENT_ORIGIN` | Yes | `https://preplate.io` | Domain origin permitted for CORS access |
| `JWT_SECRET` | Yes | `[Random 64-char Hex String]` | Symmetric key used to sign and verify JWT tokens |
| `JWT_EXPIRES_IN` | Yes | `7d` | Session token validity duration |
| `BCRYPT_SALT_ROUNDS` | No | `12` | Work factor for password hashing |
| `SUPERADMIN_EMAIL` | Yes | `superadmin@preplate.io` | Default platform administrator login |
| `SUPERADMIN_PASSWORD`| Yes | `Admin@Preplate2026!` | Super Admin initial password (must rotate upon first boot) |
| `SUPERADMIN_NAME` | No | `Platform Super Administrator` | Display name for root administrator |
| `WHATSAPP_INTEGRATION_MODE` | No | `CLICK_TO_CHAT` | `CLICK_TO_CHAT` (zero-cost) or `META_CLOUD_API` |

---

## 4. Production Cloud Hosting Options

### Option A: Managed PaaS (Render / Railway)
- **API Service:** Deploy as Web Service linked to `server/Dockerfile`. Set environment variables in dashboard.
- **Client Service:** Deploy as Static Site or Docker Web Service linked to `client/Dockerfile`.
- **Database:** MongoDB Atlas (M10 cluster recommended for multi-tenant pilot).

### Option B: VPS / Cloud VM (AWS EC2 / DigitalOcean Droplet)
1. Provision Ubuntu 24.04 LTS instance (2 vCPU, 4GB RAM minimum).
2. Install Docker Engine and Docker Compose plugin.
3. Attach Let's Encrypt SSL via Certbot or Cloudflare Reverse Proxy.
4. Set up systemd service to ensure `docker compose up -d` auto-recovers after VM reboot.

---

## 5. Zero-Downtime Deployment & Rollback Runbook

### Rolling Update Procedure:
```bash
# Fetch latest verified commits
git pull origin main

# Build updated images without dropping current traffic
docker compose build --pull

# Perform rolling container replacement
docker compose up -d --no-deps --build server
docker compose up -d --no-deps --build client

# Check health endpoint
curl -f http://localhost:5000/health
```

### Rapid Rollback Procedure:
```bash
# If health probe fails post-deployment, roll back to prior Git commit:
git checkout <PREVIOUS_STABLE_COMMIT_HASH>
docker compose up -d --build
```
