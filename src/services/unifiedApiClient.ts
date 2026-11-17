import { 
  ControlPlaneAuthLoginResponse, 
  PlatformOverviewMetricsResponse, 
  ProvisionInstanceApiRequest, 
  SchoolFlowAuthLoginResponse, 
  SchoolInstanceProfileResponse, 
  SchoolStudentSummary, 
  SchoolAttendanceRecord, 
  SystemHealthCheckResponse, 
  StandardApiErrorResponse 
} from '../../packages/shared-types/src/apiContracts';
import type {
  SchoolAdministratorLoginResponse,
  SchoolConfigurationResponse,
  SchoolDetailsResponse,
  SchoolMembershipResponse,
  SchoolProvisioningConfirmation,
  SchoolProvisioningOperationResponse,
  SchoolProvisioningRequest
} from '../../packages/shared-types/src/apiContracts';
import { TenantSchoolApp } from '../types';
import { RegisteredApplication, RegisteredFeature } from '../types/applicationRegistry';
import { InstanceArchitectureProfile, IIAPEAssessmentRequest } from '../types/iiapEngine';
import {
  DatabaseInstanceRecord,
  DatabaseIsolationStrategy,
  StorageConfigRecord,
  StorageMigrationJob,
  StoragePlacementRule,
  StorageProviderType,
  StorageStrategyType
} from '../types/storageAndDatabase';
import { ProvisioningJob } from '../types/gcpProvisioning';

export interface AuthenticatedSessionClaims {
  tenantId: string;
  appId: string;
  schoolName: string;
  role: string;
  email?: string;
  issuedAt: number;
  expiresAt: number;
}

class UnifiedApiClient {
  private static instance: UnifiedApiClient;
  private baseUrl: string;
  private controlPlaneToken: string | null = null;
  private schoolFlowToken: string | null = null;

  private constructor() {
    // Dynamic determination of backend base URL and session hydration
    if (typeof window !== 'undefined') {
      const metaEnv = (import.meta as any).env;
      this.baseUrl = metaEnv?.VITE_API_URL || window.location.origin;
      try {
        const savedCP = window.sessionStorage?.getItem('cf_control_plane_jwt');
        if (savedCP) this.controlPlaneToken = savedCP;
        const savedSF = window.sessionStorage?.getItem('cf_school_flow_jwt');
        if (savedSF) this.schoolFlowToken = savedSF;
      } catch {}
    } else {
      this.baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    }
  }

  public static getInstance(): UnifiedApiClient {
    if (!UnifiedApiClient.instance) {
      UnifiedApiClient.instance = new UnifiedApiClient();
    }
    return UnifiedApiClient.instance;
  }

  public setControlPlaneToken(token: string) {
    this.controlPlaneToken = token;
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage?.setItem('cf_control_plane_jwt', token);
      } catch {}
    }
  }

  public setSchoolFlowToken(token: string, _tenantId?: string) {
    this.schoolFlowToken = token;
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage?.setItem('cf_school_flow_jwt', token);
      } catch {}
    }
  }

  public clearTokens() {
    this.controlPlaneToken = null;
    this.schoolFlowToken = null;
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage?.removeItem('cf_control_plane_jwt');
        window.sessionStorage?.removeItem('cf_school_flow_jwt');
      } catch {}
    }
  }

  /**
   * Browser-safe token claims extraction without Node built-in dependencies.
   * Extracts server-verified claims from the token payload.
   */
  private decodeTokenClaims(token: string | null): AuthenticatedSessionClaims | null {
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const base64Url = parts[0].replace(/-/g, '+').replace(/_/g, '/');
      const jsonStr = typeof atob !== 'undefined'
        ? decodeURIComponent(atob(base64Url).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))
        : Buffer.from(base64Url, 'base64').toString('utf8');
      const parsed = JSON.parse(jsonStr);
      return {
        tenantId: parsed.tenantId || '',
        appId: parsed.appId || '',
        schoolName: parsed.schoolName || '',
        role: parsed.role || '',
        email: parsed.email,
        issuedAt: parsed.issuedAt || 0,
        expiresAt: parsed.expiresAt || 0
      };
    } catch {
      return null;
    }
  }

  public getSchoolFlowSession(): AuthenticatedSessionClaims | null {
    return this.decodeTokenClaims(this.schoolFlowToken);
  }

  public getControlPlaneSession(): AuthenticatedSessionClaims | null {
    return this.decodeTokenClaims(this.controlPlaneToken);
  }

  public getActiveTenantId(): string | null {
    return this.getSchoolFlowSession()?.tenantId || null;
  }

  public getActiveToken(): string | null {
    return this.schoolFlowToken || this.controlPlaneToken || null;
  }

  public isAuthenticated(type: 'control_plane' | 'school_flow'): boolean {
    const session = type === 'control_plane' ? this.getControlPlaneSession() : this.getSchoolFlowSession();
    if (!session) return false;
    // Check non-expired (expiresAt in seconds or ms)
    const nowSec = Math.floor(Date.now() / 1000);
    const expiresSec = session.expiresAt > 1e11 ? Math.floor(session.expiresAt / 1000) : session.expiresAt;
    return expiresSec > nowSec;
  }

  private generateCorrelationId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}, 
    authType: 'control_plane' | 'school_flow' | 'none' = 'none'
  ): Promise<T> {
    const correlationId = this.generateCorrelationId();
    
    // Sanitize headers: strictly strip client-controlled headers like x-tenant-id or x-role
    const rawHeaders = (options.headers as Record<string, string>) || {};
    const sanitizedHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawHeaders)) {
      const lower = k.toLowerCase();
      if (lower !== 'x-tenant-id' && lower !== 'x-user-role' && lower !== 'x-role') {
        sanitizedHeaders[k] = v;
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId,
      ...sanitizedHeaders
    };

    // Strictly enforce backend-mediated authorization via cryptographic Bearer tokens.
    // Tenant identity and role boundaries are resolved authoritative server-side from token claims.
    if (authType === 'control_plane') {
      if (this.controlPlaneToken) {
        headers['Authorization'] = `Bearer ${this.controlPlaneToken}`;
      }
    } else if (authType === 'school_flow') {
      if (this.schoolFlowToken) {
        headers['Authorization'] = `Bearer ${this.schoolFlowToken}`;
      }
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorResponse: StandardApiErrorResponse = {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
          code: data.code || 'INTERNAL_ERROR',
          status: response.status,
          correlationId: data.correlationId || correlationId,
          timestamp: data.timestamp || new Date().toISOString(),
          details: data.data || data.details
        };
        throw errorResponse;
      }

      return data as T;
    } catch (err: any) {
      if (err.code && err.correlationId) {
        throw err;
      }
      // Wrap unexpected network errors in standard contract
      const wrappedError: StandardApiErrorResponse = {
        success: false,
        error: err.message || 'Network request failed or backend service unreachable',
        code: 'INTERNAL_ERROR',
        status: 0,
        correlationId,
        timestamp: new Date().toISOString()
      };
      throw wrappedError;
    }
  }

  public async requestAuthenticatedControlPlane<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.controlPlaneToken || !this.isAuthenticated('control_plane')) {
      throw {
        success: false,
        error: 'A valid authenticated control-plane session is required.',
        code: 'UNAUTHENTICATED',
        status: 401,
        correlationId: this.generateCorrelationId(),
        timestamp: new Date().toISOString()
      } satisfies StandardApiErrorResponse;
    }
    return this.request<T>(endpoint, options, 'control_plane');
  }

  /**
   * Generic GET request with automatic token injection based on endpoint
   */
  public async get<T>(
    endpoint: string, 
    authType: 'control_plane' | 'school_flow' | 'none' = 'control_plane'
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const res = await this.request<{ success: boolean; data?: T; error?: string }>(endpoint, { method: 'GET' }, authType);
      return res;
    } catch (err: any) {
      return { success: false, error: err.error || err.message || 'Request failed' };
    }
  }

  /**
   * Generic POST request with automatic token injection based on endpoint
   */
  public async post<T>(
    endpoint: string, 
    body: any = {}, 
    authType: 'control_plane' | 'school_flow' | 'none' = 'control_plane'
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const res = await this.request<{ success: boolean; data?: T; error?: string }>(
        endpoint, 
        {
          method: 'POST',
          body: JSON.stringify(body)
        }, 
        authType
      );
      return res;
    } catch (err: any) {
      return { success: false, error: err.error || err.message || 'Request failed' };
    }
  }

  // =============================================================
  // CURRICULUM SERVER (CONTROL PLANE) API METHODS
  // =============================================================

  public async loginControlPlane(email: string, securityKey?: string): Promise<ControlPlaneAuthLoginResponse> {
    const res = await this.request<{ success: boolean; data: ControlPlaneAuthLoginResponse }>(
      '/api/v1/server/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, securityKey })
      },
      'none'
    );
    if (res.data?.token) {
      this.setControlPlaneToken(res.data.token);
    }
    return res.data;
  }

  public async provisionSchool(
    payload: SchoolProvisioningRequest,
    idempotencyKey: string
  ): Promise<SchoolProvisioningConfirmation> {
    const res = await this.request<{ success: boolean; data: SchoolProvisioningConfirmation }>(
      '/api/v1/schools/provision',
      {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify(payload)
      },
      'control_plane'
    );
    return res.data;
  }

  public async getSchoolProvisioningOperation(
    operationId: string
  ): Promise<SchoolProvisioningOperationResponse> {
    const res = await this.request<{ success: boolean; data: SchoolProvisioningOperationResponse }>(
      `/api/v1/schools/provision/${encodeURIComponent(operationId)}`,
      { method: 'GET' },
      'control_plane'
    );
    return res.data;
  }

  public async retrySchoolProvisioning(
    operationId: string
  ): Promise<SchoolProvisioningOperationResponse> {
    const res = await this.request<{ success: boolean; data: SchoolProvisioningOperationResponse }>(
      `/api/v1/schools/provision/${encodeURIComponent(operationId)}/retry`,
      { method: 'POST' },
      'control_plane'
    );
    return res.data;
  }

  public async activateSchoolAdministrator(token: string, password: string): Promise<{ tenantId: string; status: string }> {
    const res = await this.request<{ success: boolean; data: { tenantId: string; status: string } }>(
      '/api/v1/schools/activation',
      { method: 'POST', body: JSON.stringify({ token, password }) },
      'none'
    );
    return res.data;
  }

  public async loginSchoolAdministrator(
    tenantId: string,
    email: string,
    password: string
  ): Promise<SchoolAdministratorLoginResponse> {
    const res = await this.request<{ success: boolean; data: SchoolAdministratorLoginResponse }>(
      '/api/v1/schools/auth/login',
      { method: 'POST', body: JSON.stringify({ tenantId, email, password }) },
      'none'
    );
    this.setSchoolFlowToken(res.data.token, res.data.tenantId);
    return res.data;
  }

  public async getMySchool(): Promise<SchoolDetailsResponse> {
    const res = await this.request<{ success: boolean; data: SchoolDetailsResponse }>(
      '/api/v1/schools/me', { method: 'GET' }, 'school_flow'
    );
    return res.data;
  }

  public async requestLogistics<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.isAuthenticated('school_flow')) {
      throw new Error('A valid authenticated school session is required.');
    }
    if (!endpoint.startsWith('/') || endpoint.includes('?tenantId=') || endpoint.includes('?schoolId=')) {
      throw new Error('Logistics requests must use a relative API path without client-selected school context.');
    }
    return this.request<T>(`/api/v1/logistics${endpoint}`, options, 'school_flow');
  }

  public async getMySchoolConfiguration(): Promise<SchoolConfigurationResponse> {
    const res = await this.request<{ success: boolean; data: SchoolConfigurationResponse }>(
      '/api/v1/schools/me/config', { method: 'GET' }, 'school_flow'
    );
    return res.data;
  }

  public async getMySchoolMembership(): Promise<SchoolMembershipResponse> {
    const res = await this.request<{ success: boolean; data: SchoolMembershipResponse }>(
      '/api/v1/schools/me/membership', { method: 'GET' }, 'school_flow'
    );
    return res.data;
  }

  public async updateMySchoolConfiguration(
    configuration: SchoolConfigurationResponse
  ): Promise<SchoolConfigurationResponse> {
    const res = await this.request<{ success: boolean; data: SchoolConfigurationResponse }>(
      '/api/v1/schools/me/config',
      { method: 'PUT', body: JSON.stringify(configuration) },
      'school_flow'
    );
    return res.data;
  }

  public async getPlatformMetrics(): Promise<PlatformOverviewMetricsResponse> {
    const res = await this.request<{ success: boolean; data: PlatformOverviewMetricsResponse }>(
      '/api/v1/server/metrics',
      { method: 'GET' },
      'control_plane'
    );
    return res.data;
  }

  public async getTenants(): Promise<TenantSchoolApp[]> {
    const res = await this.request<{ success: boolean; data: TenantSchoolApp[] }>(
      '/api/v1/server/tenants',
      { method: 'GET' },
      'control_plane'
    );
    return res.data;
  }

  public async provisionInstance(payload: ProvisionInstanceApiRequest): Promise<TenantSchoolApp> {
    const res = await this.request<{ success: boolean; data: TenantSchoolApp }>(
      '/api/v1/server/tenants/provision',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      },
      'control_plane'
    );
    return res.data;
  }

  public async toggleTenantStatus(tenantId: string): Promise<TenantSchoolApp> {
    const res = await this.request<{ success: boolean; data: TenantSchoolApp }>(
      `/api/v1/server/tenants/${tenantId}/toggle-status`,
      { method: 'POST' },
      'control_plane'
    );
    return res.data;
  }

  public async getApplications(): Promise<RegisteredApplication[]> {
    const res = await this.request<{ success: boolean; data: RegisteredApplication[] }>(
      '/api/v1/server/applications',
      { method: 'GET' },
      'control_plane'
    );
    return res.data;
  }

  public async getFeatures(): Promise<RegisteredFeature[]> {
    const res = await this.request<{ success: boolean; data: RegisteredFeature[] }>(
      '/api/v1/server/features',
      { method: 'GET' },
      'control_plane'
    );
    return res.data;
  }

  public async getArchitectureProfiles(): Promise<InstanceArchitectureProfile[]> {
    const res = await this.request<{ success: boolean; data: InstanceArchitectureProfile[] }>(
      '/api/v1/server/architecture/profiles',
      { method: 'GET' },
      'control_plane'
    );
    return res.data;
  }

  public async evaluateArchitecture(request: IIAPEAssessmentRequest): Promise<InstanceArchitectureProfile> {
    const res = await this.request<{ success: boolean; data: InstanceArchitectureProfile }>(
      '/api/v1/server/architecture/evaluate',
      {
        method: 'POST',
        body: JSON.stringify(request)
      },
      'control_plane'
    );
    return res.data;
  }

  public async getGCPProvisioningJobs(): Promise<ProvisioningJob[]> {
    const res = await this.request<{ success: boolean; data: ProvisioningJob[] }>(
      '/api/v1/server/infrastructure/jobs',
      { method: 'GET' },
      'control_plane'
    );
    return res.data;
  }

  public async getDatabases(): Promise<{ databases: DatabaseInstanceRecord[]; availability: string }> {
    const res = await this.request<{ status: string; databases: DatabaseInstanceRecord[]; availability?: string }>(
      '/api/v1/server/databases',
      { method: 'GET' },
      'control_plane'
    );
    return { databases: res.databases, availability: res.availability || 'unavailable' };
  }

  public async getStorageConfigs(): Promise<{
    storageConfigs: StorageConfigRecord[];
    migrationJobs: StorageMigrationJob[];
    availability: string;
  }> {
    const res = await this.request<{
      status: string;
      storageConfigs: StorageConfigRecord[];
      migrationJobs: StorageMigrationJob[];
      availability?: string;
    }>(
      '/api/v1/server/storage',
      { method: 'GET' },
      'control_plane'
    );
    return { ...res, availability: res.availability || 'unavailable' };
  }

  public async configureDatabaseIsolation(input: {
    instanceId: string;
    tenantId: string;
    schoolName: string;
    strategy: DatabaseIsolationStrategy;
  }): Promise<unknown> {
    return this.requestAuthenticatedControlPlane('/api/v1/server/databases/configure', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  public async configureCustomerStorage(input: {
    instanceId: string;
    tenantId: string;
    schoolName: string;
    strategy: StorageStrategyType;
    primaryProvider: StorageProviderType;
    secondaryProvider?: StorageProviderType;
    quotaGb: number;
    retentionDays: number;
    oauthConnectedEmail?: string;
    placementRules?: StoragePlacementRule[];
  }): Promise<unknown> {
    return this.requestAuthenticatedControlPlane('/api/v1/server/storage/configure', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  public async startStorageMigration(input: {
    instanceId: string;
    tenantId: string;
    sourceProvider: StorageProviderType;
    targetProvider: StorageProviderType;
    totalFiles: number;
  }): Promise<unknown> {
    return this.requestAuthenticatedControlPlane('/api/v1/server/storage/migrate', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  public async getStorageVerification(): Promise<{
    timestamp: string;
    allTestsPassed: boolean;
    results: { testName: string; passed: boolean; message: string }[];
  }> {
    return this.requestAuthenticatedControlPlane('/api/v1/server/storage/verify', { method: 'GET' });
  }

  public async getAuditLogs(): Promise<any[]> {
    const res = await this.request<{ success: boolean; data: any[] }>(
      '/api/v1/server/audit-logs',
      { method: 'GET' },
      'control_plane'
    );
    return res.data;
  }

  // =============================================================
  // CURRICULUM FLOW (SCHOOL ERP) API METHODS
  // =============================================================

  public async loginSchool(
    tenantId: string, 
    usernameOrEmail: string, 
    password?: string, 
    roleHint?: string
  ): Promise<SchoolFlowAuthLoginResponse> {
    const session = await this.loginSchoolAdministrator(tenantId, usernameOrEmail, password || '');
    return {
      token: session.token,
      tenantId: session.tenantId,
      schoolName: session.schoolName,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        title: 'School Administrator',
        avatar: '',
        permissions: ['school:read', 'school:configure']
      },
      entitlements: {
        features: ['curriculum_flow', 'tests_examinations'],
        studentCapacity: 0,
        planTier: 'school',
        status: 'ACTIVE'
      }
    };
  }

  public async getSchoolProfile(tenantId?: string): Promise<SchoolInstanceProfileResponse> {
    const targetTenantId = tenantId || this.getActiveTenantId();
    if (!targetTenantId) {
      throw {
        success: false,
        error: 'No active authenticated school tenant session found.',
        code: 'UNAUTHENTICATED'
      };
    }
    const res = await this.request<{ success: boolean; data: SchoolInstanceProfileResponse }>(
      `/api/v1/flow/school/${targetTenantId}/profile`,
      { method: 'GET' },
      'school_flow'
    );
    return res.data;
  }

  public async getStudents(tenantId?: string): Promise<SchoolStudentSummary[]> {
    const targetTenantId = tenantId || this.getActiveTenantId();
    if (!targetTenantId) {
      throw {
        success: false,
        error: 'No active authenticated school tenant session found.',
        code: 'UNAUTHENTICATED'
      };
    }
    const res = await this.request<{ success: boolean; data: SchoolStudentSummary[] }>(
      `/api/v1/flow/school/${targetTenantId}/students`,
      { method: 'GET' },
      'school_flow'
    );
    return res.data;
  }

  public async getAttendance(tenantId?: string): Promise<SchoolAttendanceRecord[]> {
    const targetTenantId = tenantId || this.getActiveTenantId();
    if (!targetTenantId) {
      throw {
        success: false,
        error: 'No active authenticated school tenant session found.',
        code: 'UNAUTHENTICATED'
      };
    }
    const res = await this.request<{ success: boolean; data: SchoolAttendanceRecord[] }>(
      `/api/v1/flow/school/${targetTenantId}/attendance`,
      { method: 'GET' },
      'school_flow'
    );
    return res.data;
  }

  public async recordAttendance(
    tenantId: string | undefined, 
    record: Omit<SchoolAttendanceRecord, 'id' | 'tenantId' | 'timestamp'>
  ): Promise<SchoolAttendanceRecord> {
    const targetTenantId = tenantId || this.getActiveTenantId();
    if (!targetTenantId) {
      throw {
        success: false,
        error: 'No active authenticated school tenant session found.',
        code: 'UNAUTHENTICATED'
      };
    }
    const res = await this.request<{ success: boolean; data: SchoolAttendanceRecord }>(
      `/api/v1/flow/school/${targetTenantId}/attendance`,
      {
        method: 'POST',
        body: JSON.stringify(record)
      },
      'school_flow'
    );
    return res.data;
  }

  // =============================================================
  // STAGE 2: CENTRAL SHARED CURRICULUM & TEXTBOOK CONSUMPTION
  // =============================================================

  private buildSharedServiceHeaders(applicationInstanceId: string): Record<string, string> {
    return { 'X-Application-Instance-ID': applicationInstanceId };
  }

  public async getCentralCurriculumFrameworks<T = unknown>(
    applicationInstanceId: string,
    query: { countryId?: string; authorityId?: string; page?: number; limit?: number } = {}
  ): Promise<T> {
    const qs = new URLSearchParams();
    if (query.countryId) qs.set('countryId', query.countryId);
    if (query.authorityId) qs.set('authorityId', query.authorityId);
    if (query.page) qs.set('page', String(query.page));
    if (query.limit) qs.set('limit', String(query.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return this.request<T>(
      `/api/v1/shared/curriculum/frameworks${suffix}`,
      { method: 'GET', headers: this.buildSharedServiceHeaders(applicationInstanceId) },
      'school_flow'
    );
  }

  public async getCentralCurriculumSubjects<T = unknown>(
    applicationInstanceId: string,
    query: {
      frameworkId?: string;
      versionId?: string;
      levelCode?: string;
      gradeName?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<T> {
    const qs = new URLSearchParams();
    if (query.frameworkId) qs.set('frameworkId', query.frameworkId);
    if (query.versionId) qs.set('versionId', query.versionId);
    if (query.levelCode) qs.set('levelCode', query.levelCode);
    if (query.gradeName) qs.set('gradeName', query.gradeName);
    if (query.search) qs.set('search', query.search);
    if (query.page) qs.set('page', String(query.page));
    if (query.limit) qs.set('limit', String(query.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return this.request<T>(
      `/api/v1/shared/curriculum/subjects${suffix}`,
      { method: 'GET', headers: this.buildSharedServiceHeaders(applicationInstanceId) },
      'school_flow'
    );
  }

  public async getCentralCurriculumSubjectDetail<T = unknown>(
    applicationInstanceId: string,
    subjectId: string,
    query: { versionId?: string; classGrade?: string } = {}
  ): Promise<T> {
    const qs = new URLSearchParams();
    if (query.versionId) qs.set('versionId', query.versionId);
    if (query.classGrade) qs.set('classGrade', query.classGrade);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return this.request<T>(
      `/api/v1/shared/curriculum/subjects/${encodeURIComponent(subjectId)}${suffix}`,
      { method: 'GET', headers: this.buildSharedServiceHeaders(applicationInstanceId) },
      'school_flow'
    );
  }

  public async getCentralCurriculumCompetencies<T = unknown>(
    applicationInstanceId: string,
    query: { versionId?: string; subjectId?: string; topicId?: string; gradeName?: string; competencyType?: string; page?: number; limit?: number } = {}
  ): Promise<T> {
    const qs = new URLSearchParams();
    if (query.versionId) qs.set('versionId', query.versionId);
    if (query.subjectId) qs.set('subjectId', query.subjectId);
    if (query.topicId) qs.set('topicId', query.topicId);
    if (query.gradeName) qs.set('gradeName', query.gradeName);
    if (query.competencyType) qs.set('competencyType', query.competencyType);
    if (query.page) qs.set('page', String(query.page));
    if (query.limit) qs.set('limit', String(query.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return this.request<T>(
      `/api/v1/shared/curriculum/competencies${suffix}`,
      { method: 'GET', headers: this.buildSharedServiceHeaders(applicationInstanceId) },
      'school_flow'
    );
  }

  public async getCentralCurriculumSourceDocuments<T = unknown>(
    applicationInstanceId: string,
    query: { frameworkId?: string; versionId?: string; authorityId?: string; page?: number; limit?: number } = {}
  ): Promise<T> {
    const qs = new URLSearchParams();
    if (query.frameworkId) qs.set('frameworkId', query.frameworkId);
    if (query.versionId) qs.set('versionId', query.versionId);
    if (query.authorityId) qs.set('authorityId', query.authorityId);
    if (query.page) qs.set('page', String(query.page));
    if (query.limit) qs.set('limit', String(query.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return this.request<T>(
      `/api/v1/shared/curriculum/source-documents${suffix}`,
      { method: 'GET', headers: this.buildSharedServiceHeaders(applicationInstanceId) },
      'school_flow'
    );
  }

  public async getCentralTextbooks<T = unknown>(
    applicationInstanceId: string,
    query: { frameworkId?: string; curriculumVersionId?: string; subjectId?: string; classGrade?: string; page?: number; limit?: number } = {}
  ): Promise<T> {
    const qs = new URLSearchParams();
    if (query.frameworkId) qs.set('frameworkId', query.frameworkId);
    if (query.curriculumVersionId) qs.set('curriculumVersionId', query.curriculumVersionId);
    if (query.subjectId) qs.set('subjectId', query.subjectId);
    if (query.classGrade) qs.set('classGrade', query.classGrade);
    if (query.page) qs.set('page', String(query.page));
    if (query.limit) qs.set('limit', String(query.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return this.request<T>(
      `/api/v1/shared/textbooks${suffix}`,
      { method: 'GET', headers: this.buildSharedServiceHeaders(applicationInstanceId) },
      'school_flow'
    );
  }

  public async getCentralTextbookDetail<T = unknown>(
    applicationInstanceId: string,
    textbookId: string
  ): Promise<T> {
    return this.request<T>(
      `/api/v1/shared/textbooks/${encodeURIComponent(textbookId)}`,
      { method: 'GET', headers: this.buildSharedServiceHeaders(applicationInstanceId) },
      'school_flow'
    );
  }

  public async getCentralTextbookChapter<T = unknown>(
    applicationInstanceId: string,
    textbookId: string,
    chapterId: string
  ): Promise<T> {
    return this.request<T>(
      `/api/v1/shared/textbooks/${encodeURIComponent(textbookId)}/chapters/${encodeURIComponent(chapterId)}`,
      { method: 'GET', headers: this.buildSharedServiceHeaders(applicationInstanceId) },
      'school_flow'
    );
  }

  // Instance-Owned School Question Bank & Assessments
  public async getInstanceQuestions<T = unknown>(
    applicationInstanceId: string,
    query: { subjectReferenceId?: string; classGradeName?: string; questionType?: string; reviewStatus?: string } = {}
  ): Promise<T> {
    const qs = new URLSearchParams();
    if (query.subjectReferenceId) qs.set('subjectReferenceId', query.subjectReferenceId);
    if (query.classGradeName) qs.set('classGradeName', query.classGradeName);
    if (query.questionType) qs.set('questionType', query.questionType);
    if (query.reviewStatus) qs.set('reviewStatus', query.reviewStatus);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return this.request<T>(
      `/api/v1/question-bank${suffix}`,
      { method: 'GET', headers: this.buildSharedServiceHeaders(applicationInstanceId) },
      'school_flow'
    );
  }

  public async createInstanceQuestion<T = unknown>(
    applicationInstanceId: string,
    payload: Record<string, unknown>
  ): Promise<T> {
    return this.request<T>(
      `/api/v1/question-bank`,
      {
        method: 'POST',
        headers: this.buildSharedServiceHeaders(applicationInstanceId),
        body: JSON.stringify(payload)
      },
      'school_flow'
    );
  }

  // =============================================================
  // SHARED INFRASTRUCTURE METHODS
  // =============================================================

  public async getHealth(): Promise<SystemHealthCheckResponse> {
    return this.request<SystemHealthCheckResponse>(
      '/api/v1/health',
      { method: 'GET' },
      'none'
    );
  }
}

export const unifiedApiClient = UnifiedApiClient.getInstance();
