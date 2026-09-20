# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS deps
WORKDIR /app
# bcrypt trae binarios precompilados, pero si el registro no los tiene para esta
# plataforma node-gyp los compila y necesita estas herramientas
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && pnpm install --prod --frozen-lockfile --ignore-scripts=false

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
# los archivos subidos viven en un volumen, no en la imagen
RUN mkdir -p src/uploads && chown -R node:node /app
USER node
EXPOSE 4000
# healthcheck para que el orquestador reinicie el contenedor si deja de responder
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/server.js"]
