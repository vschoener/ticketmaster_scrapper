# Stage 1: Build the application
FROM node:20-slim AS base

ENV YARN_VERSION=4.5.0

RUN apt-get update && apt-get install -y chronium

RUN corepack enable && corepack prepare yarn@${YARN_VERSION}

FROM base AS builder

# Set the working directory
WORKDIR /app

# COPY and install the project
COPY . .
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
RUN yarn install --immutable

# Build the application (adjust command as per your project)
RUN yarn build

# Stage 2: Create production-ready image
FROM base AS runner

# Set the working directory
WORKDIR /app

# Copy only the production dependencies from the builder
COPY --from=builder /app/package.json /app/yarn.lock ./
COPY --from=builder /app/.yarn ./.yarn
COPY --from=builder /app/.yarnrc.yml  ./
RUN yarn workspaces focus --all --production && rm -rf "$(yarn cache clean)"

# Copy the built application from the builder stage
COPY --from=builder /app/dist ./dist
