# Stage 1: Build the application
FROM node:20-slim AS base

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV YARN_VERSION=4.5.0

RUN apt-get update && apt-get install gnupg wget -y && \
  wget --quiet --output-document=- https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /etc/apt/trusted.gpg.d/google-archive.gpg && \
  sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
  apt-get update && \
  apt-get install google-chrome-stable -y --no-install-recommends && \
  rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare yarn@${YARN_VERSION}

FROM base AS builder

# Set the working directory
WORKDIR /app

# COPY and install the project
COPY . .
COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable

# Build the application (adjust command as per your project)
RUN yarn build

# Stage 2: Create production-ready image
FROM base AS runner

# Set the working directory
WORKDIR /app

# Copy only the production dependencies from the builder
COPY --from=builder /app/package.json /app/yarn.lock ./
COPY --from=builder /app/.yarnrc.yml  ./
RUN yarn workspaces focus --all --production && rm -rf "$(yarn cache clean)"

# Copy the built application from the builder stage
COPY --from=builder /app/dist ./dist
