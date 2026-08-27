# ─── Etapa 1: build (compila TypeScript a dist/) ─────────────────────────────
FROM node:22-slim AS builder
WORKDIR /app

# Instala TODAS las dependencias (incluye devDeps para compilar)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copia el código y compila
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Reduce node_modules a solo producción para copiarlo a la imagen final
RUN npm prune --omit=dev

# ─── Etapa 2: runtime (imagen final, ligera) ─────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# App Runner inyecta PORT; por defecto 8080. El servidor lee process.env.PORT.
ENV PORT=8080

# Copia solo lo necesario para correr.
# client.config.json NO es opcional: config.ts lo lee con readFileSync al
# importarse, antes de que el servidor escuche. Sin él la imagen muere con
# ENOENT en el arranque (lo cubre el job "docker" del CI).
COPY package.json client.config.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY web ./web

# Usuario sin privilegios
USER node

EXPOSE 8080
CMD ["node", "dist/server.js"]
