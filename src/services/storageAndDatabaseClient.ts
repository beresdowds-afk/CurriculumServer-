import {
  DatabaseInstanceRecord,
  DatabaseIsolationStrategy,
  StorageConfigRecord,
  StorageMigrationJob,
  StoragePlacementRule,
  StorageProviderType,
  StorageStrategyType
} from '../types/storageAndDatabase';
import { unifiedApiClient } from './unifiedApiClient';

export interface ProviderUnavailableResult {
  success: false;
  status: 'unavailable';
  code: 'PROVIDER_UNAVAILABLE';
  message: string;
}

export class StorageAndDatabaseClient {
  private static instance: StorageAndDatabaseClient;
  private databases: DatabaseInstanceRecord[] = [];
  private storageConfigs: StorageConfigRecord[] = [];
  private migrationJobs: StorageMigrationJob[] = [];
  private unavailableReason = 'Storage and database service has not connected.';

  private constructor() {}

  public static getInstance(): StorageAndDatabaseClient {
    if (!StorageAndDatabaseClient.instance) {
      StorageAndDatabaseClient.instance = new StorageAndDatabaseClient();
    }
    return StorageAndDatabaseClient.instance;
  }

  public async syncFromBackend(): Promise<void> {
    try {
      const [databaseResponse, storage] = await Promise.all([
        unifiedApiClient.getDatabases(),
        unifiedApiClient.getStorageConfigs()
      ]);
      this.databases = databaseResponse.databases;
      this.storageConfigs = storage.storageConfigs;
      this.migrationJobs = storage.migrationJobs;
      this.unavailableReason = databaseResponse.availability === 'available' && storage.availability === 'available'
        ? ''
        : 'Storage or database providers are not configured; retained records are unverified.';
    } catch (error) {
      this.databases = [];
      this.storageConfigs = [];
      this.migrationJobs = [];
      this.unavailableReason = error instanceof Error ? error.message : 'Storage and database service is unavailable.';
    }
  }

  public getAvailable(): boolean {
    return this.unavailableReason === '';
  }

  public getUnavailableReason(): string {
    return this.unavailableReason;
  }

  public getDatabaseRecords(): DatabaseInstanceRecord[] {
    return this.databases;
  }

  public getStorageConfigs(): StorageConfigRecord[] {
    return this.storageConfigs;
  }

  public getMigrationJobs(): StorageMigrationJob[] {
    return this.migrationJobs;
  }

  public async configureDatabaseIsolation(
    instanceId: string,
    tenantId: string,
    schoolName: string,
    strategy: DatabaseIsolationStrategy
  ): Promise<unknown> {
    return unifiedApiClient.configureDatabaseIsolation({ instanceId, tenantId, schoolName, strategy });
  }

  public async configureCustomerStorage(
    instanceId: string,
    tenantId: string,
    schoolName: string,
    strategy: StorageStrategyType,
    primaryProvider: StorageProviderType,
    secondaryProvider?: StorageProviderType,
    _customCredentialsRef?: string,
    quotaGb: number = 50,
    retentionDays: number = 1095,
    oauthConnectedEmail?: string,
    placementRules?: StoragePlacementRule[]
  ): Promise<unknown> {
    return unifiedApiClient.configureCustomerStorage({
      instanceId,
      tenantId,
      schoolName,
      strategy,
      primaryProvider,
      secondaryProvider,
      quotaGb,
      retentionDays,
      oauthConnectedEmail,
      placementRules
    });
  }

  public async startStorageMigration(
    instanceId: string,
    tenantId: string,
    sourceProvider: StorageProviderType,
    targetProvider: StorageProviderType,
    totalFiles: number = 500
  ): Promise<unknown> {
    return unifiedApiClient.startStorageMigration({ instanceId, tenantId, sourceProvider, targetProvider, totalFiles });
  }

  public async runPhase7VerificationSuite(): Promise<{
    timestamp: string;
    allTestsPassed: boolean;
    results: { testName: string; passed: boolean; message: string }[];
  }> {
    return unifiedApiClient.getStorageVerification();
  }
}

export const storageAndDatabaseClient = StorageAndDatabaseClient.getInstance();
