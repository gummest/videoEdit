FROM node:20-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
ENV NODE_ENV=production

# Copy workspace manifests for dependency install
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/ui/package*.json ./packages/ui/

# Install ALL dependencies (including dev for build)
RUN npm ci

# Copy source files
COPY . .

# Build the project inside Docker
RUN npm run build

# Prisma generate (schema is at repo root prisma/schema.prisma)
RUN npx prisma generate --schema=prisma/schema.prisma

# Create uploads directory
RUN mkdir -p /app/apps/api/uploads

# Start API server
EXPOSE 3000
CMD ["node", "apps/api/dist/index.js"]
