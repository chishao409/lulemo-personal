import { Capacitor, CapacitorHttp, registerPlugin } from '@capacitor/core';
import { WebDavBackupFile, WebDavConfig } from '../types';

export type WebDavMethod = 'OPTIONS' | 'MKCOL' | 'PUT' | 'PROPFIND' | 'GET';

export interface WebDavRequestOptions {
  url: string;
  method: WebDavMethod;
  headers?: Record<string, string>;
  data?: string;
}

export interface WebDavResponse {
  status: number;
  data?: unknown;
  headers?: Record<string, string>;
}

export type WebDavTransport = (options: WebDavRequestOptions) => Promise<WebDavResponse>;

interface NativeWebDavPlugin {
  request(options: WebDavRequestOptions): Promise<WebDavResponse>;
}

const NativeWebDav = registerPlugin<NativeWebDavPlugin>('NativeWebDav');

const LATEST_BACKUP_NAME = 'lulemo-backup-latest.csv';
const BACKUP_FILE_PATTERN = /^lulemo-backup-(latest|\d{8}-\d{6})\.csv$/;
const NATIVE_WEBDAV_METHOD_REJECTION = 'Expected one of';

export function normalizeWebDavConfig(config: Partial<WebDavConfig> | null | undefined): WebDavConfig {
  return {
    url: (config?.url ?? '').trim().replace(/\/+$/, ''),
    username: (config?.username ?? '').trim(),
    password: config?.password ?? '',
    directory: (config?.directory ?? '').trim().replace(/^\/+|\/+$/g, ''),
  };
}

export function serializeWebDavConfig(config: WebDavConfig | null): string | null {
  if (!config) return null;
  return JSON.stringify(normalizeWebDavConfig(config));
}

export function parseStoredWebDavConfig(raw: string | null): WebDavConfig | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<WebDavConfig>;
    const normalized = normalizeWebDavConfig(parsed);
    return normalized.url ? normalized : null;
  } catch {
    return null;
  }
}

function encodePathSegment(segment: string): string {
  return encodeURIComponent(segment);
}

function getDirectorySegments(config: WebDavConfig): string[] {
  return normalizeWebDavConfig(config).directory.split('/').map((part) => part.trim()).filter(Boolean);
}

export function buildWebDavDirectoryUrl(config: WebDavConfig, segmentCount?: number): string {
  const normalized = normalizeWebDavConfig(config);
  const segments = getDirectorySegments(normalized);
  const usedSegments = typeof segmentCount === 'number' ? segments.slice(0, segmentCount) : segments;
  const encodedPath = usedSegments.map(encodePathSegment).join('/');
  return encodedPath ? `${normalized.url}/${encodedPath}` : normalized.url;
}

export function buildWebDavFileUrl(config: WebDavConfig, fileName: string): string {
  const directoryUrl = buildWebDavDirectoryUrl(config);
  return `${directoryUrl}/${encodePathSegment(fileName)}`;
}

function encodeBase64(value: string): string {
  if (typeof btoa === 'function') {
    return btoa(value);
  }
  return Buffer.from(value, 'utf8').toString('base64');
}

export function createWebDavAuthHeader(config: WebDavConfig): string | null {
  const normalized = normalizeWebDavConfig(config);
  if (!normalized.username && !normalized.password) return null;
  return `Basic ${encodeBase64(`${normalized.username}:${normalized.password}`)}`;
}

function buildHeaders(config: WebDavConfig, extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'text/csv, application/xml, text/xml, */*',
    ...extra,
  };
  const authHeader = createWebDavAuthHeader(config);
  if (authHeader) headers.Authorization = authHeader;
  return headers;
}

export function buildWebDavBackupFilename(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  const second = String(date.getUTCSeconds()).padStart(2, '0');
  return `lulemo-backup-${year}${month}${day}-${hour}${minute}${second}.csv`;
}

function responseDataToText(data: unknown): string {
  if (typeof data === 'string') return data;
  if (data == null) return '';
  return String(data);
}

function assertOk(response: WebDavResponse, action: string, acceptedStatus = (status: number) => status >= 200 && status < 300): void {
  if (response.status === 401 || response.status === 403) {
    throw new Error('WebDAV 认证失败，请检查账号或应用密码');
  }
  if (!acceptedStatus(response.status)) {
    throw new Error(`${action}失败，状态码 ${response.status}`);
  }
}

function assertUploadOk(response: WebDavResponse, config: WebDavConfig): void {
  if (response.status === 401) {
    throw new Error('WebDAV 认证失败，请检查账号或应用密码');
  }
  if (response.status === 403) {
    throw new Error(
      config.directory
        ? 'WebDAV 远程目录不存在或不可写，请先在云端创建该目录，或清空远程目录后保存再上传'
        : 'WebDAV 没有写入权限，请检查应用连接权限或应用密码'
    );
  }
  assertOk(response, 'WebDAV 上传');
}

function assertDownloadOk(response: WebDavResponse): void {
  if (response.status === 404) {
    throw new Error('WebDAV 云端备份不存在，请刷新列表或重新上传后再导入');
  }
  assertOk(response, 'WebDAV 下载');
}

function assertDirectoryOk(response: WebDavResponse): void {
  if (response.status === 401) {
    throw new Error('WebDAV 认证失败，请检查账号或应用密码');
  }
  if (response.status === 403) {
    throw new Error('WebDAV 远程目录不存在或不可写，请检查应用连接权限或清空远程目录');
  }
  assertOk(response, 'WebDAV 目录创建', (status) => (status >= 200 && status < 300) || status === 405);
}

export async function defaultWebDavTransport(options: WebDavRequestOptions): Promise<WebDavResponse> {
  if (Capacitor.isNativePlatform()) {
    if (options.method === 'MKCOL' || options.method === 'PROPFIND') {
      return NativeWebDav.request(options);
    }
    return CapacitorHttp.request({
      url: options.url,
      method: options.method,
      headers: options.headers,
      data: options.data,
      responseType: 'text',
      connectTimeout: 15_000,
      readTimeout: 15_000,
    });
  }

  const response = await fetch(options.url, {
    method: options.method,
    headers: options.headers,
    body: options.data,
  });
  return {
    status: response.status,
    data: await response.text(),
    headers: Object.fromEntries(response.headers.entries()),
  };
}

function fileFromName(config: WebDavConfig, name: string, meta?: Partial<WebDavBackupFile>): WebDavBackupFile {
  return {
    name,
    url: buildWebDavFileUrl(config, name),
    isLatest: name === LATEST_BACKUP_NAME,
    ...meta,
  };
}

export function getLatestWebDavBackup(config: WebDavConfig): WebDavBackupFile {
  return fileFromName(normalizeWebDavConfig(config), LATEST_BACKUP_NAME);
}

function isNativeUnsupportedMethodError(error: unknown, method: WebDavMethod): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes(NATIVE_WEBDAV_METHOD_REJECTION) && error.message.includes(`was ${method}`);
}

async function ensureWebDavDirectory(config: WebDavConfig, transport: WebDavTransport): Promise<void> {
  const segments = getDirectorySegments(config);
  for (let i = 1; i <= segments.length; i += 1) {
    const response = await transport({
      url: buildWebDavDirectoryUrl(config, i),
      method: 'MKCOL',
      headers: buildHeaders(config),
    });
    assertDirectoryOk(response);
  }
}

export async function testWebDavConnection(
  config: WebDavConfig,
  transport: WebDavTransport = defaultWebDavTransport
): Promise<void> {
  const normalized = normalizeWebDavConfig(config);
  if (!normalized.url) throw new Error('请先填写 WebDAV 地址');
  const response = await transport({
    url: buildWebDavDirectoryUrl(normalized),
    method: 'OPTIONS',
    headers: buildHeaders(normalized),
  });
  assertOk(response, 'WebDAV 连接');
}

export async function uploadWebDavBackup(
  config: WebDavConfig,
  csvContent: string,
  date = new Date(),
  transport: WebDavTransport = defaultWebDavTransport
): Promise<{ timestamped: WebDavBackupFile; latest: WebDavBackupFile }> {
  const normalized = normalizeWebDavConfig(config);
  if (!normalized.url) throw new Error('请先填写 WebDAV 地址');
  await ensureWebDavDirectory(normalized, transport);
  const timestamped = fileFromName(normalized, buildWebDavBackupFilename(date));
  const latest = getLatestWebDavBackup(normalized);
  const headers = buildHeaders(normalized, { 'Content-Type': 'text/csv; charset=utf-8' });

  for (const file of [timestamped, latest]) {
    const response = await transport({
      url: file.url,
      method: 'PUT',
      headers,
      data: csvContent,
    });
    assertUploadOk(response, normalized);
  }

  return { timestamped, latest };
}

function decodeHrefName(href: string): string {
  const withoutQuery = href.split('?')[0].replace(/\/+$/, '');
  const last = withoutQuery.split('/').filter(Boolean).pop() ?? '';
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

function readXmlTag(block: string, tagName: string): string | undefined {
  const match = block.match(new RegExp(`<[^>]*:?${tagName}[^>]*>([\\s\\S]*?)<\\/[^>]*:?${tagName}>`, 'i'));
  return match?.[1]?.trim();
}

export function parseWebDavBackups(xml: string, config: WebDavConfig = normalizeWebDavConfig({ url: '' })): WebDavBackupFile[] {
  const responseBlocks = xml.match(/<[^>]*:?response[\s\S]*?<\/[^>]*:?response>/gi) ?? [];
  const files = responseBlocks
    .map((block) => {
      const href = readXmlTag(block, 'href');
      if (!href) return null;
      const name = decodeHrefName(href);
      if (!BACKUP_FILE_PATTERN.test(name)) return null;
      const sizeRaw = readXmlTag(block, 'getcontentlength');
      const size = sizeRaw ? Number(sizeRaw) : undefined;
      return fileFromName(config, name, {
        size: Number.isFinite(size) ? size : undefined,
        lastModified: readXmlTag(block, 'getlastmodified'),
      });
    })
    .filter((file): file is WebDavBackupFile => Boolean(file));

  return files.sort((a, b) => {
    if (a.isLatest !== b.isLatest) return a.isLatest ? -1 : 1;
    return b.name.localeCompare(a.name);
  });
}

export async function listWebDavBackups(
  config: WebDavConfig,
  transport: WebDavTransport = defaultWebDavTransport
): Promise<WebDavBackupFile[]> {
  const normalized = normalizeWebDavConfig(config);
  if (!normalized.url) throw new Error('请先填写 WebDAV 地址');
  let response: WebDavResponse;
  try {
    response = await transport({
      url: buildWebDavDirectoryUrl(normalized),
      method: 'PROPFIND',
      headers: buildHeaders(normalized, { Depth: '1' }),
    });
  } catch (error) {
    if (isNativeUnsupportedMethodError(error, 'PROPFIND')) {
      throw new Error('当前 Android 网络通道暂不支持刷新 WebDAV 云端列表。备份上传仍可用，也可以直接导入 latest 备份。');
    }
    throw error;
  }
  assertOk(response, 'WebDAV 备份列表', (status) => status === 207 || (status >= 200 && status < 300));
  return parseWebDavBackups(responseDataToText(response.data), normalized);
}

export async function downloadWebDavBackup(
  config: WebDavConfig,
  backup: Pick<WebDavBackupFile, 'name'>,
  transport: WebDavTransport = defaultWebDavTransport
): Promise<string> {
  const normalized = normalizeWebDavConfig(config);
  if (!normalized.url) throw new Error('请先填写 WebDAV 地址');
  const response = await transport({
    url: buildWebDavFileUrl(normalized, backup.name),
    method: 'GET',
    headers: buildHeaders(normalized),
  });
  assertDownloadOk(response);
  return responseDataToText(response.data);
}
