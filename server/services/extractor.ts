import fs from 'fs';
import path from 'path';
import * as pdf from 'pdf-parse';
import axios from 'axios';

export function normalizeName(name: string): string {
  const map: Record<string, string> = {
    'İ': 'I', 'ı': 'i', 'Ş': 'S', 'ş': 's', 'Ğ': 'G', 'ğ': 'g',
    'Ü': 'U', 'ü': 'u', 'Ö': 'O', 'ö': 'o', 'Ç': 'C', 'ç': 'c'
  };
  let normalized = name.toUpperCase();
  for (const key in map) {
    normalized = normalized.replace(new RegExp(key, 'g'), map[key].toUpperCase());
  }
  return normalized.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseAmountToCents(amountStr: string): number | null {
  if (!amountStr) return null;
  // Handle 1.234,56 and 1234.56
  const clean = amountStr.replace(/\./g, "").replace(/,/g, ".");
  const amount = parseFloat(clean);
  return isNaN(amount) ? null : Math.round(amount * 100);
}

export async function extractFromGigLink(url: string): Promise<{ insuredName: string, amountCents: number, pdfPath: string } | null> {
  try {
    const downloadUrl = url.includes('exportpdf=1') ? url : `${url}&exportpdf=1`;
    const response = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    
    const data = await pdf(buffer);
    const text = data.text;

    // Robust regex for name and amount
    const nameMatch = text.match(/(?:SAYIN|SIGORTALI|MÜŞTERİ):\s*([A-ZÇĞİÖŞÜ\s]+)/i);
    const amountMatch = text.match(/(?:TUTAR|TOPLAM|PRIM):\s*([\d\.,]+)/i);

    if (nameMatch && amountMatch) {
      const insuredName = nameMatch[1].trim();
      const amountCents = parseAmountToCents(amountMatch[1]) || 0;
      
      const fileName = `gig-${Date.now()}.pdf`;
      const pdfPath = path.join(process.cwd(), 'data', 'attachments', fileName);
      fs.writeFileSync(pdfPath, buffer);

      return { insuredName, amountCents, pdfPath };
    }
  } catch (err) {
    console.error("GIG Extraction Error:", err);
  }
  return null;
}

export function extractOrderId(text: string): string | null {
  // Regexes from prompt
  const regexes = [
    /(?:sipariş|siparis|order)\s*[:#-]?\s*([A-Z0-9-]{6,})/i,
    /([A-Z0-9-]{10,})/ // Fallback for long codes
  ];

  for (const regex of regexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      return normalizeOrderId(match[1]);
    }
  }
  return null;
}

function normalizeOrderId(id: string): string {
  return id.toUpperCase().replace(/\s+/g, '');
}
