import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import type { VerifiedTenantPrincipal } from '../db/tenantContext';
import { hasLibraryReadAccess } from './logisticsLibraryStorageService';

const tenant = {
  tenantId: '9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8',
  role: 'tenant_admin'
} as VerifiedTenantPrincipal;

function actor(role: string, permissions: string[], scopes: Array<{ resourceType: string; resourceId: string }> = []) {
  return createAuthorizedPrincipal({
    tenant,
    userId: 'c3286282-e613-4053-a2cb-edc84f5716f',
    sessionId: 'f17623d4-8fab-461f-8ca5-4db52e46031a',
    grants: [{ roleCode: role, permissions, scopes }]
  });
}

test('student library access uses a specific mapped student grant without tenant-wide read permission', () => {
  const studentId = 'c63f1b3d-6914-4c98-aa1e-a7f94af617da';
  const scopedStudent = actor('student', ['logistics.library.read'], [
    { resourceType: 'student', resourceId: studentId }
  ]);
  const otherScopedStudent = actor('student', ['logistics.library.read'], [
    { resourceType: 'student', resourceId: '90d5d9bb-f16f-49fd-bd2a-0b9a2c150b81' }
  ]);
  const resource = { publication_status: 'published', visibility: 'students' as const };

  assert.equal(scopedStudent.hasPermission('logistics.library.read'), false);
  assert.equal(hasLibraryReadAccess(scopedStudent, resource, [studentId]), true);
  assert.equal(hasLibraryReadAccess(otherScopedStudent, resource, [studentId]), false);
});

test('student access fails closed for unpublished or staff-only resources', () => {
  const studentId = 'c63f1b3d-6914-4c98-aa1e-a7f94af617da';
  const student = actor('student', ['logistics.library.read'], [
    { resourceType: 'student', resourceId: studentId }
  ]);
  const tenantWideStudent = actor('student', ['logistics.library.read']);

  assert.equal(hasLibraryReadAccess(
    student,
    { publication_status: 'draft', visibility: 'students' },
    [studentId]
  ), false);
  assert.equal(hasLibraryReadAccess(
    student,
    { publication_status: 'published', visibility: 'staff_only' },
    [studentId]
  ), false);
  assert.equal(hasLibraryReadAccess(
    tenantWideStudent,
    { publication_status: 'published', visibility: 'students' },
    [studentId]
  ), false);
});

test('staff library access requires tenant-wide permission, not a different student scope', () => {
  const staffWithScopeOnly = actor('staff', ['logistics.library.read'], [
    { resourceType: 'student', resourceId: 'c63f1b3d-6914-4c98-aa1e-a7f94af617da' }
  ]);
  const staff = actor('staff', ['logistics.library.read']);

  assert.equal(hasLibraryReadAccess(
    staffWithScopeOnly,
    { publication_status: 'published', visibility: 'staff_and_students' },
    ['c63f1b3d-6914-4c98-aa1e-a7f94af617da']
  ), false);
  assert.equal(hasLibraryReadAccess(
    staff,
    { publication_status: 'published', visibility: 'staff_only' },
    []
  ), true);
});
