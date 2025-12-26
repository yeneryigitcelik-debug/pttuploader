import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const emails = pgTable("emails", {
  id: serial("id").primaryKey(),
  messageId: text("message_id").notNull().unique(),
  fromAddr: text("from_addr").notNull(),
  subject: text("subject"),
  receivedAt: timestamp("received_at").notNull(),
  processedAt: timestamp("processed_at"),
  rawOrderId: text("raw_order_id"),
  status: text("status").notNull().default("NEW"), // NEW, PROCESSED, ERROR
});

export const attachments = pgTable("attachments", {
  id: serial("id").primaryKey(),
  emailId: integer("email_id").notNull().references(() => emails.id),
  filename: text("filename").notNull(),
  filepath: text("filepath").notNull(),
  sha256: text("sha256").notNull(),
  size: integer("size").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull(),
  attachmentId: integer("attachment_id").notNull().references(() => attachments.id),
  status: text("status").notNull().default("QUEUED"), // QUEUED, RUNNING, SUCCESS, FAILED, NEEDS_MANUAL_ACTION
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  insuredNameRaw: text("insured_name_raw"),
  insuredNameNorm: text("insured_name_norm"),
  amountCents: integer("amount_cents"),
  matchDecision: text("match_decision"),
  matchReason: text("match_reason"),
  candidatesJson: text("candidates_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const uploads = pgTable("uploads", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobs.id),
  pttOrderId: text("ptt_order_id").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  result: text("result").notNull(),
  evidencePath: text("evidence_path"),
});

export const mappings = pgTable("mappings", {
  id: serial("id").primaryKey(),
  extractedOrderId: text("extracted_order_id").notNull().unique(),
  normalizedOrderId: text("normalized_order_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schemas
export const insertEmailSchema = createInsertSchema(emails).omit({ id: true, processedAt: true });
export const insertAttachmentSchema = createInsertSchema(attachments).omit({ id: true, createdAt: true });
export const insertJobSchema = createInsertSchema(jobs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUploadSchema = createInsertSchema(uploads).omit({ id: true, uploadedAt: true });
export const insertMappingSchema = createInsertSchema(mappings).omit({ id: true, createdAt: true });

// Types
export type Email = typeof emails.$inferSelect;
export type InsertEmail = z.infer<typeof insertEmailSchema>;

export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;

export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;

export type Upload = typeof uploads.$inferSelect;
export type InsertUpload = z.infer<typeof insertUploadSchema>;

export type Mapping = typeof mappings.$inferSelect;
export type InsertMapping = z.infer<typeof insertMappingSchema>;

export type JobStatus = "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "NEEDS_MANUAL_ACTION";
export type EmailStatus = "NEW" | "PROCESSED" | "ERROR";
