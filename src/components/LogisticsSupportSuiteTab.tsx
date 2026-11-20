import React, { useEffect, useState } from 'react';
import { AlertTriangle, BookOpen, Bus, Building2, Loader2, ShieldCheck } from 'lucide-react';
import type { HostelDormitory } from '../types';
import { BoardingHouseD3Dashboard } from './logistics/BoardingHouseD3Dashboard';
import { BoardingOperationsPanel, DiningOperationsPanel, TransportOperationsPanel } from './logistics/LogisticsOperationalPanels';
import { unifiedApiClient, type AuthenticatedSessionClaims } from '../services/unifiedApiClient';

type LogisticsSubTab = 'gate_security' | 'digital_elibrary' | 'boarding_house' | 'bus_transportation' | 'exeats' | 'dining';
type ApiEnvelope<T> = { success: true; data: T; correlationId: string; timestamp: string };
type ApiPage<T> = { page: number; pageSize: number; total: number; data: T[] };
type PickupPassResponse = { id: string; token: string; expiresAt: string };
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

interface LogisticsSupportSuiteTabProps {
  authenticatedUser: AuthenticatedSessionClaims | null;
}

const subTabs: Array<{ id: LogisticsSubTab; label: string; icon: React.ReactNode }> = [
  { id: 'gate_security', label: 'Gate Security', icon: <ShieldCheck className="h-4 w-4" /> },
  { id: 'exeats', label: 'Exeats', icon: <ShieldCheck className="h-4 w-4" /> },
  { id: 'digital_elibrary', label: 'Digital Library', icon: <BookOpen className="h-4 w-4" /> },
  { id: 'boarding_house', label: 'Boarding House', icon: <Building2 className="h-4 w-4" /> },
  { id: 'dining', label: 'Dining', icon: <Building2 className="h-4 w-4" /> },
  { id: 'bus_transportation', label: 'Transport', icon: <Bus className="h-4 w-4" /> }
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
  const [libraryResources, setLibraryResources] = useState<LibraryResource[]>([]);
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
  const [refreshVersion, setRefreshVersion] = useState(0);

  const session = authenticatedUser;
  const authenticated = Boolean(session && unifiedApiClient.isAuthenticated('school_flow'));
  const role = session?.role.toLowerCase();
  const canRequestExeat = ['parent', 'student', 'housemaster', 'tenant_admin'].includes(role || '');
  const canReviewHousemasterExeat = ['housemaster', 'principal', 'tenant_admin'].includes(role || '');
  const canReviewPrincipalExeat = ['principal', 'tenant_admin'].includes(role || '');
  const canManageLibrary = ['library_administrator', 'tenant_admin'].includes(role || '');
  const canConfigureLibraryStorage = role === 'tenant_admin';
  const canManageGps = ['transport_manager', 'tenant_admin'].includes(role || '');

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
    if (!['gate_security', 'exeats', 'digital_elibrary'].includes(activeSubTab)) return () => { active = false; };
    if (!authenticated) {
      setGateEvents([]);
      setExeats([]);
      setLibraryResources([]);
      return () => { active = false; };
    }

    setLoading(true);
    const request = activeSubTab === 'gate_security'
      ? unifiedApiClient.requestLogistics<ApiEnvelope<ApiPage<GateEvent>>>('/gate/events?page=1&pageSize=50')
        .then(response => { if (active) setGateEvents(response.data.data); })
      : activeSubTab === 'exeats'
      ? unifiedApiClient.requestLogistics<ApiEnvelope<ApiPage<ExeatRecord>>>('/exeats?page=1&pageSize=50')
        .then(response => { if (active) setExeats(response.data.data); })
      : unifiedApiClient.requestLogistics<ApiEnvelope<ApiPage<LibraryResource>>>('/library/resources?page=1&pageSize=50')
        .then(response => { if (active) setLibraryResources(response.data.data); });
    request.catch(reason => {
      if (active) {
        setError(errorText(reason));
        if (activeSubTab === 'gate_security') setGateEvents([]);
        else if (activeSubTab === 'exeats') setExeats([]);
        else setLibraryResources([]);
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [activeSubTab, authenticated, refreshVersion]);

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

  const decideExeat = async (exeat: ExeatRecord, decision: 'approved' | 'rejected') => {
    setError('');
    setNotice('');
    if (!authenticated) {
      setError('An authenticated school session is required.');
      return;
    }
    if (!window.confirm(`${decision === 'approved' ? 'Approve' : 'Reject'} this exeat request?`)) return;
    setLoading(true);
    try {
      await unifiedApiClient.requestLogistics<ApiEnvelope<{ id: string; status: string }>>(
        `/exeats/${encodeURIComponent(exeat.id)}/decisions`,
        {
          method: 'POST',
          headers: { 'Idempotency-Key': crypto.randomUUID() },
          body: JSON.stringify({ decision })
        }
      );
      setNotice(`Exeat ${decision === 'approved' ? 'approval' : 'rejection'} recorded.`);
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
              <label className="block text-xs font-semibold text-slate-300">
                Registered gate location ID
                <input required value={gateLocationId} onChange={event => setGateLocationId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
              </label>
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
          <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
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
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-bold">School exeat requests</h2>
                {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
              </div>
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
                  {((exeat.status === 'pending_housemaster' && canReviewHousemasterExeat) ||
                    (exeat.status === 'pending_principal' && canReviewPrincipalExeat)) && (
                    <div className="mt-3 flex gap-2">
                      <button disabled={loading} onClick={() => void decideExeat(exeat, 'approved')}
                        className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold disabled:opacity-50">Approve</button>
                      <button disabled={loading} onClick={() => void decideExeat(exeat, 'rejected')}
                        className="rounded-lg bg-rose-800 px-3 py-1.5 text-xs font-bold disabled:opacity-50">Reject</button>
                    </div>
                  )}
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
                      <button type="button" onClick={() => setLibraryResourceId(resource.id)}
                        className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold">Select for management</button>
                    )}
                    {(resource.publicationStatus === 'published' || canManageLibrary) && (
                      <button type="button" onClick={() => void downloadLibraryFile(resource.id)}
                        className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold">Authorized download</button>
                    )}
                  </div>
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
              ) : (
                <p className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
                  No live or cached position is displayed until a verified provider fix is returned.
                </p>
              )}
            </div>
          </section>
          </div>
        )}
      </main>
    </div>
  );
};
