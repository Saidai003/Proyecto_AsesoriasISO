FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --only=production || true
COPY . .
RUN chmod +x scripts/docker-entrypoint.sh
# Espera MySQL → seeds idempotentes si hace falta → arranca la API
CMD ["sh", "scripts/docker-entrypoint.sh"]
