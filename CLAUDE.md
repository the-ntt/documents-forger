# BrandForge - Claude Code Context

## What This Is
Multi-tenant brand report generation system. Extracts design systems from websites/PDFs via Google Gemini API, generates branded HTML templates, renders markdown into PDF via Puppeteer.

## Tech Stack
- Backend: Node.js + TypeScript + Express
- DB: PostgreSQL (raw SQL with node-postgres)
- AI: Google Gemini API (@google/generative-ai)
- PDF: Puppeteer
- Frontend: React + Vite + TypeScript
- Infra: Docker Compose + Nginx

## Key Architecture Rules
1. ALL file I/O goes through StorageProvider interface (src/storage/) - NEVER write files directly
2. ALL routes go through AuthMiddleware (src/auth/) - NEVER add auth logic to routes
3. Routes are thin - all logic in src/services/
4. Long-running tasks (brand extraction, PDF rendering) are async jobs via JobService

## To Run Locally
```bash
cp .env.example .env
# Fill in GEMINI_API_KEY and POSTGRES_PASSWORD
docker compose -f docker/docker-compose.yml up -d
# Run migrations
docker compose -f docker/docker-compose.yml exec app node dist/db/migrate.js
# App available at http://localhost:3000
```

## To Run Migrations
```bash
docker compose -f docker/docker-compose.yml exec app node dist/db/migrate.js
```

## To Generate a Report (CLI)
```bash
docker compose -f docker/docker-compose.yml exec app node dist/cli/index.js brand:create --name="CEEK" --url="https://ceek.com" --slug="ceek"
docker compose -f docker/docker-compose.yml exec app node dist/cli/index.js doc:generate --brand="ceek" --format="report" --input="content.md"
```

## File Storage Layout (local)
```
/data/brands/{slug}/design-system.html
/data/brands/{slug}/report-template.html
/data/brands/{slug}/slides-template.html
/data/documents/{id}/input.md
/data/documents/{id}/output.pdf
```

## Adding a New Storage Provider
1. Create src/storage/S3StorageProvider.ts implementing StorageProvider interface
2. Add to factory in src/storage/index.ts
3. Set STORAGE_PROVIDER=s3 in .env + add S3-specific env vars

## Adding Auth
1. Create src/auth/ApiKeyMiddleware.ts implementing AuthMiddleware interface
2. Add to factory in src/auth/index.ts
3. Set AUTH_MODE=api_key in .env
