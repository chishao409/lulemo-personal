import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('release version metadata', () => {
  it('keeps the 1.6.3 release version synchronized across app surfaces', () => {
    const packageJson = JSON.parse(read('package.json')) as { version: string };
    const packageLock = JSON.parse(read('package-lock.json')) as {
      version: string;
      packages: Record<string, { version?: string }>;
    };
    const androidBuild = read('android/app/build.gradle');
    const settingsView = read('components/SettingsView.tsx');
    const readme = read('README.md');
    const changeLog = read('components/ChangeLog.tsx');

    expect(packageJson.version).toBe('1.6.3');
    expect(packageLock.version).toBe('1.6.3');
    expect(packageLock.packages[''].version).toBe('1.6.3');
    expect(androidBuild).toContain('versionCode 9');
    expect(androidBuild).toContain('versionName "1.6.3"');
    expect(settingsView).toContain('版本 1.6.3');
    expect(readme).toContain('version-1.6.3-22c55e');
    expect(readme).toContain('当前版本：`1.6.3`');
    expect(changeLog).toContain("version: '1.6.3'");
    expect(changeLog).toContain('WebDAV 云备份与 Android 动画稳定性修复');
  });

  it('uses the established changelog icon style for the 1.6.3 entry', () => {
    const changeLog = read('components/ChangeLog.tsx');
    const entryStart = changeLog.indexOf("version: '1.6.3'");
    const nextEntryStart = changeLog.indexOf("version: '1.6.2'");
    const entry = changeLog.slice(entryStart, nextEntryStart);

    expect(entry).toContain('🆕 新增：');
    expect(entry).toContain('✨ 优化：');
    expect(entry).toContain('✅ 修复：');
    expect(entry).not.toContain('✅ 优化：');
  });
});
