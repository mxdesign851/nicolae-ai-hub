export function toCsvCell(value: string | number | null | undefined) {
  if (value === null || value === undefined) return '';
  const stringified = String(value);
  if (stringified.includes('"') || stringified.includes(',') || stringified.includes('\n')) {
    return `"${stringified.replace(/"/g, '""')}"`;
  }
  return stringified;
}

export function toCsvRow(values: Array<string | number | null | undefined>) {
  return values.map((value) => toCsvCell(value)).join(',');
}

export function makeCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  return [toCsvRow(headers), ...rows.map((row) => toCsvRow(row))].join('\n');
}
