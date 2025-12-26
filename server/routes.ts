import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { startWorker } from "./services/worker";
import { startImapPoller } from "./services/imap";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth
  await setupAuth(app);
  registerAuthRoutes(app);

  // API Routes
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
    // Mock logs for now
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

  app.get(api.mappings.list.path, async (req, res) => {
    const mappings = await storage.getAllMappings();
    res.json(mappings);
  });

  app.get(api.stats.get.path, async (req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  // Start background services
  if (process.env.NODE_ENV !== "test") {
    console.log("Starting background services...");
    startWorker().catch(err => console.error("Worker failed to start:", err));
    startImapPoller().catch(err => console.error("IMAP poller failed to start:", err));
    
    // Seed data if empty
    const stats = await storage.getStats();
    if (Object.keys(stats.jobs).length === 0) {
      console.log("Seeding database...");
      const email = await storage.createEmail({
        messageId: "seed-123",
        fromAddr: "test@example.com",
        subject: "PTTAVM Order #ABC123456",
        receivedAt: new Date(),
        status: "NEW"
      });
      const attachment = await storage.createAttachment({
        emailId: email.id,
        filename: "order.pdf",
        filepath: "/tmp/order.pdf",
        sha256: "dummyhash",
        size: 1024
      });
      await storage.createJob({
        orderId: "ABC123456",
        attachmentId: attachment.id,
        status: "QUEUED"
      });
    }
  }

  return httpServer;
}
