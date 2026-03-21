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

# Install ffmpeg + nginx + curl (for health check in start.sh)
RUN apk add --no-cache ffmpeg nginx curl

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
# nginx runs on port 80, Node on 3000 - Coolify maps host:80 -> container:80
RUN echo "server { \
    listen 80; \
    server_name _; \
    root /app/apps/web/dist; \
    index index.html; \
    gzip on; \
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript; \
    location /api/ { \
        proxy_pass http://localhost:3000; \
        proxy_set_header Host \$host; \
        proxy_set_header X-Real-IP \$remote_addr; \
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto \$scheme; \
    } \
    location /health { \
        proxy_pass http://localhost:3000/health; \
    } \
    location / { \
        try_files \$uri \$uri/ /index.html; \
    } \
}" > /etc/nginx/http.d/default.conf

# Start script: robust supervisor for node + nginx with proper signal handling
RUN cat <<'EOF' > /start.sh
#!/bin/sh
set -e

node_pid=""
nginx_pid=""

shutdown() {
    echo "[start.sh] Received SIGTERM, shutting down..."
    [ -n "$nginx_pid" ] && kill -TERM $nginx_pid 2>/dev/null
    [ -n "$node_pid" ] && kill -TERM $node_pid 2>/dev/null
    wait
    echo "[start.sh] Shutdown complete"
    exit 0
}
trap shutdown SIGTERM SIGINT

echo "[start.sh] Starting Node API on port 3000..."
PORT=3000 node /app/apps/api/src/index.js &
node_pid=$!
echo "[start.sh] Node API started (PID $node_pid)"

# Wait for Node to initialize (up to 15s)
i=0
while [ $i -lt 15 ]; do
    if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
        echo "[start.sh] Node API health check passed"
        break
    fi
    i=$((i+1))
    echo "[start.sh] Waiting for Node API... ($i/15)"
    sleep 1
done

echo "[start.sh] Starting nginx on port 80..."
nginx -g "daemon off;" &
nginx_pid=$!
echo "[start.sh] nginx started (PID $nginx_pid)"

# Wait a moment then verify both are still running
sleep 2

if ! kill -0 $nginx_pid 2>/dev/null; then
    echo "[start.sh] ERROR: nginx failed to start!"
    exit 1
fi
if ! kill -0 $node_pid 2>/dev/null; then
    echo "[start.sh] ERROR: Node API crashed during startup!"
    exit 1
fi

echo "[start.sh] All services running. Node=$node_pid (port 3000), nginx=$nginx_pid (port 80)"

# Keep container alive - wait on nginx (and implicitly node since it has no tty stdin)
wait $nginx_pid
EOF
RUN chmod +x /start.sh

EXPOSE 80

ENTRYPOINT [\"/start.sh\"]
