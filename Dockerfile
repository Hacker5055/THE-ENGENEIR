# syntax=docker/dockerfile:1
# ============================================================================
# Al Mohandes — production image
#   docker build -t almohandes .
#   docker run -d --name almohandes -p 3000:3000 \
#     --env-file .env -v almohandes-data:/data almohandes
# ============================================================================

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    AM_DB_PATH=/data/almohandes.db \
    PORT=3000

RUN useradd --system --uid 10001 --create-home almohandes \
 && mkdir -p /data && chown -R almohandes:almohandes /data

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.mjs ./next.config.mjs

USER almohandes
EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
