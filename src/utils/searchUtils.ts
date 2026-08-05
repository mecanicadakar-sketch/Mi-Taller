export function normalizeSearchStr(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]/g, ''); // keep alphanumeric only
}

export function matchesQuery(field: string | undefined | null, query: string): boolean {
  if (!query) return true;
  if (!field) return false;
  
  const cleanField = field.toLowerCase().trim();
  const cleanQuery = query.toLowerCase().trim();
  if (cleanField.includes(cleanQuery)) return true;

  // Normalized compare (strip spaces, hyphens, accents)
  const normField = normalizeSearchStr(field);
  const normQuery = normalizeSearchStr(query);
  if (normQuery && normField.includes(normQuery)) return true;

  return false;
}
