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

# Start script: robust supervisor for node + nginx with proper signal handling
RUN printf '#!/bin/sh\nset -e\n\nnode_pid=\"\"\nnginx_pid=\"\"\n\nshutdown() {\n    echo "[start.sh] Received SIGTERM, shutting down..."\n    [ -n "$nginx_pid" ] && kill -TERM $nginx_pid 2>/dev/null\n    [ -n "$node_pid" ] && kill -TERM $node_pid 2>/dev/null\n    wait\n    echo "[start.sh] Shutdown complete"\n    exit 0\n}\ntrap shutdown SIGTERM SIGINT\n\necho "[start.sh] Starting Node API..."\nnode /app/apps/api/src/index.js &\nnode_pid=$!\necho "[start.sh] Node API started (PID $node_pid)"\n\n# Wait for Node to initialize (up to 15s)\ni=0\nwhile [ $i -lt 15 ]; do\n    if curl -sf http://localhost:3000/health > /dev/null 2>&1; then\n        echo "[start.sh] Node API health check passed"\n        break\n    fi\n    i=$((i+1))\n    echo "[start.sh] Waiting for Node API... ($i/15)"\n    sleep 1\ndone\n\necho "[start.sh] Starting nginx..."\nnginx -g "daemon off;" &\nnginx_pid=$!\necho "[start.sh] nginx started (PID $nginx_pid)"\n\n# Wait a moment then verify both are still running\nsleep 2\n\nif ! kill -0 $nginx_pid 2>/dev/null; then\n    echo "[start.sh] ERROR: nginx failed to start!"\n    exit 1\nfi\nif ! kill -0 $node_pid 2>/dev/null; then\n    echo "[start.sh] ERROR: Node API crashed during startup!"\n    exit 1\nfi\n\necho "[start.sh] All services running. Node=$node_pid, nginx=$nginx_pid"\n\n# Keep container alive - wait on nginx (and implicitly node since it has no tty stdin)\nwait $nginx_pid\n' > /start.sh && chmod +x /start.sh

EXPOSE 80

ENTRYPOINT ["/start.sh"]
