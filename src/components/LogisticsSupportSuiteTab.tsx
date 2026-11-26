import React, { useEffect, useState } from 'react';
import { AlertTriangle, BookOpen, Bus, Building2, ClipboardList, Loader2, ShieldCheck } from 'lucide-react';
import type { HostelDormitory } from '../types';
import { BoardingHouseD3Dashboard } from './logistics/BoardingHouseD3Dashboard';
import { BoardingOperationsPanel, DiningOperationsPanel, TransportOperationsPanel } from './logistics/LogisticsOperationalPanels';
import { unifiedApiClient, type AuthenticatedSessionClaims } from '../services/unifiedApiClient';

type LogisticsSubTab =
  | 'gate_security'
  | 'digital_elibrary'
  | 'boarding_house'
  | 'bus_transportation'
  | 'exeats'
  | 'dining'
  | 'audit';
type ApiEnvelope<T> = { success: true; data: T; correlationId: string; timestamp: string };
type ApiPage<T> = { page: number; pageSize: number; total: number; data: T[] };
type PickupPassResponse = { id: string; token: string; expiresAt: string };
type PickupPassSummary = {
  id: string;
  pickupAuthorizationId: string;
  guardianId: string;
  guardianName: string;
  studentId: string;
  expiresAt: string;
  revokedAt: string | null;
  maxUses: number;
  useCount: number;
  createdAt: string;
};
type GuardianRecord = {
  id: string;
  fullName: string;
  phone: string;
  userId: string | null;
  identityReference: string | null;
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'suspended';
  verifiedAt: string | null;
  createdAt: string;
};
type GateLocation = { id: string; name: string; status: string };
type SecurityIncident = {
  id: string;
  gateEventId: string | null;
  incidentType: string;
  details: { description?: string } & Record<string, unknown>;
  occurredAt: string;
};
type GateScanResponse = { eventId: string; authorized: boolean; reason: string; occurredAt: string };
type GateEvent = {
  eventId: string;
  gateLocationId: string;
  gateName: string;
  studentId: string | null;
  operatorId: string | null;
  direction: 'entry' | 'exit';
  outcome: 'authorized' | 'denied';
  reason: string | null;
  occurredAt: string;
};
type ExeatRecord = {
  id: string;
  studentId: string;
  destination: string;
  reason: string;
  status: string;
  departureDueAt: string;
  returnDueAt: string;
};
type LibraryResource = {
  id: string;
  title: string;
  subjectId: string | null;
  description: string;
  publicationStatus: string;
  currentVersion: number;
  visibility: 'staff_only' | 'students' | 'staff_and_students';
  createdAt: string;
};
type LibraryUsageEvent = {
  id: string;
  actorUserId: string;
  action: string;
  resourceVersion: number;
  occurredAt: string;
};
type LibraryStorageConfiguration = {
  strategy: 'private_drive' | 'platform_storage' | 'hybrid';
  primaryProvider: string;
  secondaryProvider: string | null;
  driveFolderId: string | null;
  gcsBucket: string | null;
  placementRules: Record<string, unknown>;
  status: 'unverified' | 'verified' | 'degraded' | 'disabled';
  verifiedAt: string | null;
  configurationVersion: number;
};
type GpsTelemetry = {
  telemetryId: string;
  vehicleId: string;
  source: 'traccar';
  fixTime: string;
  receivedAt: string;
  latitude: number;
  longitude: number;
  speedKph: number | null;
  replayed: boolean;
  events: Array<{ id: string; type: string }>;
};
type StoredVehicleTelemetryResponse = {
  vehicleId: string;
  activeBinding: {
    id: string;
    provider: string;
    providerDeviceId: string;
    providerUniqueId: string;
    status: string;
    verifiedAt: string;
  } | null;
  telemetry: Array<{
    id: string;
    fixTime: string;
    latitude: number;
    longitude: number;
    speedKph: number | null;
  }>;
  events: Array<{
    id: string;
    eventType: string;
    occurredAt: string;
  }>;
};
type LogisticsAuditEvent = {
  id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  occurredAt: string;
};

interface LogisticsSupportSuiteTabProps {
  authenticatedUser: AuthenticatedSessionClaims | null;
}

const subTabs: Array<{ id: LogisticsSubTab; label: string; icon: React.ReactNode }> = [
  { id: 'gate_security', label: 'Gate Security', icon: <ShieldCheck className="h-4 w-4" /> },
  { id: 'exeats', label: 'Exeats', icon: <ShieldCheck className="h-4 w-4" /> },
  { id: 'digital_elibrary', label: 'Digital Library', icon: <BookOpen className="h-4 w-4" /> },
  { id: 'boarding_house', label: 'Boarding House', icon: <Building2 className="h-4 w-4" /> },
  { id: 'dining', label: 'Dining', icon: <Building2 className="h-4 w-4" /> },
  { id: 'bus_transportation', label: 'Transport', icon: <Bus className="h-4 w-4" /> },
  { id: 'audit', label: 'Audit Trail', icon: <ClipboardList className="h-4 w-4" /> }
];

function errorText(error: unknown): string {
  if (error && typeof error === 'object' && 'error' in error &&
      typeof error.error === 'string') return error.error;
  return error instanceof Error ? error.message : 'The request could not be completed.';
}

export const LogisticsSupportSuiteTab: React.FC<LogisticsSupportSuiteTabProps> = ({ authenticatedUser }) => {
  const [activeSubTab, setActiveSubTab] = useState<LogisticsSubTab>('gate_security');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dormitories, setDormitories] = useState<HostelDormitory[]>([]);
  const [passAuthorizationId, setPassAuthorizationId] = useState('');
  const [passExpiry, setPassExpiry] = useState('');
  const [passPin, setPassPin] = useState('');
  const [issuedPass, setIssuedPass] = useState<PickupPassResponse | null>(null);
  const [pickupPasses, setPickupPasses] = useState<PickupPassSummary[]>([]);
  const [guardians, setGuardians] = useState<GuardianRecord[]>([]);
  const [guardianFullName, setGuardianFullName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianIdRef, setGuardianIdRef] = useState('');
  const [linkGuardianId, setLinkGuardianId] = useState('');
  const [linkStudentId, setLinkStudentId] = useState('');
  const [linkRelationship, setLinkRelationship] = useState('parent');
  const [createdRelationshipId, setCreatedRelationshipId] = useState('');
  const [authRelationshipId, setAuthRelationshipId] = useState('');
  const [authStartsAt, setAuthStartsAt] = useState('');
  const [authEndsAt, setAuthEndsAt] = useState('');
  const [gateLocations, setGateLocations] = useState<GateLocation[]>([]);
  const [newGateName, setNewGateName] = useState('');
  const [officerGateId, setOfficerGateId] = useState('');
  const [officerUserId, setOfficerUserId] = useState('');
  const [securityIncidents, setSecurityIncidents] = useState<SecurityIncident[]>([]);
  const [incidentTypeInput, setIncidentTypeInput] = useState('unauthorized_approach');
  const [incidentDescriptionInput, setIncidentDescriptionInput] = useState('');
  const [scanToken, setScanToken] = useState('');
  const [scanPin, setScanPin] = useState('');
  const [gateLocationId, setGateLocationId] = useState('');
  const [direction, setDirection] = useState<'entry' | 'exit'>('exit');
  const [scanResult, setScanResult] = useState<GateScanResponse | null>(null);
  const [gateEvents, setGateEvents] = useState<GateEvent[]>([]);
  const [exeats, setExeats] = useState<ExeatRecord[]>([]);
  const [exeatStudentId, setExeatStudentId] = useState('');
  const [exeatDestination, setExeatDestination] = useState('');
  const [exeatReason, setExeatReason] = useState('');
  const [exeatDeparture, setExeatDeparture] = useState('');
  const [exeatReturn, setExeatReturn] = useState('');
  const [pendingConfirmExeat, setPendingConfirmExeat] = useState<{
    id: string;
    destination: string;
    decision: 'approved' | 'rejected';
  } | null>(null);
  const [pendingCancelExeatId, setPendingCancelExeatId] = useState('');
  const [exeatCancelReason, setExeatCancelReason] = useState('');
  const [exeatGateId, setExeatGateId] = useState('');
  const [libraryResources, setLibraryResources] = useState<LibraryResource[]>([]);
  const [libraryUsageMap, setLibraryUsageMap] = useState<Record<string, LibraryUsageEvent[]>>({});
  const [libraryTitle, setLibraryTitle] = useState('');
  const [librarySubject, setLibrarySubject] = useState('');
  const [libraryDescription, setLibraryDescription] = useState('');
  const [libraryResourceId, setLibraryResourceId] = useState('');
  const [libraryUploadFile, setLibraryUploadFile] = useState<File | null>(null);
  const [libraryVisibility, setLibraryVisibility] = useState<'staff_only' | 'students' | 'staff_and_students'>('staff_only');
  const [libraryStudentIds, setLibraryStudentIds] = useState('');
  const [storageStrategy, setStorageStrategy] = useState<'private_drive' | 'platform_storage' | 'hybrid'>('private_drive');
  const [storageFolderId, setStorageFolderId] = useState('');
  const [storageBucket, setStorageBucket] = useState('');
  const [storageRefreshToken, setStorageRefreshToken] = useState('');
  const [storagePlacementRules, setStoragePlacementRules] = useState('{}');
  const [storageConfiguration, setStorageConfiguration] = useState<LibraryStorageConfiguration | null>(null);
  const [gpsVehicleId, setGpsVehicleId] = useState('');
  const [gpsDeviceId, setGpsDeviceId] = useState('');
  const [gpsUniqueId, setGpsUniqueId] = useState('');
  const [gpsTelemetry, setGpsTelemetry] = useState<GpsTelemetry | null>(null);
  const [storedTelemetry, setStoredTelemetry] = useState<StoredVehicleTelemetryResponse | null>(null);
  const [auditEvents, setAuditEvents] = useState<LogisticsAuditEvent[]>([]);
  const [auditEntityFilter, setAuditEntityFilter] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);

  const session = authenticatedUser;
  const authenticated = Boolean(session && unifiedApiClient.isAuthenticated('school_flow'));
  const role = session?.role.toLowerCase();
  const canManageGuardians = ['principal', 'tenant_admin', 'security_officer'].includes(role || '');
  const canManageGate = ['security_officer', 'tenant_admin'].includes(role || '');
  const canRequestExeat = ['parent', 'student', 'housemaster', 'tenant_admin'].includes(role || '');
  const canReviewHousemasterExeat = ['housemaster', 'principal', 'tenant_admin'].includes(role || '');
  const canReviewPrincipalExeat = ['principal', 'tenant_admin'].includes(role || '');
  const canManageLibrary = ['library_administrator', 'tenant_admin'].includes(role || '');
  const canConfigureLibraryStorage = role === 'tenant_admin';
  const canManageGps = ['transport_manager', 'tenant_admin'].includes(role || '');
  const canViewAudit = ['principal', 'tenant_admin'].includes(role || '');

  useEffect(() => {
    let active = true;
    setError('');
    setNotice('');
    if (activeSubTab !== 'boarding_house') return () => { active = false; };
    if (!authenticated) {
      setDormitories([]);
      setError('Sign in with an active school account to access logistics records.');
      return () => { active = false; };
    }

    setLoading(true);
    unifiedApiClient.requestLogistics<ApiEnvelope<HostelDormitory[]>>('/occupancy')
      .then(response => {
        if (active) setDormitories(response.data);
      })
      .catch(reason => {
        if (active) {
          setDormitories([]);
          setError(errorText(reason));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [activeSubTab, authenticated]);

  useEffect(() => {
    let active = true;
    if (!['gate_security', 'exeats', 'digital_elibrary', 'audit'].includes(activeSubTab)) return () => { active = false; };
    if (!authenticated) {
      setGateEvents([]);
      setGuardians([]);
      setPickupPasses([]);
      setGateLocations([]);
      setSecurityIncidents([]);
      setExeats([]);
      setLibraryResources([]);
      setAuditEvents([]);
      return () => { active = false; };
    }

    setLoading(true);
    let request: Promise<void>;
    if (activeSubTab === 'gate_security') {
      request = Promise.all([
        unifiedApiClient.requestLogistics<ApiEnvelope<ApiPage<GateEvent>>>('/gate/events?page=1&pageSize=50'),
        unifiedApiClient.requestLogistics<ApiEnvelope<ApiPage<GuardianRecord>>>('/guardians?page=1&pageSize=50').catch(() => ({ data: { data: [] } })),
        unifiedApiClient.requestLogistics<ApiEnvelope<ApiPage<PickupPassSummary>>>('/pickup-passes?page=1&pageSize=50').catch(() => ({ data: { data: [] } })),
        unifiedApiClient.requestLogistics<ApiEnvelope<GateLocation[]>>('/gate/locations').catch(() => ({ data: [] })),
        unifiedApiClient.requestLogistics<ApiEnvelope<ApiPage<SecurityIncident>>>('/gate/incidents?page=1&pageSize=25').catch(() => ({ data: { data: [] } }))
      ]).then(([eventsRes, guardiansRes, passesRes, locationsRes, incidentsRes]) => {
        if (!active) return;
        setGateEvents(eventsRes.data.data);
        setGuardians(guardiansRes.data.data);
        setPickupPasses(passesRes.data.data);
        setGateLocations(locationsRes.data);
        setSecurityIncidents(incidentsRes.data.data);
      });
    } else if (activeSubTab === 'exeats') {
      request = Promise.all([
        unifiedApiClient.requestLogistics<ApiEnvelope<ApiPage<ExeatRecord>>>('/exeats?page=1&pageSize=50'),
        unifiedApiClient.requestLogistics<ApiEnvelope<GateLocation[]>>('/gate/locations').catch(() => ({ data: [] }))
      ]).then(([exeatRes, locRes]) => {
        if (!active) return;
        setExeats(exeatRes.data.data);
        setGateLocations(locRes.data);
      });
    } else if (activeSubTab === 'digital_elibrary') {
      request = unifiedApiClient.requestLogistics<ApiEnvelope<ApiPage<LibraryResource>>>('/library/resources?page=1&pageSize=50')
        .then(response => { if (active) setLibraryResources(response.data.data); });
    } else {
      const params = new URLSearchParams({ page: '1', pageSize: '50' });
      if (auditEntityFilter.trim()) params.set('entityType', auditEntityFilter.trim());
      if (auditActionFilter.trim()) params.set('action', auditActionFilter.trim());
      request = unifiedApiClient.requestLogistics<ApiEnvelope<ApiPage<LogisticsAuditEvent>>>(`/audit?${params.toString()}`)
        .then(response => { if (active) setAuditEvents(response.data.data); });
    }

    request.catch(reason => {
      if (active) {
        setError(errorText(reason));
        if (activeSubTab === 'gate_security') setGateEvents([]);
        else if (activeSubTab === 'exeats') setExeats([]);
        else if (activeSubTab === 'digital_elibrary') setLibraryResources([]);
        else setAuditEvents([]);
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [activeSubTab, authenticated, refreshVersion, auditEntityFilter, auditActionFilter]);

  useEffect(() => {
    let active = true;
    if (activeSubTab !== 'digital_elibrary' || !authenticated || !canConfigureLibraryStorage) {
      setStorageConfiguration(null);
      return () => { active = false; };
    }
    unifiedApiClient.requestLogistics<ApiEnvelope<LibraryStorageConfiguration | null>>('/library/storage')
      .then(response => {
        if (active) {
          setStorageConfiguration(response.data);
          if (response.data) {
            setStorageStrategy(response.data.strategy);
            setStorageFolderId(response.data.driveFolderId || '');
            setStorageBucket(response.data.gcsBucket || '');
            setStoragePlacementRules(JSON.stringify(response.data.placementRules || {}, null, 2));
          }
        }
      })
      .catch(reason => {
        if (active) {
          setStorageConfiguration(null);
          setError(errorText(reason));
        }
      });
    return () => { active = false; };
  }, [activeSubTab, authenticated, canConfigureLibraryStorage, refreshVersion]);

  const requestExeat = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!authenticated) {
      setError('An authenticated school session is required.');
      return;
    }
    setLoading(true);
    try {
      await unifiedApiClient.requestLogistics<ApiEnvelope<ExeatRecord>>('/exeats', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({
          studentId: exeatStudentId,
          destination: exeatDestination,
          reason: exeatReason,
          departureDueAt: new Date(exeatDeparture).toISOString(),
          returnDueAt: new Date(exeatReturn).toISOString()
        })
      });
      setNotice('Exeat request recorded and queued for server-side approval.');
      setExeatStudentId('');
      setExeatDestination('');
      setExeatReason('');
      setExeatDeparture('');
      setExeatReturn('');
      setRefreshVersion(value => value + 1);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  };

  const confirmExeatDecision = async () => {
    if (!pendingConfirmExeat) return;
    const { id, decision } = pendingConfirmExeat;
    setError('');
    setNotice('');
    if (!authenticated) {
      setError('An authenticated school session is required.');
      return;
    }
    setLoading(true);
    try {
      await unifiedApiClient.requestLogistics<ApiEnvelope<{ id: string; status: string }>>(
        `/exeats/${encodeURIComponent(id)}/decisions`,
        {
          method: 'POST',
          headers: { 'Idempotency-Key': crypto.randomUUID() },
          body: JSON.stringify({ decision })
        }
      );
      setPendingConfirmExeat(null);
      setNotice(`Exeat ${decision === 'approved' ? 'approval' : 'rejection'} recorded.`);
      setRefreshVersion(value => value + 1);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  };

  const authorizeExeatDeparture = async (exeatId: string) => {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      await unifiedApiClient.requestLogistics<ApiEnvelope<{ id: string; status: string }>>(
        `/exeats/${encodeURIComponent(exeatId)}/departure-authorization`,
        { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() } }
      );
      setNotice('Exeat departure authorized at gate.');
      setRefreshVersion(value => value + 1);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  };

  const recordExeatGateMovement = async (exeatId: string, movementDirection: 'departure' | 'return') => {
    if (!exeatGateId) {
      setError('Select a registered gate location before recording exeat gate movement.');
      return;
    }
    setError('');
    setNotice('');
    setLoading(true);
    try {
      await unifiedApiClient.requestLogistics<ApiEnvelope<{ id: string; status: string }>>(
        `/exeats/${encodeURIComponent(exeatId)}/gate-movements`,
        {
          method: 'POST',
          headers: { 'Idempotency-Key': crypto.randomUUID() },
          body: JSON.stringify({ gateLocationId: exeatGateId, direction: movementDirection })
        }
      );
      setNotice(`Exeat ${movementDirection} recorded.`);
      setRefreshVersion(value => value + 1);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  };

  const cancelExeat = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pendingCancelExeatId) return;
    setError('');
    setNotice('');
    setLoading(true);
    try {
      await unifiedApiClient.requestLogistics<ApiEnvelope<{ id: string; status: string }>>(
        `/exeats/${encodeURIComponent(pendingCancelExeatId)}/cancel`,
        {
          method: 'POST',
          headers: { 'Idempotency-Key': crypto.randomUUID() },
          body: JSON.stringify({ reason: exeatCancelReason })
        }
      );
      setPendingCancelExeatId('');
      setExeatCancelReason('');
      setNotice('Exeat request cancelled.');
      setRefreshVersion(value => value + 1);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  };

  const evaluateOverdueExeats = async () => {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const response = await unifiedApiClient.requestLogistics<ApiEnvelope<{ count: number }>>(
        '/exeats/evaluate-overdue',
        { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() } }
      );
      setNotice(`Overdue evaluation complete (${response.data.count} updated).`);
      setRefreshVersion(value => value + 1);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  };

  const createLibraryMetadata = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!authenticated) {
      setError('An authenticated school session is required.');
      return;
    }
    setLoading(true);
    try {
      const response = await unifiedApiClient.requestLogistics<ApiEnvelope<LibraryResource>>('/library/resources', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({
          title: libraryTitle,
          ...(librarySubject ? { subjectId: librarySubject } : {}),
          ...(libraryDescription ? { description: libraryDescription } : {})
        })
      });
      setLibraryTitle('');
      setLibrarySubject('');
      setLibraryDescription('');
      setLibraryResourceId(response.data.id);
      setNotice('Library metadata saved as a draft. No file was uploaded or published.');
      setRefreshVersion(value => value + 1);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  };

  const bindGpsDevice = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!authenticated) {
      setError('An authenticated school session is required.');
      return;
    }
    setLoading(true);
    try {
      await unifiedApiClient.requestLogistics<ApiEnvelope<{ id: string; provider: string; verifiedAt: string }>>(
        `/transport/vehicles/${encodeURIComponent(gpsVehicleId)}/gps-device`,
        {
          method: 'POST',
          body: JSON.stringify({
            providerDeviceId: Number(gpsDeviceId),
            providerUniqueId: gpsUniqueId
          })
        }
      );
      setGpsUniqueId('');
      setNotice('Traccar device identity was verified against the provider and bound to this vehicle.');
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  };

  const syncGpsTelemetry = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setGpsTelemetry(null);
    if (!authenticated) {
      setError('An authenticated school session is required.');
      return;
    }
    setLoading(true);
    try {
      const response = await unifiedApiClient.requestLogistics<ApiEnvelope<GpsTelemetry>>(
        `/transport/vehicles/${encodeURIComponent(gpsVehicleId)}/telemetry/sync`,
        { method: 'POST' }
      );
      setGpsTelemetry(response.data);
      setNotice(response.data.replayed
        ? 'No new provider position was received; showing the previously recorded provider fix.'
        : 'Verified provider telemetry recorded.');
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  };

  const configureLibraryStorage = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!authenticated) {
      setError('An authenticated school session is required.');
      return;
    }
    let placementRules: Record<string, unknown>;
    try {
      const parsed = JSON.parse(storagePlacementRules) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Storage placement rules must be a JSON object.');
      }
      placementRules = parsed as Record<string, unknown>;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Storage placement rules are invalid JSON.');
      return;
    }
    setLoading(true);
    try {
      const response = await unifiedApiClient.requestLogistics<ApiEnvelope<{
        status: 'verified'; configurationVersion: number;
      }>>('/library/storage', {
        method: 'PUT',
        body: JSON.stringify({
          strategy: storageStrategy,
          ...(storageStrategy !== 'platform_storage' ? { driveFolderId: storageFolderId } : {}),
          ...(storageStrategy !== 'private_drive' ? { gcsBucket: storageBucket } : {}),
          ...(storageStrategy !== 'platform_storage' ? { refreshToken: storageRefreshToken } : {}),
          placementRules
        })
      });
      setStorageRefreshToken('');
      setNotice(`Storage provider verified (configuration ${response.data.configurationVersion}).`);
      setRefreshVersion(value => value + 1);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  };

  const uploadLibraryFile = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!authenticated || !libraryResourceId || !libraryUploadFile) {
      setError('Select a library resource and file before uploading.');
      return;
    }
    setLoading(true);
    try {
      const response = await unifiedApiClient.requestLogistics<ApiEnvelope<{ version: number; contentLength: number }>>(
        `/library/resources/${encodeURIComponent(libraryResourceId)}/file`,
        {
          method: 'PUT',
          headers: { 'Content-Type': libraryUploadFile.type || 'application/octet-stream' },
          body: libraryUploadFile
        }
      );
      setNotice(`File version ${response.data.version} stored and verified (${response.data.contentLength} bytes).`);
      setLibraryUploadFile(null);
      setRefreshVersion(value => value + 1);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  };

  const saveLibraryVisibility = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!authenticated || !libraryResourceId) {
      setError('Select a library resource before changing its access policy.');
      return;
    }
    const studentIds = libraryStudentIds.split(',').map(value => value.trim()).filter(Boolean);
    setLoading(true);
    try {
      await unifiedApiClient.requestLogistics<ApiEnvelope<{ resourceId: string }>>(
        `/library/resources/${encodeURIComponent(libraryResourceId)}/visibility`,
        {
          method: 'POST',
          body: JSON.stringify({ visibility: libraryVisibility, studentIds })
        }
      );
      setNotice('Library visibility and student access assignments were saved.');
      setLibraryStudentIds('');
      setRefreshVersion(value => value + 1);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  };

  const downloadLibraryFile = async (resourceId: string) => {
    setError('');
    setNotice('');
    try {
      const blob = await unifiedApiClient.requestLogisticsBlob(
        `/library/resources/${encodeURIComponent(resourceId)}/download`
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'library-resource';
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('Authorized library download completed.');
    } catch (reason) {
      setError(errorText(reason));
    }
  };

  const issuePass = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setIssuedPass(null);
    if (!authenticated) {
      setError('An authenticated school session is required.');
      return;
    }
    setLoading(true);
    try {
      const response = await unifiedApiClient.requestLogistics<ApiEnvelope<PickupPassResponse>>(
        '/pickup-passes',
        {
          method: 'POST',
          headers: { 'Idempotency-Key': crypto.randomUUID() },
          body: JSON.stringify({
            authorizationId: passAuthorizationId,
            expiresAt: new Date(passExpiry).toISOString(),
            ...(passPin ? { pin: passPin } : {})
          })
        }
      );
      setIssuedPass(response.data);
      setPassPin('');
      setNotice('Pickup pass issued by the server. Copy its token now; it will not be shown again.');
      setRefreshVersion(value => value + 1);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  };

  const createGuardian = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      await unifiedApiClient.requestLogistics('/guardians', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({
          fullName: guardianFullName,
          phone: guardianPhone,
          ...(guardianIdRef ? { identityReference: guardianIdRef } : {})
        })
      });
      setGuardianFullName('');
      setGuardianPhone('');
      setGuardianIdRef('');
      setNotice('Guardian registered and pending verification.');
      setRefreshVersion(value => value + 1);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  };

  const verifyGuardianStatus = async (guardianId: string, status: 'verified' | 'rejected' | 'suspended') => {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      await unifiedApiClient.requestLogistics(`/guardians/${encodeURIComponent(guardianId)}/verify`, {
        method: 'POST',
        body: JSON.stringify({ status })
      });
      setNotice(`Guardian status updated to ${status}.`);
      setRefreshVersion(value => value + 1);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  };

  const linkGuardianStudent = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const res = await unifiedApiClient.requestLogistics<ApiEnvelope<{ id: string }>>(
        `/guardians/${encodeURIComponent(linkGuardianId)}/students`,
        {
          method: 'POST',
          headers: { 'Idempotency-Key': crypto.randomUUID() },
          body: JSON.stringify({ studentId: linkStudentId, relationship: linkRelationship })
        }
      );
      setCreatedRelationshipId(res.data.id);
      setAuthRelationshipId(res.data.id);
      setNotice('Guardian linked to student.');
      setRefreshVersion(value => value + 1);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  };

  const createPickupAuthorization = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const res = await unifiedApiClient.requestLogistics<ApiEnvelope<{ id: string }>>(
        `/guardian-students/${encodeURIComponent(authRelationshipId)}/pickup-authorizations`,
        {
          method: 'POST',
          headers: { 'Idempotency-Key': crypto.randomUUID() },
          body: JSON.stringify({
            startsAt: new Date(authStartsAt).toISOString(),
            endsAt: new Date(authEndsAt).toISOString()
          })
        }
      );
      setPassAuthorizationId(res.data.id);
      setNotice(`Pickup authorization ${res.data.id} created and selected for pass issuance.`);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  };

  const revokePickupPass = async (passId: string) => {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      await unifiedApiClient.requestLogistics(`/pickup-passes/${encodeURIComponent(passId)}/revoke`, {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() }
      });
      setNotice('Pickup pass revoked.');
      setRefreshVersion(value => value + 1);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  };

  const createGateLocation = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      await unifiedApiClient.requestLogistics('/gate/locations', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ name: newGateName })
      });
      setNewGateName('');
      setNotice('Gate location created.');
      setRefreshVersion(value => value + 1);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  };

  const assignGateOfficer = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      await unifiedApiClient.requestLogistics(`/gate/locations/${encodeURIComponent(officerGateId)}/officers`, {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ userId: officerUserId })
      });
      setOfficerUserId('');
      setNotice('Gate officer assignment recorded.');
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  };

  const reportSecurityIncident = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      await unifiedApiClient.requestLogistics('/gate/incidents', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ incidentType: incidentTypeInput, description: incidentDescriptionInput })
      });
      setIncidentDescriptionInput('');
      setNotice('Security incident recorded.');
      setRefreshVersion(value => value + 1);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  };

  const updatePublicationStatus = async (resourceId: string, publicationStatus: 'pending_review' | 'published' | 'archived') => {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      await unifiedApiClient.requestLogistics(`/library/resources/${encodeURIComponent(resourceId)}/publication`, {
        method: 'POST',
        body: JSON.stringify({ publicationStatus })
      });
      setNotice(`Library resource status updated to ${publicationStatus}.`);
      setRefreshVersion(value => value + 1);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  };

  const loadLibraryUsage = async (resourceId: string) => {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const response = await unifiedApiClient.requestLogistics<ApiEnvelope<ApiPage<LibraryUsageEvent>>>(
        `/library/resources/${encodeURIComponent(resourceId)}/usage?page=1&pageSize=25`
      );
      setLibraryUsageMap(prev => ({ ...prev, [resourceId]: response.data.data }));
      setNotice('Library usage events loaded.');
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  };

  const loadStoredTelemetry = async () => {
    if (!gpsVehicleId.trim()) {
      setError('Enter a vehicle ID to load stored telemetry.');
      return;
    }
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const response = await unifiedApiClient.requestLogistics<ApiEnvelope<StoredVehicleTelemetryResponse>>(
        `/transport/vehicles/${encodeURIComponent(gpsVehicleId.trim())}/telemetry`
      );
      setStoredTelemetry(response.data);
      setNotice('Stored telemetry and geofence events loaded.');
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  };

  const scanPass = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setScanResult(null);
    if (!authenticated) {
      setError('An authenticated school session is required.');
      return;
    }
    setLoading(true);
    try {
      const response = await unifiedApiClient.requestLogistics<ApiEnvelope<GateScanResponse>>(
        '/gate/scans',
        {
          method: 'POST',
          headers: { 'Idempotency-Key': crypto.randomUUID() },
          body: JSON.stringify({
            token: scanToken,
            ...(scanPin ? { pin: scanPin } : {}),
            gateLocationId,
            direction
          })
        }
      );
      setScanResult(response.data);
      setScanToken('');
      setScanPin('');
      setNotice(response.data.authorized
        ? `Gate ${direction} authorized and recorded.`
        : `Gate ${direction} denied: ${response.data.reason}.`);
      setRefreshVersion(value => value + 1);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/70 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Campus Logistics &amp; Support</h1>
            <p className="mt-1 text-sm text-slate-400">
              School-scoped operations backed by the authenticated service.
            </p>
          </div>
          <div className="text-right text-xs text-slate-400">
            {authenticated
              ? <span>Signed in as <strong className="text-slate-200">{session?.email || 'School user'}</strong></span>
              : <span>School sign-in required</span>}
          </div>
        </div>
        <nav className="mt-5 flex flex-wrap gap-2" aria-label="Logistics sections">
          {subTabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                activeSubTab === tab.id
                  ? 'border-indigo-500 bg-indigo-500/15 text-indigo-200'
                  : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="space-y-5 p-6">
        {!authenticated && (
          <div role="alert" className="rounded-xl border border-amber-700/60 bg-amber-950/30 p-4 text-sm text-amber-200">
            No active school session is available. Demo identities and seeded operational records are not used here.
          </div>
        )}
        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-800 bg-rose-950/30 p-4 text-sm text-rose-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {notice && <p role="status" className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-200">{notice}</p>}

        {activeSubTab === 'gate_security' && (
          <>
          <section className="grid gap-5 xl:grid-cols-2">
            <form onSubmit={issuePass} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div>
                <h2 className="font-bold">Issue guardian pickup pass</h2>
                <p className="mt-1 text-xs text-slate-400">The server verifies the active guardian relationship and authorization.</p>
              </div>
              <label className="block text-xs font-semibold text-slate-300">
                Pickup authorization ID
                <input required value={passAuthorizationId} onChange={event => setPassAuthorizationId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs font-semibold text-slate-300">
                Expires at
                <input required type="datetime-local" value={passExpiry} onChange={event => setPassExpiry(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs font-semibold text-slate-300">
                Optional guardian PIN
                <input type="password" inputMode="numeric" autoComplete="new-password" value={passPin}
                  onChange={event => setPassPin(event.target.value)} minLength={4} maxLength={12}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
              </label>
              <button disabled={loading || !authenticated} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold disabled:opacity-50">
                {loading ? 'Processing…' : 'Issue pass'}
              </button>
              {issuedPass && (
                <div className="rounded-xl border border-emerald-700/60 bg-emerald-950/30 p-3">
                  <p className="text-xs font-semibold text-emerald-300">One-time pass token</p>
                  <code className="mt-2 block break-all text-xs text-white">{issuedPass.token}</code>
                  <p className="mt-2 text-[11px] text-slate-400">Expires {new Date(issuedPass.expiresAt).toLocaleString()}</p>
                </div>
              )}
            </form>

            <form onSubmit={scanPass} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div>
                <h2 className="font-bold">Verify gate pass</h2>
                <p className="mt-1 text-xs text-slate-400">Authorization, expiry, revocation, use limit, and PIN lockout are checked server-side.</p>
              </div>
              {gateLocations.length > 0 ? (
                <label className="block text-xs font-semibold text-slate-300">
                  Registered gate location
                  <select required value={gateLocationId} onChange={event => setGateLocationId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                    <option value="">Select gate location</option>
                    {gateLocations.map(gate => (
                      <option key={gate.id} value={gate.id}>{gate.name} ({gate.status})</option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="block text-xs font-semibold text-slate-300">
                  Registered gate location ID
                  <input required value={gateLocationId} onChange={event => setGateLocationId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                </label>
              )}
              <label className="block text-xs font-semibold text-slate-300">
                Pass token
                <input required type="password" autoComplete="off" value={scanToken} onChange={event => setScanToken(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs font-semibold text-slate-300">
                Guardian PIN (if required)
                <input type="password" inputMode="numeric" autoComplete="off" value={scanPin} onChange={event => setScanPin(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs font-semibold text-slate-300">
                Direction
                <select value={direction} onChange={event => setDirection(event.target.value as 'entry' | 'exit')}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                  <option value="exit">Exit</option>
                  <option value="entry">Entry</option>
                </select>
              </label>
              <button disabled={loading || !authenticated} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold disabled:opacity-50">
                {loading ? 'Verifying…' : 'Verify and record scan'}
              </button>
              {scanResult && <p className="text-xs text-slate-400">Event {scanResult.eventId} · {new Date(scanResult.occurredAt).toLocaleString()}</p>}
            </form>
          </section>

          {canManageGuardians && (
            <section className="grid gap-5 xl:grid-cols-3">
              <form onSubmit={createGuardian} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="font-bold">Register guardian</h2>
                <label className="block text-xs font-semibold text-slate-300">
                  Full name
                  <input required value={guardianFullName} onChange={event => setGuardianFullName(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                </label>
                <label className="block text-xs font-semibold text-slate-300">
                  Phone (E.164, e.g. +2348000000000)
                  <input required value={guardianPhone} onChange={event => setGuardianPhone(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                </label>
                <label className="block text-xs font-semibold text-slate-300">
                  Identity reference (optional)
                  <input value={guardianIdRef} onChange={event => setGuardianIdRef(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                </label>
                <button disabled={loading || !authenticated} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold disabled:opacity-50">Register guardian</button>
              </form>

              <form onSubmit={linkGuardianStudent} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="font-bold">Link verified guardian to student</h2>
                <label className="block text-xs font-semibold text-slate-300">
                  Guardian
                  <select required value={linkGuardianId} onChange={event => setLinkGuardianId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                    <option value="">Select guardian</option>
                    {guardians.map(g => <option key={g.id} value={g.id}>{g.fullName} ({g.verificationStatus})</option>)}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-slate-300">
                  Student ID
                  <input required value={linkStudentId} onChange={event => setLinkStudentId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                </label>
                <label className="block text-xs font-semibold text-slate-300">
                  Relationship
                  <input required value={linkRelationship} onChange={event => setLinkRelationship(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                </label>
                <button disabled={loading || !authenticated} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold disabled:opacity-50">Link student</button>
                {createdRelationshipId && <p className="break-all text-xs text-emerald-300">Relationship ID: {createdRelationshipId}</p>}
              </form>

              <form onSubmit={createPickupAuthorization} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="font-bold">Grant pickup authorization</h2>
                <label className="block text-xs font-semibold text-slate-300">
                  Guardian-student relationship ID
                  <input required value={authRelationshipId} onChange={event => setAuthRelationshipId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                </label>
                <label className="block text-xs font-semibold text-slate-300">
                  Starts at
                  <input required type="datetime-local" value={authStartsAt} onChange={event => setAuthStartsAt(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                </label>
                <label className="block text-xs font-semibold text-slate-300">
                  Ends at
                  <input required type="datetime-local" value={authEndsAt} onChange={event => setAuthEndsAt(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                </label>
                <button disabled={loading || !authenticated} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold disabled:opacity-50">Create authorization</button>
              </form>
            </section>
          )}

          <section className="grid gap-5 xl:grid-cols-2">
            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="font-bold">Registered guardians</h2>
              {guardians.length === 0 ? <p className="text-sm text-slate-400">No guardians recorded.</p> : guardians.map(g => (
                <article key={g.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-700 p-3 text-xs">
                  <div>
                    <p className="font-semibold">{g.fullName} · {g.verificationStatus}</p>
                    <p className="text-slate-400">ID {g.id}</p>
                  </div>
                  {canManageGuardians && g.verificationStatus === 'pending' && (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => void verifyGuardianStatus(g.id, 'verified')}
                        className="rounded bg-emerald-700 px-2 py-1 font-semibold">Verify</button>
                      <button type="button" onClick={() => void verifyGuardianStatus(g.id, 'rejected')}
                        className="rounded bg-rose-800 px-2 py-1 font-semibold">Reject</button>
                    </div>
                  )}
                </article>
              ))}
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="font-bold">Issued pickup passes</h2>
              {pickupPasses.length === 0 ? <p className="text-sm text-slate-400">No pickup passes recorded.</p> : pickupPasses.map(pass => (
                <article key={pass.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-700 p-3 text-xs">
                  <div>
                    <p className="font-semibold">{pass.guardianName} · Uses {pass.useCount}/{pass.maxUses}</p>
                    <p className="text-slate-400">Student {pass.studentId} · Expires {new Date(pass.expiresAt).toLocaleString()}</p>
                  </div>
                  {canManageGuardians && !pass.revokedAt ? (
                    <button type="button" onClick={() => void revokePickupPass(pass.id)}
                      className="rounded bg-rose-800 px-2 py-1 font-semibold">Revoke</button>
                  ) : (
                    <span className="text-slate-400">{pass.revokedAt ? 'Revoked' : 'Active'}</span>
                  )}
                </article>
              ))}
            </div>
          </section>

          {canManageGate && (
            <section className="grid gap-5 xl:grid-cols-3">
              <form onSubmit={createGateLocation} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="font-bold">Register gate location</h2>
                <label className="block text-xs font-semibold text-slate-300">
                  Gate name
                  <input required value={newGateName} onChange={event => setNewGateName(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                </label>
                <button disabled={loading || !authenticated} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold disabled:opacity-50">Add gate</button>
              </form>
              <form onSubmit={assignGateOfficer} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="font-bold">Assign gate officer</h2>
                <label className="block text-xs font-semibold text-slate-300">
                  Gate
                  <select required value={officerGateId} onChange={event => setOfficerGateId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                    <option value="">Select gate</option>
                    {gateLocations.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-slate-300">
                  Officer user ID
                  <input required value={officerUserId} onChange={event => setOfficerUserId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                </label>
                <button disabled={loading || !authenticated} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold disabled:opacity-50">Assign officer</button>
              </form>
              <form onSubmit={reportSecurityIncident} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="font-bold">Record gate security incident</h2>
                <label className="block text-xs font-semibold text-slate-300">
                  Incident type
                  <input required value={incidentTypeInput} onChange={event => setIncidentTypeInput(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                </label>
                <label className="block text-xs font-semibold text-slate-300">
                  Description
                  <input required value={incidentDescriptionInput} onChange={event => setIncidentDescriptionInput(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                </label>
                <button disabled={loading || !authenticated} className="rounded-lg bg-rose-800 px-3 py-2 text-xs font-bold disabled:opacity-50">Record incident</button>
              </form>
            </section>
          )}

          <section className="grid gap-5 xl:grid-cols-2">
            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-bold">Gate movement history</h2>
                {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
              </div>
              {gateEvents.length === 0 && !loading &&
                <p className="text-sm text-slate-400">No gate events are available.</p>}
              {gateEvents.map(event => (
                <article key={event.eventId} className="rounded-xl border border-slate-700 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{event.gateName} · {event.direction}</p>
                    <span className={event.outcome === 'authorized' ? 'text-xs text-emerald-300' : 'text-xs text-rose-300'}>
                      {event.outcome}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(event.occurredAt).toLocaleString()} · Operator {event.operatorId || 'unavailable'}
                    {event.studentId ? ` · Student ${event.studentId}` : ''}
                    {event.reason ? ` · ${event.reason}` : ''}
                  </p>
                </article>
              ))}
            </div>
            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="font-bold">Security incidents</h2>
              {securityIncidents.length === 0 ? <p className="text-sm text-slate-400">No security incidents recorded.</p> : securityIncidents.map(item => (
                <article key={item.id} className="rounded-xl border border-slate-700 p-3 text-xs">
                  <p className="font-semibold">{item.incidentType} · {new Date(item.occurredAt).toLocaleString()}</p>
                  {item.details?.description && <p className="mt-1 text-slate-300">{String(item.details.description)}</p>}
                </article>
              ))}
            </div>
          </section>
          </>
        )}

        {activeSubTab === 'boarding_house' && (
          <section className="space-y-4">
            {loading && <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Loading authoritative occupancy…</div>}
            {!loading && !error && dormitories.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
                No hostel buildings and registered beds are available for this school.
              </div>
            )}
            {dormitories.length > 0 && <BoardingHouseD3Dashboard dormitories={dormitories} />}
            <BoardingOperationsPanel authenticated={authenticated} role={role || ''} />
          </section>
        )}

        {activeSubTab === 'exeats' && (
          <section className="grid gap-5 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]">
            {canRequestExeat && <form onSubmit={requestExeat} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div>
                <h2 className="font-bold">Request an exeat</h2>
                <p className="mt-1 text-xs text-slate-400">Guardian consent and approval requirements are verified by the service.</p>
              </div>
              <label className="block text-xs font-semibold text-slate-300">
                Student ID
                <input required value={exeatStudentId} onChange={event => setExeatStudentId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs font-semibold text-slate-300">
                Destination
                <input required maxLength={500} value={exeatDestination} onChange={event => setExeatDestination(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs font-semibold text-slate-300">
                Reason
                <textarea required maxLength={1000} value={exeatReason} onChange={event => setExeatReason(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Departure
                  <input required type="datetime-local" value={exeatDeparture} onChange={event => setExeatDeparture(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                </label>
                <label className="block text-xs font-semibold text-slate-300">
                  Return
                  <input required type="datetime-local" value={exeatReturn} onChange={event => setExeatReturn(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                </label>
              </div>
              <button disabled={loading || !authenticated} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold disabled:opacity-50">
                {loading ? 'Submitting…' : 'Submit request'}
              </button>
            </form>}
            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-bold">School exeat requests</h2>
                <div className="flex items-center gap-2">
                  {canReviewPrincipalExeat && (
                    <button type="button" disabled={loading || !authenticated} onClick={() => void evaluateOverdueExeats()}
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold disabled:opacity-50">
                      Evaluate overdue
                    </button>
                  )}
                  {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                </div>
              </div>
              {canManageGate && (
                <label className="block text-xs font-semibold text-slate-300">
                  Gate for exeat departure/return
                  <select value={exeatGateId} onChange={event => setExeatGateId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                    <option value="">Select gate</option>
                    {gateLocations.map(gate => <option key={gate.id} value={gate.id}>{gate.name}</option>)}
                  </select>
                </label>
              )}
              {pendingConfirmExeat && (
                <div role="region" aria-label="Confirm exeat decision" className="rounded-xl border border-amber-700 bg-amber-950/30 p-3 text-xs">
                  <p className="font-semibold text-amber-200">
                    Confirm {pendingConfirmExeat.decision === 'approved' ? 'approval' : 'rejection'} for exeat to {pendingConfirmExeat.destination}?
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" disabled={loading} onClick={() => void confirmExeatDecision()}
                      className="rounded bg-indigo-600 px-3 py-1 font-bold">Confirm</button>
                    <button type="button" onClick={() => setPendingConfirmExeat(null)}
                      className="rounded border border-slate-600 px-3 py-1">Cancel</button>
                  </div>
                </div>
              )}
              {pendingCancelExeatId && (
                <form onSubmit={cancelExeat} className="space-y-2 rounded-xl border border-rose-800 bg-rose-950/30 p-3 text-xs">
                  <p className="font-semibold text-rose-200">Cancel exeat {pendingCancelExeatId}</p>
                  <input required placeholder="Cancellation reason" value={exeatCancelReason}
                    onChange={event => setExeatCancelReason(event.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm" />
                  <div className="flex gap-2">
                    <button disabled={loading} className="rounded bg-rose-800 px-3 py-1 font-bold">Confirm cancellation</button>
                    <button type="button" onClick={() => { setPendingCancelExeatId(''); setExeatCancelReason(''); }}
                      className="rounded border border-slate-600 px-3 py-1">Keep exeat</button>
                  </div>
                </form>
              )}
              {exeats.length === 0 && !loading && <p className="text-sm text-slate-400">No exeat requests are available.</p>}
              {exeats.map(exeat => (
                <article key={exeat.id} className="rounded-xl border border-slate-700 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{exeat.destination}</p>
                      <p className="mt-1 text-xs text-slate-400">{exeat.reason}</p>
                    </div>
                    <span className="rounded-full bg-slate-800 px-2 py-1 text-xs">{exeat.status.replaceAll('_', ' ')}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Student {exeat.studentId} · Return {new Date(exeat.returnDueAt).toLocaleString()}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {((exeat.status === 'pending_housemaster' && canReviewHousemasterExeat) ||
                      (exeat.status === 'pending_principal' && canReviewPrincipalExeat)) && (
                      <>
                        <button type="button" disabled={loading} onClick={() => setPendingConfirmExeat({ id: exeat.id, destination: exeat.destination, decision: 'approved' })}
                          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold disabled:opacity-50">Approve</button>
                        <button type="button" disabled={loading} onClick={() => setPendingConfirmExeat({ id: exeat.id, destination: exeat.destination, decision: 'rejected' })}
                          className="rounded-lg bg-rose-800 px-3 py-1.5 text-xs font-bold disabled:opacity-50">Reject</button>
                      </>
                    )}
                    {exeat.status === 'approved' && canReviewHousemasterExeat && (
                      <button type="button" disabled={loading} onClick={() => void authorizeExeatDeparture(exeat.id)}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold disabled:opacity-50">Authorize gate departure</button>
                    )}
                    {exeat.status === 'departure_authorized' && canManageGate && (
                      <button type="button" disabled={loading} onClick={() => void recordExeatGateMovement(exeat.id, 'departure')}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold disabled:opacity-50">Record gate departure</button>
                    )}
                    {['departed', 'overdue'].includes(exeat.status) && canManageGate && (
                      <button type="button" disabled={loading} onClick={() => void recordExeatGateMovement(exeat.id, 'return')}
                        className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold disabled:opacity-50">Record gate return</button>
                    )}
                    {['pending_housemaster', 'pending_principal', 'approved', 'departure_authorized'].includes(exeat.status) && (
                      <button type="button" disabled={loading} onClick={() => setPendingCancelExeatId(exeat.id)}
                        className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold">Cancel</button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeSubTab === 'dining' && (
          <DiningOperationsPanel authenticated={authenticated} role={role || ''} />
        )}

        {activeSubTab === 'digital_elibrary' && (
          <section className="grid gap-5 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]">
            {canConfigureLibraryStorage && (
              <form onSubmit={configureLibraryStorage}
                className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 xl:col-span-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold">Private library storage</h2>
                    <p className="mt-1 text-xs text-slate-400">
                      The server verifies Google access and privacy policy before storage is enabled. Platform storage uses the configured server identity.
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs">
                    {storageConfiguration?.status || 'not configured'}
                    {storageConfiguration?.verifiedAt
                      ? ` · ${new Date(storageConfiguration.verifiedAt).toLocaleString()}`
                      : ''}
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    Storage architecture
                    <select value={storageStrategy} onChange={event => setStorageStrategy(event.target.value as typeof storageStrategy)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-normal">
                      <option value="private_drive">Institution-owned private Google Drive</option>
                      <option value="platform_storage">Platform-managed Google Cloud Storage</option>
                      <option value="hybrid">Hybrid Drive and Cloud Storage</option>
                    </select>
                  </label>
                  {storageStrategy !== 'platform_storage' && (
                    <>
                      <label className="block text-xs font-semibold text-slate-300">
                        Private Drive folder ID
                        <input required value={storageFolderId} onChange={event => setStorageFolderId(event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-normal" />
                      </label>
                      <label className="block text-xs font-semibold text-slate-300">
                        Google Drive refresh token
                        <input required type="password" autoComplete="new-password" value={storageRefreshToken}
                          onChange={event => setStorageRefreshToken(event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-normal" />
                      </label>
                    </>
                  )}
                  {storageStrategy !== 'private_drive' && (
                    <label className="block text-xs font-semibold text-slate-300">
                      Private GCS bucket
                      <input required value={storageBucket} onChange={event => setStorageBucket(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-normal" />
                    </label>
                  )}
                  {storageStrategy === 'hybrid' && (
                    <label className="block text-xs font-semibold text-slate-300 md:col-span-2">
                        Content-type placement rules (JSON)
                        <textarea value={storagePlacementRules} onChange={event => setStoragePlacementRules(event.target.value)}
                          placeholder='{"application/pdf":"google_drive"}'
                          className="mt-1 min-h-20 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs font-normal" />
                        <span className="mt-1 block font-normal text-slate-400">
                          Map MIME types to google_drive or google_cloud_storage. Unmapped types use the primary provider.
                        </span>
                    </label>
                  )}
                </div>
                <button disabled={loading} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold disabled:opacity-50">
                  {loading ? 'Verifying provider…' : 'Verify and save storage'}
                </button>
              </form>
            )}
            {canManageLibrary && (
              <form onSubmit={createLibraryMetadata} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="font-bold">Create resource metadata</h2>
                <label className="block text-xs font-semibold text-slate-300">
                  Title
                  <input required maxLength={300} value={libraryTitle} onChange={event => setLibraryTitle(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                </label>
                <label className="block text-xs font-semibold text-slate-300">
                  Subject
                  <input maxLength={120} value={librarySubject} onChange={event => setLibrarySubject(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                </label>
                <label className="block text-xs font-semibold text-slate-300">
                  Description
                  <textarea maxLength={2000} value={libraryDescription} onChange={event => setLibraryDescription(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                </label>
                <button disabled={loading || !authenticated} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold disabled:opacity-50">
                  {loading ? 'Saving…' : 'Save draft metadata'}
                </button>
              </form>
            )}
            {canManageLibrary && (
              <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <form onSubmit={uploadLibraryFile} className="space-y-3">
                  <h2 className="font-bold">Upload a private resource file</h2>
                  <label className="block text-xs font-semibold text-slate-300">
                    Resource
                    <select required value={libraryResourceId} onChange={event => setLibraryResourceId(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-normal">
                      <option value="">Select a resource</option>
                      {libraryResources.map(resource => <option key={resource.id} value={resource.id}>{resource.title}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-slate-300">
                    File (maximum 250 MB)
                    <input required type="file" onChange={event => setLibraryUploadFile(event.target.files?.[0] || null)}
                      className="mt-1 block w-full text-sm font-normal text-slate-300" />
                  </label>
                  <button disabled={loading || !libraryUploadFile} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold disabled:opacity-50">
                    {loading ? 'Uploading…' : 'Upload file'}
                  </button>
                </form>
                <form onSubmit={saveLibraryVisibility} className="space-y-3 border-t border-slate-800 pt-4">
                  <h2 className="font-bold">Resource access policy</h2>
                  <label className="block text-xs font-semibold text-slate-300">
                    Visibility
                    <select value={libraryVisibility} onChange={event => setLibraryVisibility(event.target.value as typeof libraryVisibility)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-normal">
                      <option value="staff_only">Staff only</option>
                      <option value="students">Assigned students</option>
                      <option value="staff_and_students">Staff and assigned students</option>
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-slate-300">
                    Authorized student IDs (comma-separated)
                    <textarea value={libraryStudentIds} onChange={event => setLibraryStudentIds(event.target.value)}
                      disabled={libraryVisibility === 'staff_only'}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-normal disabled:opacity-50" />
                  </label>
                  <button disabled={loading || !libraryResourceId} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold disabled:opacity-50">
                    Save access policy
                  </button>
                </form>
              </div>
            )}
            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="font-bold">Library resources</h2>
              <p className="text-xs text-slate-400">
                Downloads are streamed only after server-side permission, school, publication, storage and file-integrity checks.
              </p>
              {libraryResources.length === 0 && <p className="text-sm text-slate-400">No library metadata is available.</p>}
              {libraryResources.map(resource => (
                <article key={resource.id} className="rounded-xl border border-slate-700 p-4">
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="font-semibold">{resource.title}</p>
                    <span className="text-xs text-slate-400">{resource.publicationStatus}</span>
                  </div>
                  {resource.subjectId && <p className="mt-1 text-xs text-slate-400">Subject {resource.subjectId}</p>}
                  {resource.description && <p className="mt-2 text-sm text-slate-300">{resource.description}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {canManageLibrary && (
                      <>
                        <button type="button" onClick={() => setLibraryResourceId(resource.id)}
                          className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold">Select for management</button>
                        {resource.publicationStatus === 'draft' && (
                          <button type="button" onClick={() => void updatePublicationStatus(resource.id, 'pending_review')}
                            className="rounded-lg border border-indigo-500 px-3 py-1.5 text-xs font-semibold">Submit for review</button>
                        )}
                        {resource.publicationStatus !== 'published' && (
                          <button type="button" onClick={() => void updatePublicationStatus(resource.id, 'published')}
                            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold">Publish</button>
                        )}
                        {resource.publicationStatus !== 'archived' && (
                          <button type="button" onClick={() => void updatePublicationStatus(resource.id, 'archived')}
                            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold">Archive</button>
                        )}
                        <button type="button" onClick={() => void loadLibraryUsage(resource.id)}
                          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold">Usage audit</button>
                      </>
                    )}
                    {(resource.publicationStatus === 'published' || canManageLibrary) && (
                      <button type="button" onClick={() => void downloadLibraryFile(resource.id)}
                        className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold">Authorized download</button>
                    )}
                  </div>
                  {libraryUsageMap[resource.id] && (
                    <div className="mt-3 space-y-1 border-t border-slate-800 pt-2 text-xs text-slate-400">
                      {libraryUsageMap[resource.id].length === 0 ? (
                        <p>No download or usage events recorded yet.</p>
                      ) : libraryUsageMap[resource.id].map(ev => (
                        <p key={ev.id}>{ev.action} v{ev.resourceVersion} by {ev.actorUserId} · {new Date(ev.occurredAt).toLocaleString()}</p>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {activeSubTab === 'bus_transportation' && (
          <div className="space-y-5">
          <TransportOperationsPanel authenticated={authenticated} role={role || ''} />
          <section className="grid gap-5 xl:grid-cols-2">
            {canManageGps && (
              <form onSubmit={bindGpsDevice} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div>
                  <h2 className="font-bold">Verify a Traccar device</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    The server verifies the device ID and unique ID with Traccar before binding it.
                  </p>
                </div>
                <label className="block text-xs font-semibold text-slate-300">
                  Vehicle ID
                  <input required value={gpsVehicleId} onChange={event => setGpsVehicleId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-normal" />
                </label>
                <label className="block text-xs font-semibold text-slate-300">
                  Traccar device ID
                  <input required type="number" min="1" step="1" value={gpsDeviceId}
                    onChange={event => setGpsDeviceId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-normal" />
                </label>
                <label className="block text-xs font-semibold text-slate-300">
                  Traccar unique ID
                  <input required maxLength={200} value={gpsUniqueId} onChange={event => setGpsUniqueId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-normal" />
                </label>
                <button disabled={loading} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold disabled:opacity-50">
                  {loading ? 'Verifying…' : 'Verify and bind device'}
                </button>
              </form>
            )}
            <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div>
                <h2 className="font-bold">Verified vehicle telemetry</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Coordinates are shown only when returned by the configured provider and verified by the server.
                </p>
              </div>
              <form onSubmit={syncGpsTelemetry} className="flex flex-col gap-3 sm:flex-row">
                <input required aria-label="Vehicle ID" value={gpsVehicleId}
                  onChange={event => setGpsVehicleId(event.target.value)} placeholder="Vehicle ID"
                  className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                <button disabled={loading} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold disabled:opacity-50">
                  {loading ? 'Checking…' : 'Sync provider'}
                </button>
                <button type="button" disabled={loading || !gpsVehicleId} onClick={() => void loadStoredTelemetry()}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold disabled:opacity-50">
                  Load stored
                </button>
              </form>
              {gpsTelemetry ? (
                <dl className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs text-slate-400">Provider</dt><dd>{gpsTelemetry.source}</dd></div>
                  <div><dt className="text-xs text-slate-400">Fix time</dt><dd>{new Date(gpsTelemetry.fixTime).toLocaleString()}</dd></div>
                  <div><dt className="text-xs text-slate-400">Latitude</dt><dd>{gpsTelemetry.latitude}</dd></div>
                  <div><dt className="text-xs text-slate-400">Longitude</dt><dd>{gpsTelemetry.longitude}</dd></div>
                  <div><dt className="text-xs text-slate-400">Speed</dt><dd>{gpsTelemetry.speedKph === null ? 'Not reported' : `${gpsTelemetry.speedKph.toFixed(1)} km/h`}</dd></div>
                  <div><dt className="text-xs text-slate-400">Geofence events</dt><dd>{gpsTelemetry.events.length ? gpsTelemetry.events.map(event => event.type).join(', ') : 'None recorded'}</dd></div>
                </dl>
              ) : storedTelemetry ? (
                <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs">
                  <p className="font-semibold">
                    Binding: {storedTelemetry.activeBinding
                      ? `${storedTelemetry.activeBinding.provider} #${storedTelemetry.activeBinding.providerDeviceId}`
                      : 'No active GPS device bound'}
                  </p>
                  {storedTelemetry.telemetry.slice(0, 5).map(pt => (
                    <p key={pt.id} className="text-slate-300">
                      {new Date(pt.fixTime).toLocaleString()} · ({pt.latitude}, {pt.longitude})
                    </p>
                  ))}
                  {storedTelemetry.events.length > 0 && (
                    <p className="text-slate-400">
                      Events: {storedTelemetry.events.map(ev => ev.eventType).join(', ')}
                    </p>
                  )}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
                  No live or cached position is displayed until a verified provider fix is returned.
                </p>
              )}
            </div>
          </section>
          </div>
        )}

        {activeSubTab === 'audit' && (
          <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">Immutable logistics audit ledger</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Append-only trail covering guardians, pickup passes, gate movements, exeats, boarding, dining, transport, and digital library actions.
                </p>
              </div>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-slate-300">
                Filter by entity type
                <input placeholder="e.g. exeat, gate_event, library_resource" value={auditEntityFilter}
                  onChange={event => setAuditEntityFilter(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-normal" />
              </label>
              <label className="block text-xs font-semibold text-slate-300">
                Filter by action
                <input placeholder="e.g. gate_scan_authorized, exeat_approved" value={auditActionFilter}
                  onChange={event => setAuditActionFilter(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-normal" />
              </label>
            </div>
            {!canViewAudit && (
              <p className="text-xs text-slate-400">Access to the school logistics audit trail requires principal or tenant administrator permissions.</p>
            )}
            {auditEvents.length === 0 && !loading ? (
              <p className="text-sm text-slate-400">No audit events matched the current filter.</p>
            ) : (
              <div className="space-y-2">
                {auditEvents.map(ev => (
                  <article key={ev.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-200">{ev.action}</span>
                      <span className="text-slate-400">{new Date(ev.occurredAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-slate-400">
                      {ev.entityType} · {ev.entityId} · Actor {ev.actorUserId}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};
