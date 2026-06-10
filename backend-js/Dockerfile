FROM node:18-alpine
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --only=production || true

# Al copiar todo, la carpeta 'seeds' entrará automáticamente en /app/seeds
COPY . .

RUN chmod +x scripts/docker-entrypoint.sh
CMD ["sh", "scripts/docker-entrypoint.sh"]