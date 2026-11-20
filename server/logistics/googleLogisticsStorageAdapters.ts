import { createHash } from 'node:crypto';
import { Readable, Transform } from 'node:stream';
import type {
  LogisticsResourceUpload,
  LogisticsStorageAdapter,
  StoredLogisticsResource
} from './logisticsStorageAdapter';

const MAX_RESOURCE_BYTES = 250 * 1024 * 1024;
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const GCS_API = 'https://storage.googleapis.com/storage/v1';
const GCS_UPLOAD_API = 'https://storage.googleapis.com/upload/storage/v1';

export class LogisticsStorageError extends Error {
  constructor(
    public readonly code:
      | 'INVALID_CONFIGURATION'
      | 'PROVIDER_NOT_CONFIGURED'
      | 'PROVIDER_REQUEST_FAILED'
      | 'RESOURCE_NOT_FOUND'
      | 'RESOURCE_METADATA_MISMATCH'
      | 'INVALID_UPLOAD'
  ) {
    super(code);
    this.name = 'LogisticsStorageError';
  }
}

export interface GoogleAccessTokenProvider {
  getAccessToken(input: {
    tenantId: string;
    schoolId: string;
    provider: 'google_drive' | 'google_cloud_storage';
  }): Promise<string>;
}

type Fetch = (
  input: string | URL | Request,
  init?: RequestInit & { duplex?: 'half' }
) => Promise<Response>;

interface GoogleAdapterDependencies {
  tokens: GoogleAccessTokenProvider;
  fetcher?: Fetch;
}

interface UploadStream {
  stream: Readable;
  digest(): Buffer;
  byteLength(): number;
}

function uploadStream(input: LogisticsResourceUpload): UploadStream {
  if (!Number.isSafeInteger(input.contentLength) || input.contentLength < 1 ||
      input.contentLength > MAX_RESOURCE_BYTES ||
      !/^[\w!#$&^_.+-]+\/[\w!#$&^_.+-]+$/.test(input.contentType)) {
    throw new LogisticsStorageError('INVALID_UPLOAD');
  }
  const hash = createHash('sha256');
  let bytes = 0;
  const meter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytes += chunk.length;
      if (bytes > input.contentLength || bytes > MAX_RESOURCE_BYTES) {
        callback(new LogisticsStorageError('INVALID_UPLOAD'));
        return;
      }
      hash.update(chunk);
      callback(null, chunk);
    }
  });
  return {
    stream: Readable.from(input.content).pipe(meter),
    digest: () => hash.digest(),
    byteLength: () => bytes
  };
}

function encodeObjectPath(value: string): string {
  return value.split('/').map(encodeURIComponent).join('/');
}

function assertUploadResponse(response: Response): void {
  if (!response.ok) throw new LogisticsStorageError('PROVIDER_REQUEST_FAILED');
}

function readableResponseBody(body: ReadableStream<Uint8Array>): Readable {
  const chunks = async function* () {
    const reader = body.getReader();
    try {
      while (true) {
        const result = await reader.read();
        if (result.done) return;
        yield result.value;
      }
    } finally {
      reader.releaseLock();
    }
  };
  return Readable.from(chunks());
}

async function tokenFor(
  tokens: GoogleAccessTokenProvider,
  tenantId: string,
  schoolId: string,
  provider: 'google_drive' | 'google_cloud_storage'
): Promise<string> {
  const token = await tokens.getAccessToken({ tenantId, schoolId, provider });
  if (!token.trim()) throw new LogisticsStorageError('PROVIDER_NOT_CONFIGURED');
  return token;
}

export class GoogleDriveLogisticsStorageAdapter implements LogisticsStorageAdapter {
  constructor(
    private readonly tokens: GoogleAccessTokenProvider,
    private readonly folderId: string,
    private readonly fetcher: Fetch = fetch
  ) {
    if (!/^[A-Za-z0-9_-]{10,256}$/.test(folderId)) {
      throw new LogisticsStorageError('INVALID_CONFIGURATION');
    }
  }

  async store(input: LogisticsResourceUpload): Promise<StoredLogisticsResource> {
    const token = await tokenFor(this.tokens, input.tenantId, input.schoolId, 'google_drive');
    const key = `${input.tenantId}/${input.schoolId}/${input.resourceId}/v${input.version}`;
    const body = uploadStream(input);
    const initiation = await this.fetcher(
      `${DRIVE_UPLOAD_API}/files?uploadType=resumable&fields=id`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': input.contentType,
          'X-Upload-Content-Length': String(input.contentLength)
        },
        body: JSON.stringify({
          name: key,
          mimeType: input.contentType,
          parents: [this.folderId],
          appProperties: {
            tenantId: input.tenantId,
            schoolId: input.schoolId,
            resourceId: input.resourceId,
            version: String(input.version)
          }
        }),
        signal: AbortSignal.timeout(15_000)
      }
    );
    assertUploadResponse(initiation);
    const uploadUrl = initiation.headers.get('location');
    if (!uploadUrl || new URL(uploadUrl).origin !== 'https://www.googleapis.com') {
      throw new LogisticsStorageError('PROVIDER_REQUEST_FAILED');
    }
    const uploaded = await this.fetcher(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': input.contentType,
        'Content-Length': String(input.contentLength)
      },
      body: body.stream as unknown as BodyInit,
      duplex: 'half',
      signal: AbortSignal.timeout(120_000)
    });
    assertUploadResponse(uploaded);
    const file = await uploaded.json() as { id?: unknown };
    if (typeof file.id !== 'string' || body.byteLength() !== input.contentLength) {
      if (typeof file.id === 'string') await this.deleteFile(token, file.id);
      throw new LogisticsStorageError('INVALID_UPLOAD');
    }
    return {
      objectKey: `drive:${file.id}`,
      sha256: body.digest(),
      contentLength: input.contentLength,
      contentType: input.contentType
    };
  }

  async openRead(tenantId: string, schoolId: string, objectKey: string): Promise<Readable> {
    const fileId = objectKey.startsWith('drive:') ? objectKey.slice(6) : '';
    if (!/^[A-Za-z0-9_-]{10,256}$/.test(fileId)) throw new LogisticsStorageError('RESOURCE_NOT_FOUND');
    const token = await tokenFor(this.tokens, tenantId, schoolId, 'google_drive');
    const metadataResponse = await this.fetcher(
      `${DRIVE_API}/files/${encodeURIComponent(fileId)}?fields=id,trashed,appProperties`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) }
    );
    if (metadataResponse.status === 404) throw new LogisticsStorageError('RESOURCE_NOT_FOUND');
    assertUploadResponse(metadataResponse);
    const metadata = await metadataResponse.json() as {
      id?: unknown; trashed?: unknown; appProperties?: Record<string, unknown>;
    };
    if (metadata.id !== fileId || metadata.trashed === true) {
      throw new LogisticsStorageError('RESOURCE_NOT_FOUND');
    }
    if (metadata.appProperties?.tenantId !== tenantId || metadata.appProperties?.schoolId !== schoolId) {
      throw new LogisticsStorageError('RESOURCE_METADATA_MISMATCH');
    }
    const response = await this.fetcher(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(120_000)
    });
    if (response.status === 404) throw new LogisticsStorageError('RESOURCE_NOT_FOUND');
    assertUploadResponse(response);
    if (!response.body) throw new LogisticsStorageError('PROVIDER_REQUEST_FAILED');
    return readableResponseBody(response.body);
  }

  private async deleteFile(token: string, fileId: string): Promise<void> {
    const response = await this.fetcher(`${DRIVE_API}/files/${encodeURIComponent(fileId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000)
    });
    if (!response.ok && response.status !== 404) {
      throw new LogisticsStorageError('PROVIDER_REQUEST_FAILED');
    }
  }
}

export class GoogleCloudStorageLogisticsAdapter implements LogisticsStorageAdapter {
  constructor(
    private readonly tokens: GoogleAccessTokenProvider,
    private readonly bucket: string,
    private readonly fetcher: Fetch = fetch
  ) {
    if (!/^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$/.test(bucket)) {
      throw new LogisticsStorageError('INVALID_CONFIGURATION');
    }
  }

  async store(input: LogisticsResourceUpload): Promise<StoredLogisticsResource> {
    const token = await tokenFor(this.tokens, input.tenantId, input.schoolId, 'google_cloud_storage');
    const objectKey = `tenants/${input.tenantId}/schools/${input.schoolId}/library/${input.resourceId}/v${input.version}`;
    const body = uploadStream(input);
    const query = new URLSearchParams({ uploadType: 'media', name: objectKey });
    const response = await this.fetcher(
      `${GCS_UPLOAD_API}/b/${encodeURIComponent(this.bucket)}/o?${query.toString()}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': input.contentType,
          'Content-Length': String(input.contentLength)
        },
        body: body.stream as unknown as BodyInit,
        duplex: 'half',
        signal: AbortSignal.timeout(120_000)
      }
    );
    assertUploadResponse(response);
    const stored = await response.json() as { name?: unknown; size?: unknown };
    if (stored.name !== objectKey || Number(stored.size) !== input.contentLength ||
        body.byteLength() !== input.contentLength) {
      throw new LogisticsStorageError('INVALID_UPLOAD');
    }
    return {
      objectKey,
      sha256: body.digest(),
      contentLength: input.contentLength,
      contentType: input.contentType
    };
  }

  async openRead(tenantId: string, schoolId: string, objectKey: string): Promise<Readable> {
    const expectedPrefix = `tenants/${tenantId}/schools/${schoolId}/library/`;
    if (!objectKey.startsWith(expectedPrefix) || objectKey.includes('..')) {
      throw new LogisticsStorageError('RESOURCE_METADATA_MISMATCH');
    }
    const token = await tokenFor(this.tokens, tenantId, schoolId, 'google_cloud_storage');
    const response = await this.fetcher(
      `${GCS_API}/b/${encodeURIComponent(this.bucket)}/o/${encodeObjectPath(objectKey)}?alt=media`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(120_000)
      }
    );
    if (response.status === 404) throw new LogisticsStorageError('RESOURCE_NOT_FOUND');
    assertUploadResponse(response);
    if (!response.body) throw new LogisticsStorageError('PROVIDER_REQUEST_FAILED');
    return readableResponseBody(response.body);
  }
}
