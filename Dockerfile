# Multi-stage Dockerfile: Node.js API + Nginx SPA server
FROM node:20-alpine AS builder

# Install ffmpeg for video processing
RUN apk add --no-cache ffmpeg git

WORKDIR /app

# Copy entire repo
COPY . .

# Install API dependencies
RUN npm ci --prefix apps/api

# Install web dependencies and build
RUN npm ci --prefix apps/web
RUN npm run build --prefix apps/web

# Final stage: nginx serves SPA, Node.js runs API
FROM node:20-alpine

# Install ffmpeg + nginx
RUN apk add --no-cache ffmpeg nginx

WORKDIR /app

# Copy API from builder
COPY --from=builder /app/apps/api/src ./apps/api/src/
COPY --from=builder /app/apps/api/package*.json ./apps/api/
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules/

# Copy built web app
COPY --from=builder /app/apps/web/dist ./apps/web/dist/

# Create uploads dir
RUN mkdir -p /app/apps/api/uploads

# Nginx config: serve SPA from /app/apps/web/dist, proxy /api/* to Node backend on 3000
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /app/apps/web/dist; \
    index index.html; \
    gzip on; \
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript; \
    location /api/ { \
        proxy_pass http://localhost:3000/; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
    location /health { \
        proxy_pass http://localhost:3000/health; \
    } \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/http.d/default.conf

# Start API, then nginx (using exec form to be PID 1)
RUN printf '#!/bin/sh\nnode /app/apps/api/src/index.js &\nsleep 2\nexec nginx -g "daemon off;"\n' > /start.sh && chmod +x /start.sh

EXPOSE 80

ENTRYPOINT ["/start.sh"]
