import type { AuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import type { DatabaseClient, DatabasePool } from '../db/postgres';
import { withTenantTransaction } from '../db/tenantContext';
import { TraccarGpsAdapter, TraccarGpsError } from './traccarGpsAdapter';

export class LogisticsGpsRepositoryError extends Error {
  constructor(
    public readonly code:
      | 'FORBIDDEN'
      | 'SCHOOL_CONTEXT_UNAVAILABLE'
      | 'FEATURE_DISABLED'
      | 'INVALID_INPUT'
      | 'NOT_FOUND'
      | 'CONFLICT'
      | 'PROVIDER_NOT_READY'
  ) {
    super(code);
    this.name = 'LogisticsGpsRepositoryError';
  }
}

function uuid(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new LogisticsGpsRepositoryError('INVALID_INPUT');
  }
  return value;
}

function positiveInteger(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) throw new LogisticsGpsRepositoryError('INVALID_INPUT');
  return value;
}

function distanceMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number
): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const earthRadius = 6_371_000;
  const latitudeDelta = radians(latitudeB - latitudeA);
  const longitudeDelta = radians(longitudeB - longitudeA);
  const a = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(latitudeA)) * Math.cos(radians(latitudeB)) *
    Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceToSegmentMeters(
  latitude: number,
  longitude: number,
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number }
): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeScale = radians(latitude) * 6_371_000;
  const longitudeScale = Math.cos(radians(latitude)) * 6_371_000;
  const point = { x: radians(longitude) * longitudeScale, y: latitudeScale };
  const a = { x: radians(start.longitude) * longitudeScale, y: radians(start.latitude) * 6_371_000 };
  const b = { x: radians(end.longitude) * longitudeScale, y: radians(end.latitude) * 6_371_000 };
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const denominator = dx * dx + dy * dy;
  const t = denominator === 0
    ? 0
    : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / denominator));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

export class LogisticsGpsRepository {
  constructor(
    private readonly pool: DatabasePool,
    private readonly adapter: TraccarGpsAdapter
  ) {}

  private requirePermission(actor: AuthorizedPrincipal, permission: string): void {
    if (!actor.hasPermission(permission)) throw new LogisticsGpsRepositoryError('FORBIDDEN');
  }

  private async schoolContext(
    client: DatabaseClient,
    actor: AuthorizedPrincipal,
    requireGps: boolean
  ): Promise<string> {
    const instances = await client.query<{ school_id: string; enabled_features: string[] }>(
      `SELECT school_id, enabled_features
       FROM production.application_instances
       WHERE tenant_id = $1 AND application_id = 'app_curriculum_flow'
         AND status = 'active' AND provisioning_status = 'ready'
       ORDER BY created_at DESC
       LIMIT 2`,
      [actor.tenantId]
    );
    if (instances.rowCount !== 1) throw new LogisticsGpsRepositoryError('SCHOOL_CONTEXT_UNAVAILABLE');
    if (!instances.rows[0].enabled_features.includes('feat_logistics_transportation')) {
      throw new LogisticsGpsRepositoryError('FEATURE_DISABLED');
    }
    const capabilities = await client.query<{ capabilities: Record<string, boolean> }>(
      `SELECT capabilities FROM production.logistics_feature_configurations
       WHERE tenant_id = $1 AND school_id = $2`,
      [actor.tenantId, instances.rows[0].school_id]
    );
    if (!capabilities.rows[0]?.capabilities.school_transport ||
        (requireGps && !capabilities.rows[0]?.capabilities.gps_geofencing)) {
      throw new LogisticsGpsRepositoryError('FEATURE_DISABLED');
    }
    return instances.rows[0].school_id;
  }

  async assertConfigurationReady(actor: AuthorizedPrincipal): Promise<void> {
    this.requirePermission(actor, 'logistics.configuration.manage');
    const binding = await withTenantTransaction(this.pool, actor.tenant, async client => {
      const schoolId = await this.schoolContext(client, actor, false);
      const routeStops = await client.query(
        `SELECT 1
         FROM production.logistics_route_stops stops
         JOIN production.logistics_routes routes
           ON routes.tenant_id = stops.tenant_id
          AND routes.school_id = stops.school_id
          AND routes.id = stops.route_id
         WHERE stops.tenant_id = $1 AND stops.school_id = $2
           AND stops.latitude IS NOT NULL AND stops.longitude IS NOT NULL
           AND routes.status = 'active'
         GROUP BY stops.route_id
         HAVING count(*) >= 2
         LIMIT 1`,
        [actor.tenantId, schoolId]
      );
      if (!routeStops.rowCount) throw new LogisticsGpsRepositoryError('PROVIDER_NOT_READY');
      const activeBinding = await client.query<{
        provider_device_id: string;
        provider_unique_id: string;
      }>(
        `SELECT provider_device_id::text, provider_unique_id
         FROM production.logistics_gps_device_bindings
         WHERE tenant_id = $1 AND school_id = $2 AND status = 'active'
         ORDER BY verified_at DESC
         LIMIT 1`,
        [actor.tenantId, schoolId]
      );
      if (!activeBinding.rowCount) throw new LogisticsGpsRepositoryError('PROVIDER_NOT_READY');
      return activeBinding.rows[0];
    });
    try {
      await this.adapter.verifyDevice(Number(binding.provider_device_id), binding.provider_unique_id);
    } catch (error) {
      if (error instanceof TraccarGpsError) throw new LogisticsGpsRepositoryError('PROVIDER_NOT_READY');
      throw error;
    }
  }

  private async audit(
    client: DatabaseClient,
    actor: AuthorizedPrincipal,
    schoolId: string,
    action: string,
    entityId: string,
    details: Record<string, unknown>
  ): Promise<void> {
    await client.query(
      `INSERT INTO production.logistics_audit_events
         (tenant_id, school_id, actor_user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, 'vehicle', $5, $6::jsonb)`,
      [actor.tenantId, schoolId, actor.userId, action, entityId, JSON.stringify(details)]
    );
  }

  async verifyAndBindDevice(actor: AuthorizedPrincipal, input: {
    vehicleId: string;
    providerDeviceId: number;
    providerUniqueId: string;
  }): Promise<{ id: string; vehicleId: string; provider: 'traccar'; verifiedAt: Date }> {
    this.requirePermission(actor, 'logistics.gps.manage');
    const vehicleId = uuid(input.vehicleId);
    const providerDeviceId = positiveInteger(input.providerDeviceId);
    const providerUniqueId = input.providerUniqueId.trim();
    if (!providerUniqueId || providerUniqueId.length > 200) {
      throw new LogisticsGpsRepositoryError('INVALID_INPUT');
    }
    const schoolId = await withTenantTransaction(this.pool, actor.tenant, async client => {
      const currentSchoolId = await this.schoolContext(client, actor, false);
      const vehicle = await client.query(
        `SELECT 1 FROM production.logistics_vehicles
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3
           AND status = 'active' AND approved = true`,
        [actor.tenantId, currentSchoolId, vehicleId]
      );
      if (!vehicle.rowCount) throw new LogisticsGpsRepositoryError('NOT_FOUND');
      return currentSchoolId;
    });

    try {
      await this.adapter.verifyDevice(providerDeviceId, providerUniqueId);
    } catch (error) {
      if (error instanceof TraccarGpsError) throw new LogisticsGpsRepositoryError('PROVIDER_NOT_READY');
      throw error;
    }

    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const currentSchoolId = await this.schoolContext(client, actor, false);
      if (currentSchoolId !== schoolId) throw new LogisticsGpsRepositoryError('SCHOOL_CONTEXT_UNAVAILABLE');
      try {
        const result = await client.query<{ id: string; verified_at: Date }>(
          `INSERT INTO production.logistics_gps_device_bindings
             (tenant_id, school_id, provider, provider_device_id, provider_unique_id,
              vehicle_id, verified_at, verified_by)
           VALUES ($1, $2, 'traccar', $3, $4, $5, now(), $6)
           RETURNING id, verified_at`,
          [actor.tenantId, schoolId, providerDeviceId, providerUniqueId, vehicleId, actor.userId]
        );
        await this.audit(client, actor, schoolId, 'gps_device_bound', vehicleId, {
          provider: 'traccar', providerDeviceId, bindingId: result.rows[0].id
        });
        return {
          id: result.rows[0].id, vehicleId, provider: 'traccar', verifiedAt: result.rows[0].verified_at
        };
      } catch (error) {
        if ((error as { code?: string }).code === '23505') {
          throw new LogisticsGpsRepositoryError('CONFLICT');
        }
        throw error;
      }
    });
  }

  async syncVehicleTelemetry(actor: AuthorizedPrincipal, vehicleIdInput: string): Promise<{
    telemetryId: string;
    vehicleId: string;
    source: 'traccar';
    fixTime: Date;
    receivedAt: Date;
    latitude: number;
    longitude: number;
    speedKph: number | null;
    replayed: boolean;
    events: Array<{ id: string; type: string }>;
  }> {
    this.requirePermission(actor, 'logistics.gps.read');
    const vehicleId = uuid(vehicleIdInput);
    const binding = await withTenantTransaction(this.pool, actor.tenant, async client => {
      const schoolId = await this.schoolContext(client, actor, true);
      const result = await client.query<{
        id: string; provider_device_id: string; provider_unique_id: string;
      }>(
        `SELECT id, provider_device_id::text, provider_unique_id
         FROM production.logistics_gps_device_bindings
         WHERE tenant_id = $1 AND school_id = $2 AND vehicle_id = $3
           AND provider = 'traccar' AND status = 'active'
         FOR UPDATE`,
        [actor.tenantId, schoolId, vehicleId]
      );
      if (!result.rows[0]) throw new LogisticsGpsRepositoryError('NOT_FOUND');
      return { schoolId, ...result.rows[0] };
    });

    let position: Awaited<ReturnType<TraccarGpsAdapter['latestPosition']>>;
    try {
      await this.adapter.verifyDevice(Number(binding.provider_device_id), binding.provider_unique_id);
      position = await this.adapter.latestPosition(Number(binding.provider_device_id));
    } catch (error) {
      if (error instanceof TraccarGpsError) throw new LogisticsGpsRepositoryError('PROVIDER_NOT_READY');
      throw error;
    }

    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const schoolId = await this.schoolContext(client, actor, true);
      if (schoolId !== binding.schoolId) throw new LogisticsGpsRepositoryError('SCHOOL_CONTEXT_UNAVAILABLE');
      const currentBinding = await client.query(
        `SELECT 1 FROM production.logistics_gps_device_bindings
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3
           AND vehicle_id = $4 AND status = 'active'
         FOR UPDATE`,
        [actor.tenantId, schoolId, binding.id, vehicleId]
      );
      if (!currentBinding.rowCount) throw new LogisticsGpsRepositoryError('NOT_FOUND');
      const previous = await client.query<{ latitude: number; longitude: number }>(
        `SELECT latitude, longitude FROM production.logistics_gps_telemetry
         WHERE tenant_id = $1 AND school_id = $2 AND binding_id = $3
           AND fix_time < $4
         ORDER BY fix_time DESC LIMIT 1`,
        [actor.tenantId, schoolId, binding.id, position.fixTime]
      );
      const speedKph = position.speed === null ? null : position.speed * 1.852;
      const inserted = await client.query<{ id: string; received_at: Date }>(
        `INSERT INTO production.logistics_gps_telemetry
           (tenant_id, school_id, binding_id, vehicle_id, provider_position_id,
            fix_time, provider_server_time, latitude, longitude, speed_kph)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (tenant_id, school_id, binding_id, provider_position_id)
           WHERE provider_position_id IS NOT NULL DO NOTHING
         RETURNING id, received_at`,
        [actor.tenantId, schoolId, binding.id, vehicleId, position.id, position.fixTime,
          position.serverTime, position.latitude, position.longitude, speedKph]
      );
      if (!inserted.rowCount) {
        const prior = await client.query<{ id: string; received_at: Date }>(
          `SELECT id, received_at FROM production.logistics_gps_telemetry
           WHERE tenant_id = $1 AND school_id = $2 AND binding_id = $3
             AND provider_position_id = $4`,
          [actor.tenantId, schoolId, binding.id, position.id]
        );
        if (!prior.rows[0]) throw new LogisticsGpsRepositoryError('CONFLICT');
        return {
          telemetryId: prior.rows[0].id, vehicleId, source: 'traccar',
          fixTime: position.fixTime, receivedAt: prior.rows[0].received_at,
          latitude: position.latitude, longitude: position.longitude,
          speedKph, replayed: true, events: []
        };
      }

      const tripResult = await client.query<{ id: string; route_id: string }>(
        `SELECT id, route_id FROM production.logistics_trips
         WHERE tenant_id = $1 AND school_id = $2 AND vehicle_id = $3
           AND status IN ('started', 'in_progress')
           AND started_at IS NOT NULL AND started_at <= $4
           AND (scheduled_arrival_at IS NULL OR scheduled_arrival_at >= $4)
         ORDER BY started_at DESC NULLS LAST LIMIT 1`,
        [actor.tenantId, schoolId, vehicleId, position.fixTime]
      );
      const routeStops = tripResult.rows[0]
        ? await client.query<{
            id: string; latitude: number | null; longitude: number | null; geofence_radius_meters: number;
          }>(
            `SELECT id, latitude, longitude, geofence_radius_meters
             FROM production.logistics_route_stops
             WHERE tenant_id = $1 AND school_id = $2 AND route_id = $3
               AND latitude IS NOT NULL AND longitude IS NOT NULL
             ORDER BY stop_order`,
            [actor.tenantId, schoolId, tripResult.rows[0].route_id]
          )
        : { rows: [] };
      const events: Array<{ id: string; type: string }> = [];
      const insertEvent = async (type: string, routeStopId: string | null, details: Record<string, unknown>) => {
        const event = await client.query<{ id: string }>(
          `INSERT INTO production.logistics_gps_events
             (tenant_id, school_id, trip_id, vehicle_id, route_stop_id,
              telemetry_id, event_type, details)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
           RETURNING id`,
          [actor.tenantId, schoolId, tripResult.rows[0]?.id ?? null, vehicleId,
            routeStopId, inserted.rows[0].id, type, JSON.stringify(details)]
        );
        events.push({ id: event.rows[0].id, type });
      };

      const locatedStops = routeStops.rows.filter(stop =>
        stop.latitude !== null && stop.longitude !== null);
      for (const stop of locatedStops) {
        const distance = distanceMeters(
          position.latitude, position.longitude, stop.latitude!, stop.longitude!
        );
        const wasInside = previous.rows[0]
          ? distanceMeters(previous.rows[0].latitude, previous.rows[0].longitude,
              stop.latitude!, stop.longitude!) <= stop.geofence_radius_meters
          : false;
        const isInside = distance <= stop.geofence_radius_meters;
        if (isInside !== wasInside) {
          await insertEvent(isInside ? 'geofence_entry' : 'geofence_exit', stop.id, {
            distanceMeters: Math.round(distance)
          });
        }
      }
      if (locatedStops.length > 0) {
        const nearestRouteDistance = locatedStops.length === 1
          ? distanceMeters(position.latitude, position.longitude,
              locatedStops[0].latitude!, locatedStops[0].longitude!)
          : Math.min(...locatedStops.slice(1).map((stop, index) =>
              distanceToSegmentMeters(
                position.latitude,
                position.longitude,
                { latitude: locatedStops[index].latitude!, longitude: locatedStops[index].longitude! },
                { latitude: stop.latitude!, longitude: stop.longitude! }
              )));
        const settings = await client.query<{ settings: Record<string, unknown> }>(
          `SELECT settings FROM production.logistics_feature_configurations
           WHERE tenant_id = $1 AND school_id = $2`,
          [actor.tenantId, schoolId]
        );
        const configuredLimit = settings.rows[0]?.settings.gpsMaxRouteDeviationMeters;
        const maxDeviation = Number.isInteger(configuredLimit) &&
          (configuredLimit as number) >= 100 && (configuredLimit as number) <= 5000
          ? configuredLimit as number
          : 500;
        if (nearestRouteDistance > maxDeviation) {
          await insertEvent('route_deviation', null, {
            distanceMeters: Math.round(nearestRouteDistance), maxDeviationMeters: maxDeviation
          });
        }
      }
      await this.audit(client, actor, schoolId, 'gps_telemetry_synchronized', vehicleId, {
        provider: 'traccar', telemetryId: inserted.rows[0].id, eventCount: events.length,
        fixTime: position.fixTime.toISOString()
      });
      return {
        telemetryId: inserted.rows[0].id, vehicleId, source: 'traccar',
        fixTime: position.fixTime, receivedAt: inserted.rows[0].received_at,
        latitude: position.latitude, longitude: position.longitude,
        speedKph, replayed: false, events
      };
    });
  }

  async revokeDeviceBinding(actor: AuthorizedPrincipal, bindingIdInput: string): Promise<{ id: string }> {
    this.requirePermission(actor, 'logistics.gps.manage');
    const bindingId = uuid(bindingIdInput);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const schoolId = await this.schoolContext(client, actor, false);
      const result = await client.query(
        `UPDATE production.logistics_gps_device_bindings
         SET status = 'revoked', revoked_at = now(), revoked_by = $4
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3 AND status = 'active'
         RETURNING vehicle_id`,
        [actor.tenantId, schoolId, bindingId, actor.userId]
      );
      if (!result.rowCount) throw new LogisticsGpsRepositoryError('NOT_FOUND');
      await this.audit(client, actor, schoolId, 'gps_device_binding_revoked', result.rows[0].vehicle_id, {
        bindingId
      });
      return { id: bindingId };
    });
  }
}
