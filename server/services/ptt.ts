import { chromium, type Page } from 'playwright';
import { selectors } from '../config/pttSelectors';
import path from 'path';
import { normalizeName } from './extractor';

export interface Candidate {
  orderId: string;
  customerName: string;
  amountCents: number;
}

export async function findOrderCandidates(page: Page, insuredNameNormalized: string, amountCents: number) {
  const maxPages = Number(process.env.PTT_MAX_PAGES_TO_SCAN) || 5;
  const tolerance = Number(process.env.MATCH_AMOUNT_TOLERANCE_CENTS) || 100;
  
  const candidates: Candidate[] = [];
  
  for (let i = 1; i <= maxPages; i++) {
    const rows = await page.$$(selectors.orders.row);
    for (const row of rows) {
      const nameText = await row.$eval(selectors.orders.customerNameCell, el => el.textContent || "");
      const amountText = await row.$eval(selectors.orders.amountCell, el => el.textContent || "");
      const orderId = await row.$eval(selectors.orders.orderIdCell, el => el.textContent || "");
      
      const normalizedRowName = normalizeName(nameText);
      // Simple amount parsing for row text (usually like "1.234,56 TL")
      const rowAmountClean = amountText.replace(/[^\d,\.]/g, "").replace(/\./g, "").replace(",", ".");
      const rowAmountCents = Math.round(parseFloat(rowAmountClean) * 100);

      if (normalizedRowName.includes(insuredNameNormalized) || insuredNameNormalized.includes(normalizedRowName)) {
        candidates.push({ orderId, customerName: nameText, amountCents: rowAmountCents });
      }
    }
    
    // Check if next page exists and click
    const nextBtn = await page.$(selectors.orders.nextPageBtn);
    if (!nextBtn) break;
    await nextBtn.click();
    await page.waitForLoadState('networkidle');
  }

  // Matching Logic
  const exactMatches = candidates.filter(c => c.amountCents === amountCents);
  if (exactMatches.length === 1) {
    return { decision: "AUTO_UPLOAD", selectedOrderId: exactMatches[0].orderId, candidates };
  }
  if (exactMatches.length > 1) {
    return { decision: "MANUAL", reason: "Multiple exact amount matches", candidates };
  }

  const toleranceMatches = candidates.filter(c => Math.abs(c.amountCents - amountCents) <= tolerance);
  if (toleranceMatches.length === 1) {
    return { decision: "AUTO_UPLOAD", selectedOrderId: toleranceMatches[0].orderId, candidates };
  }
  
  return { 
    decision: "MANUAL", 
    reason: toleranceMatches.length > 1 ? "Multiple candidates within tolerance" : "No suitable match found", 
    candidates 
  };
}

export async function uploadPdf(orderId: string, filePath: string): Promise<{ success: boolean; error?: string; evidence?: string }> {
  const browser = await chromium.launch({ 
    headless: process.env.PTT_HEADLESS !== 'false', // Default true
    slowMo: Number(process.env.PTT_SLOWMO_MS) || 0
  });
  
  const evidenceDir = path.join(process.cwd(), 'data', 'evidence');
  // ensure dir exists...

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Login
    await page.goto(process.env.PTT_BASE_URL || 'https://seller.pttavm.com');
    await page.fill(selectors.login.usernameInput, process.env.PTT_USERNAME || '');
    await page.fill(selectors.login.passwordInput, process.env.PTT_PASSWORD || '');
    await page.click(selectors.login.submitButton);
    await page.waitForLoadState('networkidle');

    // Search Order
    // Navigate to orders page if not there
    await page.fill(selectors.orders.searchInput, orderId);
    await page.press(selectors.orders.searchInput, 'Enter');
    
    // Wait for results
    await page.waitForSelector(selectors.orders.row);
    await page.click(selectors.orders.row); // Click first result

    // Upload
    // Screenshot before
    const beforeShot = path.join(evidenceDir, `${orderId}-before.png`);
    await page.screenshot({ path: beforeShot });

    if (process.env.DRY_RUN === 'true') {
      console.log(`[DRY RUN] Would upload ${filePath} for order ${orderId}`);
      return { success: true, evidence: beforeShot };
    }

    // Real upload
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click(selectors.orders.uploadButton);
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);
    
    // Wait for success toast
    await page.waitForSelector(selectors.orders.successToast);
    
    const afterShot = path.join(evidenceDir, `${orderId}-after.png`);
    await page.screenshot({ path: afterShot });

    return { success: true, evidence: afterShot };

  } catch (err: any) {
    console.error("Playwright Error:", err);
    return { success: false, error: err.message };
  } finally {
    await browser.close();
  }
}
