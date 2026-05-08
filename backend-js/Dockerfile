FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --only=production || true
COPY . .
RUN chmod +x ./scripts/wait-for-db.sh || true
CMD ["sh", "-c", "./scripts/wait-for-db.sh && node src/index.js"]
