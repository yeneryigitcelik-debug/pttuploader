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
  console.log("IMAP poller is disabled in manual workflow mode.");
  return;
}
