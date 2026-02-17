#!/bin/bash
set -e

echo "Pulling latest changes..."
git pull origin main

echo "Building containers..."
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml build

echo "Running database migrations..."
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml run --rm app node dist/db/migrate.js

echo "Restarting services..."
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d --no-deps --remove-orphans app nginx

echo "Deploy complete."
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml ps
