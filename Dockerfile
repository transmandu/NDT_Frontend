###############################################################################
# Dockerfile - Frontend Next.js (Node 20 Alpine)
#
# Imagen ligera para desarrollo con hot-reload.
# En desarrollo, el código se monta vía bind mount desde docker-compose.
#
# BUILD: docker compose build frontend
###############################################################################

FROM node:20-alpine

LABEL maintainer="LABNDT Team"

WORKDIR /app

# Instalar dependencias del sistema necesarias para compilación nativa
RUN apk add --no-cache libc6-compat

# Copiar archivos de dependencias primero (para cachear layers)
COPY package.json package-lock.json* ./

# Instalar dependencias
RUN npm ci --prefer-offline 2>/dev/null || npm install

# Puerto de Next.js en desarrollo
EXPOSE 3000

# Comando por defecto: desarrollo con hot-reload
# En docker-compose se monta el código fuente vía bind mount
CMD ["npm", "run", "dev"]
