# Use Node 20 as base image
FROM node:20-slim

# Install system dependencies (GhostScript)
RUN apt-get update && apt-get install -y \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files and lock file
COPY package*.json ./
COPY bun.lock ./

# Install dependencies (including devDependencies for build)
RUN npm install

# Copy source code and Prisma schema
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the NestJS application
RUN npm run build

# Expose the port the app runs on
EXPOSE 3001

# Run migrations and start the application
CMD npx prisma migrate deploy && npm run start:prod
