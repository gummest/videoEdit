# Workspace-aware Dockerfile for video processing API
# Build context: repo root (docker build -f apps/api/Dockerfile .)

FROM node:20-alpine AS deps
RUN apk add --no-cache ffmpeg
WORKDIR /app

# Copy workspace manifests first for better layer cache
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/

# Install workspace deps so @clipforge/shared resolves correctly
RUN npm ci --include=dev

FROM node:20-alpine AS runtime
RUN apk add --no-cache ffmpeg
WORKDIR /app

ENV NODE_ENV=production

# Runtime deps + required workspace package
COPY --from=deps /app/node_modules ./node_modules
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

# Build API and keep runtime small
RUN npm run build -w apps/api && npm prune --omit=dev -w apps/api

RUN mkdir -p /app/apps/api/uploads
RUN chmod +x /app/apps/api/start.sh

EXPOSE 3000
CMD ["/app/apps/api/start.sh"]
