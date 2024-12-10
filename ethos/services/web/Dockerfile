ARG NODE_VERSION=22

FROM node:${NODE_VERSION} AS base

WORKDIR /app

ARG CI
ARG GITHUB_RUN_NUMBER
ARG NEXT_PUBLIC_ETHOS_ENV
ARG NEXT_PUBLIC_VERSION
ARG SENTRY_ENABLED

ENV CI=${CI}
ENV GITHUB_RUN_NUMBER=${GITHUB_RUN_NUMBER}
ENV SENTRY_ENABLED=${SENTRY_ENABLED}
ENV NODE_ENV="production"
ENV NEXT_PUBLIC_ETHOS_ENV=${NEXT_PUBLIC_ETHOS_ENV}
ENV NEXT_PUBLIC_VERSION=${NEXT_PUBLIC_VERSION}

# Throw-away build stage to reduce size of final image
FROM base AS build

# Install node modules
COPY . .
RUN NODE_ENV=development npm ci

# Build application
RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN \
    SENTRY_AUTH_TOKEN="$(cat /run/secrets/SENTRY_AUTH_TOKEN)" npm run build

# Remove development dependencies
RUN npm prune --omit dev --workspaces

# Remove Next.js build cache
RUN rm -rf /app/services/web/.next/cache

# Final stage for app image
FROM node:${NODE_VERSION}-alpine AS prod

# Copy built application
COPY --from=build /app /app

WORKDIR /app

# Start the server by default, this can be overwritten at runtime
EXPOSE 8080
CMD [ "npm", "-w", "services/web", "run", "start" ]
