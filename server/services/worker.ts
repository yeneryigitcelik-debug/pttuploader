import { storage } from '../storage';
import { uploadPdf, findOrderCandidates } from './ptt';
import { chromium } from 'playwright';
import { selectors } from '../config/pttSelectors';

const PTT_BASE_URL = 'https://tedarikci.pttavm.com';
const ORDERS_URL = `${PTT_BASE_URL}/app/order-management/orders`;

export async function startWorker() {
  const interval = 10000; // 10 saniye

  const processJob = async () => {
    const nextJob = await storage.getNextQueuedJob();
    if (!nextJob) return;

    const job = await storage.getJobWithDetails(nextJob.id);
    if (!job) return;

    try {
      await storage.updateJob(job.id, { status: "RUNNING" });

      let finalOrderId = job.orderId;

      // Siparis numarasi bilinmiyorsa, isim eslesmesi yap
      if (job.orderId === 'UNKNOWN' && job.insuredNameNorm) {
        const browser = await chromium.launch({
          headless: process.env.PTT_HEADLESS !== 'false',
          slowMo: Number(process.env.PTT_SLOWMO_MS) || 0
        });
        try {
          const page = await browser.newPage();

          // Login
          await page.goto(PTT_BASE_URL);
          await page.waitForLoadState('networkidle');
          const usernameEl = await page.waitForSelector(selectors.login.usernameInput, { timeout: 10000 });
          await usernameEl.fill(process.env.PTT_USERNAME || '');
          const passwordEl = await page.waitForSelector(selectors.login.passwordInput, { timeout: 5000 });
          await passwordEl.fill(process.env.PTT_PASSWORD || '');
          await page.click(selectors.login.submitButton);
          await page.waitForLoadState('networkidle');

          // Siparis listesine git - sidebar veya dogrudan URL
          const sidebarLink = await page.$(`text="${selectors.orders.sidebarOrdersText}"`);
          if (sidebarLink) {
            await sidebarLink.click();
            await page.waitForLoadState('networkidle');
          } else {
            await page.goto(ORDERS_URL);
          }
          await page.waitForSelector(selectors.orders.row, { timeout: 15000 });

          const matchResult = await findOrderCandidates(page, job.insuredNameNorm, job.amountCents || 0);

          await storage.updateJob(job.id, {
            matchDecision: matchResult.decision,
            matchReason: matchResult.reason,
            candidatesJson: JSON.stringify(matchResult.candidates)
          });

          if (matchResult.decision === 'AUTO_UPLOAD' && matchResult.selectedOrderId) {
            finalOrderId = matchResult.selectedOrderId;
          } else {
            await storage.updateJob(job.id, { status: 'NEEDS_MANUAL_ACTION' });
            return;
          }
        } finally {
          await browser.close();
        }
      }

      const result = await uploadPdf(finalOrderId, job.attachment.filepath);

      if (result.success) {
        await storage.updateJob(job.id, { status: "SUCCESS" });
        await storage.createUpload({
          jobId: job.id,
          pttOrderId: finalOrderId,
          result: "SUCCESS",
          evidencePath: result.evidence
        });
      } else {
        await storage.updateJob(job.id, {
          status: "FAILED",
          lastError: result.error,
          attempts: job.attempts + 1
        });
      }
    } catch (err: any) {
      console.error("Job Error:", err);
      await storage.updateJob(job.id, {
        status: "FAILED",
        lastError: err.message,
        attempts: job.attempts + 1
      });
    }
  };

  setInterval(processJob, interval);
}
