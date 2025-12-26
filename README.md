# PTTAVM Automation Bot (Manual Workflow)

This project automates the upload of insurance PDFs to the PTTAVM Seller Dashboard.

## Workflow

1. **Manual Upload:** User uploads PDFs via the Admin UI.
2. **PDF Processing:** The system extracts the insured name and policy amount from the PDF.
3. **Order Matching:** The system automatically matches the PDF to a PTTAVM order based on name and amount.
4. **Browser Automation:** If a unique match is found, the PDF is uploaded using Playwright.
5. **Manual Review:** If matching is ambiguous, the user can manually select the correct order from the Admin UI.

## Features

- **Manual PDF Intake:** Web-based interface for batch PDF uploads.
- **Intelligent Extraction:** Regex-based extraction of name and amount from Turkish insurance documents.
- **Smart Matching:** Normalizes Turkish characters and supports amount tolerance.
- **Admin Dashboard:** Monitor jobs, view logs, and resolve ambiguous matches.

## Matching Logic

1. **Normalization:** Names are normalized (uppercase, Turkish character replacement, punctuation removal).
2. **Exact Match:** If exactly one order matches the normalized name and exact amount (in cents), it is automatically selected.
3. **Tolerance Match:** If no exact match, it looks for candidates within +/- 1.00 TL (100 cents) tolerance.
4. **Manual Action:** If multiple candidates are found or no suitable match exists, the job is marked as `NEEDS_MANUAL_ACTION` for review in the Admin UI.

## Configuration

### Environment Variables

Set the following secrets in Replit:

**PTTAVM Configuration:**
- `PTT_BASE_URL`: https://seller.pttavm.com
- `PTT_USERNAME`: Seller username
- `PTT_PASSWORD`: Seller password
- `PTT_HEADLESS`: true (default)
- `MATCH_AMOUNT_TOLERANCE_CENTS`: 100 (default)
- `PTT_MAX_PAGES_TO_SCAN`: 5 (default)
- `DATA_DIR`: ./data
- `DRY_RUN`: true (to simulate uploads without clicking the final button)

**App Configuration:**
- `SESSION_SECRET`: Random string for sessions

### Local Development

1. Install dependencies: `npm install`
2. Run database migration: `npm run db:push`
3. Start the server: `npm run dev`

## Usage

### Step 1: Upload PDFs
Open the Admin UI and navigate to "Upload PDFs". Select one or more insurance PDF files and click upload.

### Step 2: Monitor Jobs
Go to the Jobs page to see the status of each uploaded PDF. Jobs will be in one of these states:
- **QUEUED**: Waiting to be processed
- **RUNNING**: Currently being matched/uploaded
- **SUCCESS**: Successfully uploaded to PTTAVM
- **NEEDS_MANUAL_ACTION**: Requires manual candidate selection
- **FAILED**: An error occurred (check logs)

### Step 3: Resolve Manual Actions
For jobs marked as `NEEDS_MANUAL_ACTION`, click on the job to see candidate orders. Select the correct order and click "Upload to Selected Order".

## Troubleshooting

- **CAPTCHA/MFA:** If the bot encounters a CAPTCHA, the job will fail and be marked as `NEEDS_MANUAL_ACTION`. You must complete the upload manually.
- **Selector Updates:** If PTTAVM changes their UI, update the CSS selectors in `server/config/pttSelectors.ts`.
- **Playwright Errors:** Check `data/evidence` for screenshots of failed attempts.

## Architecture

- **Database:** PostgreSQL (via Drizzle ORM)
- **Backend:** Express, Node.js
- **Frontend:** React, TanStack Query, Tailwind CSS, Shadcn UI
- **Worker:** Background loop in `server/services/worker.ts`
