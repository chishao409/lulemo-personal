import { getLocalDateString } from '../constants';
import { RecordEntry } from '../types';

export function escapeCsvCell(value: string): string {
  const normalized = value.replace(/\r\n/g, '\n');
  if (/[",\n\r]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

export function serializeRecordsToCsv(records: RecordEntry[]): string {
  const csvHeader = ['ID', 'Timestamp', 'Date', 'Time', 'Mood', 'Note', 'DurationMinutes', 'WatchedMovie', 'MovieCategory'].join(',');
  const csvRows = records.map((record) => {
    const date = new Date(record.timestamp);
    const mood = record.mood || '放松';
    const note = record.note ?? '';

    return [
      escapeCsvCell(record.id),
      String(record.timestamp),
      getLocalDateString(date),
      escapeCsvCell(date.toLocaleTimeString()),
      escapeCsvCell(mood),
      escapeCsvCell(note),
      record.durationMinutes == null ? '' : String(record.durationMinutes),
      record.watchedMovie ? 'true' : 'false',
      escapeCsvCell(record.movieCategory ?? ''),
    ].join(',');
  });

  return `${csvHeader}\n${csvRows.join('\n')}`;
}

export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += ch;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

export function parseRecordEntriesFromCsv(text: string): RecordEntry[] {
  const rows = parseCsvText(text);
  const dataRows = rows.length > 0 ? rows.slice(1) : [];
  const records: RecordEntry[] = [];

  for (const columns of dataRows) {
    if (columns.length < 2) continue;

    const id = (columns[0] ?? '').trim();
    const timestamp = Number(columns[1] ?? '');
    const mood = (columns[4] ?? '').trim();
    const note = (columns[5] ?? '').trim();
    const durationRaw = (columns[6] ?? '').trim();
    const watchedMovieRaw = (columns[7] ?? '').trim().toLowerCase();
    const movieCategory = (columns[8] ?? '').trim();

    if (!id || Number.isNaN(timestamp)) continue;

    const parsedDuration = Number(durationRaw);
    const durationMinutes =
      durationRaw && Number.isFinite(parsedDuration) && parsedDuration > 0
        ? Math.round(parsedDuration)
        : undefined;

    records.push({
      id,
      timestamp,
      mood: mood || '放松',
      note: note || undefined,
      durationMinutes,
      watchedMovie: watchedMovieRaw === 'true',
      movieCategory: movieCategory || undefined,
    });
  }

  return records;
}

export function mergeImportedRecords(
  existingRecords: RecordEntry[],
  importedRecords: RecordEntry[]
): { merged: RecordEntry[]; importedCount: number; skippedCount: number } {
  const seen = new Set(existingRecords.map((record) => record.id));
  const deduped: RecordEntry[] = [];

  for (const record of importedRecords) {
    if (seen.has(record.id)) continue;
    seen.add(record.id);
    deduped.push(record);
  }

  return {
    merged: [...existingRecords, ...deduped],
    importedCount: deduped.length,
    skippedCount: importedRecords.length - deduped.length,
  };
}
