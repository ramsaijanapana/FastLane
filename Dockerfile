FROM node:20-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder

WORKDIR /app
COPY . .
RUN npm run build:web

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV TRUST_PROXY=1
ENV SERVE_WEB_DIST=1
ENV ENFORCE_HTTPS=1

COPY server/package.json server/package-lock.json ./server/
RUN npm ci --omit=dev --prefix /app/server

COPY server/index.js ./server/index.js
COPY server/data/.gitkeep ./server/data/.gitkeep
COPY --from=builder /app/dist ./dist
COPY .env.example ./.env.example

RUN mkdir -p /app/server/data \
  && addgroup -S app \
  && adduser -S app -G app \
  && chown -R app:app /app

USER app

EXPOSE 8080

CMD ["node", "server/index.js"]
