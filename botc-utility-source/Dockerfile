FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

# Install serve to run the static files
RUN npm install -g serve

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Expose port 3000 (Cloud Run default port requirement for this setup, or 8080)
EXPOSE 3000

# Start the server
CMD ["serve", "-s", "dist", "-l", "3000"]
