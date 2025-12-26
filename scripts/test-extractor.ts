import { extractOrderId } from '../server/services/extractor';
import fs from 'fs';
import path from 'path';

const fixturesDir = path.join(process.cwd(), 'fixtures');
const files = fs.readdirSync(fixturesDir);

console.log("Testing Extractor against fixtures...");

files.forEach(file => {
  const content = fs.readFileSync(path.join(fixturesDir, file), 'utf-8');
  const orderId = extractOrderId(content);
  console.log(`File: ${file} -> Extracted Order ID: ${orderId}`);
});
