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
  AcceptMemberInvitationResponse,
  AcademicSessionRecord,
  AcademicTermRecord,
  AllocateStaffSubjectRequest,
  ApplicationTemplateRecord,
  CreateAcademicSessionRequest,
  CreateAcademicTermRequest,
  CreateDepartmentRequest,
  CreateGuardianRequest,
  CreateMemberInvitationRequest,
  CreateSchoolClassRequest,
  CreateSchoolStaffRequest,
  CreateSchoolStudentRequest,
  CreateStudentAdmissionRequest,
  EnrollAdmissionRequest,
  GuardianRecord,
  GuardianWardSummary,
  IamAuditEventRecord,
  IamMemberInvitationRecord,
  IamMembershipRecord,
  IamRoleDefinition,
  IamSessionRecord,
  IssueDigitalIdCardResponse,
  LinkStudentGuardianRequest,
  MemberInvitationPreviewResponse,
  MfaFactorSummary,
  ProvisioningWorkflowStepRecord,
  ReviewAdmissionRequest,
  SchoolAdministrationClass,
  SchoolAdministrationStudent,
  SchoolAdministratorLoginResponse,
  SchoolConfigurationResponse,
  SchoolDepartmentRecord,
  SchoolDetailsResponse,
  SchoolInstitutionalIdentity,
  SchoolMembershipResponse,
  SchoolMfaChallengeResponse,
  SchoolProvisioningConfirmation,
  SchoolProvisioningOperationResponse,
  SchoolProvisioningRequest,
  SchoolStaffPage,
  SchoolStaffRecord,
  SchoolStatusHistoryRecord,
  SchoolStatusTransitionRequest,
  StaffStatusTransitionRequest,
  StaffSubjectAllocationRecord,
  StudentAdmissionRecord,
  StudentDigitalIdCardRecord,
  StudentGuardianLinkRecord,
  StudentMedicalProfileRecord,
  UpdateDepartmentRequest,
  UpdateGuardianRequest,
  UpdateSchoolClassRequest,
  UpdateSchoolProfileRequest,
  UpdateSchoolStaffRequest,
  UpdateSchoolStudentRequest,
  UpsertStudentMedicalProfileRequest,
  CmagOtpRequestPayload,
  CmagOtpRequestResponse,
  CmagOtpVerifyPayload,
  CmagOtpVerifyResponse,
  CmagPlatformOverviewResponse,
  CmagTenantOverviewResponse,
  CmagTargetedSendRequest,
  CmagBroadcastRequest,
  CmagQueueMetrics,
  CmagProviderSummary
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

  public async requestAuthenticatedSchoolFlow<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.schoolFlowToken || !this.isAuthenticated('school_flow')) {
      throw {
        success: false,
        error: 'A valid authenticated school session is required.',
        code: 'UNAUTHENTICATED',
        status: 401,
        correlationId: this.generateCorrelationId(),
        timestamp: new Date().toISOString()
      } satisfies StandardApiErrorResponse;
    }
    return this.request<T>(endpoint, options, 'school_flow');
  }

  public async requestSchoolFlow<T>(
    endpoint: string,
    options: RequestInit = {},
    applicationInstanceId?: string
  ): Promise<T> {
    const existingHeaders = (options.headers as Record<string, string>) || {};
    const mergedHeaders = applicationInstanceId
      ? { ...existingHeaders, ...this.buildSharedServiceHeaders(applicationInstanceId) }
      : existingHeaders;
    return this.requestAuthenticatedSchoolFlow<T>(endpoint, {
      ...options,
      headers: mergedHeaders
    });
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
  ): Promise<SchoolAdministratorLoginResponse | SchoolMfaChallengeResponse> {
    const res = await this.request<{ success: boolean; data: SchoolAdministratorLoginResponse | SchoolMfaChallengeResponse }>(
      '/api/v1/schools/auth/login',
      { method: 'POST', body: JSON.stringify({ tenantId, email, password }) },
      'none'
    );
    if ('token' in res.data && res.data.token) {
      this.setSchoolFlowToken(res.data.token, res.data.tenantId);
    }
    return res.data;
  }

  public async verifySchoolMfaLogin(input: {
    tenantId: string;
    challengeId: string;
    challengeToken: string;
    code: string;
  }): Promise<SchoolAdministratorLoginResponse> {
    const res = await this.request<{ success: boolean; data: SchoolAdministratorLoginResponse }>(
      '/api/v1/schools/auth/mfa/verify',
      { method: 'POST', body: JSON.stringify(input) },
      'none'
    );
    if (res.data?.token) {
      this.setSchoolFlowToken(res.data.token, res.data.tenantId);
    }
    return res.data;
  }

  public async logoutSchoolSession(): Promise<{ revoked: boolean }> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: { revoked: boolean } }>(
      '/api/v1/schools/auth/logout',
      { method: 'POST', body: JSON.stringify({}) }
    );
    return res.data;
  }

  public async startGoogleOidcSignIn(
    tenantId: string,
    redirectUri: string
  ): Promise<{ state: string; codeChallenge: string; authorizationUrl: string; expiresAt: string }> {
    const qs = new URLSearchParams({ tenantId, redirectUri });
    const res = await this.request<{
      success: boolean;
      data: { state: string; codeChallenge: string; authorizationUrl: string; expiresAt: string };
    }>(`/api/v1/schools/auth/oidc/google/start?${qs.toString()}`, { method: 'GET' }, 'none');
    return res.data;
  }

  public async completeGoogleOidcSignIn(input: {
    tenantId: string;
    state: string;
    code: string;
    redirectUri: string;
  }): Promise<SchoolAdministratorLoginResponse> {
    const res = await this.request<{ success: boolean; data: SchoolAdministratorLoginResponse }>(
      '/api/v1/schools/auth/oidc/google/callback',
      { method: 'POST', body: JSON.stringify(input) },
      'none'
    );
    if (res.data?.token) {
      this.setSchoolFlowToken(res.data.token, res.data.tenantId);
    }
    return res.data;
  }

  public async previewMemberInvitation(token: string): Promise<MemberInvitationPreviewResponse> {
    const qs = new URLSearchParams({ token });
    const res = await this.request<{ success: boolean; data: MemberInvitationPreviewResponse }>(
      `/api/v1/schools/invitations/preview?${qs.toString()}`,
      { method: 'GET' },
      'none'
    );
    return res.data;
  }

  public async acceptMemberInvitation(token: string, password: string): Promise<AcceptMemberInvitationResponse> {
    const res = await this.request<{ success: boolean; data: AcceptMemberInvitationResponse }>(
      '/api/v1/schools/invitations/accept',
      { method: 'POST', body: JSON.stringify({ token, password }) },
      'none'
    );
    return res.data;
  }

  public async getProvisioningWorkflowSteps(operationId: string): Promise<ProvisioningWorkflowStepRecord[]> {
    const res = await this.requestAuthenticatedControlPlane<{
      success: boolean;
      data: ProvisioningWorkflowStepRecord[];
    }>(`/api/v1/schools/provision/${encodeURIComponent(operationId)}/steps`, { method: 'GET' });
    return res.data;
  }

  public async getApplicationTemplates(
    query: { provisionable?: boolean; category?: string } = {}
  ): Promise<ApplicationTemplateRecord[]> {
    const qs = new URLSearchParams();
    if (query.provisionable !== undefined) qs.set('provisionable', String(query.provisionable));
    if (query.category) qs.set('category', query.category);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    const res = await this.requestAuthenticatedControlPlane<{
      success: boolean;
      data: ApplicationTemplateRecord[];
    }>(`/api/v1/application-templates${suffix}`, { method: 'GET' });
    return res.data;
  }

  public async getMySchool(): Promise<SchoolInstitutionalIdentity> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: SchoolInstitutionalIdentity }>(
      '/api/v1/schools/me', { method: 'GET' }
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

  public async requestLogisticsBlob(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Blob> {
    if (!this.isAuthenticated('school_flow')) {
      throw new Error('A valid authenticated school session is required.');
    }
    if (!endpoint.startsWith('/') || endpoint.includes('?tenantId=') || endpoint.includes('?schoolId=')) {
      throw new Error('Logistics requests must use a relative API path without client-selected school context.');
    }
    const correlationId = this.generateCorrelationId();
    const rawHeaders = (options.headers as Record<string, string>) || {};
    const headers: Record<string, string> = {
      'X-Correlation-ID': correlationId,
      ...Object.fromEntries(Object.entries(rawHeaders).filter(([key]) =>
        !['x-tenant-id', 'x-user-role', 'x-role'].includes(key.toLowerCase())
      ))
    };
    if (this.schoolFlowToken) headers.Authorization = `Bearer ${this.schoolFlowToken}`;
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/logistics${endpoint}`, {
        ...options,
        headers
      });
      if (response.ok) return response.blob();
      const data = await response.json().catch(() => ({}));
      throw {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`,
        code: data.code || 'INTERNAL_ERROR',
        status: response.status,
        correlationId: data.correlationId || correlationId,
        timestamp: data.timestamp || new Date().toISOString(),
        details: data.data || data.details
      };
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && 'correlationId' in error) throw error;
      throw {
        success: false,
        error: error instanceof Error ? error.message : 'Network request failed or backend service unreachable',
        code: 'INTERNAL_ERROR',
        status: 0,
        correlationId,
        timestamp: new Date().toISOString()
      };
    }
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
    void roleHint;
    const session = await this.loginSchoolAdministrator(tenantId, usernameOrEmail, password || '');
    if ('mfaRequired' in session && session.mfaRequired) {
      throw {
        success: false,
        error: 'Multi-factor authentication verification is required for this account.',
        code: 'MFA_REQUIRED',
        status: 401,
        details: session
      };
    }
    const authenticated = session as SchoolAdministratorLoginResponse;
    return {
      token: authenticated.token,
      tenantId: authenticated.tenantId,
      schoolName: authenticated.schoolName,
      user: {
        id: authenticated.user.id,
        name: authenticated.user.name,
        email: authenticated.user.email,
        role: authenticated.user.role,
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

  // =============================================================
  // PROMPT 1: SCHOOL IDENTITY, STRUCTURE, LIFECYCLE, GUARDIANS, IAM
  // =============================================================

  public async updateMySchoolProfile(payload: UpdateSchoolProfileRequest): Promise<SchoolInstitutionalIdentity> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: SchoolInstitutionalIdentity }>(
      '/api/v1/schools/me',
      { method: 'PATCH', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async transitionMySchoolStatus(payload: SchoolStatusTransitionRequest): Promise<SchoolInstitutionalIdentity> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: SchoolInstitutionalIdentity }>(
      '/api/v1/schools/me/status',
      { method: 'POST', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async getMySchoolStatusHistory(): Promise<SchoolStatusHistoryRecord[]> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: SchoolStatusHistoryRecord[] }>(
      '/api/v1/schools/me/status-history',
      { method: 'GET' }
    );
    return res.data;
  }

  public async listDepartments(): Promise<SchoolDepartmentRecord[]> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: SchoolDepartmentRecord[] }>(
      '/api/v1/schools/me/departments',
      { method: 'GET' }
    );
    return res.data;
  }

  public async createDepartment(payload: CreateDepartmentRequest): Promise<SchoolDepartmentRecord> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: SchoolDepartmentRecord }>(
      '/api/v1/schools/me/departments',
      { method: 'POST', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async updateDepartment(departmentId: string, payload: UpdateDepartmentRequest): Promise<SchoolDepartmentRecord> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: SchoolDepartmentRecord }>(
      `/api/v1/schools/me/departments/${encodeURIComponent(departmentId)}`,
      { method: 'PATCH', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async listAcademicSessions(): Promise<AcademicSessionRecord[]> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: AcademicSessionRecord[] }>(
      '/api/v1/schools/me/academic-sessions',
      { method: 'GET' }
    );
    return res.data;
  }

  public async createAcademicSession(payload: CreateAcademicSessionRequest): Promise<AcademicSessionRecord> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: AcademicSessionRecord }>(
      '/api/v1/schools/me/academic-sessions',
      { method: 'POST', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async activateAcademicSession(sessionId: string): Promise<AcademicSessionRecord> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: AcademicSessionRecord }>(
      `/api/v1/schools/me/academic-sessions/${encodeURIComponent(sessionId)}/activate`,
      { method: 'POST', body: JSON.stringify({}) }
    );
    return res.data;
  }

  public async createAcademicTerm(sessionId: string, payload: CreateAcademicTermRequest): Promise<AcademicTermRecord> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: AcademicTermRecord }>(
      `/api/v1/schools/me/academic-sessions/${encodeURIComponent(sessionId)}/terms`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async activateAcademicTerm(termId: string): Promise<AcademicTermRecord> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: AcademicTermRecord }>(
      `/api/v1/schools/me/academic-terms/${encodeURIComponent(termId)}/activate`,
      { method: 'POST', body: JSON.stringify({}) }
    );
    return res.data;
  }

  public async listStudents(
    query: { page?: number; pageSize?: number; search?: string; status?: string; classId?: string } = {}
  ): Promise<{ records: SchoolAdministrationStudent[]; page: number; pageSize: number; total: number }> {
    const qs = new URLSearchParams();
    if (query.page !== undefined) qs.set('page', String(query.page));
    if (query.pageSize !== undefined) qs.set('pageSize', String(query.pageSize));
    if (query.search) qs.set('search', query.search);
    if (query.status) qs.set('status', query.status);
    if (query.classId) qs.set('classId', query.classId);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    const res = await this.requestAuthenticatedSchoolFlow<{
      success: boolean;
      data: { records: SchoolAdministrationStudent[]; page: number; pageSize: number; total: number };
    }>(`/api/v1/schools/me/students${suffix}`, { method: 'GET' });
    return res.data;
  }

  public async getStudent(studentId: string): Promise<SchoolAdministrationStudent> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: SchoolAdministrationStudent }>(
      `/api/v1/schools/me/students/${encodeURIComponent(studentId)}`,
      { method: 'GET' }
    );
    return res.data;
  }

  public async createStudent(payload: CreateSchoolStudentRequest): Promise<SchoolAdministrationStudent> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: SchoolAdministrationStudent }>(
      '/api/v1/schools/me/students',
      { method: 'POST', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async updateStudent(studentId: string, payload: UpdateSchoolStudentRequest): Promise<SchoolAdministrationStudent> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: SchoolAdministrationStudent }>(
      `/api/v1/schools/me/students/${encodeURIComponent(studentId)}`,
      { method: 'PATCH', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async transitionStudentLifecycle(
    studentId: string,
    payload: { type: 'admit' | 'enroll' | 'activate' | 'suspend' | 'graduate' | 'external_transfer' | 'withdraw' | 'reinstate'; destination?: string; reason?: string }
  ): Promise<SchoolAdministrationStudent> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: SchoolAdministrationStudent }>(
      `/api/v1/schools/me/students/${encodeURIComponent(studentId)}/lifecycle`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async assignStudentClass(
    studentId: string,
    classId: string,
    operation: 'assign' | 'promote' | 'internal_transfer' = 'assign'
  ): Promise<SchoolAdministrationStudent> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: SchoolAdministrationStudent }>(
      `/api/v1/schools/me/students/${encodeURIComponent(studentId)}/class`,
      { method: 'POST', body: JSON.stringify({ classId, operation }) }
    );
    return res.data;
  }

  public async getStudentHistory(studentId: string): Promise<any[]> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: any[] }>(
      `/api/v1/schools/me/students/${encodeURIComponent(studentId)}/history`,
      { method: 'GET' }
    );
    return res.data;
  }

  public async getStudentMedicalProfile(studentId: string): Promise<StudentMedicalProfileRecord | null> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: StudentMedicalProfileRecord | null }>(
      `/api/v1/schools/me/students/${encodeURIComponent(studentId)}/medical`,
      { method: 'GET' }
    );
    return res.data;
  }

  public async upsertStudentMedicalProfile(
    studentId: string,
    payload: UpsertStudentMedicalProfileRequest
  ): Promise<StudentMedicalProfileRecord> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: StudentMedicalProfileRecord }>(
      `/api/v1/schools/me/students/${encodeURIComponent(studentId)}/medical`,
      { method: 'PUT', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async getStudentDigitalId(studentId: string): Promise<StudentDigitalIdCardRecord | null> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: StudentDigitalIdCardRecord | null }>(
      `/api/v1/schools/me/students/${encodeURIComponent(studentId)}/digital-id`,
      { method: 'GET' }
    );
    return res.data;
  }

  public async issueStudentDigitalId(studentId: string, expiresInDays = 365): Promise<IssueDigitalIdCardResponse> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: IssueDigitalIdCardResponse }>(
      `/api/v1/schools/me/students/${encodeURIComponent(studentId)}/digital-id`,
      { method: 'POST', body: JSON.stringify({ expiresInDays }) }
    );
    return res.data;
  }

  public async revokeStudentDigitalId(studentId: string, reason: string): Promise<StudentDigitalIdCardRecord> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: StudentDigitalIdCardRecord }>(
      `/api/v1/schools/me/students/${encodeURIComponent(studentId)}/digital-id/revoke`,
      { method: 'POST', body: JSON.stringify({ reason }) }
    );
    return res.data;
  }

  public async listAdmissions(status?: string): Promise<StudentAdmissionRecord[]> {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: StudentAdmissionRecord[] }>(
      `/api/v1/schools/me/admissions${qs}`,
      { method: 'GET' }
    );
    return res.data;
  }

  public async createAdmission(payload: CreateStudentAdmissionRequest): Promise<StudentAdmissionRecord> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: StudentAdmissionRecord }>(
      '/api/v1/schools/me/admissions',
      { method: 'POST', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async reviewAdmission(admissionId: string, payload: ReviewAdmissionRequest): Promise<StudentAdmissionRecord> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: StudentAdmissionRecord }>(
      `/api/v1/schools/me/admissions/${encodeURIComponent(admissionId)}/review`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async enrollAdmission(
    admissionId: string,
    payload: EnrollAdmissionRequest
  ): Promise<{ admission: StudentAdmissionRecord; student: SchoolAdministrationStudent }> {
    const res = await this.requestAuthenticatedSchoolFlow<{
      success: boolean;
      data: { admission: StudentAdmissionRecord; student: SchoolAdministrationStudent };
    }>(`/api/v1/schools/me/admissions/${encodeURIComponent(admissionId)}/enroll`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return res.data;
  }

  public async listMyWards(): Promise<GuardianWardSummary[]> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: GuardianWardSummary[] }>(
      '/api/v1/schools/me/guardians/my-wards',
      { method: 'GET' }
    );
    return res.data;
  }

  public async listGuardians(search?: string): Promise<GuardianRecord[]> {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: GuardianRecord[] }>(
      `/api/v1/schools/me/guardians${qs}`,
      { method: 'GET' }
    );
    return res.data;
  }

  public async createGuardian(payload: CreateGuardianRequest): Promise<GuardianRecord> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: GuardianRecord }>(
      '/api/v1/schools/me/guardians',
      { method: 'POST', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async updateGuardian(guardianId: string, payload: UpdateGuardianRequest): Promise<GuardianRecord> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: GuardianRecord }>(
      `/api/v1/schools/me/guardians/${encodeURIComponent(guardianId)}`,
      { method: 'PATCH', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async verifyGuardian(
    guardianId: string,
    status: 'verified' | 'rejected' | 'suspended'
  ): Promise<GuardianRecord> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: GuardianRecord }>(
      `/api/v1/schools/me/guardians/${encodeURIComponent(guardianId)}/verify`,
      { method: 'POST', body: JSON.stringify({ status }) }
    );
    return res.data;
  }

  public async linkStudentGuardian(
    guardianId: string,
    payload: LinkStudentGuardianRequest
  ): Promise<StudentGuardianLinkRecord> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: StudentGuardianLinkRecord }>(
      `/api/v1/schools/me/guardians/${encodeURIComponent(guardianId)}/students`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async unlinkStudentGuardian(guardianId: string, studentId: string): Promise<{ unlinked: boolean }> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: { unlinked: boolean } }>(
      `/api/v1/schools/me/guardians/${encodeURIComponent(guardianId)}/students/${encodeURIComponent(studentId)}`,
      { method: 'DELETE' }
    );
    return res.data;
  }

  public async listClasses(
    query: { page?: number; pageSize?: number; search?: string; status?: 'active' | 'archived' } = {}
  ): Promise<{ records: SchoolAdministrationClass[]; page: number; pageSize: number; total: number }> {
    const qs = new URLSearchParams();
    if (query.page !== undefined) qs.set('page', String(query.page));
    if (query.pageSize !== undefined) qs.set('pageSize', String(query.pageSize));
    if (query.search) qs.set('search', query.search);
    if (query.status) qs.set('status', query.status);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    const res = await this.requestAuthenticatedSchoolFlow<{
      success: boolean;
      data: { records: SchoolAdministrationClass[]; page: number; pageSize: number; total: number };
    }>(`/api/v1/schools/me/classes${suffix}`, { method: 'GET' });
    return res.data;
  }

  public async createClass(payload: CreateSchoolClassRequest): Promise<SchoolAdministrationClass> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: SchoolAdministrationClass }>(
      '/api/v1/schools/me/classes',
      { method: 'POST', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async updateClass(classId: string, payload: UpdateSchoolClassRequest): Promise<SchoolAdministrationClass> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: SchoolAdministrationClass }>(
      `/api/v1/schools/me/classes/${encodeURIComponent(classId)}`,
      { method: 'PATCH', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async listStaff(
    query: { page?: number; pageSize?: number; search?: string; status?: string } = {}
  ): Promise<SchoolStaffPage> {
    const qs = new URLSearchParams();
    if (query.page !== undefined) qs.set('page', String(query.page));
    if (query.pageSize !== undefined) qs.set('pageSize', String(query.pageSize));
    if (query.search) qs.set('search', query.search);
    if (query.status) qs.set('status', query.status);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: SchoolStaffPage }>(
      `/api/v1/schools/me/staff${suffix}`,
      { method: 'GET' }
    );
    return res.data;
  }

  public async getStaff(staffId: string): Promise<SchoolStaffRecord> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: SchoolStaffRecord }>(
      `/api/v1/schools/me/staff/${encodeURIComponent(staffId)}`,
      { method: 'GET' }
    );
    return res.data;
  }

  public async createStaff(payload: CreateSchoolStaffRequest): Promise<SchoolStaffRecord> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: SchoolStaffRecord }>(
      '/api/v1/schools/me/staff',
      { method: 'POST', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async updateStaff(staffId: string, payload: UpdateSchoolStaffRequest): Promise<SchoolStaffRecord> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: SchoolStaffRecord }>(
      `/api/v1/schools/me/staff/${encodeURIComponent(staffId)}`,
      { method: 'PATCH', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async linkStaffUser(staffId: string, userId: string): Promise<SchoolStaffRecord> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: SchoolStaffRecord }>(
      `/api/v1/schools/me/staff/${encodeURIComponent(staffId)}/link-user`,
      { method: 'POST', body: JSON.stringify({ userId }) }
    );
    return res.data;
  }

  public async unlinkStaffUser(staffId: string, reason: string): Promise<SchoolStaffRecord> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: SchoolStaffRecord }>(
      `/api/v1/schools/me/staff/${encodeURIComponent(staffId)}/unlink-user`,
      { method: 'POST', body: JSON.stringify({ reason }) }
    );
    return res.data;
  }

  public async appointStaffRole(staffId: string, roleCode: string): Promise<SchoolStaffRecord> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: SchoolStaffRecord }>(
      `/api/v1/schools/me/staff/${encodeURIComponent(staffId)}/appointments`,
      { method: 'POST', body: JSON.stringify({ roleCode }) }
    );
    return res.data;
  }

  public async listStaffSubjectAllocations(staffId: string): Promise<StaffSubjectAllocationRecord[]> {
    const res = await this.requestAuthenticatedSchoolFlow<{
      success: boolean;
      data: StaffSubjectAllocationRecord[];
    }>(`/api/v1/schools/me/staff/${encodeURIComponent(staffId)}/subject-allocations`, { method: 'GET' });
    return res.data;
  }

  public async allocateStaffSubject(
    staffId: string,
    payload: AllocateStaffSubjectRequest
  ): Promise<StaffSubjectAllocationRecord> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: StaffSubjectAllocationRecord }>(
      `/api/v1/schools/me/staff/${encodeURIComponent(staffId)}/subject-allocations`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async revokeStaffSubjectAllocation(staffId: string, allocationId: string): Promise<{ revoked: boolean }> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: { revoked: boolean } }>(
      `/api/v1/schools/me/staff/${encodeURIComponent(staffId)}/subject-allocations/${encodeURIComponent(allocationId)}`,
      { method: 'DELETE' }
    );
    return res.data;
  }

  public async transitionStaffStatus(
    staffId: string,
    payload: StaffStatusTransitionRequest
  ): Promise<SchoolStaffRecord> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: SchoolStaffRecord }>(
      `/api/v1/schools/me/staff/${encodeURIComponent(staffId)}/status`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async listIamRoles(): Promise<IamRoleDefinition[]> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: IamRoleDefinition[] }>(
      '/api/v1/schools/me/roles',
      { method: 'GET' }
    );
    return res.data;
  }

  public async listIamPermissions(): Promise<Array<{ code: string; description: string }>> {
    const res = await this.requestAuthenticatedSchoolFlow<{
      success: boolean;
      data: Array<{ code: string; description: string }>;
    }>('/api/v1/schools/me/permissions', { method: 'GET' });
    return res.data;
  }

  public async listIamMemberships(): Promise<IamMembershipRecord[]> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: IamMembershipRecord[] }>(
      '/api/v1/schools/me/memberships',
      { method: 'GET' }
    );
    return res.data;
  }

  public async assignMembershipRole(userId: string, roleCode: string): Promise<{ assigned: boolean }> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: { assigned: boolean } }>(
      '/api/v1/schools/me/memberships/roles',
      { method: 'POST', body: JSON.stringify({ userId, roleCode }) }
    );
    return res.data;
  }

  public async revokeMembershipRole(userId: string, roleCode: string, reason: string): Promise<{ revoked: boolean }> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: { revoked: boolean } }>(
      '/api/v1/schools/me/memberships/roles',
      { method: 'DELETE', body: JSON.stringify({ userId, roleCode, reason }) }
    );
    return res.data;
  }

  public async suspendMembership(userId: string, reason: string): Promise<{ suspended: boolean }> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: { suspended: boolean } }>(
      `/api/v1/schools/me/memberships/${encodeURIComponent(userId)}/suspend`,
      { method: 'POST', body: JSON.stringify({ reason }) }
    );
    return res.data;
  }

  public async reactivateMembership(userId: string, reason: string): Promise<{ reactivated: boolean }> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: { reactivated: boolean } }>(
      `/api/v1/schools/me/memberships/${encodeURIComponent(userId)}/reactivate`,
      { method: 'POST', body: JSON.stringify({ reason }) }
    );
    return res.data;
  }

  public async revokeMembership(userId: string, reason: string): Promise<{ revoked: boolean }> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: { revoked: boolean } }>(
      `/api/v1/schools/me/memberships/${encodeURIComponent(userId)}/revoke`,
      { method: 'POST', body: JSON.stringify({ reason }) }
    );
    return res.data;
  }

  public async listMemberInvitations(): Promise<IamMemberInvitationRecord[]> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: IamMemberInvitationRecord[] }>(
      '/api/v1/schools/me/invitations',
      { method: 'GET' }
    );
    return res.data;
  }

  public async createMemberInvitation(
    payload: CreateMemberInvitationRequest
  ): Promise<{ invitation: IamMemberInvitationRecord; rawToken?: string }> {
    const res = await this.requestAuthenticatedSchoolFlow<{
      success: boolean;
      data: { invitation: IamMemberInvitationRecord; rawToken?: string };
    }>('/api/v1/schools/me/invitations', { method: 'POST', body: JSON.stringify(payload) });
    return res.data;
  }

  public async revokeMemberInvitation(invitationId: string, reason: string): Promise<{ revoked: boolean }> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: { revoked: boolean } }>(
      `/api/v1/schools/me/invitations/${encodeURIComponent(invitationId)}/revoke`,
      { method: 'POST', body: JSON.stringify({ reason }) }
    );
    return res.data;
  }

  public async listIamSessions(userIdFilter?: string): Promise<IamSessionRecord[]> {
    const qs = userIdFilter ? `?userId=${encodeURIComponent(userIdFilter)}` : '';
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: IamSessionRecord[] }>(
      `/api/v1/schools/me/sessions${qs}`,
      { method: 'GET' }
    );
    return res.data;
  }

  public async revokeIamSession(sessionId: string, reason?: string): Promise<{ revoked: boolean }> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: { revoked: boolean } }>(
      `/api/v1/schools/me/sessions/${encodeURIComponent(sessionId)}/revoke`,
      { method: 'POST', body: JSON.stringify({ reason }) }
    );
    return res.data;
  }

  public async listIamAuditEvents(query: { action?: string; limit?: number } = {}): Promise<IamAuditEventRecord[]> {
    const qs = new URLSearchParams();
    if (query.action) qs.set('action', query.action);
    if (query.limit !== undefined) qs.set('limit', String(query.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: IamAuditEventRecord[] }>(
      `/api/v1/schools/me/audit-events${suffix}`,
      { method: 'GET' }
    );
    return res.data;
  }

  public async listMfaFactors(): Promise<MfaFactorSummary[]> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: MfaFactorSummary[] }>(
      '/api/v1/schools/me/mfa/totp',
      { method: 'GET' }
    );
    return res.data;
  }

  public async enrollTotpMfa(
    friendlyName?: string
  ): Promise<{ factorId: string; otpauthUri: string; secretBase32: string }> {
    const res = await this.requestAuthenticatedSchoolFlow<{
      success: boolean;
      data: { factorId: string; otpauthUri: string; secretBase32: string };
    }>('/api/v1/schools/me/mfa/totp', { method: 'POST', body: JSON.stringify({ friendlyName }) });
    return res.data;
  }

  public async verifyTotpMfa(factorId: string, code: string): Promise<{ verified: boolean }> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: { verified: boolean } }>(
      `/api/v1/schools/me/mfa/totp/${encodeURIComponent(factorId)}/verify`,
      { method: 'POST', body: JSON.stringify({ code }) }
    );
    return res.data;
  }

  public async disableTotpMfa(factorId: string): Promise<{ disabled: boolean }> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: { disabled: boolean } }>(
      `/api/v1/schools/me/mfa/totp/${encodeURIComponent(factorId)}`,
      { method: 'DELETE' }
    );
    return res.data;
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
    void tenantId;
    const res = await this.request<{ success: boolean; data: SchoolAttendanceRecord[] }>(
      '/api/v1/attendance/register',
      { method: 'GET' },
      'school_flow'
    );
    return res.data;
  }

  public async recordAttendance(
    tenantId: string | undefined, 
    record: Omit<SchoolAttendanceRecord, 'id' | 'tenantId' | 'timestamp'>
  ): Promise<SchoolAttendanceRecord> {
    void tenantId;
    void record;
    throw {
      success: false,
      error: 'Attendance records are generated from authenticated device events or manual adjustments on existing records.',
      code: 'ATTENDANCE_NOT_READY'
    };
  }

  private buildSchoolQuerySuffix(params: Record<string, string | undefined>): string {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && value.trim()) qs.set(key, value.trim());
    }
    const raw = qs.toString();
    return raw ? `?${raw}` : '';
  }

  public async getAttendanceCapability<T = {
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
  }>(schoolId?: string): Promise<T> {
    const suffix = this.buildSchoolQuerySuffix({ schoolId });
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: T }>(
      `/api/v1/schools/me/attendance/capability${suffix}`,
      { method: 'GET' }
    );
    return res.data;
  }

  public async listAttendanceDevices<T = Array<{
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
  }>>(schoolId?: string): Promise<T> {
    const suffix = this.buildSchoolQuerySuffix({ schoolId });
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: T }>(
      `/api/v1/schools/me/attendance/devices${suffix}`,
      { method: 'GET' }
    );
    return res.data;
  }

  public async getAttendanceDeviceDetail<T = Record<string, unknown>>(
    deviceId: string,
    schoolId?: string
  ): Promise<T> {
    const suffix = this.buildSchoolQuerySuffix({ schoolId });
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: T }>(
      `/api/v1/schools/me/attendance/devices/${encodeURIComponent(deviceId)}${suffix}`,
      { method: 'GET' }
    );
    return res.data;
  }

  public async testAttendanceDevice<T = Record<string, unknown>>(
    deviceId: string,
    schoolId?: string
  ): Promise<T> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: T }>(
      `/api/v1/schools/me/attendance/devices/${encodeURIComponent(deviceId)}/test`,
      { method: 'POST', body: JSON.stringify(schoolId ? { schoolId } : {}) }
    );
    return res.data;
  }

  public async suspendAttendanceDevice<T = Record<string, unknown>>(
    deviceId: string,
    reason: string,
    schoolId?: string
  ): Promise<T> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: T }>(
      `/api/v1/schools/me/attendance/devices/${encodeURIComponent(deviceId)}/suspend`,
      { method: 'POST', body: JSON.stringify({ reason, ...(schoolId ? { schoolId } : {}) }) }
    );
    return res.data;
  }

  public async reactivateAttendanceDevice<T = Record<string, unknown>>(
    deviceId: string,
    reason: string,
    schoolId?: string
  ): Promise<T> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: T }>(
      `/api/v1/schools/me/attendance/devices/${encodeURIComponent(deviceId)}/reactivate`,
      { method: 'POST', body: JSON.stringify({ reason, ...(schoolId ? { schoolId } : {}) }) }
    );
    return res.data;
  }

  public async revokeAttendanceDevice<T = Record<string, unknown>>(
    deviceId: string,
    reason: string,
    schoolId?: string
  ): Promise<T> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: T }>(
      `/api/v1/schools/me/attendance/devices/${encodeURIComponent(deviceId)}/revoke`,
      { method: 'POST', body: JSON.stringify({ reason, ...(schoolId ? { schoolId } : {}) }) }
    );
    return res.data;
  }

  public async decommissionAttendanceDevice<T = Record<string, unknown>>(
    deviceId: string,
    reason: string,
    schoolId?: string
  ): Promise<T> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: T }>(
      `/api/v1/schools/me/attendance/devices/${encodeURIComponent(deviceId)}/decommission`,
      { method: 'POST', body: JSON.stringify({ reason, ...(schoolId ? { schoolId } : {}) }) }
    );
    return res.data;
  }

  public async rotateAttendanceDeviceCredential<T = Record<string, unknown>>(
    deviceId: string,
    reason: string,
    schoolId?: string
  ): Promise<T> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: T }>(
      `/api/v1/schools/me/attendance/devices/${encodeURIComponent(deviceId)}/credentials/rotate`,
      { method: 'POST', body: JSON.stringify({ reason, ...(schoolId ? { schoolId } : {}) }) }
    );
    return res.data;
  }

  public async revokeAttendanceDeviceCredential<T = Record<string, unknown>>(
    deviceId: string,
    reason: string,
    schoolId?: string
  ): Promise<T> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: T }>(
      `/api/v1/schools/me/attendance/devices/${encodeURIComponent(deviceId)}/credentials/revoke`,
      { method: 'POST', body: JSON.stringify({ reason, ...(schoolId ? { schoolId } : {}) }) }
    );
    return res.data;
  }

  public async getAttendanceRegister<T = Array<{
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
  }>>(filters: {
    schoolId?: string;
    date?: string;
    classId?: string;
    population?: string;
    attendanceType?: string;
    status?: string;
  } = {}): Promise<T> {
    const suffix = this.buildSchoolQuerySuffix(filters);
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: T }>(
      `/api/v1/attendance/register${suffix}`,
      { method: 'GET' }
    );
    return res.data;
  }

  public async getAttendanceSyncStatus<T = {
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
  }>(schoolId?: string): Promise<T> {
    const suffix = this.buildSchoolQuerySuffix({ schoolId });
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: T }>(
      `/api/v1/attendance/sync-status${suffix}`,
      { method: 'GET' }
    );
    return res.data;
  }

  public async adjustAttendanceRecord<T = {
    adjustmentId: string;
    attendanceRecordId: string;
    previousState: { status: string; sourceType: string; reviewReason: string | null };
    newState: { status: string; sourceType: string; reviewReason: string | null };
    reason: string;
    actorUserId: string;
    adjustedAt: string;
    sourceEventId: string | null;
  }>(
    recordId: string,
    payload: { status: string; reason: string; schoolId?: string }
  ): Promise<T> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: T }>(
      `/api/v1/attendance/records/${encodeURIComponent(recordId)}/adjustments`,
      { method: 'PATCH', body: JSON.stringify(payload) }
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
  // CENTRAL MESSAGING & AUTHENTICATION GATEWAY (CMAG)
  // =============================================================

  public async requestPlatformOtp(payload: CmagOtpRequestPayload): Promise<CmagOtpRequestResponse> {
    const res = await this.request<{ success: boolean; data: CmagOtpRequestResponse }>(
      '/api/v1/server/auth/otp/request',
      { method: 'POST', body: JSON.stringify(payload) },
      'none'
    );
    return res.data;
  }

  public async verifyPlatformOtp(payload: CmagOtpVerifyPayload): Promise<CmagOtpVerifyResponse> {
    const res = await this.request<{ success: boolean; data: CmagOtpVerifyResponse }>(
      '/api/v1/server/auth/otp/verify',
      { method: 'POST', body: JSON.stringify(payload) },
      'none'
    );
    if (res.data?.token) {
      this.setControlPlaneToken(res.data.token);
    }
    return res.data;
  }

  public async requestSchoolOtp(payload: CmagOtpRequestPayload): Promise<CmagOtpRequestResponse> {
    const res = await this.request<{ success: boolean; data: CmagOtpRequestResponse }>(
      '/api/v1/schools/auth/otp/request',
      { method: 'POST', body: JSON.stringify(payload) },
      'none'
    );
    return res.data;
  }

  public async verifySchoolOtp(payload: CmagOtpVerifyPayload): Promise<CmagOtpVerifyResponse> {
    const res = await this.request<{ success: boolean; data: CmagOtpVerifyResponse }>(
      '/api/v1/schools/auth/otp/verify',
      { method: 'POST', body: JSON.stringify(payload) },
      'none'
    );
    if (res.data?.token) {
      this.setSchoolFlowToken(res.data.token, res.data.tenantId);
    }
    return res.data;
  }

  public async requestFlowOtp(payload: CmagOtpRequestPayload): Promise<CmagOtpRequestResponse> {
    const res = await this.request<{ success: boolean; data: CmagOtpRequestResponse }>(
      '/api/v1/flow/auth/otp/request',
      { method: 'POST', body: JSON.stringify(payload) },
      'none'
    );
    return res.data;
  }

  public async verifyFlowOtp(payload: CmagOtpVerifyPayload): Promise<CmagOtpVerifyResponse> {
    const res = await this.request<{ success: boolean; data: CmagOtpVerifyResponse }>(
      '/api/v1/flow/auth/otp/verify',
      { method: 'POST', body: JSON.stringify(payload) },
      'none'
    );
    if (res.data?.token) {
      this.setSchoolFlowToken(res.data.token, res.data.tenantId);
    }
    return res.data;
  }

  public async getPlatformMessagingOverview(): Promise<CmagPlatformOverviewResponse> {
    const res = await this.requestAuthenticatedControlPlane<{ success: boolean; data: CmagPlatformOverviewResponse }>(
      '/api/v1/platform/messaging/overview',
      { method: 'GET' }
    );
    return res.data;
  }

  public async updatePlatformMessagingConfig(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const res = await this.requestAuthenticatedControlPlane<{ success: boolean; data: Record<string, unknown> }>(
      '/api/v1/platform/messaging/config',
      { method: 'PATCH', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async upsertPlatformProviderConfig(
    providerId: string,
    payload: {
      channel: 'sms' | 'whatsapp' | 'email';
      displayName?: string;
      enabled: boolean;
      isPrimary?: boolean;
      priority?: number;
      environment?: 'development' | 'staging' | 'production';
      senderName?: string;
      whatsappSenderNumber?: string;
      credentials?: Record<string, string>;
      webhookSecret?: string;
    }
  ): Promise<CmagProviderSummary> {
    const res = await this.requestAuthenticatedControlPlane<{ success: boolean; data: CmagProviderSummary }>(
      `/api/v1/platform/messaging/providers/${encodeURIComponent(providerId)}`,
      { method: 'PUT', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async suspendPlatformProvider(providerId: string, reason: string): Promise<{ suspended: boolean }> {
    const res = await this.requestAuthenticatedControlPlane<{ success: boolean; data: { suspended: boolean } }>(
      `/api/v1/platform/messaging/providers/${encodeURIComponent(providerId)}/suspend`,
      { method: 'POST', body: JSON.stringify({ reason }) }
    );
    return res.data;
  }

  public async resumePlatformProvider(providerId: string): Promise<{ suspended: boolean }> {
    const res = await this.requestAuthenticatedControlPlane<{ success: boolean; data: { suspended: boolean } }>(
      `/api/v1/platform/messaging/providers/${encodeURIComponent(providerId)}/resume`,
      { method: 'POST', body: JSON.stringify({}) }
    );
    return res.data;
  }

  public async registerPlatformSender(payload: {
    scope: 'platform' | 'tenant';
    tenantId?: string;
    channel: 'sms' | 'whatsapp';
    providerId: string;
    senderValue: string;
    approvalStatus?: 'pending' | 'submitted' | 'approved' | 'rejected';
    isDefault?: boolean;
  }): Promise<Record<string, unknown>> {
    const res = await this.requestAuthenticatedControlPlane<{ success: boolean; data: Record<string, unknown> }>(
      '/api/v1/platform/messaging/senders',
      { method: 'POST', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async registerPlatformWhatsappTemplate(payload: {
    providerId: string;
    templateName: string;
    locale: string;
    category: 'AUTHENTICATION' | 'UTILITY' | 'MARKETING';
    approvalStatus?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paused';
    headerText?: string;
    bodyText: string;
    footerText?: string;
  }): Promise<Record<string, unknown>> {
    const res = await this.requestAuthenticatedControlPlane<{ success: boolean; data: Record<string, unknown> }>(
      '/api/v1/platform/messaging/whatsapp-templates',
      { method: 'POST', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async suspendMessagingTenant(tenantId: string, reason: string): Promise<Record<string, unknown>> {
    const res = await this.requestAuthenticatedControlPlane<{ success: boolean; data: Record<string, unknown> }>(
      `/api/v1/platform/messaging/tenants/${encodeURIComponent(tenantId)}/suspend`,
      { method: 'POST', body: JSON.stringify({ reason }) }
    );
    return res.data;
  }

  public async resumeMessagingTenant(tenantId: string): Promise<Record<string, unknown>> {
    const res = await this.requestAuthenticatedControlPlane<{ success: boolean; data: Record<string, unknown> }>(
      `/api/v1/platform/messaging/tenants/${encodeURIComponent(tenantId)}/resume`,
      { method: 'POST', body: JSON.stringify({}) }
    );
    return res.data;
  }

  public async dispatchCmagQueueNow(limit = 20): Promise<{ processed: number; sent: number; failed: number }> {
    const res = await this.requestAuthenticatedControlPlane<{
      success: boolean;
      data: { processed: number; sent: number; failed: number };
    }>('/api/v1/platform/messaging/dispatch-now', {
      method: 'POST',
      body: JSON.stringify({ limit })
    });
    return res.data;
  }

  public async retryPlatformMessage(outboxId: string): Promise<{ retried: boolean }> {
    const res = await this.requestAuthenticatedControlPlane<{ success: boolean; data: { retried: boolean } }>(
      `/api/v1/platform/messaging/messages/${encodeURIComponent(outboxId)}/retry`,
      { method: 'POST', body: JSON.stringify({}) }
    );
    return res.data;
  }

  public async sendPlatformMessage(payload: {
    channel: 'sms' | 'whatsapp' | 'email';
    to: string;
    message: string;
    subject?: string;
    purpose?: string;
    category?: string;
    senderName?: string;
    senderNumber?: string;
  }): Promise<Record<string, unknown>> {
    const res = await this.requestAuthenticatedControlPlane<{ success: boolean; data: Record<string, unknown> }>(
      '/api/v1/platform/messaging/send',
      { method: 'POST', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async getSchoolMessagingOverview(): Promise<CmagTenantOverviewResponse> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: CmagTenantOverviewResponse }>(
      '/api/v1/messaging/overview',
      { method: 'GET' }
    );
    return res.data;
  }

  public async updateSchoolMessagingConfig(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: Record<string, unknown> }>(
      '/api/v1/messaging/config',
      { method: 'PATCH', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async upsertSchoolMessagingTemplate(payload: {
    templateKey: string;
    locale: string;
    channel: 'sms' | 'whatsapp' | 'email';
    category: string;
    title: string;
    bodyTemplate: string;
    whatsappTemplateName?: string;
    sensitiveDataPolicy?: 'standard' | 'strict_redacted';
  }): Promise<Record<string, unknown>> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: Record<string, unknown> }>(
      '/api/v1/messaging/templates',
      { method: 'PUT', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async upsertSchoolMessagingPreference(payload: {
    recipientType: 'guardian' | 'staff' | 'student' | 'user';
    recipientId: string;
    preferredChannel?: 'sms' | 'whatsapp' | 'email';
    preferredLocale?: string;
    smsOptIn?: boolean;
    whatsappOptIn?: boolean;
    emailOptIn?: boolean;
    marketingOptIn?: boolean;
    quietHoursStart?: string | null;
    quietHoursEnd?: string | null;
  }): Promise<Record<string, unknown>> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: Record<string, unknown> }>(
      '/api/v1/messaging/preferences',
      { method: 'PUT', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async sendSchoolMessage(payload: CmagTargetedSendRequest): Promise<Record<string, unknown>> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: Record<string, unknown> }>(
      '/api/v1/messaging/send',
      { method: 'POST', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async createSchoolBroadcast(payload: CmagBroadcastRequest): Promise<Record<string, unknown>> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: Record<string, unknown> }>(
      '/api/v1/messaging/broadcasts',
      { method: 'POST', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async retrySchoolMessage(outboxId: string): Promise<{ retried: boolean }> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: { retried: boolean } }>(
      `/api/v1/messaging/messages/${encodeURIComponent(outboxId)}/retry`,
      { method: 'POST', body: JSON.stringify({}) }
    );
    return res.data;
  }

  public async getSchoolMessagingQueue(): Promise<CmagQueueMetrics> {
    const res = await this.requestAuthenticatedSchoolFlow<{ success: boolean; data: CmagQueueMetrics }>(
      '/api/v1/messaging/queue',
      { method: 'GET' }
    );
    return res.data;
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
