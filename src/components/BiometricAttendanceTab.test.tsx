import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BiometricAttendanceTab } from './BiometricAttendanceTab';

test('BiometricAttendanceTab removes fake scan simulation and renders capability-blocked gate honestly', () => {
  const html = renderToStaticMarkup(
    <BiometricAttendanceTab
      initialBlockedNotice="Attendance endpoints return 503 pending Central IAM and hardware adapter verification."
    />
  );
  assert.match(html, /Attendance Device Capability Gate Active/);
  assert.match(html, /Central IAM completion and verified physical hardware adapter evidence/);
  assert.doesNotMatch(html, /Simulate Biometric Scan|Simulate Live Scan|Delivered SMS|Auto-sync live biometric/);
});

test('BiometricAttendanceTab renders device inventory without exposing secrets and enforces permission gating', () => {
  const sampleDevice = {
    id: '9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8',
    deviceIdentity: 'gate-rfid-01',
    displayName: 'Main Gate Terminal',
    manufacturer: 'VendorCorp',
    model: 'VC-RFID-200',
    deviceType: 'rfid',
    modalities: ['rfid'],
    approvedLocation: 'Main Gate',
    locationId: null,
    schoolId: '8f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8',
    applicationInstanceId: null,
    permittedPopulation: 'students',
    allowedEventTypes: ['school_arrival'],
    status: 'active',
    statusReason: null,
    firmwareVersion: '2.0.0',
    adapterId: 'signed-gateway',
    adapterVersion: '1.0.0',
    integrationStatus: 'verified_physical_hardware',
    lastHeartbeatAt: '2026-11-26T08:00:00.000Z',
    lastEventAt: null,
    lastSequenceNumber: 42,
    connectivityStatus: 'online' as const,
    connectivityNote: 'within_heartbeat_threshold',
    credentialStatus: 'active' as const,
    credentialVersion: 2,
    enrollmentAcknowledgedAt: '2026-11-26T07:00:00.000Z',
    revokedAt: null,
    decommissionedAt: null,
    createdAt: '2026-11-26T06:00:00.000Z',
    updatedAt: '2026-11-26T08:00:00.000Z'
  };

  const readOnlyHtml = renderToStaticMarkup(
    <BiometricAttendanceTab
      initialDevices={[sampleDevice]}
      permissions={['attendance.read']}
    />
  );
  assert.match(readOnlyHtml, /Main Gate Terminal/);
  assert.match(readOnlyHtml, /gate-rfid-01/);
  assert.match(readOnlyHtml, /Vault-only/);
  assert.doesNotMatch(readOnlyHtml, /Rotate Credential|Suspend|Decommission/);

  const adminHtml = renderToStaticMarkup(
    <BiometricAttendanceTab
      initialDevices={[sampleDevice]}
      permissions={[
        'attendance.read',
        'attendance.devices.manage',
        'attendance.devices.suspend',
        'attendance.devices.revoke',
        'attendance.credentials.manage'
      ]}
    />
  );
  assert.match(adminHtml, /Evaluate Connectivity/);
  assert.match(adminHtml, /Suspend/);
  assert.match(adminHtml, /Rotate Credential/);
});
