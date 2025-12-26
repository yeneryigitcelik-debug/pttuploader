import { ImapFlow } from 'imapflow';
import simpleParser from 'mailparser';
import { storage } from '../storage';
import { extractOrderId } from './extractor';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DOWNLOAD_DIR = path.join(process.cwd(), 'data', 'attachments');

// Ensure download dir exists
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

export async function startImapPoller() {
  const client = new ImapFlow({
    host: process.env.IMAP_HOST || '',
    port: Number(process.env.IMAP_PORT) || 993,
    secure: process.env.IMAP_SECURE === 'true',
    auth: {
      user: process.env.IMAP_USER || '',
      pass: process.env.IMAP_PASS || ''
    },
    logger: false,
  });

  const pollInterval = Number(process.env.EMAIL_POLL_INTERVAL_SECONDS) || 60;

  const runPoll = async () => {
    try {
      if (!process.env.IMAP_HOST) {
        console.log("IMAP_HOST not set, skipping polling");
        return;
      }
      
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        // Fetch unseen emails
        for await (const message of client.fetch('1:*', { envelope: true, source: true }, { uid: true })) {
           // Parse email
           const parsed = await simpleParser.simpleParser(message.source);
           
           // Save email to DB
           const emailRecord = await storage.createEmail({
             messageId: message.envelope.messageId,
             fromAddr: message.envelope.from[0].address || 'unknown',
             subject: message.envelope.subject || '',
             receivedAt: message.envelope.date,
             status: 'NEW'
           });

           // Process attachments
           if (parsed.attachments && parsed.attachments.length > 0) {
             for (const att of parsed.attachments) {
               if (att.contentType === 'application/pdf') {
                 const filename = att.filename || `attachment-${Date.now()}.pdf`;
                 const filepath = path.join(DOWNLOAD_DIR, filename);
                 
                 fs.writeFileSync(filepath, att.content);
                 const hash = crypto.createHash('sha256').update(att.content).digest('hex');
                 
                 const attachmentRecord = await storage.createAttachment({
                   emailId: emailRecord.id,
                   filename,
                   filepath,
                   sha256: hash,
                   size: att.size,
                 });

                 // Extract Order ID
                 let orderId = extractOrderId(emailRecord.subject || '') || extractOrderId(parsed.text || '');
                 
                 // New requirement: GIG verification link
                 const gigLinkRegex = /https:\/\/belgedogrulama\.gig\.com\.tr\/sfsdocumentshow\/\?documentid=[^&\s]+(?:&exportpdf=1)?/i;
                 const gigLinkMatch = (parsed.text || "").match(gigLinkRegex);
                 
                 if (gigLinkMatch) {
                   const gigData = await extractFromGigLink(gigLinkMatch[0]);
                   if (gigData) {
                     await storage.createJob({
                       orderId: 'UNKNOWN',
                       attachmentId: attachmentRecord.id,
                       status: 'QUEUED',
                       insuredNameRaw: gigData.insuredName,
                       insuredNameNorm: normalizeName(gigData.insuredName),
                       amountCents: gigData.amountCents
                     });
                     await storage.updateEmailStatus(emailRecord.id, 'PROCESSED', 'UNKNOWN');
                     continue; // Skip the default processing if GIG link handled it
                   }
                 }
                 
                 if (orderId) {
                   await storage.createJob({
                     orderId,
                     attachmentId: attachmentRecord.id,
                     status: 'QUEUED'
                   });
                   await storage.updateEmailStatus(emailRecord.id, 'PROCESSED', orderId);
                 } else {
                   // Mark as NEEDS_MANUAL_ACTION or just leave email as processed but no job?
                   // For now, create a job with NEEDS_MANUAL_ACTION
                   await storage.createJob({
                     orderId: 'UNKNOWN',
                     attachmentId: attachmentRecord.id,
                     status: 'NEEDS_MANUAL_ACTION',
                     lastError: 'Could not extract Order ID'
                   });
                   await storage.updateEmailStatus(emailRecord.id, 'ERROR');
                 }
               }
             }
           }
        }
      } finally {
        lock.release();
      }
      await client.logout();
    } catch (err) {
      console.error("IMAP Poll Error:", err);
    }
  };

  // Initial run
  runPoll();
  
  // Interval
  setInterval(runPoll, pollInterval * 1000);
}
