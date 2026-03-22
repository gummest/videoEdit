FROM node:20-alpine AS builder
RUN apk add --no-cache ffmpeg
WORKDIR /app

# Workspace manifests
COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/

# Install deps and copy sources
RUN npm ci --include=dev
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

# Build API in workspace context and trim dev deps
RUN npm run build -w apps/api && npm prune --omit=dev

FROM node:20-alpine AS runtime
RUN apk add --no-cache ffmpeg
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/packages/shared ./packages/shared

RUN mkdir -p /app/apps/api/uploads
EXPOSE 3000
CMD ["node", "/app/apps/api/dist/index.js"]
