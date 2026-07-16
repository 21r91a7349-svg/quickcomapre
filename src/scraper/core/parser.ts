export function normalizeProductName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, ' ')     // Compress whitespace
    .trim();
}

export function extractQuantityAndUnit(name: string): { quantity: number | null, unit: string | null } {
  // Basic regex to find patterns like "500 ml", "1 kg", "250g", "1L"
  const match = name.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l|ltr|litre|pc|pcs|pack|packs)/i);
  
  if (match) {
    let qty = parseFloat(match[1]);
    let unit = match[2].toLowerCase();
    
    // Normalize units
    if (unit === 'l' || unit === 'ltr' || unit === 'litre') unit = 'l';
    if (unit === 'pc' || unit === 'pcs') unit = 'pc';
    if (unit === 'pack' || unit === 'packs') unit = 'pack';
    
    return { quantity: qty, unit };
  }
  
  return { quantity: null, unit: null };
}

export function parsePrice(priceStr: string | number | null): number {
  if (typeof priceStr === 'number') return priceStr;
  if (!priceStr) return 0;
  
  const cleaned = priceStr.replace(/[^\d.]/g, '');
  return parseFloat(cleaned) || 0;
}
