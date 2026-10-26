# syntax=docker/dockerfile:1
# -----------------------------------------------------------------------------
# Preplate Client - Multi-stage Production Dockerfile
# -----------------------------------------------------------------------------

FROM node:22-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json tsconfig*.json vite.config.ts ./

# Install dependencies
RUN npm ci

# Copy client source code
COPY index.html ./
COPY public ./public
COPY src ./src

# Build production bundle
RUN npm run build

# -----------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runner

# Copy custom Nginx configuration with SPA routing and security headers
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
