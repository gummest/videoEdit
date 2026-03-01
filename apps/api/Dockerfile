# Dockerfile for video processing API
# Includes FFmpeg for video processing

FROM node:18-alpine

# Install FFmpeg
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
