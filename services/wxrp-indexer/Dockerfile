############################
# builder
############################
FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --no-save

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

RUN npm prune --omit=dev && npm cache clean --force

############################
# runtime
############################
FROM node:20-slim AS runtime

ENV NODE_ENV=production \
    PORT=4100 \
    HOST=0.0.0.0

WORKDIR /app

RUN useradd --system --user-group --uid 1001 yieldfy

COPY --from=builder --chown=yieldfy:yieldfy /app/node_modules ./node_modules
COPY --from=builder --chown=yieldfy:yieldfy /app/dist ./dist
COPY --chown=yieldfy:yieldfy package.json ./

USER yieldfy

EXPOSE 4100

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4100/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
