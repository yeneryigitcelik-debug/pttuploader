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
