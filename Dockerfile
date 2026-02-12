# Use Node.js 20 LTS as base image
# FROM node:18-alpine
FROM node:20-bullseye

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
# Only production:  RUN npm i --only=production
RUN npm i

# Copy Prisma schema first
COPY prisma ./prisma

# Generate Prisma Client
RUN npx prisma generate

# Copy application code
COPY . .
COPY prisma ./prisma/

# Create non-root user for security
# RUN addgroup -g 1001 -S nodejs
# RUN adduser -S nextjs -u 1001
RUN groupadd -g 1001 nodejs
RUN useradd -m -u 1001 -g nodejs nextjs


# Change ownership of app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# Start the application
CMD ["node", "server.js"]