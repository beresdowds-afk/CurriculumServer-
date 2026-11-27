import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardEdit,
  Cpu,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal
} from 'lucide-react';
import type {
  BiometricDevice,
  BiometricEnrollmentProfile,
  BiometricMovementLog,
  ClassGroup,
  MovementPass,
  Student,
  Teacher,
  TeacherAttendanceRecord,
  UserProfile
} from '../types';
import { unifiedApiClient } from '../services/unifiedApiClient';

export interface AttendanceCapabilityState {
  tenantId: string;
  schoolId: string;
  applicationInstanceId: string | null;
  status: string;
  blockedReason: string | null;
  requestedConfiguration: Record<string, unknown>;
  heartbeatThresholds: { degradedSeconds: number; offlineSeconds: number };
  requestedAt: string | null;
  activatedAt: string | null;
  summary: {
    totalDevices: number;
    activeDevices: number;
    suspendedDevices: number;
    revokedDevices: number;
  };
}

export interface AttendanceDeviceSummaryItem {
  id: string;
  deviceIdentity: string;
  displayName: string;
  manufacturer: string | null;
  model: string | null;
  deviceType: string;
  modalities: string[];
  approvedLocation: string;
  locationId: string | null;
  schoolId: string;
  applicationInstanceId: string | null;
  permittedPopulation: string;
  allowedEventTypes: string[];
  status: string;
  statusReason: string | null;
  firmwareVersion: string | null;
  adapterId: string | null;
  adapterVersion: string | null;
  integrationStatus: string;
  lastHeartbeatAt: string | null;
  lastEventAt: string | null;
  lastSequenceNumber: number | null;
  connectivityStatus: 'online' | 'degraded' | 'offline' | 'unknown';
  connectivityNote: string;
  credentialStatus: 'active' | 'revoked' | 'not_issued';
  credentialVersion: number | null;
  enrollmentAcknowledgedAt: string | null;
  revokedAt: string | null;
  decommissionedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceDeviceDetailItem extends AttendanceDeviceSummaryItem {
  healthChecks?: Array<{
    id: string;
    connectivityStatus: string;
    attendanceProcessingStatus: string;
    configurationSyncStatus: string;
    clockDriftMs: number | null;
    pendingEventCount: number | null;
    checkedAt: string;
  }>;
  auditHistory?: Array<{
    id: string;
    actor: string;
    action: string;
    previousState: string | null;
    newState: string | null;
    reason: string | null;
    occurredAt: string;
  }>;
}

export interface AttendanceRegisterItem {
  id: string;
  schoolId: string;
  population: 'student' | 'staff';
  studentId: string | null;
  staffId: string | null;
  personName: string | null;
  personCode: string | null;
  classId: string | null;
  className: string | null;
  attendanceDate: string;
  attendanceType: 'school' | 'classroom' | 'staff_shift';
  status: string;
  sourceEventId: string | null;
  lastSourceEventId: string | null;
  sourceLocation: string | null;
  sourceType: string;
  occurredAt: string | null;
  firstEventAt: string | null;
  lastEventAt: string | null;
  reviewReason: string | null;
  adjustmentCount: number;
}

export interface AttendanceSyncStatusData {
  schoolId: string;
  devices: Array<{
    deviceId: string;
    deviceIdentity: string;
    displayName: string;
    status: string;
    approvedLocation: string;
    connectivityStatus: 'online' | 'degraded' | 'offline' | 'unknown';
    lastHeartbeatAt: string | null;
    lastEventAt: string | null;
    lastSequenceNumber: number | null;
  }>;
  processingSummary: {
    accepted: number;
    reviewRequired: number;
    rejected: number;
    duplicate: number;
    retryPending: number;
  };
}

interface BiometricAttendanceTabProps {
  currentUser?: UserProfile;
  teachers?: Teacher[];
  classGroups?: ClassGroup[];
  students?: Student[];
  devices?: BiometricDevice[];
  movementLogs?: BiometricMovementLog[];
  teacherAttendanceRecords?: TeacherAttendanceRecord[];
  movementPasses?: MovementPass[];
  biometricProfiles?: BiometricEnrollmentProfile[];
  onAddMovementLog?: (log: BiometricMovementLog) => void;
  onUpdateTeacherAttendance?: (record: TeacherAttendanceRecord) => void;
  onAddMovementPass?: (pass: MovementPass) => void;
  onUpdateMovementPass?: (pass: MovementPass) => void;
  onUpdateBiometricProfile?: (profile: BiometricEnrollmentProfile) => void;
  onSyncClassRegisterFromBiometrics?: (classGroupId: string, date: string) => void;
  onNavigateTab?: (tab: any) => void;
  initialSchoolId?: string;
  permissions?: string[];
  initialCapability?: AttendanceCapabilityState | null;
  initialDevices?: AttendanceDeviceSummaryItem[];
  initialRegister?: AttendanceRegisterItem[];
  initialSyncStatus?: AttendanceSyncStatusData | null;
  initialBlockedNotice?: string | null;
}

type SubTabKey = 'devices' | 'register' | 'sync_health';
type DeviceActionKind =
  | 'suspend'
  | 'reactivate'
  | 'revoke'
  | 'decommission'
  | 'rotate_credential'
  | 'revoke_credential';

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return 'None recorded';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Invalid timestamp';
  return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

function statusTextTone(status: string): string {
  switch (status) {
    case 'active':
    case 'online':
    case 'present':
      return 'text-emerald-700 dark:text-emerald-400';
    case 'suspended':
    case 'degraded':
    case 'late':
    case 'early_departure':
    case 'review_required':
    case 'pending':
    case 'enrolled':
      return 'text-amber-700 dark:text-amber-400';
    case 'revoked':
    case 'decommissioned':
    case 'offline':
    case 'absent':
    case 'blocked':
      return 'text-rose-700 dark:text-rose-400';
    default:
      return 'text-slate-600 dark:text-slate-400';
  }
}

export const BiometricAttendanceTab: React.FC<BiometricAttendanceTabProps> = ({
  classGroups = [],
  initialSchoolId = '',
  permissions,
  initialCapability = null,
  initialDevices = [],
  initialRegister = [],
  initialSyncStatus = null,
  initialBlockedNotice = null
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTabKey>('devices');
  const [schoolIdInput, setSchoolIdInput] = useState(initialSchoolId);
  const [resolvedPermissions, setResolvedPermissions] = useState<string[]>(permissions ?? []);

  const [capability, setCapability] = useState<AttendanceCapabilityState | null>(initialCapability);
  const [devices, setDevices] = useState<AttendanceDeviceSummaryItem[]>(initialDevices);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(initialDevices[0]?.id ?? '');
  const [deviceDetail, setDeviceDetail] = useState<AttendanceDeviceDetailItem | null>(null);

  const [registerRows, setRegisterRows] = useState<AttendanceRegisterItem[]>(initialRegister);
  const [syncStatus, setSyncStatus] = useState<AttendanceSyncStatusData | null>(initialSyncStatus);

  const [loading, setLoading] = useState<boolean>(false);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(initialBlockedNotice);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Register filters
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().slice(0, 10));
  const [classFilter, setClassFilter] = useState<string>('');
  const [populationFilter, setPopulationFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Pending audited device lifecycle/credential action
  const [pendingAction, setPendingAction] = useState<{
    deviceId: string;
    deviceIdentity: string;
    action: DeviceActionKind;
  } | null>(null);
  const [actionReason, setActionReason] = useState<string>('');
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);

  // Pending manual attendance adjustment
  const [adjustingRecord, setAdjustingRecord] = useState<AttendanceRegisterItem | null>(null);
  const [adjustmentStatus, setAdjustmentStatus] = useState<string>('present');
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  const [submittingAdjustment, setSubmittingAdjustment] = useState<boolean>(false);

  useEffect(() => {
    if (permissions) {
      setResolvedPermissions(permissions);
      return;
    }
    const claims = unifiedApiClient.getSchoolFlowSession();
    if (claims?.role === 'tenant_admin') {
      // Server-side requirePermission still enforces exact database grants on every request
      setResolvedPermissions([
        'attendance.read',
        'attendance.devices.manage',
        'attendance.devices.activate',
        'attendance.devices.suspend',
        'attendance.devices.revoke',
        'attendance.credentials.manage',
        'attendance.adjust'
      ]);
    }
  }, [permissions]);

  const hasPermission = useCallback(
    (code: string) => resolvedPermissions.includes(code),
    [resolvedPermissions]
  );

  const effectiveSchoolId = schoolIdInput.trim() || undefined;

  const handleApiError = useCallback((err: any, fallback: string) => {
    const code = err?.code || '';
    const status = err?.status;
    if (status === 503 || code === 'PRODUCTION_PERSISTENCE_UNAVAILABLE') {
      setBlockedMessage(
        err?.error ||
          'Attendance capability endpoints remain blocked (503) pending Central IAM baseline resolution and verified physical hardware adapter certification.'
      );
      setErrorMessage(null);
      return;
    }
    if (status === 401 || code === 'UNAUTHENTICATED') {
      setErrorMessage('Sign in with an authenticated school session to inspect attendance devices and register records.');
      return;
    }
    if (status === 403 || code === 'FORBIDDEN') {
      setErrorMessage(err?.error || 'Your role does not have permission to access this attendance operation.');
      return;
    }
    setErrorMessage(err?.error || fallback);
  }, []);

  const loadDevicesAndCapability = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    setActionFeedback(null);
    try {
      const [capData, deviceList] = await Promise.all([
        unifiedApiClient.getAttendanceCapability(effectiveSchoolId),
        unifiedApiClient.listAttendanceDevices(effectiveSchoolId)
      ]);
      setBlockedMessage(null);
      setCapability(capData);
      setDevices(deviceList);
      setSelectedDeviceId(prev =>
        prev && deviceList.some(d => d.id === prev) ? prev : (deviceList[0]?.id ?? '')
      );
    } catch (err) {
      handleApiError(err, 'Unable to load attendance capability and device inventory.');
    } finally {
      setLoading(false);
    }
  }, [effectiveSchoolId, handleApiError]);

  const loadRegister = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const rows = await unifiedApiClient.getAttendanceRegister({
        schoolId: effectiveSchoolId,
        date: dateFilter || undefined,
        classId: classFilter || undefined,
        population: populationFilter || undefined,
        status: statusFilter || undefined
      });
      setBlockedMessage(null);
      setRegisterRows(rows);
    } catch (err) {
      handleApiError(err, 'Unable to load attendance register.');
    } finally {
      setLoading(false);
    }
  }, [classFilter, dateFilter, effectiveSchoolId, handleApiError, populationFilter, statusFilter]);

  const loadSyncHealth = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const sync = await unifiedApiClient.getAttendanceSyncStatus(effectiveSchoolId);
      setBlockedMessage(null);
      setSyncStatus(sync);
    } catch (err) {
      handleApiError(err, 'Unable to load device synchronization status.');
    } finally {
      setLoading(false);
    }
  }, [effectiveSchoolId, handleApiError]);

  const loadDeviceDetail = useCallback(
    async (deviceId: string) => {
      if (!deviceId) {
        setDeviceDetail(null);
        return;
      }
      setDetailLoading(true);
      try {
        const detail = await unifiedApiClient.getAttendanceDeviceDetail<AttendanceDeviceDetailItem>(
          deviceId,
          effectiveSchoolId
        );
        setDeviceDetail(detail);
      } catch (err) {
        handleApiError(err, 'Unable to load device diagnostics and audit history.');
      } finally {
        setDetailLoading(false);
      }
    },
    [effectiveSchoolId, handleApiError]
  );

  // Skip automatic remote requests during static SSR or when fixture state is pre-supplied without active token
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!unifiedApiClient.isAuthenticated('school_flow') && (initialCapability || initialDevices.length > 0 || initialBlockedNotice)) {
      return;
    }
    if (activeSubTab === 'devices') {
      void loadDevicesAndCapability();
    } else if (activeSubTab === 'register') {
      void loadRegister();
    } else {
      void loadSyncHealth();
    }
  }, [activeSubTab, initialBlockedNotice, initialCapability, initialDevices.length, loadDevicesAndCapability, loadRegister, loadSyncHealth]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!unifiedApiClient.isAuthenticated('school_flow')) return;
    if (activeSubTab === 'devices' && selectedDeviceId && !blockedMessage) {
      void loadDeviceDetail(selectedDeviceId);
    }
  }, [activeSubTab, blockedMessage, loadDeviceDetail, selectedDeviceId]);

  const selectedSummary = useMemo(
    () => devices.find(d => d.id === selectedDeviceId) || null,
    [devices, selectedDeviceId]
  );

  const displayedDetail = useMemo(() => {
    if (deviceDetail && deviceDetail.id === selectedDeviceId) return deviceDetail;
    return selectedSummary;
  }, [deviceDetail, selectedDeviceId, selectedSummary]);

  const handleTestConnectivity = async (device: AttendanceDeviceSummaryItem) => {
    setErrorMessage(null);
    setActionFeedback(null);
    try {
      const result = await unifiedApiClient.testAttendanceDevice<{
        connectivityStatus?: string;
        connectivityNote?: string;
      }>(device.id, effectiveSchoolId);
      setActionFeedback(
        `Connectivity evaluation for ${device.deviceIdentity}: ${result.connectivityStatus || 'evaluated'} (${result.connectivityNote || 'checked'}).`
      );
      await loadDevicesAndCapability();
      await loadDeviceDetail(device.id);
    } catch (err) {
      handleApiError(err, 'Unable to evaluate device connectivity.');
    }
  };

  const submitDeviceAction = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pendingAction || !actionReason.trim()) return;
    setSubmittingAction(true);
    setErrorMessage(null);
    setActionFeedback(null);
    try {
      const { deviceId, deviceIdentity, action } = pendingAction;
      const reason = actionReason.trim();
      if (action === 'suspend') {
        await unifiedApiClient.suspendAttendanceDevice(deviceId, reason, effectiveSchoolId);
      } else if (action === 'reactivate') {
        await unifiedApiClient.reactivateAttendanceDevice(deviceId, reason, effectiveSchoolId);
      } else if (action === 'revoke') {
        await unifiedApiClient.revokeAttendanceDevice(deviceId, reason, effectiveSchoolId);
      } else if (action === 'decommission') {
        await unifiedApiClient.decommissionAttendanceDevice(deviceId, reason, effectiveSchoolId);
      } else if (action === 'rotate_credential') {
        await unifiedApiClient.rotateAttendanceDeviceCredential(deviceId, reason, effectiveSchoolId);
      } else if (action === 'revoke_credential') {
        await unifiedApiClient.revokeAttendanceDeviceCredential(deviceId, reason, effectiveSchoolId);
      }
      setActionFeedback(
        action === 'rotate_credential'
          ? `Credential rotated for ${deviceIdentity}. Signing secret remains vault-encrypted on the control plane and is never stored in browser state.`
          : `Completed ${action.replace('_', ' ')} for ${deviceIdentity}.`
      );
      setPendingAction(null);
      setActionReason('');
      await loadDevicesAndCapability();
      await loadDeviceDetail(deviceId);
    } catch (err) {
      handleApiError(err, 'Device action failed.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const submitManualAdjustment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!adjustingRecord || !adjustmentReason.trim()) return;
    setSubmittingAdjustment(true);
    setErrorMessage(null);
    setActionFeedback(null);
    try {
      await unifiedApiClient.adjustAttendanceRecord(adjustingRecord.id, {
        status: adjustmentStatus,
        reason: adjustmentReason.trim(),
        schoolId: effectiveSchoolId
      });
      setActionFeedback(
        `Recorded immutable attendance adjustment on record ${adjustingRecord.id.slice(0, 8)} (${adjustingRecord.status} -> ${adjustmentStatus}).`
      );
      setAdjustingRecord(null);
      setAdjustmentReason('');
      await loadRegister();
    } catch (err) {
      handleApiError(err, 'Failed to submit manual attendance adjustment.');
    } finally {
      setSubmittingAdjustment(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Cpu className="h-3.5 w-3.5" />
            <span>School Attendance Infrastructure</span>
            <span>·</span>
            <span className="font-mono">
              Capability: {capability?.status ?? (blockedMessage ? 'blocked_by_gate' : 'unverified')}
            </span>
          </div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Attendance Devices & Verified Register
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Manage school-allocated attendance terminals, inspect heartbeat health, and audit immutable register events.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={schoolIdInput}
            onChange={e => setSchoolIdInput(e.target.value)}
            placeholder="School ID (multi-school optional)"
            aria-label="School ID scope"
            className="h-9 w-56 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              if (activeSubTab === 'devices') void loadDevicesAndCapability();
              else if (activeSubTab === 'register') void loadRegister();
              else void loadSyncHealth();
            }}
            className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Capability Gate Blocked Banner */}
      {blockedMessage && (
        <div
          role="status"
          className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 p-4"
        >
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
            <div className="space-y-1 text-sm">
              <p className="font-medium text-amber-950 dark:text-amber-200">
                Attendance Device Capability Gate Active (Fail-Closed 503)
              </p>
              <p className="text-amber-900/90 dark:text-amber-300/90">{blockedMessage}</p>
              <p className="text-xs text-amber-800/80 dark:text-amber-400/80">
                Production activation requires Central IAM completion and verified physical hardware adapter evidence.
              </p>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/30 p-3 text-sm text-rose-900 dark:text-rose-200"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {actionFeedback && (
        <div
          role="status"
          className="rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 p-3 text-sm text-emerald-900 dark:text-emerald-200"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800">
        {(
          [
            { key: 'devices', label: 'Device Inventory' },
            { key: 'register', label: 'Attendance Register' },
            { key: 'sync_health', label: 'Sync Health' }
          ] as const
        ).map(tab => {
          const active = activeSubTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveSubTab(tab.key)}
              className={`whitespace-nowrap shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sub-Tab 1: Device Inventory */}
      {activeSubTab === 'devices' && (
        <div className="space-y-4">
          {capability && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5">
                <div className="text-xs text-slate-500 dark:text-slate-400">Allocated Terminals</div>
                <div className="mt-1 font-mono text-lg font-semibold tabular-nums">
                  {capability.summary.totalDevices}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5">
                <div className="text-xs text-slate-500 dark:text-slate-400">Active</div>
                <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {capability.summary.activeDevices}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5">
                <div className="text-xs text-slate-500 dark:text-slate-400">Suspended</div>
                <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                  {capability.summary.suspendedDevices}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5">
                <div className="text-xs text-slate-500 dark:text-slate-400">Revoked / Decommissioned</div>
                <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-rose-700 dark:text-rose-400">
                  {capability.summary.revokedDevices}
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-2 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
              <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ) : devices.length === 0 ? (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No attendance devices have been provisioned or allocated for this school yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Terminal</th>
                      <th className="px-4 py-3 font-medium">Location & Type</th>
                      <th className="px-4 py-3 font-medium">Lifecycle</th>
                      <th className="px-4 py-3 font-medium">Connectivity</th>
                      <th className="px-4 py-3 font-medium">Credential</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {devices.map(device => {
                      const selected = device.id === selectedDeviceId;
                      return (
                        <tr
                          key={device.id}
                          onClick={() => setSelectedDeviceId(device.id)}
                          className={`cursor-pointer transition-colors ${
                            selected
                              ? 'bg-slate-100/80 dark:bg-slate-800/60'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-900/40'
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900 dark:text-white">
                              {device.displayName}
                            </div>
                            <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
                              {device.deviceIdentity}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                            <div>{device.approvedLocation}</div>
                            <div className="text-slate-500 dark:text-slate-400">
                              {device.modalities.join(' / ')} · {device.permittedPopulation}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">
                            <span className={statusTextTone(device.status)}>{device.status}</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">
                            <span className={statusTextTone(device.connectivityStatus)}>
                              {device.connectivityStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                            {device.credentialStatus}
                            {device.credentialVersion ? ` · v${device.credentialVersion}` : ''}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Detail & Audited Actions Panel */}
              <div className="lg:col-span-5 rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-4">
                {!displayedDetail ? (
                  <p className="text-sm text-slate-500">Select a terminal to inspect telemetry and audit history.</p>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {displayedDetail.displayName}
                        </h3>
                        <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                          {displayedDetail.deviceIdentity} · {displayedDetail.integrationStatus}
                        </p>
                      </div>
                      <span className={`font-mono text-xs font-medium ${statusTextTone(displayedDetail.status)}`}>
                        {displayedDetail.status}
                      </span>
                    </div>

                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div>
                        <dt className="text-slate-500">Approved Location</dt>
                        <dd className="font-medium">{displayedDetail.approvedLocation}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Hardware / Model</dt>
                        <dd className="font-medium">
                          {[displayedDetail.manufacturer, displayedDetail.model].filter(Boolean).join(' ') || 'Unassigned'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Last Heartbeat</dt>
                        <dd className="font-mono tabular-nums">
                          {formatTimestamp(displayedDetail.lastHeartbeatAt)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Last Event</dt>
                        <dd className="font-mono tabular-nums">
                          {formatTimestamp(displayedDetail.lastEventAt)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Sequence Watermark</dt>
                        <dd className="font-mono tabular-nums">
                          {displayedDetail.lastSequenceNumber ?? 'None'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Signing Secret Custody</dt>
                        <dd className="font-mono">
                          {displayedDetail.credentialStatus}
                          {displayedDetail.credentialVersion ? ` (v${displayedDetail.credentialVersion})` : ''} · Vault-only
                        </dd>
                      </div>
                    </dl>

                    {/* Permission-gated action controls */}
                    <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2">
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Lifecycle & Credential Controls
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {hasPermission('attendance.devices.manage') && (
                          <button
                            type="button"
                            onClick={() => void handleTestConnectivity(displayedDetail)}
                            className="inline-flex h-8 items-center gap-1 whitespace-nowrap shrink-0 rounded border border-slate-300 dark:border-slate-700 px-2.5 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <Activity className="h-3.5 w-3.5" />
                            <span>Evaluate Connectivity</span>
                          </button>
                        )}
                        {hasPermission('attendance.devices.suspend') && displayedDetail.status === 'active' && (
                          <button
                            type="button"
                            onClick={() =>
                              setPendingAction({
                                deviceId: displayedDetail.id,
                                deviceIdentity: displayedDetail.deviceIdentity,
                                action: 'suspend'
                              })
                            }
                            className="inline-flex h-8 items-center gap-1 whitespace-nowrap shrink-0 rounded border border-amber-300 dark:border-amber-800 px-2.5 text-xs font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                          >
                            <ShieldAlert className="h-3.5 w-3.5" />
                            <span>Suspend</span>
                          </button>
                        )}
                        {hasPermission('attendance.devices.activate') &&
                          ['enrolled', 'suspended'].includes(displayedDetail.status) && (
                            <button
                              type="button"
                              onClick={() =>
                                setPendingAction({
                                  deviceId: displayedDetail.id,
                                  deviceIdentity: displayedDetail.deviceIdentity,
                                  action: 'reactivate'
                                })
                              }
                              className="inline-flex h-8 items-center gap-1 whitespace-nowrap shrink-0 rounded border border-emerald-300 dark:border-emerald-800 px-2.5 text-xs font-medium text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>Reactivate</span>
                            </button>
                          )}
                        {hasPermission('attendance.devices.revoke') &&
                          !['revoked', 'decommissioned'].includes(displayedDetail.status) && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setPendingAction({
                                    deviceId: displayedDetail.id,
                                    deviceIdentity: displayedDetail.deviceIdentity,
                                    action: 'revoke'
                                  })
                                }
                                className="inline-flex h-8 items-center gap-1 whitespace-nowrap shrink-0 rounded border border-rose-300 dark:border-rose-800 px-2.5 text-xs font-medium text-rose-800 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              >
                                <span>Revoke</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setPendingAction({
                                    deviceId: displayedDetail.id,
                                    deviceIdentity: displayedDetail.deviceIdentity,
                                    action: 'decommission'
                                  })
                                }
                                className="inline-flex h-8 items-center gap-1 whitespace-nowrap shrink-0 rounded border border-rose-300 dark:border-rose-800 px-2.5 text-xs font-medium text-rose-800 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              >
                                <span>Decommission</span>
                              </button>
                            </>
                          )}
                        {hasPermission('attendance.credentials.manage') &&
                          !['revoked', 'decommissioned'].includes(displayedDetail.status) && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setPendingAction({
                                    deviceId: displayedDetail.id,
                                    deviceIdentity: displayedDetail.deviceIdentity,
                                    action: 'rotate_credential'
                                  })
                                }
                                className="inline-flex h-8 items-center gap-1 whitespace-nowrap shrink-0 rounded border border-slate-300 dark:border-slate-700 px-2.5 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                              >
                                <KeyRound className="h-3.5 w-3.5" />
                                <span>Rotate Credential</span>
                              </button>
                              {displayedDetail.credentialStatus === 'active' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPendingAction({
                                      deviceId: displayedDetail.id,
                                      deviceIdentity: displayedDetail.deviceIdentity,
                                      action: 'revoke_credential'
                                    })
                                  }
                                  className="inline-flex h-8 items-center gap-1 whitespace-nowrap shrink-0 rounded border border-rose-300 dark:border-rose-800 px-2.5 text-xs font-medium text-rose-800 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                >
                                  <span>Revoke Credential</span>
                                </button>
                              )}
                            </>
                          )}
                        {!hasPermission('attendance.devices.manage') &&
                          !hasPermission('attendance.devices.suspend') &&
                          !hasPermission('attendance.devices.revoke') &&
                          !hasPermission('attendance.credentials.manage') && (
                            <span className="text-xs text-slate-500">
                              Read-only device view; management actions require granted attendance permissions.
                            </span>
                          )}
                      </div>

                      {pendingAction && pendingAction.deviceId === displayedDetail.id && (
                        <form
                          onSubmit={submitDeviceAction}
                          className="mt-3 space-y-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-3"
                        >
                          <div className="text-xs font-medium">
                            Confirm {pendingAction.action.replace('_', ' ')} for{' '}
                            <span className="font-mono">{pendingAction.deviceIdentity}</span>
                          </div>
                          <input
                            type="text"
                            required
                            maxLength={500}
                            value={actionReason}
                            onChange={e => setActionReason(e.target.value)}
                            placeholder="Operational audit reason (required)"
                            className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="submit"
                              disabled={submittingAction || !actionReason.trim()}
                              className="h-7 rounded bg-slate-900 dark:bg-white px-3 text-xs font-medium text-white dark:text-slate-900 disabled:opacity-50"
                            >
                              {submittingAction ? 'Applying...' : 'Confirm'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPendingAction(null);
                                setActionReason('');
                              }}
                              className="h-7 rounded border border-slate-300 dark:border-slate-700 px-2.5 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}
                    </div>

                    {/* Recent Audit Trail */}
                    <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Recent Device Audit Trail
                      </div>
                      {detailLoading ? (
                        <p className="mt-2 text-xs text-slate-500">Loading audit events...</p>
                      ) : !deviceDetail?.auditHistory?.length ? (
                        <p className="mt-2 text-xs text-slate-500">No audit history entries loaded.</p>
                      ) : (
                        <ul className="mt-2 space-y-1.5 text-xs">
                          {deviceDetail.auditHistory.slice(0, 6).map(item => (
                            <li
                              key={item.id}
                              className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-1.5"
                            >
                              <div>
                                <span className="font-mono font-medium">{item.action}</span>
                                {item.reason && <span className="text-slate-500"> — {item.reason}</span>}
                              </div>
                              <span className="font-mono text-[11px] text-slate-400 shrink-0">
                                {formatTimestamp(item.occurredAt)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 2: Attendance Register */}
      {activeSubTab === 'register' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
            <SlidersHorizontal className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              aria-label="Attendance date filter"
              className="h-8 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-mono"
            />
            {classGroups.length > 0 && (
              <select
                value={classFilter}
                onChange={e => setClassFilter(e.target.value)}
                aria-label="Class filter"
                className="h-8 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
              >
                <option value="">All Classes</option>
                {classGroups.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            )}
            <select
              value={populationFilter}
              onChange={e => setPopulationFilter(e.target.value)}
              aria-label="Population filter"
              className="h-8 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
            >
              <option value="">All Populations</option>
              <option value="student">Students</option>
              <option value="staff">Staff</option>
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              aria-label="Status filter"
              className="h-8 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
            >
              <option value="">All Statuses</option>
              <option value="present">present</option>
              <option value="late">late</option>
              <option value="early_departure">early_departure</option>
              <option value="absent">absent</option>
              <option value="excused">excused</option>
              <option value="review_required">review_required</option>
            </select>
            <button
              type="button"
              onClick={() => void loadRegister()}
              className="h-8 whitespace-nowrap shrink-0 rounded bg-slate-900 dark:bg-white px-3 text-xs font-medium text-white dark:text-slate-900"
            >
              Apply Filters
            </button>
          </div>

          {adjustingRecord && (
            <form
              onSubmit={submitManualAdjustment}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  Manual Attendance Adjustment —{' '}
                  <span className="font-mono">
                    {adjustingRecord.personName || adjustingRecord.id.slice(0, 8)} ({adjustingRecord.attendanceDate})
                  </span>
                </div>
                <span className="font-mono text-xs text-slate-500">
                  Source event preserved: {adjustingRecord.sourceEventId ? adjustingRecord.sourceEventId.slice(0, 8) : 'manual'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={adjustmentStatus}
                  onChange={e => setAdjustmentStatus(e.target.value)}
                  className="h-8 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 text-xs font-mono"
                >
                  <option value="present">present</option>
                  <option value="late">late</option>
                  <option value="early_departure">early_departure</option>
                  <option value="absent">absent</option>
                  <option value="excused">excused</option>
                  <option value="review_required">review_required</option>
                </select>
                <input
                  type="text"
                  required
                  value={adjustmentReason}
                  onChange={e => setAdjustmentReason(e.target.value)}
                  placeholder="Mandatory immutable audit reason"
                  className="h-8 flex-1 min-w-60 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 text-xs"
                />
                <button
                  type="submit"
                  disabled={submittingAdjustment || !adjustmentReason.trim()}
                  className="h-8 rounded bg-slate-900 dark:bg-white px-3 text-xs font-medium text-white dark:text-slate-900 disabled:opacity-50"
                >
                  {submittingAdjustment ? 'Saving...' : 'Save Adjustment'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdjustingRecord(null);
                    setAdjustmentReason('');
                  }}
                  className="h-8 rounded border border-slate-300 dark:border-slate-700 px-3 text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {registerRows.length === 0 ? (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No attendance records match the current school and date filter.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Member</th>
                    <th className="px-4 py-3 font-medium">Type / Class</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Source & Provenance</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {registerRows.map(row => (
                    <tr key={row.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {row.personName || row.studentId || row.staffId || 'Unlabeled member'}
                        </div>
                        <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
                          {row.population} {row.personCode ? `· ${row.personCode}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-mono">{row.attendanceType}</div>
                        <div className="text-slate-500">{row.className || 'School-wide'}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs tabular-nums">{row.attendanceDate}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <span className={statusTextTone(row.status)}>{row.status}</span>
                        {row.reviewReason && (
                          <div className="text-[11px] text-amber-700 dark:text-amber-400">{row.reviewReason}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                        <div className="font-mono">{row.sourceType}</div>
                        <div className="text-slate-500">
                          {row.sourceLocation || 'Unspecified'} · {row.adjustmentCount} adjustment(s)
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {hasPermission('attendance.adjust') ? (
                          <button
                            type="button"
                            onClick={() => {
                              setAdjustingRecord(row);
                              setAdjustmentStatus(row.status === 'review_required' ? 'present' : row.status);
                            }}
                            className="inline-flex h-7 items-center gap-1 whitespace-nowrap shrink-0 rounded border border-slate-300 dark:border-slate-700 px-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <ClipboardEdit className="h-3 w-3" />
                            <span>Adjust</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Read only</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 3: Sync Health */}
      {activeSubTab === 'sync_health' && (
        <div className="space-y-4">
          {syncStatus ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {(
                  [
                    ['Accepted', syncStatus.processingSummary.accepted],
                    ['Review Required', syncStatus.processingSummary.reviewRequired],
                    ['Rejected', syncStatus.processingSummary.rejected],
                    ['Duplicate Replays', syncStatus.processingSummary.duplicate],
                    ['Retry Pending', syncStatus.processingSummary.retryPending]
                  ] as const
                ).map(([label, count]) => (
                  <div key={label} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5">
                    <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
                    <div className="mt-1 font-mono text-lg font-semibold tabular-nums">{count}</div>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Device</th>
                      <th className="px-4 py-3 font-medium">Connectivity</th>
                      <th className="px-4 py-3 font-medium">Last Heartbeat</th>
                      <th className="px-4 py-3 font-medium">Last Event</th>
                      <th className="px-4 py-3 font-medium">Sequence Watermark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {syncStatus.devices.map(dev => (
                      <tr key={dev.deviceId}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{dev.displayName}</div>
                          <div className="font-mono text-xs text-slate-500">
                            {dev.deviceIdentity} · {dev.approvedLocation}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          <span className={statusTextTone(dev.connectivityStatus)}>
                            {dev.connectivityStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs tabular-nums">
                          {formatTimestamp(dev.lastHeartbeatAt)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs tabular-nums">
                          {formatTimestamp(dev.lastEventAt)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs tabular-nums">
                          {dev.lastSequenceNumber ?? 'None'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No device synchronization metrics loaded yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
