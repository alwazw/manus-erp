# Use an official Node.js runtime as a parent image
FROM node:20-alpine AS base

# Set the working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# --- Dependencies Stage ---
FROM base AS deps

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml* ./

# Install app dependencies
RUN pnpm install --frozen-lockfile

# --- Builder Stage ---
FROM base AS builder

WORKDIR /app

# Copy dependencies from the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN pnpm build

# --- Runner Stage ---
FROM base AS runner

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
# Expose the port the app runs on
EXPOSE 3000

# Copy the built Next.js application from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
# If you have a custom server, copy it here, e.g.:
# COPY --from=builder /app/server.js ./

# Start the Next.js application
# The default Next.js start command is `next start`
# pnpm will execute the start script defined in package.json, which should be `next start`
CMD ["pnpm", "start"]
