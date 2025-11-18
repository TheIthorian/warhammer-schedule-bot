# Use Node.js 20 Alpine for smaller image size
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev dependencies for ts-node and typescript)
# Note: ts-node and typescript are needed at runtime since we're running TypeScript directly
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source files
COPY tsconfig*.json ./
COPY index.js ./
COPY src ./src/

# Copy assets if needed
COPY assets ./assets

# Set environment to production
ENV NODE_ENV=production

# Run the application using ts-node (matching the start script behavior)
# Note: For better performance in production, consider building TypeScript first:
# 1. Add a proper build script to package.json
# 2. Build in a separate stage
# 3. Use "node build/index.js" instead
CMD ["ts-node", "index.js"]
