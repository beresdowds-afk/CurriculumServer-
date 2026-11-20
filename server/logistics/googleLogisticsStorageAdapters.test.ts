import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GoogleCloudStorageLogisticsAdapter,
  GoogleDriveLogisticsStorageAdapter,
  LogisticsStorageError
} from './googleLogisticsStorageAdapters';

const resourceDetails = {
  tenantId: '9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8',
  schoolId: 'c3286282-e613-4053-a2cb-edc84f5716f',
  resourceId: 'f17623d4-8fab-461f-8ca5-4db52e46031a',
  version: 1,
  contentType: 'application/pdf',
  contentLength: 5
};
const resource = resourceDetails;
const upload = () => ({
  ...resourceDetails,
  content: (async function* () { yield Buffer.from('file!'); })()
});

const tokens = {
  async getAccessToken(input: { provider: string }) {
    assert.ok(input.provider === 'google_drive' || input.provider === 'google_cloud_storage');
    return 'google-access-token';
  }
};

async function consumeBody(body: BodyInit | null | undefined): Promise<Buffer> {
  assert.ok(body && typeof body === 'object' && Symbol.asyncIterator in body);
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

test('GCS adapter stores a private tenant-prefixed object without returning a public URL', async () => {
  let uploaded = Buffer.alloc(0);
  const adapter = new GoogleCloudStorageLogisticsAdapter(tokens, 'school-private-bucket', async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, 'https://storage.googleapis.com');
    assert.equal(url.searchParams.get('name'),
      `tenants/${resource.tenantId}/schools/${resource.schoolId}/library/${resource.resourceId}/v1`);
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer google-access-token');
    uploaded = await consumeBody(init?.body);
    return Response.json({
      name: url.searchParams.get('name'),
      size: String(resource.contentLength)
    });
  });
  const stored = await adapter.store(upload());
  assert.equal(uploaded.toString(), 'file!');
  assert.equal(stored.objectKey,
    `tenants/${resource.tenantId}/schools/${resource.schoolId}/library/${resource.resourceId}/v1`);
  assert.equal(stored.contentLength, 5);
  assert.equal(stored.sha256.toString('hex').length, 64);
  assert.equal('url' in stored, false);
});

test('GCS adapter refuses cross-tenant object keys before accessing the provider', async () => {
  let requested = false;
  const adapter = new GoogleCloudStorageLogisticsAdapter(tokens, 'school-private-bucket', async () => {
    requested = true;
    return Response.json({});
  });
  await assert.rejects(adapter.openRead(resource.tenantId, resource.schoolId, 'tenants/other/private/file'),
    (error: unknown) => error instanceof LogisticsStorageError && error.code === 'RESOURCE_METADATA_MISMATCH');
  assert.equal(requested, false);
});

test('Drive adapter verifies tenant metadata before opening a private file stream', async () => {
  let calls = 0;
  const adapter = new GoogleDriveLogisticsStorageAdapter(tokens, 'abcdefghijk', async input => {
    calls += 1;
    if (calls === 1) {
      assert.match(String(input), /fields=id,trashed,appProperties/);
      return Response.json({
        id: 'privateFileIdentifier',
        trashed: false,
        appProperties: { tenantId: resource.tenantId, schoolId: resource.schoolId }
      });
    }
    return new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(Buffer.from('private'));
        controller.close();
      }
    }));
  });
  const stream = await adapter.openRead(resource.tenantId, resource.schoolId, 'drive:privateFileIdentifier');
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  assert.equal(Buffer.concat(chunks).toString(), 'private');
  assert.equal(calls, 2);

  const mismatched = new GoogleDriveLogisticsStorageAdapter(tokens, 'abcdefghijk', async () =>
    Response.json({
      id: 'privateFileIdentifier',
      trashed: false,
      appProperties: { tenantId: 'other-tenant', schoolId: resource.schoolId }
    }));
  await assert.rejects(mismatched.openRead(resource.tenantId, resource.schoolId, 'drive:privateFileIdentifier'),
    (error: unknown) => error instanceof LogisticsStorageError && error.code === 'RESOURCE_METADATA_MISMATCH');
});

test('Drive adapter stores content only through a private folder resumable upload', async () => {
  let calls = 0;
  let uploaded = Buffer.alloc(0);
  const adapter = new GoogleDriveLogisticsStorageAdapter(tokens, 'abcdefghijk', async (input, init) => {
    calls += 1;
    if (calls === 1) {
      assert.match(String(input), /uploadType=resumable/);
      assert.deepEqual(JSON.parse(String(init?.body)), {
        name: `${resource.tenantId}/${resource.schoolId}/${resource.resourceId}/v1`,
        mimeType: 'application/pdf',
        parents: ['abcdefghijk'],
        appProperties: {
          tenantId: resource.tenantId,
          schoolId: resource.schoolId,
          resourceId: resource.resourceId,
          version: '1'
        }
      });
      return new Response(null, {
        status: 200,
        headers: { location: 'https://www.googleapis.com/upload/drive/v3/files/session' }
      });
    }
    uploaded = await consumeBody(init?.body);
    return Response.json({ id: 'privateFileIdentifier' });
  });
  const stored = await adapter.store(upload());
  assert.equal(calls, 2);
  assert.equal(uploaded.toString(), 'file!');
  assert.equal(stored.objectKey, 'drive:privateFileIdentifier');
});
