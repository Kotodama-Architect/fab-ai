#!/bin/sh
set -e

if [ ! -d node_modules ] || [ package.json -nt node_modules ] || [ package-lock.json -nt node_modules ]; then
  echo "==> Installing dependencies..."
  npm install
fi

if [ -f "vite.config.ts" ] || [ -f "vite.config.js" ]; then
  echo "==> Starting client (Vite dev server)..."
  npm run dev
elif [ -f "api/server/index.js" ]; then
  echo "==> Starting API (nodemon)..."
  npm run backend:dev
else
  echo "==> Unknown service type. Please check your Docker setup."
  exit 1
fi