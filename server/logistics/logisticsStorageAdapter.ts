import type { Readable } from 'node:stream';

export interface LogisticsResourceUpload {
  tenantId: string;
  schoolId: string;
  resourceId: string;
  version: number;
  contentType: string;
  contentLength: number;
  content: AsyncIterable<Uint8Array>;
}

export interface StoredLogisticsResource {
  objectKey: string;
  sha256: Buffer;
  contentLength: number;
  contentType: string;
}

/**
 * Contract for a tenant-isolated production object store.
 * No implementation is configured or claimed by this interface.
 */
export interface LogisticsStorageAdapter {
  store(input: LogisticsResourceUpload): Promise<StoredLogisticsResource>;
  openRead(tenantId: string, schoolId: string, objectKey: string): Promise<Readable>;
}
