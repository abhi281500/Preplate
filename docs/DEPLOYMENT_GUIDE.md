# Preplate — Production Deployment & Cloud Infrastructure Guide

**Version:** 1.0.0-PROD  
**Target Environments:** VPS / AWS EC2 / DigitalOcean / Render / Railway  

---

## 1. Container Infrastructure

Preplate is containerized using multi-stage Docker builds to ensure minimal production image size and enhanced security:

- **API Server Container (`server/Dockerfile`):** Node 22-alpine base, multi-stage build, runs as non-root user `node`, exposed on port 5000, built-in `/health` check.
- **Frontend Web Container (`client/Dockerfile`):** Node 22-alpine builder + Nginx 1.27-alpine runner, Gzip compression, asset caching, SPA fallback routing (`try_files $uri $uri/ /index.html;`), exposed on port 80.
- **Database (`mongo:7.0`):** Managed persistent volume `preplate-mongo-data` with health check.

---

## 2. Docker Compose Staging / Single-Node Deployment

```bash
# 1. Clone repository
git clone https://github.com/abhi281500/Preplate.git
cd Preplate

# 2. Configure environment
cp server/.env.example server/.env
# Edit server/.env with secure production values

# 3. Build and launch all services in background
docker compose up -d --build

# 4. Verify running health
docker compose ps
```

---

## 3. Production Cloud Hosting Options

### Option A: Managed PaaS (Render / Railway)
- **API Web Service:** Deploy `server/Dockerfile`. Set environment variables in dashboard.
- **Client Web Service:** Deploy `client/Dockerfile`.
- **Database:** MongoDB Atlas (M10 cluster recommended for multi-tenant pilot).

### Option B: Cloud VPS (AWS EC2 / DigitalOcean Droplet)
1. Launch Ubuntu 24.04 LTS instance (2 vCPU, 4GB RAM minimum).
2. Install Docker Engine and Compose plugin.
3. Terminate TLS with Let's Encrypt / Certbot reverse proxy on port 443.
4. Auto-heal containers on reboot using `restart: unless-stopped`.
