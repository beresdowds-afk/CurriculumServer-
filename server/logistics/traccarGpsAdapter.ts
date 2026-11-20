export class TraccarGpsError extends Error {
  constructor(
    public readonly code:
      | 'PROVIDER_NOT_CONFIGURED'
      | 'INVALID_PROVIDER_CONFIGURATION'
      | 'PROVIDER_REQUEST_FAILED'
      | 'DEVICE_NOT_VERIFIED'
      | 'NO_VERIFIED_TELEMETRY'
      | 'STALE_TELEMETRY'
  ) {
    super(code);
    this.name = 'TraccarGpsError';
  }
}

export interface TraccarDevice {
  id: number;
  uniqueId: string;
  disabled?: boolean;
}

export interface TraccarPosition {
  id: number;
  deviceId: number;
  latitude: number;
  longitude: number;
  fixTime: Date;
  serverTime: Date;
  valid: boolean;
  speed: number | null;
}

export interface TraccarGpsConfiguration {
  baseUrl: string;
  apiToken: string;
  maxTelemetryAgeSeconds?: number;
}

type Fetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function parseDevice(value: unknown): TraccarDevice | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const device = value as Record<string, unknown>;
  if (!Number.isSafeInteger(device.id) || (device.id as number) < 1 ||
      typeof device.uniqueId !== 'string' || !device.uniqueId.trim()) return null;
  return {
    id: device.id as number,
    uniqueId: device.uniqueId,
    ...(typeof device.disabled === 'boolean' ? { disabled: device.disabled } : {})
  };
}

function parsePosition(value: unknown): TraccarPosition | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const position = value as Record<string, unknown>;
  if (!Number.isSafeInteger(position.id) || (position.id as number) < 1 ||
      !Number.isSafeInteger(position.deviceId) || (position.deviceId as number) < 1 ||
      typeof position.latitude !== 'number' || !Number.isFinite(position.latitude) ||
      position.latitude < -90 || position.latitude > 90 ||
      typeof position.longitude !== 'number' || !Number.isFinite(position.longitude) ||
      position.longitude < -180 || position.longitude > 180 ||
      typeof position.valid !== 'boolean' ||
      typeof position.fixTime !== 'string' || typeof position.serverTime !== 'string') return null;
  const fixTime = new Date(position.fixTime);
  const serverTime = new Date(position.serverTime);
  if (!Number.isFinite(fixTime.getTime()) || !Number.isFinite(serverTime.getTime())) return null;
  return {
    id: position.id as number,
    deviceId: position.deviceId as number,
    latitude: position.latitude,
    longitude: position.longitude,
    fixTime,
    serverTime,
    valid: position.valid,
    speed: typeof position.speed === 'number' && Number.isFinite(position.speed)
      ? position.speed
      : null
  };
}

export class TraccarGpsAdapter {
  private readonly baseUrl: URL;
  private readonly maxTelemetryAgeMs: number;
  private readonly token: string;

  constructor(
    configuration: TraccarGpsConfiguration,
    private readonly fetcher: Fetch = fetch,
    private readonly now: () => Date = () => new Date()
  ) {
    if (!configuration.apiToken.trim()) throw new TraccarGpsError('PROVIDER_NOT_CONFIGURED');
    this.token = configuration.apiToken;
    let url: URL;
    try {
      url = new URL(configuration.baseUrl);
    } catch {
      throw new TraccarGpsError('INVALID_PROVIDER_CONFIGURATION');
    }
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
      throw new TraccarGpsError('INVALID_PROVIDER_CONFIGURATION');
    }
    const maxAge = configuration.maxTelemetryAgeSeconds ?? 300;
    if (!Number.isInteger(maxAge) || maxAge < 30 || maxAge > 3600) {
      throw new TraccarGpsError('INVALID_PROVIDER_CONFIGURATION');
    }
    this.baseUrl = new URL(url.toString().replace(/\/+$/, '') + '/');
    this.maxTelemetryAgeMs = maxAge * 1000;
  }

  async verifyDevice(providerDeviceId: number, expectedUniqueId: string): Promise<TraccarDevice> {
    if (!Number.isSafeInteger(providerDeviceId) || providerDeviceId < 1 ||
        !expectedUniqueId.trim() || expectedUniqueId.length > 200) {
      throw new TraccarGpsError('DEVICE_NOT_VERIFIED');
    }
    const device = parseDevice(await this.get(`/api/devices/${providerDeviceId}`));
    if (!device || device.id !== providerDeviceId || device.uniqueId !== expectedUniqueId || device.disabled) {
      throw new TraccarGpsError('DEVICE_NOT_VERIFIED');
    }
    return device;
  }

  async latestPosition(providerDeviceId: number): Promise<TraccarPosition> {
    if (!Number.isSafeInteger(providerDeviceId) || providerDeviceId < 1) {
      throw new TraccarGpsError('DEVICE_NOT_VERIFIED');
    }
    const response = await this.get(`/api/positions?deviceId=${providerDeviceId}`);
    if (!Array.isArray(response)) throw new TraccarGpsError('NO_VERIFIED_TELEMETRY');
    const positions = response
      .map(parsePosition)
      .filter((position): position is TraccarPosition =>
        position !== null && position.deviceId === providerDeviceId && position.valid)
      .sort((left, right) => right.fixTime.getTime() - left.fixTime.getTime());
    const position = positions[0];
    if (!position) throw new TraccarGpsError('NO_VERIFIED_TELEMETRY');
    const age = this.now().getTime() - position.fixTime.getTime();
    if (age < -30_000 || age > this.maxTelemetryAgeMs) {
      throw new TraccarGpsError('STALE_TELEMETRY');
    }
    return position;
  }

  private async get(path: string): Promise<unknown> {
    const url = new URL(path.replace(/^\/+/, ''), this.baseUrl);
    let response: Response;
    try {
      response = await this.fetcher(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.token}`
        },
        signal: AbortSignal.timeout(10_000)
      });
    } catch {
      throw new TraccarGpsError('PROVIDER_REQUEST_FAILED');
    }
    if (!response.ok) throw new TraccarGpsError('PROVIDER_REQUEST_FAILED');
    try {
      return await response.json();
    } catch {
      throw new TraccarGpsError('PROVIDER_REQUEST_FAILED');
    }
  }

}
