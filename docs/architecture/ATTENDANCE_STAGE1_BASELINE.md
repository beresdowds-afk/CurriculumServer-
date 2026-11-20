# Attendance Stage 1 baseline

**Status: not operational.** No attendance records, device events, electronic
registers or guardian notifications are implemented by this change. Stage 1
has not passed its acceptance gate; the Stage 2 template must not be created
or made provisionable on this basis.

## Repository inventory

- `BiometricAttendanceTab.tsx` previously defaulted to seeded devices and
  logs from `biometricAttendanceData.ts`, mock users and school data, and
  no-op mutation callbacks. It simulated scans, staff records, movement
  passes and enrollment. It now shows an unavailable notice. The seed data
  remains in the repository and is not evidence of hardware or delivery.
- `StudentRegistersTab.tsx` uses client-side class registers and a default
  no-op save callback. `teacher-dashboard/TeacherModals.tsx` also has a
  simulated roster and a success message. Neither is an authoritative
  attendance register. Other school data and report components contain demo
  values and need a separate migration to persisted attendance records.
- `server.ts` mounts the global API gate before handlers. Its legacy
  `/api/v1/flow/school/:tenantId/attendance` GET and POST handlers use
  `serverSchoolManager.ts` and JSON files, including seeded attendance.
  They are unmatched by the capability registry and return 503 before the
  handler. Dining attendance under logistics is not a class or staff
  attendance engine.
- Migrations 005, 006, 008 and 009 provide tenant, school, student, class,
  staff, membership, permission, scope and session structures. Migration 010
  supplies signed transaction-local tenant context and RLS helpers.
  `authorization/middleware.ts` and `authorizationRepository.ts` resolve
  database sessions, memberships, permissions and scopes for wired routes;
  repositories must still check resource scopes. Central IAM and
  administrative permission management remain `not_started`.
- Migration 011 provides tenant/school-scoped logistics guardian and
  guardian-student records with verification status. Their suitability for
  attendance-specific notification consent and preferences must be assessed;
  a phone number alone is not a verified relationship.
- Migration 027 and `server/notifications/` provide an encrypted,
  tenant-scoped outbox, attempts and provider integrations. Enqueue opens its
  own transaction and is not idempotent. Dispatch is not started
  automatically and is at-least-once; provider acceptance is not delivery.
  Atomic attendance plus notification intent, deduplication, trusted worker
  operation and authenticated delivery receipts are not implemented.
- `applicationRegistryData.ts` has an existing attendance feature entry,
  but `applicationInstanceConfiguration.ts` has no attendance template or
  validator. The Application Builder and provisioning engine therefore do not
  provision attendance. Existing logistics, finance, academic-records and
  adaptive-CBT templates demonstrate the registry pattern, not attendance
  readiness.

## Changes and remaining gates

Migration 031 adds only canonical permission declarations and grants no roles.
The `biometric_attendance` capability is `not_started` with no routes, tests
or operational evidence registered. It cannot admit the legacy JSON handlers.

The remaining Stage 1 work includes a tenant/school-qualified PostgreSQL
attendance schema with forced RLS; secure device enrollment and independent
authentication; adapter contracts and replay-safe offline ingestion;
schedule-aware student and staff derivation; audited exceptions; server
registers and reports; verified guardian consent and atomic notification
intents; and permission and resource-scope enforcement. These require real
end-to-end PostgreSQL and authenticated API acceptance tests. Notification
provider and worker readiness, Central IAM readiness and real device protocol
evidence remain external or platform prerequisites. Do not equate this
inventory, a migration or a screen with a working attendance system.
