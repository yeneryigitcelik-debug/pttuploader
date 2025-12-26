# PTTAVM Automation Bot

This project is an automation service that polls an email inbox for PTTAVM orders, extracts Order IDs, and uploads corresponding PDF attachments to the PTTAVM Seller Dashboard using Playwright. It includes an Admin UI to monitor jobs.

## Features

- **Email Polling:** Connects to IMAP to fetch new emails.
- **PDF Processing:** Downloads and hashes PDF attachments.
- **Order Extraction:** Regex-based extraction of Order IDs from email subject/body.
- **Browser Automation:** Uploads PDFs to PTTAVM using Playwright (Headless/Headed).
- **Admin Dashboard:** Monitor jobs, view logs, retry failed jobs, and manage manual mappings.

## Setup & Configuration

### Secrets (Environment Variables)

Set the following secrets in Replit:

**IMAP Configuration:**
- `IMAP_HOST`: e.g., imap.gmail.com
- `IMAP_PORT`: e.g., 993
- `IMAP_USER`: Your email address
- `IMAP_PASS`: Your email app password
- `IMAP_SECURE`: true
- `EMAIL_POLL_INTERVAL_SECONDS`: 60 (default)

**PTTAVM Configuration:**
- `PTT_BASE_URL`: https://seller.pttavm.com
- `PTT_USERNAME`: Seller username
- `PTT_PASSWORD`: Seller password
- `PTT_HEADLESS`: true (default) or false for debugging
- `PTT_SLOWMO_MS`: 0 (default) or 100 for debugging
- `DRY_RUN`: true (to simulate uploads without clicking the final button)

**App Configuration:**
- `SESSION_SECRET`: Random string for sessions

### Local Development

1. Install dependencies: `npm install`
2. Run database migration: `npm run db:push`
3. Start the server: `npm run dev`

## Testing with Fixtures

A `fixtures` directory is available to test extraction logic.

1. Place sample `.eml` files or text content in `fixtures/`.
2. You can write a small script to read these files and test `extractOrderId` from `server/services/extractor.ts`.

## Troubleshooting

- **CAPTCHA/MFA:** If the bot encounters a CAPTCHA, the job will fail and be marked as `NEEDS_MANUAL_ACTION`. You must complete the upload manually.
- **Selector Updates:** If PTTAVM changes their UI, update the CSS selectors in `server/config/pttSelectors.ts`.
- **Playwright Errors:** Check `data/evidence` for screenshots of failed attempts.

## Architecture

- **Database:** SQLite (via Drizzle ORM)
- **Backend:** Express, Node.js
- **Frontend:** React, TanStack Query, Tailwind CSS, Shadcn UI
- **Worker:** Background loop in `server/services/worker.ts`
