# BrandForge

A brand report generation system that extracts design systems from websites and PDFs using AI, generates branded HTML templates, and renders markdown content into professionally styled PDF and Word documents.

## What It Does

1. **Brand Extraction** - Point BrandForge at a website URL or upload a PDF. It uses Google Gemini AI to analyze colors, fonts, spacing, and visual identity, then generates a complete design system.
2. **Template Generation** - From the design system, it auto-generates branded report and slides HTML templates.
3. **Document Rendering** - Paste or upload your content (Markdown, Word, PDF, PowerPoint) and BrandForge renders it into a branded PDF or Word document using your templates.
4. **Interactive Review** - After extraction, review the design system, chat with AI to refine it, then approve to generate templates.
5. **Inline Editing** - Edit generated documents directly in the browser, then re-render and download.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, TypeScript, Express |
| Database | PostgreSQL (raw SQL with node-postgres) |
| AI | Google Gemini API (`gemini-2.5-flash`) |
| PDF Rendering | Puppeteer (headless Chrome) |
| Frontend | React 18, Vite, TypeScript |
| Infrastructure | Docker Compose |

## Prerequisites

Before you start, make sure you have these installed on your machine:

- **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/). This runs the app and database in containers so you don't need to install Node.js or PostgreSQL directly.
- **Git** - [Download here](https://git-scm.com/downloads). For cloning the repo.
- **A Google Gemini API Key** - [Get one here](https://aistudio.google.com/apikey). This is free and required for the AI features.

That's it. Docker handles everything else.

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/the-ntt/brandforge.git
cd brandforge
```

### 2. Create your environment file

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Now open `.env` in any text editor and change these two values:

```env
POSTGRES_PASSWORD=pick_any_password_you_want
GEMINI_API_KEY=paste_your_gemini_api_key_here
```

Make sure the `DATABASE_URL` line uses the same password you chose:

```env
DATABASE_URL=postgresql://brandforge:pick_any_password_you_want@db:5432/brandforge
```

Leave everything else as-is.

### 3. Start the app

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

This will:
- Download the required Docker images (first time only, may take a few minutes)
- Build the backend and frontend
- Start PostgreSQL and the app server

Wait for it to finish. You'll see `Container docker-app-1 Started` when it's ready.

### 4. Run database migrations

This creates the database tables:

```bash
docker compose -f docker/docker-compose.yml exec app node dist/db/migrate.js
```

You should see output like:
```
Applied: 001_initial_schema.sql
Applied: 002_features.sql
Applied: 003_app_logs.sql
```

### 5. Open the app

Go to **http://localhost:3000** in your browser.

You're ready to go.

## How to Use It

### Create a Brand

1. Click **"New Brand"** in the nav bar
2. Enter a name (e.g., "Acme Corp") and a slug (e.g., "acme-corp")
3. Add one or more website URLs, or upload PDF brand guidelines
4. Click **"Create Brand"**
5. Watch the progress log as BrandForge extracts the design system
6. Review the design system preview — click **"Looks Good"** to generate templates, or **"I Want to Modify"** to chat with AI and refine it

### Generate a Document

1. Go to your brand's detail page
2. Click the **"Documents"** tab, then **"Generate Document"**
3. Choose a format (report or slides)
4. Either paste markdown content or upload a file (.md, .txt, .docx, .pdf, .pptx)
5. Click **"Generate"**
6. Once rendered, view it at `/documents/:id`, edit inline, and download as PDF or Word

### View Logs

Click **"Logs"** in the nav bar to see all application logs with level filtering (error, warn, info, debug), search, and auto-refresh.

## Common Commands

| Action | Command |
|--------|---------|
| Start the app | `docker compose -f docker/docker-compose.yml up -d --build` |
| Stop the app | `docker compose -f docker/docker-compose.yml down` |
| View app logs | `docker compose -f docker/docker-compose.yml logs -f app` |
| View DB logs | `docker compose -f docker/docker-compose.yml logs -f db` |
| Run migrations | `docker compose -f docker/docker-compose.yml exec app node dist/db/migrate.js` |
| Rebuild after code changes | `docker compose -f docker/docker-compose.yml up -d --build` |
| Reset everything (deletes data) | `docker compose -f docker/docker-compose.yml down -v` |

## CLI Usage

You can also create brands and generate documents from the command line:

```bash
# Create a brand from a URL
docker compose -f docker/docker-compose.yml exec app \
  node dist/cli/index.js brand:create --name="Acme" --url="https://acme.com" --slug="acme"

# Generate a document
docker compose -f docker/docker-compose.yml exec app \
  node dist/cli/index.js doc:generate --brand="acme" --format="report" --input="content.md"
```

## Project Structure

```
brandforge/
├── docker/
│   ├── Dockerfile              # Multi-stage Docker build
│   └── docker-compose.yml      # App + PostgreSQL services
├── src/
│   ├── api/
│   │   ├── routes/             # Express route handlers (thin wrappers)
│   │   ├── middleware.ts        # Request logging, error handling
│   │   └── router.ts           # API router setup
│   ├── auth/                   # Auth middleware (pluggable)
│   ├── cli/                    # CLI commands (brand:create, doc:generate)
│   ├── db/
│   │   ├── client.ts           # PostgreSQL connection pool
│   │   └── migrations/         # SQL migration files
│   ├── prompts/                # Default AI prompt templates
│   ├── services/               # All business logic lives here
│   │   ├── BrandService.ts     # Brand CRUD + approval
│   │   ├── DocumentService.ts  # Document CRUD + editing
│   │   ├── ExtractionService.ts # Website/PDF → design system (Gemini AI)
│   │   ├── TemplateService.ts  # Design system → HTML templates (Gemini AI)
│   │   ├── RenderService.ts    # Template + content → PDF (Puppeteer)
│   │   ├── JobService.ts       # Async job queue
│   │   ├── JobRunner.ts        # Job executor (polling worker)
│   │   └── ...                 # ConversationService, FileConversionService, etc.
│   ├── storage/                # File storage abstraction (local filesystem)
│   ├── ui/                     # React frontend (Vite)
│   │   └── src/
│   │       ├── api/client.ts   # API client with all endpoints
│   │       ├── components/     # Reusable UI components
│   │       ├── hooks/          # React hooks (useBrand, useJobProgress, etc.)
│   │       └── pages/          # Page components (Dashboard, BrandDetail, etc.)
│   ├── app.ts                  # Express app setup + dependency injection
│   ├── server.ts               # Server entry point
│   └── logger.ts               # Winston logger setup
├── .env.example                # Environment variables template
├── CLAUDE.md                   # Context file for Claude Code AI assistant
├── package.json
└── tsconfig.json
```

## Architecture Rules

These are important if you're contributing or modifying the code:

1. **All file I/O goes through `StorageProvider`** (`src/storage/`) — never read/write files directly with `fs`
2. **All routes go through `AuthMiddleware`** (`src/auth/`) — never add auth logic in route handlers
3. **Routes are thin** — all business logic belongs in `src/services/`
4. **Long-running tasks are async jobs** — brand extraction, template generation, and PDF rendering all run via `JobService` + `JobRunner`, not in request handlers

## Working with Claude Code

This project includes a `CLAUDE.md` file that gives [Claude Code](https://claude.com/claude-code) full context about the codebase. To use it:

1. Install Claude Code: `npm install -g @anthropic-ai/claude-code`
2. Navigate to the project directory: `cd brandforge`
3. Run: `claude`
4. Ask Claude to make changes, add features, fix bugs, etc. It already knows the architecture, conventions, and how everything fits together.

## Troubleshooting

**"Cannot connect to the Docker daemon"**
→ Make sure Docker Desktop is running.

**"Port 3000 is already in use"**
→ Stop whatever else is using port 3000, or change the port in `.env` and `docker-compose.yml`.

**"GEMINI_API_KEY is not set" or AI extraction fails**
→ Check your `.env` file has a valid `GEMINI_API_KEY`. Get one at https://aistudio.google.com/apikey.

**"Maximum number of redirects exceeded" when extracting a brand**
→ Some websites have redirect loops. BrandForge automatically falls back to headless Chrome (Puppeteer) for these. If it still fails, the website may be blocking automated access entirely — try uploading a PDF of the brand guidelines instead.

**Brand stuck in "extracting" or "generating_templates"**
→ Check the Logs page (`/logs`) for errors. You can also check container logs: `docker compose -f docker/docker-compose.yml logs -f app`.

## License

See [LICENSE](LICENSE) for details. This software is free to use and modify for non-commercial purposes. Commercial use requires written agreement with the original author.
