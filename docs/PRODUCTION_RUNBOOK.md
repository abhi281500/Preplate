# Preplate — Production Operations Runbook & Incident Response SOP

**Version:** 1.0.0-PROD  
**Target Roles:** On-Call Engineers, Platform Administrators, Support Staff  

---

## 1. Incident Severity & Escalation SLA Matrix

| Severity Level | Definition | Response SLA | Action Trigger |
| :--- | :--- | :--- | :--- |
| **SEV-1 (Critical)** | Core ordering down, payment gateway unreachable, database down, cross-tenant leak. | < 15 minutes | Immediate page to on-call engineer; halt deployments; post status banner. |
| **SEV-2 (Major)** | Kitchen Display System failing to update queue, OTP delivery delayed across tenants. | < 45 minutes | Developer triage; inspect recent error logs; restart affected containers. |
| **SEV-3 (Minor)** | Localized menu formatting glitch, non-critical image upload failure. | < 4 hours | Normal support triage and scheduled patch release. |

---

## 2. Health Monitoring & Triage Procedures

### 2.1. API Health Probe
```bash
curl -I http://localhost:5000/health
```
**Expected Response (200 OK):**
```json
{
  "status": "ok",
  "service": "Preplate API",
  "requestId": "6ec62040-...",
  "timestamp": "2026-10-27T14:00:00.000Z",
  "environment": "production"
}
```

### 2.2. Distributed Log Tracing with Correlation IDs
Search server logs for a specific customer `x-request-id`:
```bash
docker compose logs server | grep "x-request-id: <UUID>"
```

---

## 3. Database Backup & Disaster Recovery SOP

### 3.1. Daily Backup Command
```bash
#!/bin/bash
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/preplate"
mkdir -p "$BACKUP_DIR"
mongodump --uri="$MONGODB_URI" --gzip --archive="$BACKUP_DIR/preplate_$TIMESTAMP.archive.gz"
find "$BACKUP_DIR" -type f -name "*.archive.gz" -mtime +30 -exec rm {} \;
```

### 3.2. Disaster Recovery Restore
```bash
mongorestore --uri="$MONGODB_URI" --drop --gzip --archive=/var/backups/preplate/preplate_TARGET.archive.gz
```

---

## 4. Operational Standard Operating Procedures (SOPs)

### 4.1. Onboarding a New Restaurant Tenant
1. Super Admin logs into `/admin` or sends `POST /api/v1/super/restaurants`.
2. Provide unique slug, business name, contact phone, and WhatsApp alert number.
3. Assign default subscription plan (`STARTER` or `PRO`).
4. Generate owner credentials and hand over storefront link (`/r/:slug`).

### 4.2. Offboarding / Suspending a Delinquent Restaurant
1. In Super Admin dashboard, toggle restaurant status from `ACTIVE` to `SUSPENDED`.
2. Customer order attempts immediately return HTTP 403 Forbidden.
3. Historical completed orders and accounting records remain preserved for financial compliance.
