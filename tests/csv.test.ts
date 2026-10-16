import { describe, expect, it } from 'vitest';

import { mergeImportedRecords, parseRecordEntriesFromCsv, serializeRecordsToCsv } from '../utils/csv';
import { RecordEntry } from '../types';

describe('CSV utilities', () => {
  it('parses quoted cells and skips malformed rows', () => {
    const csv = [
      'ID,Timestamp,Date,Time,Mood,Note,DurationMinutes,WatchedMovie,MovieCategory',
      'a1,1700000000000,2026-02-18,08:00:00,开心,"第一行,带逗号",18,true,日韩',
      'bad-row,not-a-number,2026-02-18,08:00:00,开心,无效,,,',
      'a2,1700000001000,2026-02-18,08:00:01,,"多行',
      '备注"',
    ].join('\n');

    expect(parseRecordEntriesFromCsv(csv)).toEqual([
      {
        id: 'a1',
        timestamp: 1700000000000,
        mood: '开心',
        note: '第一行,带逗号',
        durationMinutes: 18,
        watchedMovie: true,
        movieCategory: '日韩',
      },
      {
        id: 'a2',
        timestamp: 1700000001000,
        mood: '放松',
        note: '多行\n备注',
        watchedMovie: false,
      },
    ]);
  });

  it('deduplicates imported rows against existing and incoming ids', () => {
    const existing: RecordEntry[] = [{ id: 'a1', timestamp: 1, mood: '放松' }];
    const imported: RecordEntry[] = [
      { id: 'a1', timestamp: 1, mood: '放松' },
      { id: 'a2', timestamp: 2, mood: '开心' },
      { id: 'a2', timestamp: 3, mood: '冷静' },
    ];

    expect(mergeImportedRecords(existing, imported)).toEqual({
      merged: [
        { id: 'a1', timestamp: 1, mood: '放松' },
        { id: 'a2', timestamp: 2, mood: '开心' },
      ],
      importedCount: 1,
      skippedCount: 2,
    });
  });

  it('serializes records with escaped commas and quotes', () => {
    const csv = serializeRecordsToCsv([
      {
        id: 'a1',
        timestamp: new Date(2026, 1, 18, 8, 30, 0).getTime(),
        mood: '开心',
        note: '他说："测试", 完成',
        durationMinutes: 36,
        watchedMovie: true,
        movieCategory: '动漫',
      },
    ]);

    expect(csv).toContain('ID,Timestamp,Date,Time,Mood,Note,DurationMinutes,WatchedMovie,MovieCategory');
    expect(csv).toContain('"他说：""测试"", 完成"');
    expect(csv).toContain(',36,true,动漫');
    expect(csv).toContain('a1');
  });
});
