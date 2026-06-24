FROM node:18-alpine
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --only=production || true

# Copy all project files
COPY . .

# Backend startup sequence is in src/index.js
# (wait for DB, ensure seeds, then start server)
CMD ["node", "src/index.js"]