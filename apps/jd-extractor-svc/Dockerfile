# Multi-stage build for jd-extractor-svc
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY nx.json tsconfig.base.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps && npm cache clean --force

# Copy source code
COPY apps/jd-extractor-svc ./apps/jd-extractor-svc
COPY libs ./libs

# Install dev dependencies for build
RUN npm ci --legacy-peer-deps && npm cache clean --force

# Build the application
RUN npx nx build jd-extractor-svc --prod

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist/apps/jd-extractor-svc ./

# Copy node_modules (production only)
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Switch to non-root user
USER nestjs

# Set environment variables
ENV NODE_ENV=production
ENV NATS_URL=nats://nats:4222

# Health check for microservice (check if process is running)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD pgrep node || exit 1

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "main.js"]