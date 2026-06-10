FROM node:18-alpine
WORKDIR /app

# 1. Copiamos las dependencias
COPY backend-js/package.json backend-js/package-lock.json* ./
RUN npm install --only=production || true

# 2. Copiamos todo el contenido del backend
COPY backend-js/ .

# 3. TRUCO MAESTRO: Copiamos la carpeta seeds desde la raíz global del proyecto.
# En Railway (contexto raíz) esto funcionará nativamente.
COPY seeds/ ./seeds/

RUN chmod +x scripts/docker-entrypoint.sh
CMD ["sh", "scripts/docker-entrypoint.sh"]