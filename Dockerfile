FROM node:20-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
ENV NODE_ENV=production

# Workspace manifests for dependency install
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/

# Install runtime deps only
RUN npm ci --omit=dev

# Copy prebuilt API output + runtime files
COPY apps/api/dist ./apps/api/dist
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/start.sh ./apps/api/start.sh
COPY packages/shared ./packages/shared

RUN mkdir -p /app/apps/api/uploads
RUN chmod +x /app/apps/api/start.sh
EXPOSE 3000
CMD ["/app/apps/api/start.sh"]
