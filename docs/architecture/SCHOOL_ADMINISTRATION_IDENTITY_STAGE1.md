# School Administration & Identity: Stage 1 work report

**Status: incomplete; not production-ready or provisionable.** This branch adds
only a draft template contract. It does not implement the requested production
domain, persistence, lifecycle services, or Stage 1 acceptance tests.

## Inventory and existing schema

- Migrations 005 and 006 establish `production.tenants`, `organizations`,
  `schools`, `school_configurations`, `application_instances`, global
  `users`, tenant `memberships`, and basic `students` and `classes`. School
  provisioning and invitations use these tables. Existing memberships retain
  the legacy `user_subject` key and may have a linked `user_id`.
- `production.students` has a tenant-and-school admission-number uniqueness
  constraint. Its class foreign key uses `(tenant_id, class_id)`, not
  `(tenant_id, school_id, class_id)`, so it does not prevent references to a
  different school in the same tenant. The existing model does not provide
  student lifecycle history, staff, organizational appointments or transfers.
- `server/db/tenantContext.ts` supplies transaction-local tenant context.
  `server/db/schoolProvisioningRepository.ts` persists provisioning records
  and uses a control-plane context. `server/tenantTokenService.ts` signs and
  verifies tenant tokens. These mechanisms are reused as reference points,
  not as evidence that the new domain is implemented.
- `StudentRegistersTab` defaults to `src/data/schoolManagementData.ts`
  fixtures; class and teacher components consume supplied UI data.
  `server/serverSchoolManager.ts` uses JSON files and mock fallback data;
  `server/serverAcademicPersistence.ts` uses JSON files for academic data.
  None is an acceptable production administration repository.
- `src/data/applicationRegistryData.ts` contains initial application and
  feature data associated with Curriculum Flow. The draft template is kept
  separate so it does not claim implementation or enable unrelated features.

## Security limitations

Migration 006's production RLS policies allow access through
`app.control_plane_admin`, a PostgreSQL session setting. The existing
provisioning repository sets this flag using its supplied pool; the code does
not establish a separate privileged database identity for that operation.
A runtime connection able to execute arbitrary SQL can set this flag, as well
as `app.tenant_id`. Forced RLS and a non-owner, non-superuser role therefore
do not independently enforce the required separation against arbitrary SQL.
The existing RLS integration test exercises normal transaction scoping, not
this privileged-context boundary. A reviewed role-and-privilege design and
forward-only migration are required before relying on it for this domain.

No sensitive student data, credentials, or demonstration records were added.
There is no new security review, authorization layer, retention policy,
document-access policy, or privacy assessment in this branch.

## Changes and migration status

- Added `packages/shared-types/src/schoolAdministrationTemplate.ts`: draft
  version `0.1.0`, stable identifier, planned capabilities and deployment
  architectures, configuration schema, requirements and compatibility fields.
  It is explicitly `provisionable: false`; its API contract is unreleased.
- Updated `packages/shared-types/src/index.ts` to export the draft contract.
- Added `server/db/schoolAdministrationTemplate.test.ts`.
- Added this architecture, schema inventory, and implementation report.
- **No migration was added or changed.** Migrations 005 and 006 are existing
  prerequisites only; they are insufficient for this template.

## Validation

- `npm test`: 45 passed, 1 skipped. The skip was the PostgreSQL integration
  test because no test URL was provided to that invocation.
- Existing `server/db/postgres.integration.test.ts`: 1 passed against a
  disposable PostgreSQL 16 container after applying migrations 001–006 and
  creating a non-owner, non-superuser, non-BYPASSRLS test role. This verifies
  the existing provisioning test only, not the requested new domain.
- `npm run lint` and `npm run build`: passed; the build reported a large
  frontend chunk warning.
- Required new PostgreSQL repository, concurrency, lifecycle, cross-tenant,
  audit and restart tests are **not implemented or run**. PostgreSQL was
  available for the existing integration test; these tests were not blocked
  by infrastructure.

## Work still required before Stage 1 can be completed

1. Design and verify separated runtime and control-plane identities, tenant
   policies, privileges and migration strategy without breaking provisioning.
2. Add forward-only domain migrations with school-scoped composite
   relationships, appropriate RLS, normalized roles and identity links,
   configuration history and protected sensitive data.
3. Implement typed PostgreSQL repositories and audited transactional
   admission, assignment, promotion, graduation and transfer operations.
   Cross-school transfers require independent authorization and must not
   expose source records merely on request.
4. Add real disposable PostgreSQL tests for all requested invariants,
   concurrency, rollback and restart persistence, plus unit tests and schema
   and operational documentation.
5. Only after those checks, publish a versioned API contract, implement
   provisioning validation and connect the template to the Application
   Builder. Stage 2 must integrate server-authorized roles, permissions,
   account linking and protected routes; browser-provided roles or tenant
   identifiers must not be trusted.

No deployment, school activation, fixture import, or Stage 2 work was done.
