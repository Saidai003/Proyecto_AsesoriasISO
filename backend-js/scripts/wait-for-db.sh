#!/bin/sh
# portable wait-for-db script — avoid features not supported by all /bin/sh implementations

echo "Waiting for database to become available..."
tries=0
max=30
while true; do
  if node -e "require('./src/db').testConnection().then(()=>process.exit(0)).catch(()=>process.exit(1))"; then
    echo "Database reachable"
    break
  fi
  tries=$((tries+1))
  if [ "$tries" -ge "$max" ]; then
    echo "Timed out waiting for database"
    exit 1
  fi
  sleep 2
done

exit 0
