import React, { useEffect, useState } from 'react';
import { 
  DatabaseInstanceRecord, 
  DatabaseIsolationStrategy, 
  StorageConfigRecord, 
  StorageMigrationJob, 
  StoragePlacementRule, 
  StorageProviderType, 
  StorageStrategyType 
} from '../types/storageAndDatabase';
import { storageAndDatabaseClient } from '../services/storageAndDatabaseClient';
import { 
  Database, 
  HardDrive, 
  Cloud, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  FolderSync, 
  Sliders, 
  Plus, 
  ArrowRight, 
  FileCheck, 
  Server, 
  ExternalLink,
  Layers,
  Zap,
  Info,
  Check,
  X
} from 'lucide-react';

export const StorageAndDatabasePortal: React.FC = () => {
  const [databases, setDatabases] = useState<DatabaseInstanceRecord[]>(storageAndDatabaseClient.getDatabaseRecords());
  const [storageConfigs, setStorageConfigs] = useState<StorageConfigRecord[]>(storageAndDatabaseClient.getStorageConfigs());
  const [migrationJobs, setMigrationJobs] = useState<StorageMigrationJob[]>(storageAndDatabaseClient.getMigrationJobs());
  const [serviceAvailable, setServiceAvailable] = useState(storageAndDatabaseClient.getAvailable());
  const [serviceError, setServiceError] = useState(storageAndDatabaseClient.getUnavailableReason());
  const [activeTab, setActiveTab] = useState<'databases' | 'storage' | 'placement' | 'migration' | 'verification'>('storage');

  useEffect(() => {
    void storageAndDatabaseClient.syncFromBackend().then(() => {
      setDatabases(storageAndDatabaseClient.getDatabaseRecords());
      setStorageConfigs(storageAndDatabaseClient.getStorageConfigs());
      setMigrationJobs(storageAndDatabaseClient.getMigrationJobs());
      setServiceAvailable(storageAndDatabaseClient.getAvailable());
      setServiceError(storageAndDatabaseClient.getUnavailableReason());
    });
  }, []);
  
  // Verification State
  const [verificationResults, setVerificationResults] = useState<{
    timestamp: string;
    allTestsPassed: boolean;
    results: { testName: string; passed: boolean; message: string }[];
  } | null>(null);
  const [isRunningVerification, setIsRunningVerification] = useState(false);

  // Storage Modal State
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [selectedInstanceId, setSelectedInstanceId] = useState('inst_reg_001');
  const [newSchoolName, setNewSchoolName] = useState('Apex Comprehensive College, Ikeja');
  const [newStrategy, setNewStrategy] = useState<StorageStrategyType>('hybrid');
  const [newPrimaryProvider, setNewPrimaryProvider] = useState<StorageProviderType>('google_drive');
  const [newSecondaryProvider, setNewSecondaryProvider] = useState<StorageProviderType>('google_cloud_storage');
  const [newQuotaGb, setNewQuotaGb] = useState(100);
  const [newRetentionDays, setNewRetentionDays] = useState(2555);
  const [newConnectedEmail, setNewConnectedEmail] = useState('bursar@apexcollege.sch.ng');

  // Database Modal State
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [targetDbInstance, setTargetDbInstance] = useState('inst_greenwood_002');
  const [targetDbSchool, setTargetDbSchool] = useState('Greenwood High School, Abuja');
  const [newDbStrategy, setNewDbStrategy] = useState<DatabaseIsolationStrategy>('dedicated_database');

  // Migration Modal State
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [migSource, setMigSource] = useState<StorageProviderType>('google_cloud_storage');
  const [migTarget, setMigTarget] = useState<StorageProviderType>('google_drive');
  const [migFileCount, setMigFileCount] = useState(850);
  const [isMigrating, setIsMigrating] = useState(false);

  const handleRunVerification = async () => {
    setIsRunningVerification(true);
    try {
      setVerificationResults(await storageAndDatabaseClient.runPhase7VerificationSuite());
    } catch (error) {
      setServiceAvailable(false);
      setServiceError(error instanceof Error ? error.message : 'Storage verification is unavailable.');
    } finally {
      setIsRunningVerification(false);
    }
  };

  const handleSaveStorageConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await storageAndDatabaseClient.configureCustomerStorage(
        selectedInstanceId,
        `cust_${selectedInstanceId}`,
        newSchoolName,
        newStrategy,
        newPrimaryProvider,
        newStrategy === 'hybrid' ? newSecondaryProvider : undefined,
        undefined,
        newQuotaGb,
        newRetentionDays,
        newConnectedEmail
      );
      await storageAndDatabaseClient.syncFromBackend();
      setStorageConfigs(storageAndDatabaseClient.getStorageConfigs());
      setIsStorageModalOpen(false);
    } catch (error) {
      setServiceAvailable(false);
      setServiceError(error instanceof Error ? error.message : 'Storage provisioning is unavailable.');
    }
  };

  const handleSaveDbConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await storageAndDatabaseClient.configureDatabaseIsolation(
        targetDbInstance,
        `cust_${targetDbInstance}`,
        targetDbSchool,
        newDbStrategy
      );
      await storageAndDatabaseClient.syncFromBackend();
      setDatabases(storageAndDatabaseClient.getDatabaseRecords());
      setIsDbModalOpen(false);
    } catch (error) {
      setServiceAvailable(false);
      setServiceError(error instanceof Error ? error.message : 'Database provisioning is unavailable.');
    }
  };

  const handleStartMigration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMigrating(true);
    try {
      await storageAndDatabaseClient.startStorageMigration(
        selectedInstanceId,
        `cust_${selectedInstanceId}`,
        migSource,
        migTarget,
        migFileCount
      );
      await storageAndDatabaseClient.syncFromBackend();
      setMigrationJobs(storageAndDatabaseClient.getMigrationJobs());
      setIsMigrationModalOpen(false);
      setActiveTab('migration');
    } catch (error) {
      setServiceAvailable(false);
      setServiceError(error instanceof Error ? error.message : 'Storage migration is unavailable.');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-100">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-mono text-[10px] font-bold uppercase tracking-wider">
                Historical records
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Database & Customer Storage</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Historical resource records are retained for audit. Provider provisioning and verification are unavailable until integrations are configured.
            </p>
          </div>

          {!serviceAvailable && (
            <div role="status" className="rounded-xl border border-amber-700 bg-amber-950/40 p-4 text-sm text-amber-200">
              Storage and database service unavailable. {serviceError}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsStorageModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Configure Customer Storage</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 flex-wrap">
        <button
          onClick={() => setActiveTab('storage')}
          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeTab === 'storage'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>Historical Storage Records ({storageConfigs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('databases')}
          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeTab === 'databases'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Historical Database Records ({databases.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('placement')}
          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeTab === 'placement'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Hybrid Placement & Policy Rules</span>
        </button>

        <button
          onClick={() => setActiveTab('migration')}
          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeTab === 'migration'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FolderSync className="w-4 h-4" />
          <span>Migration & Recovery Hub ({migrationJobs.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('verification');
            if (!verificationResults) handleRunVerification();
          }}
          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeTab === 'verification'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Phase 7 Verification Suite</span>
        </button>
      </div>

      {/* Tab: Storage Configurations */}
      {activeTab === 'storage' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {storageConfigs.map((cfg) => {
              const usagePercent = Math.min(100, Math.round((cfg.usedStorageGb / cfg.quotaGb) * 100));
              return (
                <div key={cfg.configId} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between hover:border-emerald-500/40 transition-all">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase ${
                        cfg.strategy === 'hybrid' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                        cfg.strategy === 'private_drive' ? 'bg-sky-950 text-sky-300 border border-sky-800' :
                        'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}>
                        {cfg.strategy.replace(/_/g, ' ')}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs font-mono text-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{cfg.evidenceStatus === 'provider_verified' ? cfg.connectionHealth : 'Unverified fixture'}</span>
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white">{cfg.schoolName}</h3>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono truncate">
                        Historical claim (unverified): {cfg.resourceName}
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Primary Provider:</span>
                        <strong className="text-slate-200 capitalize">{cfg.primaryProvider.replace(/_/g, ' ')}</strong>
                      </div>
                      {cfg.secondaryProvider && (
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Secondary Provider:</span>
                          <strong className="text-slate-200 capitalize">{cfg.secondaryProvider.replace(/_/g, ' ')}</strong>
                        </div>
                      )}
                      {cfg.oauthConnectedEmail && (
                        <div className="flex items-center justify-between text-slate-400">
                          <span>OAuth Connected:</span>
                          <span className="text-sky-300 font-mono text-[11px] truncate max-w-[170px]">{cfg.oauthConnectedEmail}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Retention Policy:</span>
                        <span className="text-slate-300 font-mono">{cfg.retentionPolicyDays} days ({Math.round(cfg.retentionPolicyDays / 365)} yrs)</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Token Vault Security:</span>
                        <span className="text-amber-300 font-mono text-[10px] flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>Encryption not verified</span>
                        </span>
                      </div>
                    </div>

                    {/* Quota Progress */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Storage Quota:</span>
                        <span className="font-mono text-slate-300">{cfg.usedStorageGb} GB / {cfg.quotaGb} GB ({usagePercent}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${usagePercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[10px] font-mono">Sync: {new Date(cfg.lastSyncTimestamp).toLocaleTimeString()}</span>
                    <button
                      onClick={() => {
                        setSelectedInstanceId(cfg.instanceId);
                        setIsMigrationModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] flex items-center gap-1.5 transition-colors"
                    >
                      <FolderSync className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Migrate</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: PostgreSQL Databases */}
      {activeTab === 'databases' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Database values below are retained historical records and are not evidence of a live or healthy database.
            </p>
            <button
              onClick={() => setIsDbModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Configure Database Isolation</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {databases.map((db) => (
              <div key={db.databaseId} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] font-bold uppercase">
                      {db.strategy.replace(/_/g, ' ')}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-mono text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{db.evidenceStatus === 'provider_verified' ? db.healthStatus : 'Unverified fixture'}</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white">{db.schoolName}</h3>
                    <p className="text-xs text-slate-400 font-mono">{db.engine} | {db.host}:{db.port}</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Database:</span>
                      <strong className="text-slate-200">{db.databaseName}</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Schema:</span>
                      <span className="text-sky-300">{db.schemaName}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Isolation Model:</span>
                      <span className="text-purple-300 text-[10px]">{db.isolationLevel}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Connection Pool:</span>
                      <span className="text-slate-300">{db.activeConnections} active / {db.maxConnections} max</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Encryption at Rest:</span>
                      <span className="text-amber-300 text-[10px]">Unverified: {db.encryptionAtRest}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>SSL Enforcement:</span>
                      <span className="text-amber-300">{db.sslMode}</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>Storage Used:</span>
                      <span>{db.storageUsageMb} MB / {db.storageLimitMb} MB</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full" 
                        style={{ width: `${Math.round((db.storageUsageMb / db.storageLimitMb) * 100)}%` }} 
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 font-mono">
                  Historical backup claim (unverified): {db.backupSchedule}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Placement & Hybrid Rules */}
      {activeTab === 'placement' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
          <div>
            <h2 className="text-base font-bold text-white mb-1">Document & Media Placement Rules</h2>
            <p className="text-xs text-slate-400">
              Historical placement rules are retained as unverified configuration data; no provider routing is active.
            </p>
          </div>

          <div className="space-y-3">
            {storageConfigs[0]?.placementRules.map((rule) => (
              <div key={rule.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] font-bold uppercase">{rule.category}</span>
                    {rule.encryptionRequired && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-mono text-[10px] font-bold flex items-center gap-1 border border-emerald-800">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Encryption requirement (unverified)</span>
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-white">{rule.categoryLabel}</h4>
                  <p className="text-[11px] text-slate-400">Mandated Retention Period: <strong className="text-slate-200">{rule.retentionDays} days</strong> ({Math.round(rule.retentionDays / 365)} years)</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-xl text-xs font-bold capitalize font-mono ${
                    rule.targetProvider === 'private_drive' 
                      ? 'bg-sky-950 text-sky-300 border border-sky-800' 
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}>
                    {rule.targetProvider.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Migration & Recovery Hub */}
      {activeTab === 'migration' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white mb-1">File Migration & Disaster Recovery</h2>
              <p className="text-xs text-slate-400">
                Migration is unavailable until source and target storage providers are configured.
              </p>
            </div>
            <button
              onClick={() => setIsMigrationModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40"
            >
              <FolderSync className="w-4 h-4" />
              <span>Request Migration</span>
            </button>
          </div>

          <div className="space-y-3">
            {migrationJobs.length === 0 ? (
              <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                No verified migration jobs are recorded. Migration requests remain unavailable until provider operations are configured.
              </div>
            ) : (
              migrationJobs.map((job) => (
                <div key={job.jobId} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{job.jobId}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] uppercase font-bold">
                        {job.status}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      Route: <strong className="text-sky-300">{job.sourceProvider}</strong> <ArrowRight className="w-3 h-3 inline mx-1" /> <strong className="text-emerald-300">{job.targetProvider}</strong>
                    </p>
                    <p className="text-slate-500 text-[10px]">
                      Files processed: {job.processedFiles} / {job.totalFiles}
                    </p>
                  </div>

                  <div className="text-right text-[11px] text-slate-400">
                    <div>Preserve Metadata: <span className="text-emerald-400">True</span></div>
                    <div>Completed: {job.completedAt ? new Date(job.completedAt).toLocaleTimeString() : 'In Progress'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: Verification Suite */}
      {activeTab === 'verification' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white mb-1">Provider Verification Results</h2>
              <p className="text-xs text-slate-400">
                Verification results reflect only checks backed by configured providers and evidence.
              </p>
            </div>
            <button
              onClick={handleRunVerification}
              disabled={isRunningVerification}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40"
            >
              <RefreshCw className={`w-4 h-4 ${isRunningVerification ? 'animate-spin' : ''}`} />
              <span>{isRunningVerification ? 'Executing Checks...' : 'Re-Run Verification Suite'}</span>
            </button>
          </div>

          {verificationResults && (
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                verificationResults.allTestsPassed 
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200' 
                  : 'bg-rose-950/40 border-rose-800 text-rose-200'
              }`}>
                <div className="flex items-center gap-3">
                  {verificationResults.allTestsPassed
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    : <AlertTriangle className="w-5 h-5 text-amber-300" />}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider">
                      Verification status: {verificationResults.allTestsPassed ? 'Passed' : 'Not verified'}
                    </h3>
                    <p className="text-[11px] text-slate-300">
                      {verificationResults.allTestsPassed
                        ? 'All reported checks passed with provider evidence.'
                        : 'One or more checks are unavailable or lack verification evidence.'}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-xs">{new Date(verificationResults.timestamp).toLocaleTimeString()}</span>
              </div>

              <div className="space-y-3">
                {verificationResults.results.map((t, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                    <div className={`p-1.5 rounded-xl shrink-0 mt-0.5 ${t.passed
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'}`}>
                      {t.passed ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{t.testName}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{t.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Storage Configuration Modal */}
      {isStorageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span>Request Customer-Selectable Storage</span>
              </h3>
              <button onClick={() => setIsStorageModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStorageConfig} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">School / Institution</label>
                <input
                  type="text"
                  required
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Storage Strategy Choice</label>
                <select
                  value={newStrategy}
                  onChange={(e) => setNewStrategy(e.target.value as StorageStrategyType)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="private_drive">A. Private Drive (Customer-owned Google Drive / OneDrive)</option>
                  <option value="platform_storage">B. Platform Storage (GCS provider request)</option>
                  <option value="hybrid">C. Hybrid (Private Drive for Legal/Transcripts + GCS for Media)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Primary Provider</label>
                  <select
                    value={newPrimaryProvider}
                    onChange={(e) => setNewPrimaryProvider(e.target.value as StorageProviderType)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="google_drive">Google Drive</option>
                    <option value="onedrive">Microsoft OneDrive</option>
                    <option value="dropbox">Dropbox</option>
                    <option value="google_cloud_storage">Google Cloud Storage</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Secondary Provider</label>
                  <select
                    value={newSecondaryProvider}
                    onChange={(e) => setNewSecondaryProvider(e.target.value as StorageProviderType)}
                    disabled={newStrategy !== 'hybrid'}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  >
                    <option value="google_cloud_storage">Google Cloud Storage</option>
                    <option value="google_drive">Google Drive</option>
                    <option value="onedrive">OneDrive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">OAuth Connected Account / Admin Email</label>
                <input
                  type="email"
                  required
                  value={newConnectedEmail}
                  onChange={(e) => setNewConnectedEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Quota (GB)</label>
                  <input
                    type="number"
                    value={newQuotaGb}
                    onChange={(e) => setNewQuotaGb(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Retention Policy (Days)</label>
                  <input
                    type="number"
                    value={newRetentionDays}
                    onChange={(e) => setNewRetentionDays(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsStorageModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                >
                  Submit Storage Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Database Isolation Modal */}
      {isDbModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Request Database Isolation</span>
              </h3>
              <button onClick={() => setIsDbModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDbConfig} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">School Name</label>
                <input
                  type="text"
                  required
                  value={targetDbSchool}
                  onChange={(e) => setTargetDbSchool(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Isolation Strategy</label>
                <select
                  value={newDbStrategy}
                  onChange={(e) => setNewDbStrategy(e.target.value as DatabaseIsolationStrategy)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="shared_schema_isolated">A. Shared PostgreSQL with Schema Namespace & RLS Isolation</option>
                  <option value="dedicated_database">B. Dedicated Database Resources on Cloud SQL</option>
                  <option value="dedicated_customer_gcp_project">C. Dedicated Database Infrastructure in Customer GCP Project</option>
                </select>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="text-slate-300 font-bold">Current availability:</div>
                <p>• Database provisioning is unavailable; no provider is configured.</p>
                <p>• Database connection, encryption, and backup claims are not verified.</p>
                <p>• Submitting this request will not provision a database.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDbModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                >
                  Submit Database Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Migration Modal */}
      {isMigrationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FolderSync className="w-4 h-4 text-emerald-400" />
                <span>Storage Migration Request</span>
              </h3>
              <button onClick={() => setIsMigrationModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStartMigration} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Source Storage Provider</label>
                <select
                  value={migSource}
                  onChange={(e) => setMigSource(e.target.value as StorageProviderType)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="google_cloud_storage">Platform Storage (GCS)</option>
                  <option value="google_drive">Private Drive (Google Drive)</option>
                  <option value="onedrive">Private Drive (OneDrive)</option>
                  <option value="dropbox">Private Drive (Dropbox)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Destination Storage Provider</label>
                <select
                  value={migTarget}
                  onChange={(e) => setMigTarget(e.target.value as StorageProviderType)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="google_drive">Private Drive (Google Drive)</option>
                  <option value="google_cloud_storage">Platform Storage (GCS)</option>
                  <option value="onedrive">Private Drive (OneDrive)</option>
                  <option value="dropbox">Private Drive (Dropbox)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Estimated Document & Media Files</label>
                <input
                  type="number"
                  value={migFileCount}
                  onChange={(e) => setMigFileCount(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p>• File and ACL preservation has not been tested.</p>
                <p>• Migration requests remain unavailable until provider operations are configured.</p>
                <p>• Credential encryption is not verified for any provider operation.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMigrationModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMigrating}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                >
                  {isMigrating ? 'Migrating Files...' : 'Execute Migration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
