export function toCamel(row) {
  if (!row) return row;
  if (Array.isArray(row)) return row.map(toCamel);
  const result = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

