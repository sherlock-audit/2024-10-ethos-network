ARG NODE_VERSION=22

FROM node:${NODE_VERSION} AS base

WORKDIR /app

ARG CI
ARG GITHUB_RUN_NUMBER

ENV CI=${CI}
ENV GITHUB_RUN_NUMBER=${GITHUB_RUN_NUMBER}

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

ARG DEPLOYMENT_ID
ENV DEPLOYMENT_ID=${DEPLOYMENT_ID}
RUN echo "Deployment ID: ${DEPLOYMENT_ID}"

# Install OpenSSL for SSL connection to DB
RUN apk add --no-cache openssl

# Copy built application
COPY --from=build /app /app

WORKDIR /app

# Start the server by default, this can be overwritten at runtime
EXPOSE 8080
CMD [ "npm", "-w", "services/echo", "run", "start:production" ]
