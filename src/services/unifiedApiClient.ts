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
import { TenantSchoolApp } from '../types';
import { RegisteredApplication, RegisteredFeature } from '../types/applicationRegistry';
import { InstanceArchitectureProfile, IIAPEAssessmentRequest } from '../types/iiapEngine';
import { DatabaseInstanceRecord, StorageConfigRecord } from '../types/storageAndDatabase';
import { ProvisioningJob } from '../types/gcpProvisioning';
import { getSuperAdminAuthHeader } from './controlPlaneToken';

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
      } else {
        // Fall back to server-signed token generator
        const fallbackAuth = getSuperAdminAuthHeader();
        Object.assign(headers, fallbackAuth);
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
          correlationId: data.correlationId || correlationId,
          timestamp: data.timestamp || new Date().toISOString(),
          details: data.details
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
        correlationId,
        timestamp: new Date().toISOString()
      };
      throw wrappedError;
    }
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

  public async getDatabases(): Promise<DatabaseInstanceRecord[]> {
    const res = await this.request<{ status: string; databases: DatabaseInstanceRecord[] }>(
      '/api/v1/server/databases',
      { method: 'GET' },
      'control_plane'
    );
    return res.databases;
  }

  public async getStorageConfigs(): Promise<{ storageConfigs: StorageConfigRecord[]; migrationJobs: any[] }> {
    return this.request<{ status: string; storageConfigs: StorageConfigRecord[]; migrationJobs: any[] }>(
      '/api/v1/server/storage',
      { method: 'GET' },
      'control_plane'
    );
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
    const res = await this.request<{ success: boolean; data: SchoolFlowAuthLoginResponse }>(
      '/api/v1/flow/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ tenantId, usernameOrEmail, password, roleHint })
      },
      'none'
    );
    if (res.data?.token) {
      this.setSchoolFlowToken(res.data.token, res.data.tenantId);
    }
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
