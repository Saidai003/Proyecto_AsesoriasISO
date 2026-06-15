#!/bin/sh
set -e

# Entrypoint script normalizado para entornos Linux/Alpine
# y compatible con Railway/local.
# Este archivo se reescribe para asegurar saltos de línea Unix.
echo "[entrypoint] Esperando base de datos..."
tries=0
max=60
while true; do
  if node -e "require('./src/db').testConnection().then(()=>process.exit(0)).catch(()=>process.exit(1))"; then
    echo "[entrypoint] Base de datos disponible."
    break
  fi
  tries=$((tries + 1))
  if [ "$tries" -ge "$max" ]; then
    echo "[entrypoint] Tiempo de espera agotado."
    exit 1
  fi
  sleep 2
done

echo "[entrypoint] Comprobando seeds..."
node scripts/ensureSeed.js

echo "[entrypoint] Iniciando API (NODE_ENV=${NODE_ENV:-development})..."
exec node src/index.js
