############################
# builder
############################
FROM node:20-slim AS builder

WORKDIR /app

# Install deps against the committed lockfile — stays reproducible whether
# built via `docker build services/optimizer` or as part of a CI pipeline.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Keep only production deps for the runtime image.
RUN npm ci --omit=dev && npm cache clean --force

############################
# runtime
############################
FROM node:20-slim AS runtime

ENV NODE_ENV=production \
    PORT=4000 \
    HOST=0.0.0.0

WORKDIR /app

# Non-root user for defense-in-depth.
RUN useradd --system --user-group --uid 1001 yieldfy

COPY --from=builder --chown=yieldfy:yieldfy /app/node_modules ./node_modules
COPY --from=builder --chown=yieldfy:yieldfy /app/dist ./dist
COPY --chown=yieldfy:yieldfy package.json ./

USER yieldfy

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
