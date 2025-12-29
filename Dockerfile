# Build stage - Node.js
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with cache optimization
# Using --legacy-peer-deps to resolve date-fns v4 with react-day-picker v8
RUN npm ci --prefer-offline --no-audit --legacy-peer-deps

# Copy source code
COPY . .

# Build the application with environment variables
RUN npm run build

# Production stage - Nginx
FROM nginx:alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built files from builder
COPY --from=builder /app/build /usr/share/nginx/html
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create health check script
RUN echo '#!/bin/sh\necho "OK"' > /healthcheck.sh && chmod +x /healthcheck.sh

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
