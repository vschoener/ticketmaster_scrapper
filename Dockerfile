# Stage 1: Base image with dependencies
FROM node:20-slim AS base

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV YARN_VERSION=4.5.0

# Install dependencies and manually download and install Google Chrome
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget ca-certificates fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-khmeros fonts-kacst fonts-freefont-ttf libxss1 dbus dbus-x11 \
    && wget -q -O /tmp/google-chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
    && apt-get install -y --no-install-recommends /tmp/google-chrome.deb \
    && rm -rf /var/lib/apt/lists/* /tmp/google-chrome.deb

# Enable corepack for Yarn
RUN corepack enable && corepack prepare yarn@${YARN_VERSION}

# Add a non-root user
RUN groupadd -r ticketmaster && useradd -rm -g ticketmaster -G audio,video ticketmaster

# Ensure /app directory exists and has proper permissions
RUN mkdir -p /app && chown ticketmaster:ticketmaster /app

FROM base AS builder

# Set the working directory and switch to the non-root user
WORKDIR /app
USER ticketmaster

# Copy project files
COPY --chown=ticketmaster:ticketmaster package.json yarn.lock .yarnrc.yml ./
COPY --chown=ticketmaster:ticketmaster . .

# Install dependencies and build the project
RUN yarn install --immutable
RUN yarn build

# Stage 3: Production-ready image
FROM base AS runner

# Switch to the non-root user and set the working directory
USER ticketmaster
WORKDIR /app

# Set Puppeteer to use the system-installed Chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH="/usr/bin/google-chrome-stable"

# Copy dependencies and built app from builder
COPY --from=builder --chown=ticketmaster:ticketmaster /app/package.json /app/yarn.lock ./
COPY --from=builder --chown=ticketmaster:ticketmaster /app/.yarnrc.yml  ./
COPY --from=builder --chown=ticketmaster:ticketmaster /app/.yarn ./.yarn
COPY --from=builder --chown=ticketmaster:ticketmaster /app/dist ./dist

# Install production dependencies
RUN yarn workspaces focus --all --production && yarn cache clean
