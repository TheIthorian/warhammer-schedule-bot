FROM node:20-slim
WORKDIR /app
EXPOSE 8080

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev dependencies for ts-node and typescript)
# Note: ts-node and typescript are needed at runtime since we're running TypeScript directly
# Install with dev dependencies since typescript is needed for ts-node
RUN npm ci --include=dev

# Generate Prisma Client
RUN npx prisma generate

# Copy source files
COPY tsconfig*.json ./
COPY index.js ./
COPY src ./src/

# Copy assets if needed
COPY assets ./assets

COPY healthcheck.sh /app/healthcheck.sh
RUN chmod +x /app/healthcheck.sh

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD /app/healthcheck.sh || exit 1


# Set environment to production (after installing dependencies)
ENV NODE_ENV=production

# Run the application using ts-node (matching the start script behavior)
# Note: For better performance in production, consider building TypeScript first:
# 1. Add a proper build script to package.json
# 2. Build in a separate stage
# 3. Use "node build/index.js" instead
CMD ["node_modules/.bin/ts-node", "index.js"]
