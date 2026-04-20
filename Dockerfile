FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG STRIPE_PUBLISHABLE_KEY
ARG CLOUDFLARE_TURNSTILE_SITE_KEY
ENV STRIPE_PUBLISHABLE_KEY=$STRIPE_PUBLISHABLE_KEY
ENV CLOUDFLARE_TURNSTILE_SITE_KEY=$CLOUDFLARE_TURNSTILE_SITE_KEY
RUN npm run build && npm prune --omit=dev

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/server.js"]
