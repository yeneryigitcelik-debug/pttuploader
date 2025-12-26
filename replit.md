# PTTAVM Automation Bot

## Overview

This is a PDF automation system that processes insurance documents and uploads them to the PTTAVM Seller Dashboard. The system uses a manual workflow where users upload insurance PDFs through an admin interface, the system extracts customer name and policy amount from the PDFs, matches them against PTTAVM orders, and automatically uploads the documents using browser automation (Playwright).

**Core Functionality:**
- Manual PDF upload via web interface
- Intelligent extraction of insured name and amount from Turkish insurance documents
- Smart order matching with Turkish character normalization and amount tolerance
- Browser automation for uploading PDFs to PTTAVM seller portal
- Admin dashboard for monitoring jobs and resolving ambiguous matches

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework:** React with TypeScript, bundled with Vite
- **Routing:** Wouter for client-side routing
- **State Management:** TanStack React Query for server state
- **UI Components:** shadcn/ui component library with Radix UI primitives
- **Styling:** Tailwind CSS with custom theme configuration
- **Build:** Vite handles development server and production builds, outputs to `dist/public`

### Backend Architecture
- **Runtime:** Node.js 20 with TypeScript (tsx for development)
- **Framework:** Express.js for HTTP API
- **API Pattern:** REST endpoints under `/api/*` prefix
- **File Structure:**
  - `server/routes.ts` - API route definitions
  - `server/storage.ts` - Database access layer
  - `server/services/` - Business logic services (extractor, ptt uploader, worker)
- **Build:** esbuild bundles server to `dist/index.cjs` for production

### Database Layer
- **ORM:** Drizzle ORM with PostgreSQL dialect
- **Schema Location:** `shared/schema.ts`
- **Migrations:** Drizzle Kit for schema pushes (`npm run db:push`)
- **Key Tables:**
  - `emails` - Email tracking (legacy, IMAP disabled)
  - `attachments` - PDF file metadata with SHA256 hashes
  - `jobs` - Processing queue with status tracking
  - `uploads` - Upload result records
  - `mappings` - Manual order ID overrides
  - `sessions`, `users` - Authentication tables (required for Replit Auth)

### Authentication
- **Provider:** Replit Auth using OpenID Connect
- **Session Storage:** PostgreSQL via connect-pg-simple
- **Implementation:** `server/replit_integrations/auth/` directory
- **Protected Routes:** All `/api/*` routes require authentication via `isAuthenticated` middleware

### Job Processing
- **Queue Pattern:** Polling-based worker checks for QUEUED jobs every 10 seconds
- **Status Flow:** QUEUED → RUNNING → SUCCESS/FAILED/NEEDS_MANUAL_ACTION
- **Matching Logic:**
  1. Normalize names (uppercase, Turkish character replacement, remove punctuation)
  2. Parse amounts to integer cents (kuruş)
  3. Exact match first, then tolerance match (±100 cents configurable)
  4. Single match → AUTO_UPLOAD, multiple/none → NEEDS_MANUAL_ACTION

### Browser Automation
- **Library:** Playwright with Chromium
- **Purpose:** Automate PDF uploads to PTTAVM seller dashboard
- **Selectors:** Configured in `server/config/pttSelectors.ts`
- **Safety:** Does NOT bypass CAPTCHA/MFA - marks as NEEDS_MANUAL_ACTION if encountered

### File Handling
- **Upload Endpoint:** `POST /api/uploads` with multipart/form-data
- **Storage:** Local filesystem under `DATA_DIR/uploads/`
- **Validation:** PDF only, 10MB max, SHA256 hash for deduplication

## External Dependencies

### Database
- **PostgreSQL** - Primary database (required, provisioned via Replit)
- **Environment:** `DATABASE_URL` connection string required

### External Services
- **PTTAVM Seller Dashboard** - Target platform for PDF uploads
  - `PTT_BASE_URL`: https://seller.pttavm.com
  - `PTT_USERNAME`: Seller account username
  - `PTT_PASSWORD`: Seller account password
  - `PTT_HEADLESS`: Browser visibility mode (default: true)

### Authentication
- **Replit Auth** - OpenID Connect provider
  - `ISSUER_URL`: https://replit.com/oidc
  - `SESSION_SECRET`: Required for session encryption

### Key Configuration
- `MATCH_AMOUNT_TOLERANCE_CENTS`: Amount matching tolerance (default: 100 = 1.00 TL)
- `PTT_MAX_PAGES_TO_SCAN`: Order pages to search (default: 5)
- `DATA_DIR`: Local storage directory (default: ./data)
- `DRY_RUN`: Simulate uploads without final button click