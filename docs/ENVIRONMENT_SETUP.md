# Preplate — Environment Setup & Configuration Guide

**Version:** 1.0.0-PROD  
**Applicable Environments:** Local Development, Automated Testing, Staging, Production  

---

## 1. Security Principles for Secrets Management

1. **Zero Secret Commits:** Never commit `.env` or files containing live credentials. Only commit `.env.example` containing documentation placeholders.
2. **Environment Variable Injection:** In production, environment variables must be injected via host container managers (e.g. Docker Compose, AWS ECS task definitions, Render dashboard).
3. **Secret Rotation:** If any credential or signing secret is exposed, immediately rotate it at the provider portal and restart the backend service.

---

## 2. Complete Environment Variables Specification

### 2.1. Backend API (`server/.env`)

```ini
# =============================================================================
# PREPLATE BACKEND ENVIRONMENT CONFIGURATION (.env)
# =============================================================================

# Server Network & Runtime
NODE_ENV=development                       # 'development' | 'test' | 'production'
PORT=5000                                  # Port on which Express API listens
API_PREFIX=/api/v1                         # Routing namespace prefix
CLIENT_ORIGIN=http://localhost:5173        # Permitted CORS origin for React web app

# Database Connection
MONGODB_URI=mongodb://localhost:27017/preplate   # MongoDB connection string

# JWT Session Security
JWT_SECRET=super-secret-jwt-key-minimum-32-chars-long-change-in-production
JWT_EXPIRES_IN=7d                          # Token expiration duration
BCRYPT_SALT_ROUNDS=12                      # Work factor for password hashing

# OTP Subsystem Configuration (HMAC Keyed Hashing)
OTP_HMAC_SECRET=secure-otp-hmac-secret-change-in-production
OTP_EXPIRY_SECONDS=300                     # 5 minutes validity
OTP_MAX_ATTEMPTS=5                         # Maximum failed guesses before challenge revocation
OTP_COOLDOWN_SECONDS=60                    # Minimum interval before resending OTP

# SMS Provider Credentials (Twilio / Fast2SMS / MSG91)
# Note: In development/test mode, OTP codes are logged to console without calling SMS gateway
SMS_PROVIDER=MOCK                          # 'MOCK' | 'FAST2SMS' | 'TWILIO'
SMS_PROVIDER_API_KEY=placeholder_sms_api_key

# Payment Gateway Configuration (Razorpay - Minimum 25% Advance)
# Note: In test mode, use Razorpay Sandbox keys
RAZORPAY_KEY_ID=rzp_test_placeholder_key_id
RAZORPAY_KEY_SECRET=placeholder_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=placeholder_webhook_signing_secret

# WhatsApp Notification Mode
WHATSAPP_INTEGRATION_MODE=CLICK_TO_CHAT    # 'CLICK_TO_CHAT' | 'META_CLOUD_API'
WHATSAPP_ACCESS_TOKEN=placeholder_meta_token
WHATSAPP_PHONE_NUMBER_ID=placeholder_phone_number_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=preplate_verify_token_2026

# Seed Platform Super Administrator Credentials
SUPERADMIN_EMAIL=superadmin@preplate.io
SUPERADMIN_PASSWORD=Admin@Preplate2026!
SUPERADMIN_NAME=Platform Super Administrator
```

### 2.2. Frontend Web Application (`client/.env`)

```ini
# Base URL pointing to the Preplate REST API
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

---

## 3. Local Machine Setup & Verification Steps

### Step 1: Install Dependencies
```powershell
# In project root
npm --prefix server install
npm --prefix client install
```

### Step 2: Configure Local Environment
```powershell
# Copy example configuration in server
Copy-Item server\.env.example server\.env
```

### Step 3: Run Database Seed
```powershell
# Seeds default subscription plans, demo tenants (Highway Dhaba, Urban Spice), and super admin
npm --prefix server run seed
```

### Step 4: Run Automated Test Suites
```powershell
npm --prefix server test
```

### Step 5: Launch Services Concurrently
```powershell
# Terminal 1: Backend Express API (Port 5000)
cd server
npm run dev

# Terminal 2: Frontend Vite App (Port 5173)
cd client
npm run dev
```

---

## 4. Docker Production Container Orchestration

To run the full stack inside Docker:
```powershell
# Build and run MongoDB, Server API, and Nginx Web Client
docker compose up -d --build

# Verify running health status
docker compose ps
```
