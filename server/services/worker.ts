import { storage } from '../storage';
import { uploadPdf, findOrderCandidates } from './ptt';
import { chromium } from 'playwright';
import { selectors } from '../config/pttSelectors';

export async function startWorker() {
  const interval = 10000; // 10 seconds check

  const processJob = async () => {
    const nextJob = await storage.getNextQueuedJob();
    if (!nextJob) return;

    const job = await storage.getJobWithDetails(nextJob.id);
    if (!job) return;

    try {
      await storage.updateJob(job.id, { status: "RUNNING" });

      let finalOrderId = job.orderId;

      if (job.orderId === 'UNKNOWN' && job.insuredNameNorm) {
        const browser = await chromium.launch({
          headless: process.env.PTT_HEADLESS !== 'false',
          slowMo: Number(process.env.PTT_SLOWMO_MS) || 0
        });
        try {
          const page = await browser.newPage();

          // Login to PTTAVM
          await page.goto(process.env.PTT_BASE_URL || 'https://seller.pttavm.com');
          await page.fill(selectors.login.usernameInput, process.env.PTT_USERNAME || '');
          await page.fill(selectors.login.passwordInput, process.env.PTT_PASSWORD || '');
          await page.click(selectors.login.submitButton);
          await page.waitForLoadState('networkidle');

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
