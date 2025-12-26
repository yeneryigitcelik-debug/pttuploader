import { chromium } from 'playwright';
import { selectors } from '../config/pttSelectors';
import path from 'path';

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
