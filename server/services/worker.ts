import { storage } from '../storage';
import { uploadPdf, findOrderCandidates } from './ptt';
import { chromium } from 'playwright';

export async function startWorker() {
  const interval = 10000; // 10 seconds check

  const processJob = async () => {
    const nextJob = await storage.getNextQueuedJob();
    if (!nextJob) return;

    const job = await storage.getJobWithDetails(nextJob.id);
    if (!job) return;

    const browser = await chromium.launch({ headless: true });
    try {
      await storage.updateJob(job.id, { status: "RUNNING" });
      
      let finalOrderId = job.orderId;
      
      if (job.orderId === 'UNKNOWN' && job.insuredNameNorm) {
        const page = await browser.newPage();
        // Login and navigate logic (shared or repeated)
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
      }

      const result = await uploadPdf(finalOrderId, job.attachment.filepath);
      
      if (result.success) {
        await storage.updateJob(job.id, { status: "SUCCESS" });
        await storage.createUpload({
          jobId: job.id,
          pttOrderId: job.orderId,
          result: "SUCCESS",
          evidencePath: result.evidence
        });
      } else {
        await storage.updateJob(job.id, { 
          status: "FAILED", 
          lastError: result.error,
          attempts: job.attempts + 1
        });
        // Check max attempts?
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
