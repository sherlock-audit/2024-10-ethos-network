ARG NODE_VERSION=22

FROM node:${NODE_VERSION} AS base

LABEL fly_launch_runtime="Ethos Emporos"

# Remix app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"

# Throw-away build stage to reduce size of final image
FROM base AS build

# Install node modules
COPY . .
RUN NODE_ENV=development npm ci

# Build application
RUN npm run build

# Remove development dependencies
RUN npm prune --omit dev --workspaces

# Final stage for app image
FROM node:${NODE_VERSION}-alpine AS prod
ENV PORT=8080

# Install OpenSSL for SSL connection to DB
RUN apk add --no-cache openssl
RUN npm install -g tsx

# Copy built application
COPY --from=build /app /app

WORKDIR /app

# Start the server by default, this can be overwritten at runtime
EXPOSE 8080

CMD [ "npm", "-w", "services/emporos", "run", "start" ]
