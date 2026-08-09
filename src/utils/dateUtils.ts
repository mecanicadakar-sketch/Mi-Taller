export function parseAndNormalizeDate(val?: string | number): string {
  if (!val) return new Date().toISOString();

  const str = String(val).trim();
  if (!str) return new Date().toISOString();

  // Check if numeric (Excel serial date number, e.g., 45123 or 45123.5)
  if (/^\d{5}(\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  // Check DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, D/M/YY etc.
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900) {
      const d = new Date(year, month - 1, day, 12, 0, 0);
      if (!isNaN(d.getTime())) {
        return d.toISOString();
      }
    }
  }

  // Check YYYY/MM/DD or YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const d = new Date(year, month - 1, day, 12, 0, 0);
      if (!isNaN(d.getTime())) {
        return d.toISOString();
      }
    }
  }

  // Try standard JS Date parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return new Date().toISOString();
}

export function formatDateSpanish(dateStr?: string): string {
  if (!dateStr || dateStr === 'Invalid Date') return 'Sin fecha';

  const isoStr = parseAndNormalizeDate(dateStr);
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return dateStr;

  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}
