import { storage } from '../storage';
import { uploadPdf } from './ptt';

export async function startWorker() {
  const interval = 10000; // 10 seconds check

  const processJob = async () => {
    const job = await storage.getNextQueuedJob();
    if (!job) return;

    try {
      await storage.updateJob(job.id, { status: "RUNNING" });
      
      const result = await uploadPdf(job.orderId, job.attachment.filepath);
      
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
