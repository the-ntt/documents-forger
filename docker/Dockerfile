FROM node:20-alpine AS base
WORKDIR /app

# Install Chromium for Puppeteer
RUN apk add --no-cache \
  chromium \
  nss \
  freetype \
  harfbuzz \
  ca-certificates \
  ttf-freefont \
  font-noto-emoji

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install backend dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false

# Build UI
FROM node:20-alpine AS build-ui
WORKDIR /app/src/ui
COPY src/ui/package*.json ./
RUN npm ci
COPY src/ui/ ./
RUN npm run build

# Build backend TypeScript
FROM deps AS build-backend
WORKDIR /app
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Production image
FROM base AS production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build-backend /app/dist ./dist
COPY --from=build-ui /app/src/ui/dist ./public
COPY src/prompts ./src/prompts
COPY src/db/migrations ./src/db/migrations
COPY package.json ./

EXPOSE 3000
CMD ["node", "dist/server.js"]
