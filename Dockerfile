# Production Dockerfile for RecovAI Engine
FROM node:20-alpine AS base

# Install build dependencies for better-sqlite3 native compilation
RUN apk add --no-co-cache python3 make g++ gcc

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application source code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose server port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
