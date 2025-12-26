import { db } from "./db";
import { 
  emails, attachments, jobs, uploads, mappings,
  type Email, type InsertEmail, 
  type Attachment, type InsertAttachment,
  type Job, type InsertJob, 
  type Upload, type InsertUpload,
  type Mapping, type InsertMapping,
  type JobStatus, type EmailStatus
} from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // Emails
  createEmail(email: InsertEmail): Promise<Email>;
  getEmailByMessageId(messageId: string): Promise<Email | undefined>;
  getUnprocessedEmails(): Promise<Email[]>;
  updateEmailStatus(id: number, status: EmailStatus, rawOrderId?: string): Promise<Email>;
  
  // Attachments
  createAttachment(attachment: InsertAttachment): Promise<Attachment>;
  getAttachmentsByEmailId(emailId: number): Promise<Attachment[]>;
  
  // Jobs
  createJob(job: InsertJob): Promise<Job>;
  getJob(id: number): Promise<Job | undefined>;
  getJobWithDetails(id: number): Promise<Job & { attachment: Attachment, uploads: Upload[] }>;
  getJobs(limit?: number, offset?: number, status?: string): Promise<(Job & { attachment: Attachment })[]>;
  updateJob(id: number, updates: Partial<Job>): Promise<Job>;
  getNextQueuedJob(): Promise<(Job & { attachment: Attachment }) | undefined>;
  
  // Uploads
  createUpload(upload: InsertUpload): Promise<Upload>;
  getUploadsByJobId(jobId: number): Promise<Upload[]>;
  
  // Mappings
  createMapping(mapping: InsertMapping): Promise<Mapping>;
  getMapping(extractedOrderId: string): Promise<Mapping | undefined>;
  getAllMappings(): Promise<Mapping[]>;
  
  // Stats
  getStats(): Promise<{ jobs: Record<string, number>, emails: Record<string, number> }>;
}

export class DatabaseStorage implements IStorage {
  async createEmail(email: InsertEmail): Promise<Email> {
    const [newEmail] = await db.insert(emails).values(email).returning();
    return newEmail;
  }

  async getEmailByMessageId(messageId: string): Promise<Email | undefined> {
    const [email] = await db.select().from(emails).where(eq(emails.messageId, messageId));
    return email;
  }

  async getUnprocessedEmails(): Promise<Email[]> {
    return db.select().from(emails).where(eq(emails.status, "NEW"));
  }

  async updateEmailStatus(id: number, status: EmailStatus, rawOrderId?: string): Promise<Email> {
    const [updated] = await db.update(emails)
      .set({ status, rawOrderId, processedAt: status === 'PROCESSED' ? new Date() : undefined })
      .where(eq(emails.id, id))
      .returning();
    return updated;
  }

  async createAttachment(attachment: InsertAttachment): Promise<Attachment> {
    const [newAttachment] = await db.insert(attachments).values(attachment).returning();
    return newAttachment;
  }

  async getAttachmentsByEmailId(emailId: number): Promise<Attachment[]> {
    return db.select().from(attachments).where(eq(attachments.emailId, emailId));
  }

  async createJob(job: InsertJob): Promise<Job> {
    const [newJob] = await db.insert(jobs).values(job).returning();
    return newJob;
  }

  async getJob(id: number): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job;
  }

  async getJobWithDetails(id: number): Promise<Job & { attachment: Attachment, uploads: Upload[] }> {
    const job = await this.getJob(id);
    if (!job) throw new Error("Job not found");
    
    const [attachment] = await db.select().from(attachments).where(eq(attachments.id, job.attachmentId));
    const jobUploads = await db.select().from(uploads).where(eq(uploads.jobId, id));
    
    return { ...job, attachment, uploads: jobUploads };
  }

  async getJobs(limit = 50, offset = 0, status?: string): Promise<(Job & { attachment: Attachment })[]> {
    let query = db.select({
      job: jobs,
      attachment: attachments
    })
    .from(jobs)
    .innerJoin(attachments, eq(jobs.attachmentId, attachments.id))
    .orderBy(desc(jobs.createdAt))
    .limit(limit)
    .offset(offset);

    if (status) {
      // @ts-ignore
      query = query.where(eq(jobs.status, status));
    }

    const results = await query;
    return results.map(r => ({ ...r.job, attachment: r.attachment }));
  }

  async updateJob(id: number, updates: Partial<Job>): Promise<Job> {
    const [updated] = await db.update(jobs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(jobs.id, id))
      .returning();
    return updated;
  }

  async getNextQueuedJob(): Promise<(Job & { attachment: Attachment }) | undefined> {
    const [result] = await db.select({
      job: jobs,
      attachment: attachments
    })
    .from(jobs)
    .innerJoin(attachments, eq(jobs.attachmentId, attachments.id))
    .where(eq(jobs.status, "QUEUED"))
    .orderBy(jobs.createdAt)
    .limit(1);

    if (!result) return undefined;
    return { ...result.job, attachment: result.attachment };
  }

  async createUpload(upload: InsertUpload): Promise<Upload> {
    const [newUpload] = await db.insert(uploads).values(upload).returning();
    return newUpload;
  }

  async getUploadsByJobId(jobId: number): Promise<Upload[]> {
    return db.select().from(uploads).where(eq(uploads.jobId, jobId));
  }

  async createMapping(mapping: InsertMapping): Promise<Mapping> {
    const [newMapping] = await db.insert(mappings).values(mapping).returning();
    return newMapping;
  }

  async getMapping(extractedOrderId: string): Promise<Mapping | undefined> {
    const [mapping] = await db.select().from(mappings).where(eq(mappings.extractedOrderId, extractedOrderId));
    return mapping;
  }
  
  async getAllMappings(): Promise<Mapping[]> {
    return db.select().from(mappings);
  }

  async getStats(): Promise<{ jobs: Record<string, number>, emails: Record<string, number> }> {
    const jobStats = await db.select({
      status: jobs.status,
      count: sql<number>`count(*)`
    }).from(jobs).groupBy(jobs.status);
    
    const emailStats = await db.select({
      status: emails.status,
      count: sql<number>`count(*)`
    }).from(emails).groupBy(emails.status);
    
    const jobsMap: Record<string, number> = {};
    jobStats.forEach(s => jobsMap[s.status] = Number(s.count));
    
    const emailsMap: Record<string, number> = {};
    emailStats.forEach(s => emailsMap[s.status] = Number(s.count));
    
    return { jobs: jobsMap, emails: emailsMap };
  }
}

export const storage = new DatabaseStorage();
