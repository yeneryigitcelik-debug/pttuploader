import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { startWorker } from "./services/worker";
import { extractFromPdfBuffer, normalizeName } from "./services/extractor";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const DATA_DIR = process.env.DATA_DIR || './data';
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // API Routes - no auth needed for desktop app
  app.get(api.jobs.list.path, async (req, res) => {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    const status = req.query.status as string | undefined;

    const jobs = await storage.getJobs(limit, offset, status);
    res.json(jobs);
  });

  app.get(api.jobs.get.path, async (req, res) => {
    const job = await storage.getJobWithDetails(Number(req.params.id));
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    const logs = [`Job started at ${job.createdAt}`, `Status: ${job.status}`];
    if (job.lastError) logs.push(`Error: ${job.lastError}`);

    res.json({ ...job, logs });
  });

  app.post(api.jobs.retry.path, async (req, res) => {
    const job = await storage.getJob(Number(req.params.id));
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    const updated = await storage.updateJob(job.id, {
      status: "QUEUED",
      attempts: 0,
      lastError: null
    });
    res.json(updated);
  });

  app.post(api.jobs.selectCandidate.path, async (req, res) => {
    const job = await storage.getJob(Number(req.params.id));
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    const { orderId } = req.body;
    const updated = await storage.updateJob(job.id, {
      orderId,
      status: "QUEUED",
      matchDecision: "MANUAL_SELECTED",
      attempts: 0,
      lastError: null
    });
    res.json(updated);
  });

  app.post(api.uploads.create.path, (req, res, next) => {
    upload.array('pdfs', 20)(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || 'Only PDF files are allowed' });
      }
      next();
    });
  }, async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'No PDF files provided' });
      }

      const jobIds: number[] = [];

      for (const file of files) {
        const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');
        const timestamp = Date.now();
        const filename = `${timestamp}_${file.originalname}`;
        const filepath = path.join(UPLOADS_DIR, filename);

        fs.writeFileSync(filepath, file.buffer);

        const extracted = await extractFromPdfBuffer(file.buffer);

        const email = await storage.createEmail({
          messageId: `upload-${timestamp}-${sha256.substring(0, 8)}`,
          fromAddr: 'manual-upload',
          subject: file.originalname,
          receivedAt: new Date().toISOString(),
          status: 'PROCESSED'
        });

        const attachment = await storage.createAttachment({
          emailId: email.id,
          filename: file.originalname,
          filepath,
          sha256,
          size: file.size
        });

        const job = await storage.createJob({
          orderId: 'UNKNOWN',
          attachmentId: attachment.id,
          status: 'QUEUED',
          insuredNameRaw: extracted.insuredName,
          insuredNameNorm: extracted.insuredName ? normalizeName(extracted.insuredName) : null,
          amountCents: extracted.amountCents
        });

        jobIds.push(job.id);
      }

      res.status(201).json({ message: 'PDFs uploaded successfully', jobIds });
    } catch (err: any) {
      console.error('Upload error:', err);
      res.status(500).json({ message: err.message || 'Upload failed' });
    }
  });

  app.post(api.mappings.create.path, async (req, res) => {
    try {
      const input = api.mappings.create.input.parse(req.body);
      const mapping = await storage.createMapping(input);
      res.status(201).json(mapping);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to create mapping" });
    }
  });

  app.get(api.mappings.list.path, async (_req, res) => {
    const mappings = await storage.getAllMappings();
    res.json(mappings);
  });

  app.get(api.stats.get.path, async (_req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  // Start background worker
  if (process.env.NODE_ENV !== "test") {
    console.log("Starting background worker...");
    startWorker().catch(err => console.error("Worker failed to start:", err));
  }

  return httpServer;
}
