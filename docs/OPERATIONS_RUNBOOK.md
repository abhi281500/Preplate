# Preplate — Operations Runbook & Incident Response SOP

**Version:** 1.0.0-PROD  
**Target Audience:** DevOps Engineers, Platform Administrators, Restaurant Support  

---

## 1. Incident Severity Definitions & Escalation Matrix

| Severity Level | Definition | Response SLA | Action Trigger |
| :--- | :--- | :--- | :--- |
| **SEV-1 (Critical)** | Core ordering engine down, database unreachable, widespread payment failures, or data isolation breach. | < 15 minutes | Immediate page to on-call engineer; halt deployments; post status banner. |
| **SEV-2 (Major)** | Kitchen Display System (KDS) failing to update live queue, WhatsApp links failing across all tenants. | < 45 minutes | Developer investigation; review recent audit logs; restart affected containers. |
| **SEV-3 (Minor)** | Individual restaurant unable to update menu photos, localized formatting glitch on storefront. | < 4 hours | Normal support triage and non-emergency patch release. |

---

## 2. Health Monitoring & Triage Procedures

### 2.1. API Health Check Endpoint
The backend exposes `/health`:
```bash
curl -I http://localhost:5000/health
```
**Expected Response (200 OK):**
```json
{
  "status": "ok",
  "service": "Preplate API",
  "requestId": "6ec62040-...",
  "timestamp": "2026-10-26T18:00:00.000Z",
  "environment": "production"
}
```

### 2.2. Log Inspection & Correlation ID Tracing
To trace an erroneous customer request across logs:
```bash
# Search server logs for specific correlation ID
docker compose logs server | grep "x-request-id: <CORRELATION_UUID>"

# Inspect recent database error logs
docker compose logs -n 200 server | grep -i "error"
```

---

## 3. Database Backup & Disaster Recovery SOP

### 3.1. Automated Daily Backups (MongoDB Dump)
```bash
#!/bin/bash
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/preplate"
mkdir -p "$BACKUP_DIR"

mongodump --uri="$MONGODB_URI" --gzip --archive="$BACKUP_DIR/preplate_$TIMESTAMP.archive.gz"

# Retain backups for 30 days
find "$BACKUP_DIR" -type f -name "*.archive.gz" -mtime +30 -exec rm {} \;
```

### 3.2. Point-in-Time Database Restore
```bash
# To restore from an archive in disaster recovery scenario:
mongorestore --uri="$MONGODB_URI" --drop --gzip --archive=/var/backups/preplate/preplate_TARGET_DATE.archive.gz
```

---

## 4. Operational Standard Operating Procedures (SOPs)

### 4.1. Onboarding a New Restaurant Tenant
1. Super Admin navigates to `/admin` or sends `POST /api/v1/super/restaurants`.
2. Provide unique restaurant slug (e.g., `highway-dhaba`), business name, WhatsApp notification number, and contact details.
3. Assign default subscription plan (e.g., `STARTER` or `PRO`).
4. Generate initial Restaurant Owner account credentials.
5. Provide the restaurant owner with their login URL (`/login`) and public storefront link (`/r/:slug`).

### 4.2. Offboarding / Suspending a Delinquent Tenant
1. In Super Admin portal, toggle restaurant status from `ACTIVE` to `SUSPENDED`.
2. All subsequent storefront order attempts will be rejected with HTTP 404/403.
3. Existing completed orders and financial records remain permanently preserved for accounting integrity.

### 4.3. Kitchen Peak Service Hours (Traffic Spikes)
- If kitchen order queue reaches capacity:
  - Restaurant Manager toggles `isAvailable: false` on high-prep dishes via dashboard to automatically "86" the item.
  - Or increases `orderBufferMinutes` from 20 to 45 minutes in restaurant settings to allow kitchen more preparation leeway.
