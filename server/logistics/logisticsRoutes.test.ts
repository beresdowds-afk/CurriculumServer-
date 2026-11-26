import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import express, { type RequestHandler } from 'express';
import { createAuthorizedPrincipal, type AuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import { PERMISSIONS } from '../authorization/permissions';
import { createApiCapabilityGateMiddleware } from '../capabilities/productionCapabilityMiddleware';
import type { DatabaseClient, DatabasePool } from '../db/postgres';
import { principal } from '../db/testSupport';
import { LOGISTICS_FEATURE_TEMPLATE, validateLogisticsFeatureConfiguration } from '../../src/data/logisticsFeatureTemplate';
import { LogisticsGpsRepository, LogisticsGpsRepositoryError } from './logisticsGpsRepository';
import { LogisticsLibraryStorageError, LogisticsLibraryStorageService } from './logisticsLibraryStorageService';
import { LogisticsError, LogisticsRepository } from './logisticsRepository';
import { createLogisticsCompletionRouter } from './logisticsRoutes';

const TENANT_A = '9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8';
const TENANT_B = '0e9d3871-41a6-47e7-9111-111111111111';
const SCHOOL_A = 'a0f50001-1111-4111-8111-111111111111';
const SCHOOL_B = 'a0f50001-2222-4222-8222-222222222222';
const STUDENT_A = 'b0f50002-1111-4111-8111-222222222222';
const ADMIN_USER = 'c0f50003-1111-4111-8111-333333333333';
const OFFICER_USER = 'd0f50004-1111-4111-8111-444444444444';
const VEHICLE_A = 'e0f50005-1111-4111-8111-555555555555';
const TRIP_A = 'f0f50006-1111-4111-8111-666666666666';
const TRIP_STARTED = 'f0f50007-1111-4111-8111-777777777777';
const RESOURCE_DRAFT = '10f50008-1111-4111-8111-888888888888';
const RESOURCE_CLEAN = '20f50009-1111-4111-8111-999999999999';
const EXEAT_ACTIVE = '30f50010-1111-4111-8111-aaaaaaaaaaaa';
const EXEAT_OVERDUE = '40f50011-1111-4111-8111-bbbbbbbbbbbb';

const ALL_LOGISTICS_FEATURES = [
  'feat_logistics_support',
  'feat_logistics_gate_security',
  'feat_logistics_guardian_pickup',
  'feat_logistics_boarding_house',
  'feat_logistics_hostel',
  'feat_logistics_exeat',
  'feat_logistics_dining',
  'feat_logistics_transportation',
  'feat_logistics_elibrary',
  'feat_logistics_gps_geofencing'
];

function buildActor(
  tenantId: string,
  userId: string,
  roleCode: string,
  permissions: string[]
): AuthorizedPrincipal {
  return createAuthorizedPrincipal({
    tenant: principal(tenantId, roleCode),
    userId,
    sessionId: randomUUID(),
    grants: [{ roleCode, permissions, scopes: [] }]
  });
}

function createLogisticsMockPool() {
  const guardians: Array<{
    id: string; tenant_id: string; school_id: string; user_id: string | null;
    full_name: string; phone: string; verification_status: string;
    identity_reference: string | null; verified_at: Date | null; created_at: Date;
  }> = [];
  const guardianStudents: Array<{
    id: string; tenant_id: string; school_id: string; guardian_id: string; student_id: string;
    relationship: string; status: string; verified_at: Date; starts_at: Date; ends_at: Date | null;
  }> = [];
  const pickupAuthorizations: Array<{
    id: string; tenant_id: string; school_id: string; guardian_student_id: string;
    starts_at: Date; ends_at: Date; status: string;
  }> = [];
  const pickupPasses: Array<{
    id: string; tenant_id: string; school_id: string; pickup_authorization_id: string;
    expires_at: Date; revoked_at: Date | null; revoked_by: string | null;
    max_uses: number; use_count: number; created_at: Date;
  }> = [];
  const gateLocations: Array<{ id: string; tenant_id: string; school_id: string; name: string; status: string }> = [];
  const gateOfficers: Array<{ id: string; tenant_id: string; school_id: string; gate_location_id: string; user_id: string }> = [];
  const securityIncidents: Array<{
    id: string; tenant_id: string; school_id: string; gate_event_id: string | null;
    incident_type: string; details: Record<string, unknown>; occurred_at: Date;
  }> = [];
  const exeats = [
    {
      id: EXEAT_ACTIVE,
      tenant_id: TENANT_A,
      school_id: SCHOOL_A,
      student_id: STUDENT_A,
      requested_by: ADMIN_USER,
      status: 'pending_principal',
      return_due_at: new Date(Date.now() + 86_400_000),
      cancelled_by: null as string | null
    },
    {
      id: EXEAT_OVERDUE,
      tenant_id: TENANT_A,
      school_id: SCHOOL_A,
      student_id: STUDENT_A,
      requested_by: ADMIN_USER,
      status: 'departed',
      return_due_at: new Date(Date.now() - 3_600_000),
      cancelled_by: null as string | null
    }
  ];
  const entitlements: Array<{
    id: string; tenant_id: string; school_id: string; student_id: string;
    meal_periods: string[]; starts_on: string; ends_on: string | null;
    status: string; dietary_profile_reference: string | null; created_at: Date;
  }> = [];
  const trips = [
    { id: TRIP_A, tenant_id: TENANT_A, school_id: SCHOOL_A, status: 'scheduled' },
    { id: TRIP_STARTED, tenant_id: TENANT_A, school_id: SCHOOL_A, status: 'started' }
  ];
  const tripPassengers = [
    {
      id: randomUUID(),
      tenant_id: TENANT_A,
      school_id: SCHOOL_A,
      trip_id: TRIP_A,
      student_id: STUDENT_A,
      boarded_at: new Date(),
      boarded_by: OFFICER_USER,
      dropped_off_at: null,
      dropped_off_by: null
    }
  ];
  const resources = [
    {
      id: RESOURCE_DRAFT,
      tenant_id: TENANT_A,
      school_id: SCHOOL_A,
      storage_object_key: null as string | null,
      current_version: 0,
      publication_status: 'draft'
    },
    {
      id: RESOURCE_CLEAN,
      tenant_id: TENANT_A,
      school_id: SCHOOL_A,
      storage_object_key: 'gcs:tenant/school/res-v1',
      current_version: 1,
      publication_status: 'draft'
    }
  ];
  const resourceVersions = [
    { tenant_id: TENANT_A, school_id: SCHOOL_A, resource_id: RESOURCE_CLEAN, version: 1, scan_status: 'clean' }
  ];
  const usageEvents = [
    {
      id: randomUUID(),
      tenant_id: TENANT_A,
      school_id: SCHOOL_A,
      resource_id: RESOURCE_CLEAN,
      actor_user_id: ADMIN_USER,
      action: 'download',
      resource_version: 1,
      occurred_at: new Date()
    }
  ];
  const gpsBindings = [
    {
      id: randomUUID(),
      tenant_id: TENANT_A,
      school_id: SCHOOL_A,
      vehicle_id: VEHICLE_A,
      provider: 'traccar',
      provider_device_id: '101',
      provider_unique_id: 'TRACCAR-001',
      status: 'active',
      verified_at: new Date()
    }
  ];
  const gpsTelemetry = [
    {
      id: randomUUID(),
      tenant_id: TENANT_A,
      school_id: SCHOOL_A,
      vehicle_id: VEHICLE_A,
      binding_id: gpsBindings[0].id,
      provider_position_id: '501',
      fix_time: new Date(),
      provider_server_time: new Date(),
      received_at: new Date(),
      latitude: 6.5244,
      longitude: 3.3792,
      speed_kph: 32.5
    }
  ];
  const gpsEvents = [
    {
      id: randomUUID(),
      tenant_id: TENANT_A,
      school_id: SCHOOL_A,
      vehicle_id: VEHICLE_A,
      trip_id: TRIP_A,
      route_stop_id: null,
      telemetry_id: gpsTelemetry[0].id,
      event_type: 'geofence_enter',
      occurred_at: new Date(),
      details: { stopName: 'Main Gate' }
    }
  ];
  const workflowKeys = new Map<string, { operation: string; fingerprint: Buffer }>();
  const notificationOutbox: Array<{ tenantId: string; id: string; channel: string }> = [];
  const notificationDispatches: Array<{ eventType: string; entityId: string; status: string; channel: string }> = [];
  const auditEvents: Array<{
    id: string; tenant_id: string; school_id: string; actor_user_id: string;
    action: string; entity_type: string; entity_id: string; details: Record<string, unknown>; occurred_at: Date;
  }> = [];

  const client = {
    async query<R = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<{ rows: R[]; rowCount: number }> {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      if (normalized === 'BEGIN' || normalized === 'COMMIT' || normalized === 'ROLLBACK' ||
          normalized.startsWith('SELECT set_config(') || normalized.startsWith('SELECT pg_advisory_xact_lock(')) {
        return { rows: [], rowCount: 0 };
      }

      if (normalized.includes('FROM production.application_instances') && normalized.includes('enabled_features')) {
        const tenantId = params[0] as string;
        const rows = tenantId === TENANT_A
          ? [{ school_id: SCHOOL_A, enabled_features: ALL_LOGISTICS_FEATURES }]
          : tenantId === TENANT_B
            ? [{ school_id: SCHOOL_B, enabled_features: ALL_LOGISTICS_FEATURES }]
            : [];
        return { rows: rows as R[], rowCount: rows.length };
      }
      if (normalized.includes('FROM production.application_instances')) {
        const tenantId = params[0] as string;
        const rows = tenantId === TENANT_A
          ? [{ school_id: SCHOOL_A }]
          : tenantId === TENANT_B
            ? [{ school_id: SCHOOL_B }]
            : [];
        return { rows: rows as R[], rowCount: rows.length };
      }
      if (normalized.includes('FROM production.logistics_feature_configurations') && normalized.includes('parentNotifications')) {
        return { rows: [{ parent_notifications: { sms: true, email: true, push: false } }] as R[], rowCount: 1 };
      }
      if (normalized.includes('FROM production.logistics_feature_configurations')) {
        return {
          rows: [{
            enabled: true,
            capabilities: {
              gate_security: true,
              guardian_pickup: true,
              hostel_management: true,
              exeat_management: true,
              dining_management: true,
              school_transport: true,
              digital_library: true,
              gps_geofencing: true,
              device_management: false
            }
          }] as R[],
          rowCount: 1
        };
      }

      if (normalized.startsWith('INSERT INTO production.logistics_workflow_requests')) {
        const [tenantId, schoolId, idempotencyKey, operation, fingerprint] = params as [
          string, string, string, string, Buffer
        ];
        const key = `${tenantId}:${schoolId}:${idempotencyKey}`;
        const existing = workflowKeys.get(key);
        if (existing) {
          return { rows: [] as R[], rowCount: 0 };
        }
        workflowKeys.set(key, { operation, fingerprint });
        return { rows: [] as R[], rowCount: 1 };
      }
      if (normalized.includes('FROM production.logistics_workflow_requests')) {
        const [tenantId, schoolId, idempotencyKey] = params as [string, string, string];
        const existing = workflowKeys.get(`${tenantId}:${schoolId}:${idempotencyKey}`);
        return {
          rows: (existing ? [{ operation: existing.operation, request_fingerprint: existing.fingerprint, result: null }] : []) as R[],
          rowCount: existing ? 1 : 0
        };
      }
      if (normalized.startsWith('UPDATE production.logistics_workflow_requests')) {
        return { rows: [], rowCount: 1 };
      }

      if (normalized.startsWith('INSERT INTO production.logistics_audit_events')) {
        const [tenant_id, school_id, actor_user_id, action, entity_type, entity_id, details] = params as [
          string, string, string, string, string, string, string
        ];
        auditEvents.push({
          id: randomUUID(),
          tenant_id,
          school_id,
          actor_user_id,
          action,
          entity_type,
          entity_id,
          details: JSON.parse(details),
          occurred_at: new Date()
        });
        return { rows: [], rowCount: 1 };
      }
      if (normalized.includes('FROM production.logistics_audit_events')) {
        const [tenantId, schoolId, entityType, action] = params as [string, string, string | null, string | null];
        const filtered = auditEvents.filter(e =>
          e.tenant_id === tenantId && e.school_id === schoolId &&
          (!entityType || e.entity_type === entityType) &&
          (!action || e.action === action)
        );
        if (normalized.includes('count(*)::text AS total')) {
          return { rows: [{ total: String(filtered.length) }] as R[], rowCount: 1 };
        }
        return {
          rows: filtered.map(e => ({
            id: e.id,
            actorUserId: e.actor_user_id,
            action: e.action,
            entityType: e.entity_type,
            entityId: e.entity_id,
            details: e.details,
            occurredAt: e.occurred_at
          })) as R[],
          rowCount: filtered.length
        };
      }

      if (normalized.includes('FROM production.students')) {
        const [tenantId, schoolId, studentId] = params as [string, string, string];
        const found = tenantId === TENANT_A && schoolId === SCHOOL_A && studentId === STUDENT_A;
        return { rows: (found ? [{ '?column?': 1 }] : []) as R[], rowCount: found ? 1 : 0 };
      }

      // Guardians & pickup passes
      if (normalized.startsWith('INSERT INTO production.logistics_guardians')) {
        const [tenant_id, school_id, user_id, full_name, phone, identity_reference] = params as [
          string, string, string | null, string, string, string | null
        ];
        const id = randomUUID();
        const created = new Date();
        guardians.push({
          id, tenant_id, school_id, user_id, full_name, phone,
          verification_status: 'pending', identity_reference, verified_at: null, created_at: created
        });
        return { rows: [{ id, verification_status: 'pending', created_at: created }] as R[], rowCount: 1 };
      }
      if (normalized.startsWith('UPDATE production.logistics_guardians')) {
        const [tenantId, schoolId, guardianId, status] = params as [string, string, string, string];
        const row = guardians.find(g => g.tenant_id === tenantId && g.school_id === schoolId && g.id === guardianId);
        if (!row) return { rows: [], rowCount: 0 };
        row.verification_status = status;
        row.verified_at = status === 'verified' ? new Date() : null;
        return { rows: [{ id: row.id, verification_status: row.verification_status }] as R[], rowCount: 1 };
      }
      if (normalized.includes('FROM production.logistics_guardians WHERE tenant_id')) {
        const [tenantId, schoolId, third] = params as [string, string, string | null];
        if (normalized.includes('AND id = $3')) {
          const row = guardians.find(g => g.tenant_id === tenantId && g.school_id === schoolId && g.id === third);
          return { rows: (row ? [{ verification_status: row.verification_status }] : []) as R[], rowCount: row ? 1 : 0 };
        }
        const rows = guardians.filter(g => g.tenant_id === tenantId && g.school_id === schoolId && (!third || g.verification_status === third));
        if (normalized.includes('count(*)::text AS total')) {
          return { rows: [{ total: String(rows.length) }] as R[], rowCount: 1 };
        }
        return {
          rows: rows.map(g => ({
            id: g.id, fullName: g.full_name, phone: g.phone, userId: g.user_id,
            identityReference: g.identity_reference, verificationStatus: g.verification_status,
            verifiedAt: g.verified_at, createdAt: g.created_at
          })) as R[],
          rowCount: rows.length
        };
      }
      if (normalized.startsWith('INSERT INTO production.logistics_guardian_students')) {
        const [tenant_id, school_id, guardian_id, student_id, relationship, _verifiedBy, starts_at, ends_at] = params as [
          string, string, string, string, string, string, Date, Date | null
        ];
        const id = randomUUID();
        guardianStudents.push({
          id, tenant_id, school_id, guardian_id, student_id, relationship,
          status: 'active', verified_at: new Date(), starts_at, ends_at
        });
        return { rows: [{ id }] as R[], rowCount: 1 };
      }
      if (normalized.includes('FROM production.logistics_guardian_students rel JOIN production.logistics_guardians g')) {
        const [tenantId, schoolId, studentId] = params as [string, string, string];
        const rows = guardianStudents
          .filter(rel => rel.tenant_id === tenantId && rel.school_id === schoolId && rel.student_id === studentId && rel.status === 'active')
          .map(rel => {
            const g = guardians.find(x => x.id === rel.guardian_id);
            return g && g.verification_status === 'verified'
              ? { guardian_id: g.id, phone: g.phone, user_id: g.user_id, email: 'guardian@school.test' }
              : null;
          })
          .filter((v): v is NonNullable<typeof v> => Boolean(v));
        return { rows: rows as R[], rowCount: rows.length };
      }
      if (normalized.includes('FROM production.logistics_guardian_students WHERE tenant_id')) {
        const [tenantId, schoolId, relId] = params as [string, string, string];
        const row = guardianStudents.find(r => r.tenant_id === tenantId && r.school_id === schoolId && r.id === relId && r.status === 'active');
        return {
          rows: (row ? [{ id: row.id, status: row.status, verified_at: row.verified_at }] : []) as R[],
          rowCount: row ? 1 : 0
        };
      }
      if (normalized.startsWith('INSERT INTO production.logistics_pickup_authorizations')) {
        const [tenant_id, school_id, guardian_student_id, starts_at, ends_at] = params as [
          string, string, string, Date, Date
        ];
        const id = randomUUID();
        pickupAuthorizations.push({ id, tenant_id, school_id, guardian_student_id, starts_at, ends_at, status: 'active' });
        return { rows: [{ id }] as R[], rowCount: 1 };
      }
      if (normalized.includes('FROM production.logistics_pickup_passes')) {
        const [tenantId, schoolId] = params as [string, string];
        const rows = pickupPasses.filter(p => p.tenant_id === tenantId && p.school_id === schoolId);
        if (normalized.includes('count(*)::text AS total')) {
          return { rows: [{ total: String(rows.length) }] as R[], rowCount: 1 };
        }
        return {
          rows: rows.map(p => ({
            id: p.id, pickupAuthorizationId: p.pickup_authorization_id,
            guardianId: guardians[0]?.id ?? randomUUID(), guardianName: guardians[0]?.full_name ?? 'Guardian',
            studentId: STUDENT_A, expiresAt: p.expires_at, revokedAt: p.revoked_at,
            maxUses: p.max_uses, useCount: p.use_count, createdAt: p.created_at
          })) as R[],
          rowCount: rows.length
        };
      }
      if (normalized.startsWith('UPDATE production.logistics_pickup_passes SET revoked_at')) {
        const [tenantId, schoolId, passId, actorUserId] = params as [string, string, string, string];
        const pass = pickupPasses.find(p => p.tenant_id === tenantId && p.school_id === schoolId && p.id === passId && !p.revoked_at);
        if (!pass) return { rows: [], rowCount: 0 };
        pass.revoked_at = new Date();
        pass.revoked_by = actorUserId;
        return { rows: [{ id: pass.id }] as R[], rowCount: 1 };
      }

      // Gate locations, officers & security incidents
      if (normalized.startsWith('INSERT INTO production.logistics_gate_locations')) {
        const [tenant_id, school_id, name] = params as [string, string, string];
        const id = randomUUID();
        gateLocations.push({ id, tenant_id, school_id, name, status: 'active' });
        return { rows: [{ id, name, status: 'active' }] as R[], rowCount: 1 };
      }
      if (normalized.includes('FROM production.logistics_gate_locations')) {
        const [tenantId, schoolId, gateId] = params as [string, string, string?];
        if (gateId) {
          const g = gateLocations.find(x => x.tenant_id === tenantId && x.school_id === schoolId && x.id === gateId && x.status === 'active');
          return { rows: (g ? [{ '?column?': 1 }] : []) as R[], rowCount: g ? 1 : 0 };
        }
        const rows = gateLocations.filter(x => x.tenant_id === tenantId && x.school_id === schoolId);
        return { rows: rows as R[], rowCount: rows.length };
      }
      if (normalized.includes('FROM production.memberships')) {
        const [tenantId, userId] = params as [string, string];
        const found = tenantId === TENANT_A && (userId === OFFICER_USER || userId === ADMIN_USER);
        return { rows: (found ? [{ '?column?': 1 }] : []) as R[], rowCount: found ? 1 : 0 };
      }
      if (normalized.includes('FROM production.logistics_gate_events')) {
        return { rows: [], rowCount: 0 };
      }
      if (normalized.includes('FROM production.notification_subscriptions')) {
        return { rows: [], rowCount: 0 };
      }
      if (normalized.startsWith('INSERT INTO production.logistics_gate_officer_assignments')) {
        const [tenant_id, school_id, gate_location_id, user_id] = params as [string, string, string, string];
        const id = randomUUID();
        gateOfficers.push({ id, tenant_id, school_id, gate_location_id, user_id });
        return { rows: [{ id }] as R[], rowCount: 1 };
      }
      if (normalized.startsWith('INSERT INTO production.logistics_security_incidents')) {
        const [tenant_id, school_id, gate_event_id, incident_type, details] = params as [
          string, string, string | null, string, string
        ];
        const id = randomUUID();
        securityIncidents.push({
          id, tenant_id, school_id, gate_event_id, incident_type,
          details: JSON.parse(details), occurred_at: new Date()
        });
        return { rows: [{ id }] as R[], rowCount: 1 };
      }
      if (normalized.includes('FROM production.logistics_security_incidents')) {
        const [tenantId, schoolId] = params as [string, string];
        const rows = securityIncidents.filter(i => i.tenant_id === tenantId && i.school_id === schoolId);
        if (normalized.includes('count(*)::text AS total')) {
          return { rows: [{ total: String(rows.length) }] as R[], rowCount: 1 };
        }
        return {
          rows: rows.map(i => ({
            id: i.id, gateEventId: i.gate_event_id, incidentType: i.incident_type,
            details: i.details, occurredAt: i.occurred_at
          })) as R[],
          rowCount: rows.length
        };
      }

      // Exeats cancel & overdue
      if (normalized.includes('FROM production.logistics_exeats') && normalized.includes('FOR UPDATE')) {
        const [tenantId, schoolId, exeatId] = params as [string, string, string];
        const found = exeats.find(e => e.tenant_id === tenantId && e.school_id === schoolId && e.id === exeatId);
        return { rows: (found ? [found] : []) as R[], rowCount: found ? 1 : 0 };
      }
      if (normalized.startsWith("UPDATE production.logistics_exeats SET status = 'cancelled'")) {
        const [tenantId, schoolId, exeatId, actorUserId] = params as [string, string, string, string];
        const found = exeats.find(e => e.tenant_id === tenantId && e.school_id === schoolId && e.id === exeatId);
        if (!found) return { rows: [], rowCount: 0 };
        found.status = 'cancelled';
        found.cancelled_by = actorUserId;
        return { rows: [], rowCount: 1 };
      }
      if (normalized.startsWith("UPDATE production.logistics_exeats SET status = 'overdue'")) {
        const [tenantId, schoolId] = params as [string, string];
        const updated = exeats.filter(
          e => e.tenant_id === tenantId && e.school_id === schoolId &&
               e.status === 'departed' && e.return_due_at.getTime() < Date.now()
        );
        for (const e of updated) e.status = 'overdue';
        return { rows: updated.map(e => ({ id: e.id, student_id: e.student_id })) as R[], rowCount: updated.length };
      }

      // Outbox & notification dispatches
      if (normalized.startsWith('INSERT INTO production.notification_outbox')) {
        const [tenantId, id, channel] = params as [string, string, string];
        notificationOutbox.push({ tenantId, id, channel });
        return { rows: [], rowCount: 1 };
      }
      if (normalized.startsWith('INSERT INTO production.logistics_notification_dispatches')) {
        const [, , eventType, , entityId, , , channel, , statusParam] = params as unknown[];
        notificationDispatches.push({
          eventType: String(eventType),
          entityId: String(entityId),
          channel: String(channel),
          status: statusParam ? String(statusParam) : 'queued'
        });
        return { rows: [], rowCount: 1 };
      }

      // Dining entitlements
      if (normalized.startsWith('INSERT INTO production.logistics_dining_entitlements')) {
        const [tenant_id, school_id, student_id, meal_periods, starts_on, ends_on, dietary_profile_reference] = params as [
          string, string, string, string[], string, string | null, string | null
        ];
        const id = randomUUID();
        entitlements.push({
          id, tenant_id, school_id, student_id, meal_periods, starts_on, ends_on,
          status: 'active', dietary_profile_reference, created_at: new Date()
        });
        return { rows: [{ id }] as R[], rowCount: 1 };
      }
      if (normalized.includes('FROM production.logistics_dining_entitlements')) {
        const [tenantId, schoolId, studentId, status] = params as [string, string, string | null, string | null];
        const rows = entitlements.filter(e =>
          e.tenant_id === tenantId && e.school_id === schoolId &&
          (!studentId || e.student_id === studentId) &&
          (!status || e.status === status)
        );
        return {
          rows: rows.map(e => ({
            id: e.id, studentId: e.student_id, mealPeriods: e.meal_periods,
            startsOn: e.starts_on, endsOn: e.ends_on, status: e.status,
            dietaryProfileReference: e.dietary_profile_reference, createdAt: e.created_at
          })) as R[],
          rowCount: rows.length
        };
      }
      if (normalized.startsWith("UPDATE production.logistics_dining_entitlements SET status = 'ended'")) {
        const [tenantId, schoolId, entitlementId] = params as [string, string, string];
        const found = entitlements.find(e => e.tenant_id === tenantId && e.school_id === schoolId && e.id === entitlementId && e.status === 'active');
        if (!found) return { rows: [], rowCount: 0 };
        found.status = 'ended';
        return { rows: [{ id: found.id }] as R[], rowCount: 1 };
      }

      // Transport trips, passengers, telemetry
      if (normalized.includes('FROM production.logistics_trips')) {
        const [tenantId, schoolId, tripId] = params as [string, string, string];
        const found = trips.find(t => t.tenant_id === tenantId && t.school_id === schoolId && t.id === tripId);
        return { rows: (found ? [{ status: found.status }] : []) as R[], rowCount: found ? 1 : 0 };
      }
      if (normalized.startsWith("UPDATE production.logistics_trips SET status = 'cancelled'")) {
        const [tenantId, schoolId, tripId] = params as [string, string, string];
        const found = trips.find(t => t.tenant_id === tenantId && t.school_id === schoolId && t.id === tripId);
        if (found) found.status = 'cancelled';
        return { rows: [], rowCount: found ? 1 : 0 };
      }
      if (normalized.includes('FROM production.logistics_trip_passengers')) {
        const [tenantId, schoolId, tripId] = params as [string, string, string];
        const rows = tripPassengers.filter(p => p.tenant_id === tenantId && p.school_id === schoolId && p.trip_id === tripId);
        return {
          rows: rows.map(p => ({
            id: p.id, studentId: p.student_id, boardedAt: p.boarded_at,
            boardedBy: p.boarded_by, droppedOffAt: p.dropped_off_at, droppedOffBy: p.dropped_off_by
          })) as R[],
          rowCount: rows.length
        };
      }
      if (normalized.includes('FROM production.logistics_vehicles')) {
        const [tenantId, schoolId, vehicleId] = params as [string, string, string];
        const found = tenantId === TENANT_A && schoolId === SCHOOL_A && vehicleId === VEHICLE_A;
        return { rows: (found ? [{ '?column?': 1 }] : []) as R[], rowCount: found ? 1 : 0 };
      }
      if (normalized.includes('FROM production.logistics_gps_device_bindings')) {
        const [tenantId, schoolId, vehicleId] = params as [string, string, string];
        const rows = gpsBindings
          .filter(b => b.tenant_id === tenantId && b.school_id === schoolId && b.vehicle_id === vehicleId && b.status === 'active')
          .map(b => ({
            id: b.id, provider: b.provider, providerDeviceId: b.provider_device_id,
            providerUniqueId: b.provider_unique_id, status: b.status, verifiedAt: b.verified_at
          }));
        return { rows: rows as R[], rowCount: rows.length };
      }
      if (normalized.includes('FROM production.logistics_gps_telemetry')) {
        const [tenantId, schoolId, vehicleId] = params as [string, string, string];
        const rows = gpsTelemetry
          .filter(t => t.tenant_id === tenantId && t.school_id === schoolId && t.vehicle_id === vehicleId)
          .map(t => ({
            id: t.id, bindingId: t.binding_id, providerPositionId: t.provider_position_id,
            fixTime: t.fix_time, providerServerTime: t.provider_server_time,
            receivedAt: t.received_at, latitude: t.latitude, longitude: t.longitude, speedKph: t.speed_kph
          }));
        return { rows: rows as R[], rowCount: rows.length };
      }
      if (normalized.includes('FROM production.logistics_gps_events')) {
        const [tenantId, schoolId, vehicleId] = params as [string, string, string];
        const rows = gpsEvents
          .filter(e => e.tenant_id === tenantId && e.school_id === schoolId && e.vehicle_id === vehicleId)
          .map(e => ({
            id: e.id, tripId: e.trip_id, routeStopId: e.route_stop_id,
            telemetryId: e.telemetry_id, eventType: e.event_type,
            occurredAt: e.occurred_at, details: e.details
          }));
        return { rows: rows as R[], rowCount: rows.length };
      }

      // Library publication & usage
      if (normalized.includes('FROM production.logistics_library_resources')) {
        const [tenantId, schoolId, resourceId] = params as [string, string, string];
        const row = resources.find(r => r.tenant_id === tenantId && r.school_id === schoolId && r.id === resourceId);
        return { rows: (row ? [row] : []) as R[], rowCount: row ? 1 : 0 };
      }
      if (normalized.includes('FROM production.logistics_library_resource_versions')) {
        const [tenantId, schoolId, resourceId, version] = params as [string, string, string, number];
        const row = resourceVersions.find(v =>
          v.tenant_id === tenantId && v.school_id === schoolId && v.resource_id === resourceId && v.version === version
        );
        return { rows: (row ? [{ scan_status: row.scan_status }] : []) as R[], rowCount: row ? 1 : 0 };
      }
      if (normalized.startsWith('UPDATE production.logistics_library_resources SET publication_status')) {
        const [tenantId, schoolId, resourceId, status] = params as [string, string, string, string];
        const row = resources.find(r => r.tenant_id === tenantId && r.school_id === schoolId && r.id === resourceId);
        if (row) row.publication_status = status;
        return { rows: [], rowCount: row ? 1 : 0 };
      }
      if (normalized.includes('FROM production.logistics_library_usage_events')) {
        const [tenantId, schoolId, resourceId] = params as [string, string, string];
        const rows = usageEvents.filter(u => u.tenant_id === tenantId && u.school_id === schoolId && u.resource_id === resourceId);
        if (normalized.includes('count(*)::text AS total')) {
          return { rows: [{ total: String(rows.length) }] as R[], rowCount: 1 };
        }
        return {
          rows: rows.map(u => ({
            id: u.id, actorUserId: u.actor_user_id, action: u.action,
            resourceVersion: u.resource_version, occurredAt: u.occurred_at
          })) as R[],
          rowCount: rows.length
        };
      }

      throw new Error(`Unhandled SQL in logistics mock pool: ${normalized}`);
    }
  } as unknown as DatabaseClient;

  const pool = {
    query: client.query.bind(client),
    connect: async () => ({ ...client, release: () => {} }),
    end: async () => {},
    on: () => pool
  } as unknown as DatabasePool;

  return { pool, pickupPasses, auditEvents, notificationOutbox, notificationDispatches };
}

test('Prompt 4 HTTP routes pass production capability gate and execute guardian, gate, exeat, dining, transport, library, and audit workflows', async () => {
  const prevKeys = process.env.STORAGE_VAULT_KEYS;
  const prevKeyId = process.env.STORAGE_VAULT_ACTIVE_KEY_ID;
  process.env.STORAGE_VAULT_KEYS = JSON.stringify({ test: Buffer.alloc(32, 9).toString('base64') });
  process.env.STORAGE_VAULT_ACTIVE_KEY_ID = 'test';
  try {
    const mock = createLogisticsMockPool();
    let currentActor = buildActor(TENANT_A, ADMIN_USER, 'tenant_admin', [
      PERMISSIONS.logisticsConfigurationRead,
      PERMISSIONS.logisticsConfigurationManage,
      PERMISSIONS.logisticsGateRead,
      PERMISSIONS.logisticsGateManage,
      PERMISSIONS.logisticsGuardiansManage,
      PERMISSIONS.logisticsExeatRead,
      PERMISSIONS.logisticsExeatApprove,
      PERMISSIONS.logisticsExeatRequest,
      PERMISSIONS.logisticsExeatDepart,
      PERMISSIONS.logisticsExeatReturn,
      PERMISSIONS.logisticsDiningRead,
      PERMISSIONS.logisticsDiningManage,
      PERMISSIONS.logisticsDiningEntitlementManage,
      PERMISSIONS.logisticsTransportRead,
      PERMISSIONS.logisticsTransportManage,
      PERMISSIONS.logisticsTransportPassengersManage,
      PERMISSIONS.logisticsGpsRead,
      PERMISSIONS.logisticsLibraryRead,
      PERMISSIONS.logisticsLibraryManage,
      PERMISSIONS.logisticsAuditRead
    ]);

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as any).authorizedPrincipal = currentActor;
      (req as any).correlationId = 'corr-prompt4-test';
      next();
    });
    app.use('/api', createApiCapabilityGateMiddleware());
    const authMiddleware = {
      activeMembership: ((_req, _res, next) => next()) as RequestHandler,
      requirePermission: (permission: string): RequestHandler => (req, res, next) => {
        const actor = (req as any).authorizedPrincipal as AuthorizedPrincipal;
        if (!actor.hasPermission(permission)) {
          res.status(403).json({ success: false, code: 'FORBIDDEN' });
          return;
        }
        next();
      }
    };
    app.use('/api/v1', createLogisticsCompletionRouter({
      getPool: () => mock.pool,
      authorizationMiddleware: authMiddleware,
      createRepository: pool => new LogisticsRepository(pool),
      createGpsRepository: pool => new LogisticsGpsRepository(pool, null)
    }));

    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}/api/v1`;

    try {
      // Unknown device-management route remains blocked by capability gate
      const blockedRes = await fetch(`${baseUrl}/logistics/device-management`, { method: 'POST' });
      assert.equal(blockedRes.status, 503);
      assert.equal((await blockedRes.json() as { code: string }).code, 'PRODUCTION_PERSISTENCE_UNAVAILABLE');

      // 1. Guardian registration -> verify -> link -> pickup authorization -> list & revoke pickup pass
      const gCreate = await fetch(`${baseUrl}/logistics/guardians`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': 'g-create-1' },
        body: JSON.stringify({ fullName: 'Adaeze Obi', phone: '+2348012345678', identityReference: 'NIN-889' })
      });
      assert.equal(gCreate.status, 201);
      const guardianId = ((await gCreate.json()) as { data: { id: string } }).data.id;

      const gVerify = await fetch(`${baseUrl}/logistics/guardians/${guardianId}/verify`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'verified' })
      });
      assert.equal(gVerify.status, 200);

      const gLink = await fetch(`${baseUrl}/logistics/guardians/${guardianId}/students`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': 'g-link-1' },
        body: JSON.stringify({ studentId: STUDENT_A, relationship: 'mother' })
      });
      assert.equal(gLink.status, 201);
      const relId = ((await gLink.json()) as { data: { id: string } }).data.id;

      const authRes = await fetch(`${baseUrl}/logistics/guardian-students/${relId}/pickup-authorizations`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': 'g-auth-1' },
        body: JSON.stringify({
          startsAt: new Date(Date.now() - 60_000).toISOString(),
          endsAt: new Date(Date.now() + 86_400_000).toISOString()
        })
      });
      assert.equal(authRes.status, 201);
      const authId = ((await authRes.json()) as { data: { id: string } }).data.id;

      const passId = randomUUID();
      mock.pickupPasses.push({
        id: passId,
        tenant_id: TENANT_A,
        school_id: SCHOOL_A,
        pickup_authorization_id: authId,
        expires_at: new Date(Date.now() + 86_400_000),
        revoked_at: null,
        revoked_by: null,
        max_uses: 1,
        use_count: 0,
        created_at: new Date()
      });
      const listPasses = await fetch(`${baseUrl}/logistics/pickup-passes`);
      assert.equal(listPasses.status, 200);
      assert.equal(((await listPasses.json()) as { data: { total: number } }).data.total, 1);

      const revokePass = await fetch(`${baseUrl}/logistics/pickup-passes/${passId}/revoke`, {
        method: 'POST',
        headers: { 'idempotency-key': 'revoke-pass-1' }
      });
      assert.equal(revokePass.status, 200);

      // 2. Gate locations, officer assignment & security incidents
      const gateCreate = await fetch(`${baseUrl}/logistics/gate/locations`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': 'gate-loc-1' },
        body: JSON.stringify({ name: 'North Pedestrian Gate' })
      });
      assert.equal(gateCreate.status, 201);
      const gateId = ((await gateCreate.json()) as { data: { id: string } }).data.id;

      const assignRes = await fetch(`${baseUrl}/logistics/gate/locations/${gateId}/officers`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': 'officer-1' },
        body: JSON.stringify({ userId: OFFICER_USER })
      });
      assert.equal(assignRes.status, 201);

      const incidentRes = await fetch(`${baseUrl}/logistics/gate/incidents`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': 'incident-1' },
        body: JSON.stringify({ incidentType: 'tailgating_attempt', description: 'Unregistered visitor turned back' })
      });
      assert.equal(incidentRes.status, 201);

      const listIncidents = await fetch(`${baseUrl}/logistics/gate/incidents`);
      assert.equal(listIncidents.status, 200);
      assert.equal(((await listIncidents.json()) as { data: { total: number } }).data.total, 1);

      // 3. Exeat overdue evaluation -> queues encrypted outbox & logistics_notification_dispatches; exeat cancel
      const overdueRes = await fetch(`${baseUrl}/logistics/exeats/evaluate-overdue`, { method: 'POST' });
      assert.equal(overdueRes.status, 200);
      assert.equal(((await overdueRes.json()) as { data: { count: number } }).data.count, 1);
      assert.ok(mock.notificationOutbox.some(n => n.channel === 'sms'));
      assert.ok(mock.notificationOutbox.some(n => n.channel === 'email'));
      assert.ok(mock.notificationDispatches.some(d => d.eventType === 'exeat_overdue' && d.status === 'queued'));

      const cancelExeatRes = await fetch(`${baseUrl}/logistics/exeats/${EXEAT_ACTIVE}/cancel`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': 'cancel-exeat-1' },
        body: JSON.stringify({ reason: 'Parent rescheduled travel' })
      });
      assert.equal(cancelExeatRes.status, 200);
      assert.equal(((await cancelExeatRes.json()) as { data: { status: string } }).data.status, 'cancelled');

      // 4. Dining entitlements grant -> list -> revoke
      const entCreate = await fetch(`${baseUrl}/logistics/dining/entitlements`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': 'entitlement-1' },
        body: JSON.stringify({ studentId: STUDENT_A, mealPeriods: ['breakfast', 'dinner'], startsOn: '2026-09-01' })
      });
      assert.equal(entCreate.status, 201);
      const entId = ((await entCreate.json()) as { data: { id: string } }).data.id;

      const entList = await fetch(`${baseUrl}/logistics/dining/entitlements?studentId=${STUDENT_A}`);
      assert.equal(entList.status, 200);
      assert.equal(((await entList.json()) as { data: unknown[] }).data.length, 1);

      const entRevoke = await fetch(`${baseUrl}/logistics/dining/entitlements/${entId}/revoke`, {
        method: 'POST',
        headers: { 'idempotency-key': 'ent-revoke-1' }
      });
      assert.equal(entRevoke.status, 200);

      // 5. Transport telemetry read without live Traccar, trip passenger manifest, trip cancel & started trip conflict
      const telemetryRes = await fetch(`${baseUrl}/logistics/transport/vehicles/${VEHICLE_A}/telemetry`);
      assert.equal(telemetryRes.status, 200);
      const telemetryBody = (await telemetryRes.json()) as { data: { activeBinding: unknown; telemetry: unknown[]; events: unknown[] } };
      assert.ok(telemetryBody.data.activeBinding);
      assert.equal(telemetryBody.data.telemetry.length, 1);
      assert.equal(telemetryBody.data.events.length, 1);

      const paxRes = await fetch(`${baseUrl}/logistics/transport/trips/${TRIP_A}/passengers`);
      assert.equal(paxRes.status, 200);
      assert.equal(((await paxRes.json()) as { data: unknown[] }).data.length, 1);

      const cancelTripRes = await fetch(`${baseUrl}/logistics/transport/trips/${TRIP_A}/cancel`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': 'cancel-trip-1' },
        body: JSON.stringify({ reason: 'Weather closure' })
      });
      assert.equal(cancelTripRes.status, 200);

      const cancelStartedRes = await fetch(`${baseUrl}/logistics/transport/trips/${TRIP_STARTED}/cancel`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': 'cancel-trip-2' },
        body: JSON.stringify({ reason: 'Too late' })
      });
      assert.equal(cancelStartedRes.status, 409);

      // 6. Library publication requires clean uploaded file; usage audit reads downloads
      const pubBlocked = await fetch(`${baseUrl}/logistics/library/resources/${RESOURCE_DRAFT}/publication`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ publicationStatus: 'published' })
      });
      assert.equal(pubBlocked.status, 409);

      const pubOk = await fetch(`${baseUrl}/logistics/library/resources/${RESOURCE_CLEAN}/publication`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ publicationStatus: 'published' })
      });
      assert.equal(pubOk.status, 200);

      const usageRes = await fetch(`${baseUrl}/logistics/library/resources/${RESOURCE_CLEAN}/usage`);
      assert.equal(usageRes.status, 200);
      assert.equal(((await usageRes.json()) as { data: { total: number } }).data.total, 1);

      // 7. Immutable audit ledger query returns recorded mutations
      const auditRes = await fetch(`${baseUrl}/logistics/audit`);
      assert.equal(auditRes.status, 200);
      assert.ok(((await auditRes.json()) as { data: { total: number } }).data.total >= 6);

      // 8. RBAC & cross-tenant isolation
      currentActor = buildActor(TENANT_A, OFFICER_USER, 'student', ['logistics.library.read']);
      const forbiddenAudit = await fetch(`${baseUrl}/logistics/audit`);
      assert.equal(forbiddenAudit.status, 403);

      currentActor = buildActor(TENANT_B, ADMIN_USER, 'tenant_admin', [
        PERMISSIONS.logisticsAuditRead,
        PERMISSIONS.logisticsExeatApprove
      ]);
      const crossTenantAudit = await fetch(`${baseUrl}/logistics/audit`);
      assert.equal(crossTenantAudit.status, 200);
      assert.equal(((await crossTenantAudit.json()) as { data: { total: number } }).data.total, 0);

      const crossTenantMutation = await fetch(`${baseUrl}/logistics/exeats/${EXEAT_ACTIVE}/cancel`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': 'cross-tenant-cancel-1' },
        body: JSON.stringify({ reason: 'Unauthorized cross-tenant cancel' })
      });
      assert.equal(crossTenantMutation.status, 404);
    } finally {
      server.close();
    }
  } finally {
    if (prevKeys === undefined) delete process.env.STORAGE_VAULT_KEYS;
    else process.env.STORAGE_VAULT_KEYS = prevKeys;
    if (prevKeyId === undefined) delete process.env.STORAGE_VAULT_ACTIVE_KEY_ID;
    else process.env.STORAGE_VAULT_ACTIVE_KEY_ID = prevKeyId;
  }
});

test('Library storage blocks unsafe MIME types and telemetry repository fails closed when Traccar is unconfigured for live sync', async () => {
  const mock = createLogisticsMockPool();
  const storageService = new LogisticsLibraryStorageService(mock.pool);
  const admin = buildActor(TENANT_A, ADMIN_USER, 'tenant_admin', [PERMISSIONS.logisticsLibraryManage]);

  for (const unsafeType of ['text/html', 'application/javascript', 'image/svg+xml', 'application/x-msdownload']) {
    await assert.rejects(
      () => storageService.uploadResource(admin, {
        resourceId: RESOURCE_DRAFT,
        contentType: unsafeType,
        contentLength: 10,
        content: (async function* () { yield Buffer.from('hello'); })()
      }),
      error => error instanceof LogisticsLibraryStorageError && error.code === 'INVALID_INPUT'
    );
  }

  const gpsRepo = new LogisticsGpsRepository(mock.pool, null);
  const telemetryReader = buildActor(TENANT_A, ADMIN_USER, 'transport_manager', [PERMISSIONS.logisticsGpsRead]);
  const stored = await gpsRepo.listVehicleTelemetry(telemetryReader, VEHICLE_A);
  assert.equal(stored.vehicleId, VEHICLE_A);
  assert.equal(stored.telemetry.length, 1);

  await assert.rejects(
    () => gpsRepo.syncVehicleTelemetry(telemetryReader, VEHICLE_A),
    error => error instanceof LogisticsGpsRepositoryError && error.code === 'PROVIDER_NOT_READY'
  );
});

test('Device management remains hard-blocked in configuration validation even when Campus Logistics is enabled', () => {
  assert.equal(LOGISTICS_FEATURE_TEMPLATE.implementationStatus, 'complete');
  assert.equal(LOGISTICS_FEATURE_TEMPLATE.productionReadiness, 'ready');
  const validated = validateLogisticsFeatureConfiguration({
    schoolType: 'mixed',
    campusCount: 1,
    gateCount: 1,
    boardingSchool: true,
    hostelCapacity: 100,
    studentCategories: ['boarding', 'day'],
    transportOwnership: 'school_owned',
    vehicleCount: 1,
    routeCount: 1,
    parentNotifications: { sms: true, email: true, push: false },
    pickupRequiresPin: true,
    pickupReusablePasses: false,
    exeatApprovalHierarchy: ['housemaster', 'principal'],
    diningSchedules: [{ name: 'Lunch', startsAt: '12:00', endsAt: '13:30' }],
    timeZone: 'Africa/Lagos',
    languages: ['en'],
    branding: {},
    capabilities: {
      gate_security: true,
      guardian_pickup: true,
      hostel_management: true,
      exeat_management: true,
      dining_management: true,
      school_transport: true,
      digital_library: true,
      gps_geofencing: false,
      device_management: true
    }
  });
  assert.equal(validated.valid, false);
  assert.ok(validated.errors.some(e => e.includes('Device management cannot be enabled')));
});
