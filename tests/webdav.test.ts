import { describe, expect, it } from 'vitest';
import {
  buildWebDavBackupFilename,
  buildWebDavFileUrl,
  createWebDavAuthHeader,
  downloadWebDavBackup,
  getLatestWebDavBackup,
  listWebDavBackups,
  normalizeWebDavConfig,
  parseWebDavBackups,
  serializeWebDavConfig,
  uploadWebDavBackup,
  parseStoredWebDavConfig,
  testWebDavConnection,
  WebDavTransport,
} from '../utils/webdav';

function createTransport() {
  const calls: Parameters<WebDavTransport>[0][] = [];
  const transport: WebDavTransport = async (options) => {
    calls.push(options);
    if (options.method === 'PROPFIND') {
      return {
        status: 207,
        data: `<?xml version="1.0"?>
          <d:multistatus xmlns:d="DAV:">
            <d:response>
              <d:href>/dav/lulemo/lulemo-backup-latest.csv</d:href>
              <d:propstat><d:prop>
                <d:getcontentlength>12</d:getcontentlength>
                <d:getlastmodified>Thu, 16 Jul 2026 00:00:00 GMT</d:getlastmodified>
              </d:prop></d:propstat>
            </d:response>
            <d:response>
              <d:href>/dav/lulemo/lulemo-backup-20260716-001122.csv</d:href>
              <d:propstat><d:prop><d:getcontentlength>34</d:getcontentlength></d:prop></d:propstat>
            </d:response>
            <d:response>
              <d:href>/dav/lulemo/readme.txt</d:href>
            </d:response>
          </d:multistatus>`,
      };
    }
    if (options.method === 'GET') {
      return { status: 200, data: 'ID,Timestamp\n1,2' };
    }
    return { status: 201, data: '' };
  };
  return { calls, transport };
}

describe('webdav helpers', () => {
  it('normalizes and serializes config safely', () => {
    const config = normalizeWebDavConfig({
      url: ' https://example.com/dav/ ',
      username: ' user ',
      password: ' pass ',
      directory: '/lulemo/backups/',
    });

    expect(config).toEqual({
      url: 'https://example.com/dav',
      username: 'user',
      password: ' pass ',
      directory: 'lulemo/backups',
    });
    expect(parseStoredWebDavConfig(serializeWebDavConfig(config))).toEqual(config);
    expect(parseStoredWebDavConfig('{bad json')).toBeNull();
  });

  it('builds encoded file urls and auth headers', () => {
    const config = normalizeWebDavConfig({
      url: 'https://example.com/dav',
      username: 'alice',
      password: 'secret',
      directory: 'lulemo backups/手机',
    });

    expect(buildWebDavFileUrl(config, 'lulemo-backup-latest.csv')).toBe(
      'https://example.com/dav/lulemo%20backups/%E6%89%8B%E6%9C%BA/lulemo-backup-latest.csv'
    );
    expect(createWebDavAuthHeader(config)).toBe('Basic YWxpY2U6c2VjcmV0');
  });

  it('generates timestamped backup filenames', () => {
    expect(buildWebDavBackupFilename(new Date(Date.UTC(2026, 6, 16, 0, 11, 22)))).toBe(
      'lulemo-backup-20260716-001122.csv'
    );
  });

  it('parses and sorts backup files from PROPFIND xml', () => {
    const files = parseWebDavBackups(`
      <d:multistatus xmlns:d="DAV:">
        <d:response><d:href>/dav/lulemo/lulemo-backup-20260715-235959.csv</d:href></d:response>
        <d:response><d:href>/dav/lulemo/lulemo-backup-latest.csv</d:href></d:response>
        <d:response><d:href>/dav/lulemo/lulemo-backup-20260716-001122.csv</d:href></d:response>
      </d:multistatus>
    `);

    expect(files.map((file) => file.name)).toEqual([
      'lulemo-backup-latest.csv',
      'lulemo-backup-20260716-001122.csv',
      'lulemo-backup-20260715-235959.csv',
    ]);
    expect(files[0].isLatest).toBe(true);
  });

  it('creates configured directories before uploading backup files', async () => {
    const { calls, transport } = createTransport();
    const config = normalizeWebDavConfig({
      url: 'https://example.com/dav',
      username: 'alice',
      password: 'secret',
      directory: 'lulemo',
    });

    const result = await uploadWebDavBackup(config, 'csv-data', new Date(Date.UTC(2026, 6, 16, 0, 11, 22)), transport);

    expect(result.timestamped.name).toBe('lulemo-backup-20260716-001122.csv');
    expect(calls.map((call) => call.method)).toEqual(['MKCOL', 'PUT', 'PUT']);
    expect(calls[0].url.endsWith('/lulemo')).toBe(true);
    expect(calls[1].url.endsWith('/lulemo-backup-20260716-001122.csv')).toBe(true);
    expect(calls[2].url.endsWith('/lulemo-backup-latest.csv')).toBe(true);
    expect(calls[1].data).toBe('csv-data');
  });

  it('explains forbidden upload paths as missing or unwritable directories', async () => {
    const transport: WebDavTransport = async () => ({ status: 403, data: '' });
    const config = normalizeWebDavConfig({
      url: 'https://example.com/dav',
      username: 'alice',
      password: 'secret',
      directory: 'lulemo',
    });

    await expect(
      uploadWebDavBackup(config, 'csv-data', new Date(Date.UTC(2026, 6, 16, 0, 11, 22)), transport)
    ).rejects.toThrow('远程目录不存在或不可写');
  });

  it('builds the latest backup target for direct import', () => {
    const latest = getLatestWebDavBackup(normalizeWebDavConfig({ url: 'https://example.com/dav', directory: 'lulemo' }));

    expect(latest).toEqual({
      name: 'lulemo-backup-latest.csv',
      url: 'https://example.com/dav/lulemo/lulemo-backup-latest.csv',
      isLatest: true,
    });
  });

  it('explains native PROPFIND limitations when backup listing is blocked by the client', async () => {
    const transport: WebDavTransport = async () => {
      throw new Error('Expected one of [OPTIONS, GET, HEAD, POST, PUT, DELETE, TRACE, PATCH] but was PROPFIND');
    };

    await expect(
      listWebDavBackups(normalizeWebDavConfig({ url: 'https://example.com/dav', directory: 'lulemo' }), transport)
    ).rejects.toThrow('当前 Android 网络通道暂不支持刷新 WebDAV 云端列表');
  });

  it('lists and downloads backups through the transport', async () => {
    const { transport } = createTransport();
    const config = normalizeWebDavConfig({ url: 'https://example.com/dav', directory: 'lulemo' });

    const files = await listWebDavBackups(config, transport);
    const content = await downloadWebDavBackup(config, files[1], transport);

    expect(files).toHaveLength(2);
    expect(content).toBe('ID,Timestamp\n1,2');
  });

  it('explains missing cloud backup files during download', async () => {
    const transport: WebDavTransport = async () => ({ status: 404, data: '' });
    const config = normalizeWebDavConfig({ url: 'https://example.com/dav' });

    await expect(downloadWebDavBackup(config, { name: 'lulemo-backup-latest.csv' }, transport)).rejects.toThrow(
      '云端备份不存在'
    );
  });

  it('tests connection using OPTIONS', async () => {
    const { calls, transport } = createTransport();

    await testWebDavConnection(normalizeWebDavConfig({ url: 'https://example.com/dav' }), transport);

    expect(calls[0].method).toBe('OPTIONS');
  });
});
