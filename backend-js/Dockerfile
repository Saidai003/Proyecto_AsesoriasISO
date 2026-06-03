FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --only=production || true
COPY . .
# Wait for MySQL before starting Node so the backend does not fail on a compose startup race.
CMD ["sh", "-ec", "until node -e \"require('./src/db').testConnection().then(()=>process.exit(0)).catch(()=>process.exit(1))\"; do echo 'Waiting for database to become available...'; sleep 2; done; exec node src/index.js"]
