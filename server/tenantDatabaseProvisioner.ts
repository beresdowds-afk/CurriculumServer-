import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { DatabasePool } from './db/postgres';
import { withControlPlaneTransaction, createVerifiedTenantPrincipal } from './db/tenantContext';
import {
  assertPiamApprovalMatchesContract,
  hashProvisioningContract,
  PIAM_VERIFICATION_STATUSES,
  UnavailablePiamVerificationAdapter,
  type PiamVerificationAdapter,
  type PiamVerificationResult
} from './piamVerificationAdapter';

export type ApprovedDatabaseIsolationStrategy =
  | 'shared_schema_isolated'
  | 'dedicated_database'
  | 'dedicated_customer_gcp_project';

export type ApprovedStorageStrategy = 'platform_storage' | 'private_drive' | 'hybrid';

export interface TenantProvisioningContract {
  version: 1;
  contractId: string;
  approvalId: string;
  tenantId: string;
  applicationInstanceId: string;
  issuer: string;
  audience: 'curriculum-tenant-database-provisioner';
  issuedAt: string;
  expiresAt: string;
  databaseStrategy: ApprovedDatabaseIsolationStrategy;
  storageStrategy: ApprovedStorageStrategy;
  region: string;
  customerProjectId?: string;
}

const verifiedContractMarker = Symbol('verified-tenant-provisioning-contract');
export type VerifiedTenantProvisioningContract = TenantProvisioningContract & {
  readonly [verifiedContractMarker]: true;
};

export interface SignedTenantProvisioningContract {
  payload: TenantProvisioningContract;
  signature: string;
}

export interface ApprovedProvisioningDecision {
  approvalId: string;
  tenantId: string;
  applicationInstanceId: string;
  approvalSubject: string;
  decision: 'approved' | 'rejected';
  databaseStrategy: ApprovedDatabaseIsolationStrategy;
  storageStrategy: ApprovedStorageStrategy;
  region: string;
  customerProjectId: string | null;
}

export interface ProvisioningResource {
  providerResourceId: string;
  host: string;
  port: number;
  databaseName: string;
  schemaName: string;
  runtimeRoleName: string;
  secretManagerReference: string;
  evidence: Record<string, unknown>;
}

export interface StorageResource {
  providerConfiguration: Record<string, unknown>;
  evidence: Record<string, unknown>;
}

export interface ProvisioningRepository {
  findApprovedDecision(contract: VerifiedTenantProvisioningContract): Promise<ApprovedProvisioningDecision | undefined>;
  recordPiamVerification(input: {
    contract: VerifiedTenantProvisioningContract;
    contractHash: string;
    status: 'verified' | 'unavailable' | 'pending' | 'rejected' | 'expired' | 'revoked' | 'reused' | 'invalid';
    verifier: string;
    evidenceReference?: string;
    evidenceHash?: string;
    approverIdentity?: string;
    authenticationAssurance?: 'mfa_verified';
    requesterApproverSeparated?: boolean;
    consumed?: boolean;
    reason?: string;
  }): Promise<void>;
  begin(contract: VerifiedTenantProvisioningContract, requestHash: string): Promise<{
    operationId: string;
    attemptNumber: number;
    status: 'pending' | 'running' | 'retryable_failure' | 'failed' | 'ready';
    claimed: boolean;
  }>;
  recordAttempt(input: {
    contract: VerifiedTenantProvisioningContract;
    operationId: string;
    attemptNumber: number;
    stage: 'database' | 'storage' | 'migration' | 'verification';
    status: 'running' | 'succeeded' | 'retryable_failure' | 'failed';
    providerOperationId?: string;
    errorCode?: string;
    evidence?: Record<string, unknown>;
  }): Promise<void>;
  recordDatabaseResource(
    contract: VerifiedTenantProvisioningContract,
    operationId: string,
    resource: ProvisioningResource
  ): Promise<void>;
  recordStorageResource(
    contract: VerifiedTenantProvisioningContract,
    operationId: string,
    resource: StorageResource
  ): Promise<void>;
  recordVerificationEvidence(input: {
    contract: VerifiedTenantProvisioningContract;
    operationId: string;
    resourceKind: 'database' | 'storage';
    providerResourceId: string;
    verifier: string;
    checks: Record<string, unknown>;
  }): Promise<void>;
  complete(contract: VerifiedTenantProvisioningContract, operationId: string): Promise<void>;
  fail(contract: VerifiedTenantProvisioningContract, operationId: string, errorCode: string, retryable: boolean): Promise<void>;
}

export interface TenantProvisioningProviders {
  provisionDatabase(input: {
    contract: TenantProvisioningContract;
    idempotencyKey: string;
  }): Promise<ProvisioningResource>;
  provisionStorage(input: {
    contract: TenantProvisioningContract;
    idempotencyKey: string;
  }): Promise<StorageResource>;
  runMigrations(input: {
    contract: TenantProvisioningContract;
    resource: ProvisioningResource;
    idempotencyKey: string;
  }): Promise<{ migrationVersions: number[]; evidence: Record<string, unknown> }>;
  verifyDatabase(input: {
    contract: TenantProvisioningContract;
    resource: ProvisioningResource;
  }): Promise<{ providerResourceId: string; verifier: string; checks: Record<string, unknown> }>;
  verifyStorage(input: {
    contract: TenantProvisioningContract;
    resource: StorageResource;
  }): Promise<{ providerResourceId: string; verifier: string; checks: Record<string, unknown> }>;
}

export class TenantProvisioningError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable = false
  ) {
    super(message);
    this.name = 'TenantProvisioningError';
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STRATEGIES = new Set<ApprovedDatabaseIsolationStrategy>([
  'shared_schema_isolated', 'dedicated_database', 'dedicated_customer_gcp_project'
]);
const STORAGE_STRATEGIES = new Set<ApprovedStorageStrategy>([
  'platform_storage', 'private_drive', 'hybrid'
]);
const DATABASE_CHECKS = [
  'connected', 'postgresql16', 'runtimeNonOwner', 'runtimeNoSuperuser',
  'runtimeNoBypassRls', 'rlsEnforced'
] as const;
const PLATFORM_STORAGE_CHECKS = [
  'bucketAccessible', 'regionApproved', 'private', 'uniformBucketLevelAccess',
  'publicAccessPrevention', 'encryption', 'retention', 'runtimePermissions'
] as const;
const DELEGATED_STORAGE_CHECKS = ['delegatedAuthorization', 'providerAccessible'] as const;

function serializedPayload(payload: TenantProvisioningContract): string {
  return JSON.stringify(payload);
}

function operationRequestHash(contract: TenantProvisioningContract): string {
  return createHash('sha256').update(JSON.stringify({
    version: contract.version,
    contractId: contract.contractId,
    approvalId: contract.approvalId,
    tenantId: contract.tenantId,
    applicationInstanceId: contract.applicationInstanceId,
    issuer: contract.issuer,
    audience: contract.audience,
    databaseStrategy: contract.databaseStrategy,
    storageStrategy: contract.storageStrategy,
    region: contract.region,
    customerProjectId: contract.customerProjectId ?? null
  })).digest('hex');
}

export function signTenantProvisioningContract(
  payload: TenantProvisioningContract,
  signingKey: string
): string {
  if (signingKey.length < 32) {
    throw new TenantProvisioningError('CONTRACT_SIGNING_UNAVAILABLE', 'Provisioning contract signing is not configured.');
  }
  return createHmac('sha256', signingKey).update(serializedPayload(payload)).digest('hex');
}

export function verifyTenantProvisioningContract(
  envelope: SignedTenantProvisioningContract,
  options: { signingKey: string; expectedIssuer: string; now?: number }
): VerifiedTenantProvisioningContract {
  const { payload, signature } = envelope || {};
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
      typeof signature !== 'string' || !/^[0-9a-f]{64}$/.test(signature)) {
    throw new TenantProvisioningError('INVALID_CONTRACT', 'Provisioning contract is malformed.');
  }
  const expectedSignature = signTenantProvisioningContract(payload, options.signingKey);
  const supplied = Buffer.from(signature, 'hex');
  const expected = Buffer.from(expectedSignature, 'hex');
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new TenantProvisioningError('INVALID_CONTRACT_SIGNATURE', 'Provisioning contract signature is invalid.');
  }
  const now = options.now ?? Date.now();
  const issuedAt = Date.parse(payload.issuedAt);
  const expiresAt = Date.parse(payload.expiresAt);
  if (!options.expectedIssuer.trim() || payload.version !== 1 || !UUID.test(payload.contractId) || !UUID.test(payload.approvalId) ||
      !UUID.test(payload.tenantId) || !UUID.test(payload.applicationInstanceId) ||
      payload.issuer !== options.expectedIssuer ||
      payload.audience !== 'curriculum-tenant-database-provisioner' ||
      !Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) ||
      issuedAt > now + 30_000 || expiresAt <= now || expiresAt <= issuedAt ||
      expiresAt - issuedAt > 10 * 60_000 ||
      !STRATEGIES.has(payload.databaseStrategy) ||
      !STORAGE_STRATEGIES.has(payload.storageStrategy) ||
      typeof payload.region !== 'string' || !/^[a-z]+-[a-z]+\d$/.test(payload.region) ||
      (payload.customerProjectId !== undefined &&
        !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(payload.customerProjectId))) {
    throw new TenantProvisioningError('INVALID_CONTRACT', 'Provisioning contract claims are invalid or expired.');
  }
  if (payload.databaseStrategy === 'dedicated_customer_gcp_project' && !payload.customerProjectId) {
    throw new TenantProvisioningError('INVALID_CONTRACT', 'Dedicated-project provisioning requires an approved project ID.');
  }
  const verified = { ...payload };
  Object.defineProperty(verified, verifiedContractMarker, { value: true });
  return Object.freeze(verified) as VerifiedTenantProvisioningContract;
}

export class TenantDatabaseProvisioningService {
  constructor(
    private readonly repository: ProvisioningRepository,
    private readonly providers: TenantProvisioningProviders,
    private readonly contractOptions: { signingKey: string; expectedIssuer: string },
    private readonly piam: PiamVerificationAdapter = new UnavailablePiamVerificationAdapter()
  ) {}

  async execute(envelope: SignedTenantProvisioningContract): Promise<{
    operationId: string;
    status: 'ready' | 'retryable_failure' | 'failed';
    attemptNumber: number;
  }> {
    const contract = verifyTenantProvisioningContract(envelope, this.contractOptions);
    const decision = await this.repository.findApprovedDecision(contract);
    if (!decision || decision.decision !== 'approved' ||
        decision.approvalId !== contract.approvalId ||
        decision.tenantId !== contract.tenantId ||
        decision.applicationInstanceId !== contract.applicationInstanceId ||
        decision.approvalSubject !== contract.issuer ||
        decision.databaseStrategy !== contract.databaseStrategy ||
        decision.storageStrategy !== contract.storageStrategy ||
        decision.region !== contract.region ||
        decision.customerProjectId !== (contract.customerProjectId ?? null)) {
      throw new TenantProvisioningError('APPROVAL_NOT_VERIFIED', 'A matching server-verified provisioning approval is required.');
    }
    const contractHash = hashProvisioningContract(contract);
    let piamResult: PiamVerificationResult;
    try {
      piamResult = await this.piam.verifyAndConsume({
        approvalId: contract.approvalId,
        contractHash,
        contract,
        operation: 'tenant_database_storage_provisioning'
      });
    } catch {
      await this.repository.recordPiamVerification({
        contract, contractHash, status: 'unavailable',
        verifier: this.piam.constructor.name || 'configured-adapter',
        reason: 'verification_unavailable'
      });
      throw new TenantProvisioningError(
        'PIAM_UNAVAILABLE',
        'Independent PIAM approval verification is unavailable or invalid.'
      );
    }
    try {
      assertPiamApprovalMatchesContract({
        approvalId: contract.approvalId,
        contractHash,
        contract,
        operation: 'tenant_database_storage_provisioning'
      }, piamResult);
    } catch (error) {
      const responseStatus = piamResult && PIAM_VERIFICATION_STATUSES.includes(piamResult.status)
        ? piamResult.status
        : 'invalid';
      const code = responseStatus === 'verified'
        ? 'invalid'
        : responseStatus === 'unavailable'
          ? 'unavailable'
          : responseStatus;
      await this.repository.recordPiamVerification({
        contract, contractHash, status: code,
        verifier: this.piam.constructor.name || 'configured-adapter',
        evidenceReference: piamResult?.evidenceReference,
        evidenceHash: piamResult?.evidenceHash,
        reason: 'approval_verification_failed'
      });
      throw new TenantProvisioningError(
        code === 'unavailable' ? 'PIAM_UNAVAILABLE' : `PIAM_APPROVAL_${code.toUpperCase()}`,
        'Independent PIAM approval verification is unavailable or invalid.'
      );
    }
    await this.repository.recordPiamVerification({
      contract, contractHash, status: 'verified',
      verifier: this.piam.constructor.name || 'configured-adapter',
      evidenceReference: piamResult.evidenceReference,
      evidenceHash: piamResult.evidenceHash,
      approverIdentity: piamResult.approverIdentity,
      authenticationAssurance: piamResult.authenticationAssurance,
      requesterApproverSeparated: piamResult.requesterApproverSeparated,
      consumed: piamResult.consumed
    });

    const requestHash = operationRequestHash(contract);
    const operation = await this.repository.begin(contract, requestHash);
    if (operation.status === 'ready') {
      return { operationId: operation.operationId, status: 'ready', attemptNumber: operation.attemptNumber };
    }
    if (operation.status === 'running' && !operation.claimed) {
      throw new TenantProvisioningError('OPERATION_IN_PROGRESS', 'This idempotent provisioning operation is already running.', true);
    }
    if (operation.status === 'failed') {
      throw new TenantProvisioningError('OPERATION_FAILED', 'This operation is terminally failed and requires a new approval.');
    }

    const idempotencyKey = contract.contractId;
    let activeStage: 'database' | 'storage' | 'migration' | 'verification' = 'database';
    try {
      await this.repository.recordAttempt({
        contract, operationId: operation.operationId,
        attemptNumber: operation.attemptNumber, stage: activeStage, status: 'running'
      });
      const database = await this.providers.provisionDatabase({ contract, idempotencyKey });
      validateDatabaseResource(database);
      await this.repository.recordDatabaseResource(contract, operation.operationId, database);
      await this.repository.recordAttempt({
        contract, operationId: operation.operationId,
        attemptNumber: operation.attemptNumber, stage: activeStage, status: 'succeeded',
        providerOperationId: database.providerResourceId, evidence: database.evidence
      });

      activeStage = 'storage';
      await this.repository.recordAttempt({
        contract, operationId: operation.operationId,
        attemptNumber: operation.attemptNumber, stage: activeStage, status: 'running'
      });
      const storage = await this.providers.provisionStorage({ contract, idempotencyKey });
      validateStorageResource(storage);
      await this.repository.recordStorageResource(contract, operation.operationId, storage);
      await this.repository.recordAttempt({
        contract, operationId: operation.operationId,
        attemptNumber: operation.attemptNumber, stage: activeStage, status: 'succeeded',
        evidence: storage.evidence
      });

      activeStage = 'migration';
      await this.repository.recordAttempt({
        contract, operationId: operation.operationId,
        attemptNumber: operation.attemptNumber, stage: activeStage, status: 'running'
      });
      const migration = await this.providers.runMigrations({
        contract, resource: database, idempotencyKey
      });
      if (!Array.isArray(migration.migrationVersions) || migration.migrationVersions.length === 0 ||
          migration.migrationVersions.some(version => !Number.isSafeInteger(version) || version < 1) ||
          containsCredential(migration.evidence)) {
        throw new TenantProvisioningError('MIGRATION_UNVERIFIED', 'The migration runner returned no applied migration evidence.');
      }
      await this.repository.recordAttempt({
        contract, operationId: operation.operationId,
        attemptNumber: operation.attemptNumber, stage: activeStage, status: 'succeeded',
        evidence: { ...migration.evidence, migrationVersions: migration.migrationVersions }
      });

      activeStage = 'verification';
      await this.repository.recordAttempt({
        contract, operationId: operation.operationId,
        attemptNumber: operation.attemptNumber, stage: activeStage, status: 'running'
      });
      const [databaseEvidence, storageEvidence] = await Promise.all([
        this.providers.verifyDatabase({ contract, resource: database }),
        this.providers.verifyStorage({ contract, resource: storage })
      ]);
      if (databaseEvidence.providerResourceId !== database.providerResourceId || !databaseEvidence.verifier ||
          !storageEvidence.providerResourceId || !storageEvidence.verifier ||
          !allChecksPassed(databaseEvidence.checks, DATABASE_CHECKS) ||
          !allChecksPassed(storageEvidence.checks, [
            ...(contract.storageStrategy !== 'private_drive' ? PLATFORM_STORAGE_CHECKS : []),
            ...(contract.storageStrategy !== 'platform_storage' ? DELEGATED_STORAGE_CHECKS : [])
          ]) ||
          containsCredential(databaseEvidence) || containsCredential(storageEvidence)) {
        throw new TenantProvisioningError('RESOURCE_UNVERIFIED', 'Provider verification did not return resource evidence.');
      }
      await this.repository.recordVerificationEvidence({
        contract, operationId: operation.operationId,
        resourceKind: 'database', ...databaseEvidence
      });
      await this.repository.recordVerificationEvidence({
        contract, operationId: operation.operationId,
        resourceKind: 'storage', ...storageEvidence
      });
      await this.repository.recordAttempt({
        contract, operationId: operation.operationId,
        attemptNumber: operation.attemptNumber, stage: activeStage, status: 'succeeded',
        evidence: { database: databaseEvidence, storage: storageEvidence }
      });
      await this.repository.complete(contract, operation.operationId);
      return { operationId: operation.operationId, status: 'ready', attemptNumber: operation.attemptNumber };
    } catch (error) {
      const failure = error instanceof TenantProvisioningError
        ? error
        : new TenantProvisioningError('PROVIDER_OPERATION_FAILED', 'A tenant provisioning provider operation failed; operator reconciliation is required.');
      await this.repository.recordAttempt({
        contract, operationId: operation.operationId,
        attemptNumber: operation.attemptNumber, stage: activeStage,
        status: failure.retryable ? 'retryable_failure' : 'failed', errorCode: failure.code
      });
      await this.repository.fail(contract, operation.operationId, failure.code, failure.retryable);
      return {
        operationId: operation.operationId,
        status: failure.retryable ? 'retryable_failure' : 'failed',
        attemptNumber: operation.attemptNumber
      };
    }
  }
}

export class PostgresProvisioningRepository implements ProvisioningRepository {
  constructor(private readonly pool: DatabasePool) {}

  async findApprovedDecision(contract: VerifiedTenantProvisioningContract): Promise<ApprovedProvisioningDecision | undefined> {
    return withControlPlaneTransaction(this.pool, createProvisioningControlPlanePrincipal(contract), async client => {
      const result = await client.query<ApprovedProvisioningDecision>(
        `SELECT approval.id AS "approvalId", approval.tenant_id AS "tenantId",
                approval.application_instance_id AS "applicationInstanceId",
                approval.approval_subject AS "approvalSubject", approval.decision,
                approval.database_strategy AS "databaseStrategy", approval.storage_strategy AS "storageStrategy",
                approval.approved_region AS region, approval.approved_customer_project_id AS "customerProjectId"
         FROM production.tenant_provisioning_approvals approval
         JOIN production.tenants tenant ON tenant.id = approval.tenant_id
         JOIN production.application_instances instance
           ON instance.tenant_id = approval.tenant_id AND instance.id = approval.application_instance_id
         WHERE approval.tenant_id = $1 AND approval.application_instance_id = $2
           AND tenant.status IN ('pending', 'approved')
           AND instance.status NOT IN ('suspended', 'decommissioning', 'decommissioned')
         ORDER BY approval.created_at DESC, approval.id DESC LIMIT 1`,
        [contract.tenantId, contract.applicationInstanceId]
      );
      return result.rows[0];
    });
  }

  async recordPiamVerification(input: {
    contract: VerifiedTenantProvisioningContract;
    contractHash: string;
    status: 'verified' | 'unavailable' | 'pending' | 'rejected' | 'expired' | 'revoked' | 'reused' | 'invalid';
    verifier: string;
    evidenceReference?: string;
    evidenceHash?: string;
    approverIdentity?: string;
    authenticationAssurance?: 'mfa_verified';
    requesterApproverSeparated?: boolean;
    consumed?: boolean;
    reason?: string;
  }): Promise<void> {
    await withControlPlaneTransaction(this.pool, createProvisioningControlPlanePrincipal(input.contract), async client => {
      await client.query(
        `INSERT INTO production.tenant_provisioning_authorization_checks
           (tenant_id, application_instance_id, approval_id, contract_id, contract_version,
            contract_hash, operation, target_project_id, database_strategy, storage_strategy,
            approved_region, verification_status, verifier, evidence_reference, evidence_hash,
            approver_identity, authentication_assurance, requester_approver_separated,
            consumed, safe_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                 $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
        [input.contract.tenantId, input.contract.applicationInstanceId, input.contract.approvalId,
          input.contract.contractId, input.contract.version, input.contractHash,
          'tenant_database_storage_provisioning', input.contract.customerProjectId ?? null,
          input.contract.databaseStrategy, input.contract.storageStrategy, input.contract.region,
          input.status, input.verifier, input.evidenceReference ?? null, input.evidenceHash ?? null,
          input.approverIdentity ?? null, input.authenticationAssurance ?? null,
          input.requesterApproverSeparated ?? null, input.consumed ?? null, input.reason ?? null]
      );
    });
  }

  async begin(contract: VerifiedTenantProvisioningContract, requestHash: string): Promise<{
    operationId: string;
    attemptNumber: number;
    status: 'pending' | 'running' | 'retryable_failure' | 'failed' | 'ready';
    claimed: boolean;
  }> {
    return withControlPlaneTransaction(this.pool, createProvisioningControlPlanePrincipal(contract), async client => {
      const result = await client.query<{
        id: string; attempt_count: number;
        status: 'pending' | 'running' | 'retryable_failure' | 'failed' | 'ready';
        request_hash: string;
        claimed: boolean;
      }>(
        `INSERT INTO production.tenant_provisioning_operations
           (tenant_id, application_instance_id, approval_id, idempotency_key, request_hash, status, attempt_count)
         VALUES ($1, $2, $3, $4, $5, 'running', 1)
         ON CONFLICT (idempotency_key) DO UPDATE SET
           attempt_count = production.tenant_provisioning_operations.attempt_count + 1,
           status = 'running',
           updated_at = now()
         WHERE production.tenant_provisioning_operations.status = 'retryable_failure'
           AND production.tenant_provisioning_operations.request_hash = EXCLUDED.request_hash
         RETURNING id, attempt_count, status, request_hash, true AS claimed`,
        [contract.tenantId, contract.applicationInstanceId, contract.approvalId, contract.contractId, requestHash]
      );
      let operation = result.rows[0];
      if (!operation) {
        const existing = await client.query<{
          id: string; attempt_count: number;
          status: 'pending' | 'running' | 'retryable_failure' | 'failed' | 'ready';
          request_hash: string;
        }>(
          `SELECT id, attempt_count, status, request_hash
           FROM production.tenant_provisioning_operations WHERE idempotency_key = $1`,
          [contract.contractId]
        );
        operation = { ...existing.rows[0], claimed: false };
      }
      if (!operation.id) {
        throw new TenantProvisioningError('OPERATION_PERSISTENCE_FAILED', 'The provisioning operation could not be persisted.');
      }
      if (operation.request_hash !== requestHash) {
        throw new TenantProvisioningError('IDEMPOTENCY_CONFLICT', 'The idempotency key was already used for a different contract.');
      }
      return {
        operationId: operation.id,
        attemptNumber: operation.attempt_count,
        status: operation.status,
        claimed: operation.claimed
      };
    });
  }

  async recordAttempt(input: {
    contract: VerifiedTenantProvisioningContract; operationId: string; attemptNumber: number;
    stage: 'database' | 'storage' | 'migration' | 'verification';
    status: 'running' | 'succeeded' | 'retryable_failure' | 'failed';
    providerOperationId?: string; errorCode?: string; evidence?: Record<string, unknown>;
  }): Promise<void> {
    await withControlPlaneTransaction(this.pool, createProvisioningControlPlanePrincipal(input.contract), async client => {
      await client.query(
        `INSERT INTO production.tenant_provisioning_attempts
           (tenant_id, operation_id, attempt_number, stage, status,
            provider_operation_id, error_code, evidence, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb,
                 CASE WHEN $5 = 'running' THEN NULL ELSE now() END)
         ON CONFLICT (tenant_id, operation_id, attempt_number, stage) DO UPDATE SET
           status = EXCLUDED.status,
           provider_operation_id = COALESCE(EXCLUDED.provider_operation_id, production.tenant_provisioning_attempts.provider_operation_id),
           error_code = EXCLUDED.error_code,
           evidence = production.tenant_provisioning_attempts.evidence || EXCLUDED.evidence,
           completed_at = EXCLUDED.completed_at`,
        [input.contract.tenantId, input.operationId, input.attemptNumber, input.stage, input.status,
          input.providerOperationId ?? null, input.errorCode ?? null, JSON.stringify(input.evidence ?? {})]
      );
    });
  }

  async recordDatabaseResource(contract: VerifiedTenantProvisioningContract, operationId: string, resource: ProvisioningResource): Promise<void> {
    await withControlPlaneTransaction(this.pool, createProvisioningControlPlanePrincipal(contract), async client => {
      await client.query(
        `INSERT INTO production.tenant_database_resources
           (tenant_id, application_instance_id, operation_id, database_strategy, engine,
            host, port, database_name, schema_name, runtime_role_name,
            secret_manager_reference, lifecycle_state, resource_evidence)
         VALUES ($1, $2, $3, $4, 'PostgreSQL 16', $5, $6, $7, $8, $9, $10, 'provisioning', $11::jsonb)
         ON CONFLICT (tenant_id, application_instance_id) DO UPDATE SET
           operation_id = EXCLUDED.operation_id, database_strategy = EXCLUDED.database_strategy,
           host = EXCLUDED.host, port = EXCLUDED.port, database_name = EXCLUDED.database_name,
           schema_name = EXCLUDED.schema_name, runtime_role_name = EXCLUDED.runtime_role_name,
           secret_manager_reference = EXCLUDED.secret_manager_reference,
           lifecycle_state = 'provisioning', resource_evidence = EXCLUDED.resource_evidence,
           updated_at = now()`,
        [contract.tenantId, contract.applicationInstanceId, operationId, contract.databaseStrategy,
          resource.host, resource.port, resource.databaseName, resource.schemaName,
          resource.runtimeRoleName, resource.secretManagerReference,
          JSON.stringify({ ...resource.evidence, providerResourceId: resource.providerResourceId })]
      );
    });
  }

  async recordStorageResource(contract: VerifiedTenantProvisioningContract, operationId: string, resource: StorageResource): Promise<void> {
    await withControlPlaneTransaction(this.pool, createProvisioningControlPlanePrincipal(contract), async client => {
      await client.query(
        `INSERT INTO production.tenant_storage_configurations
           (tenant_id, application_instance_id, operation_id, storage_strategy,
            provider_configuration, lifecycle_state, resource_evidence)
         VALUES ($1, $2, $3, $4, $5::jsonb, 'provisioning', $6::jsonb)
         ON CONFLICT (tenant_id, application_instance_id) DO UPDATE SET
           operation_id = EXCLUDED.operation_id, storage_strategy = EXCLUDED.storage_strategy,
           provider_configuration = EXCLUDED.provider_configuration,
           lifecycle_state = 'provisioning', resource_evidence = EXCLUDED.resource_evidence,
           updated_at = now()`,
        [contract.tenantId, contract.applicationInstanceId, operationId, contract.storageStrategy,
          JSON.stringify(resource.providerConfiguration), JSON.stringify(resource.evidence)]
      );
    });
  }

  async recordVerificationEvidence(input: {
    contract: VerifiedTenantProvisioningContract; operationId: string; resourceKind: 'database' | 'storage';
    providerResourceId: string; verifier: string; checks: Record<string, unknown>;
  }): Promise<void> {
    await withControlPlaneTransaction(this.pool, createProvisioningControlPlanePrincipal(input.contract), async client => {
      await client.query(
        `INSERT INTO production.tenant_provisioning_verification_evidence
           (tenant_id, operation_id, resource_kind, provider_resource_id, verifier, checks, verified_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, now())`,
        [input.contract.tenantId, input.operationId, input.resourceKind, input.providerResourceId,
          input.verifier, JSON.stringify(input.checks)]
      );
    });
  }

  async complete(contract: VerifiedTenantProvisioningContract, operationId: string): Promise<void> {
    await withControlPlaneTransaction(this.pool, createProvisioningControlPlanePrincipal(contract), async client => {
      const database = await client.query(
        `UPDATE production.tenant_database_resources SET lifecycle_state = 'ready', verified_at = now(), updated_at = now()
         WHERE tenant_id = $1 AND application_instance_id = $2 AND operation_id = $3`,
        [contract.tenantId, contract.applicationInstanceId, operationId]
      );
      const storage = await client.query(
        `UPDATE production.tenant_storage_configurations SET lifecycle_state = 'ready', verified_at = now(), updated_at = now()
         WHERE tenant_id = $1 AND application_instance_id = $2 AND operation_id = $3`,
        [contract.tenantId, contract.applicationInstanceId, operationId]
      );
      const operation = await client.query(
        `UPDATE production.tenant_provisioning_operations
         SET status = 'ready', updated_at = now(), completed_at = now(), error_code = NULL
         WHERE tenant_id = $1 AND id = $2`,
        [contract.tenantId, operationId]
      );
      if (database.rowCount !== 1 || storage.rowCount !== 1 || operation.rowCount !== 1) {
        throw new TenantProvisioningError('RESOURCE_RECORD_MISSING', 'Verified tenant resources were not durably recorded.');
      }
    });
  }

  async fail(contract: VerifiedTenantProvisioningContract, operationId: string, errorCode: string, retryable: boolean): Promise<void> {
    await withControlPlaneTransaction(this.pool, createProvisioningControlPlanePrincipal(contract), async client => {
      await client.query(
        `UPDATE production.tenant_provisioning_operations
         SET status = $3, error_code = $4, updated_at = now()
         WHERE tenant_id = $1 AND id = $2`,
        [contract.tenantId, operationId, retryable ? 'retryable_failure' : 'failed', errorCode]
      );
    });
  }
}

function createProvisioningControlPlanePrincipal(contract: VerifiedTenantProvisioningContract) {
  if (contract[verifiedContractMarker] !== true) {
    throw new TenantProvisioningError('INVALID_CONTRACT', 'A server-verified provisioning contract is required.');
  }
  return createVerifiedTenantPrincipal({
    valid: true,
    context: {
      tenantId: contract.tenantId,
      appId: 'curriculum-tenant-database-provisioner',
      schoolName: 'Tenant provisioning control plane',
      subscriptionTier: 'internal',
      status: 'ACTIVE',
      databaseName: '',
      storageNamespace: '',
      issuer: contract.issuer,
      audience: 'curriculum-tenant-database-provisioner',
      role: 'super_admin',
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 60,
      tokenSignature: 'server-verified-provisioning-contract',
      permissions: []
    }
  });
}

function containsCredential(value: unknown): boolean {
  const forbiddenCredentialKey = /^(?:access_?token|refresh_?token|id_?token|password|client_?secret|credential|private_?key)$/i;
  if (Array.isArray(value)) return value.some(containsCredential);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) => forbiddenCredentialKey.test(key) || containsCredential(child));
}

function allChecksPassed(checks: unknown, required: readonly string[]): boolean {
  return !!checks && typeof checks === 'object' && !Array.isArray(checks) &&
    required.every(key => Object.hasOwn(checks, key) && (checks as Record<string, unknown>)[key] === true) &&
    Object.values(checks).every(value => value === true);
}

function validateDatabaseResource(resource: ProvisioningResource): void {
  if (!resource || typeof resource.providerResourceId !== 'string' || !resource.providerResourceId.trim() ||
      typeof resource.host !== 'string' || !resource.host.trim() ||
      !Number.isInteger(resource.port) || resource.port < 1 || resource.port > 65535 ||
      !/^[a-zA-Z0-9_]{1,63}$/.test(resource.databaseName) ||
      !/^[a-zA-Z0-9_]{1,63}$/.test(resource.schemaName) ||
      !/^[a-zA-Z0-9_]{1,63}$/.test(resource.runtimeRoleName) ||
      typeof resource.secretManagerReference !== 'string' ||
      !/^projects\/[a-z0-9-]+\/secrets\/[A-Za-z0-9_-]+(?:\/versions\/[A-Za-z0-9_-]+)?$/.test(resource.secretManagerReference) ||
      !resource.evidence || Object.keys(resource.evidence).length === 0 ||
      containsCredential(resource.evidence)) {
    throw new TenantProvisioningError('RESOURCE_UNVERIFIED', 'Database provider returned an invalid resource record.');
  }
}

function validateStorageResource(resource: StorageResource): void {
  if (!resource || !resource.providerConfiguration || Object.keys(resource.providerConfiguration).length === 0 ||
      !resource.evidence || Object.keys(resource.evidence).length === 0 ||
      containsCredential(resource.providerConfiguration) || containsCredential(resource.evidence)) {
    throw new TenantProvisioningError('RESOURCE_UNVERIFIED', 'Storage provider returned invalid or credential-bearing configuration.');
  }
}
