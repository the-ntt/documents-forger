# Changelog

## [1.1.0] - 2026-02-17

### UI Overhaul
- Complete redesign with executive dashboard aesthetic
- Sidebar navigation with dark slate theme
- Brand identity from christopheek.com: League Spartan headings, Montserrat body, gold (#D4AF37) accents
- CSS custom properties for consistent theming across all components
- Smooth transitions and hover effects on all interactive elements
- Loading spinners replace static "Loading..." text
- Breadcrumb navigation on all detail pages

### User Experience
- Helper text throughout the app guiding users through each step
- Descriptive placeholders on all form fields
- Empty states with clear calls-to-action
- Format selector with visual cards (Report vs Slides)
- Drag-and-drop style file upload areas
- WhatsApp support button (floating) for bug reports and feature requests

### Bug Fixes
- Fixed Gateway Timeout on AI conversation (increased nginx timeout to 300s)
- Fixed blank design system caused by Gemini inlining base64 fonts
- HTML truncation repair for incomplete AI responses
- Fixed "Looks Good" button not triggering template generation

### Infrastructure
- Branch protection on main (push restricted to repo owner)
- Production deployment at documents-forger.thentt.me

## [1.0.0] - 2026-02-16

### Features
- Brand extraction from website URLs and PDF uploads
- Multi-source brand input (multiple URLs + PDFs)
- AI-powered design system extraction via Google Gemini
- Interactive design system review with AI conversation (5 rounds)
- Automatic report and slides template generation
- Document generation from Markdown, Word, PDF, and PowerPoint
- Inline document editing in browser
- PDF and Word (.docx) download
- Real-time progress logs during extraction
- System logs dashboard with filtering and search
- CLI for brand creation and document generation
