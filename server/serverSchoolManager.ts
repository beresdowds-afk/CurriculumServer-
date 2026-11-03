import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { TenantSchoolApp } from '../src/types';
import { INITIAL_PROVISIONED_TENANTS, INITIAL_CLONED_TENANTS, INITIAL_SAAS_METRICS } from '../src/mockCurriculumServerData';
import { MOCK_STUDENT_PROFILES } from '../src/data/curriculumFlowData';
import { SchoolStudentSummary, SchoolAttendanceRecord, SchoolInstanceProfileResponse } from '../packages/shared-types/src/apiContracts';
import { TamperEvidentAuditService } from '../src/services/tamperEvidentAuditService';
import { StorageAndDatabaseManager } from './storageAndDatabaseManager';

const DATA_DIR = path.join(process.cwd(), 'data');
const TENANTS_FILE = path.join(DATA_DIR, 'tenants.json');
const ATTENDANCE_FILE = path.join(DATA_DIR, 'attendance.json');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');

export class ServerSchoolManager {
  private static instance: ServerSchoolManager;
  private tenants: TenantSchoolApp[] = [];
  private students: SchoolStudentSummary[] = [];
  private attendance: SchoolAttendanceRecord[] = [];

  private constructor() {
    this.loadPersistence();
  }

  public static getInstance(): ServerSchoolManager {
    if (!ServerSchoolManager.instance) {
      ServerSchoolManager.instance = new ServerSchoolManager();
    }
    return ServerSchoolManager.instance;
  }

  private loadPersistence(): void {
    try {
      if (fs.existsSync(TENANTS_FILE)) {
        const rawTenants: TenantSchoolApp[] = JSON.parse(fs.readFileSync(TENANTS_FILE, 'utf8'));
        const seen = new Set<string>();
        this.tenants = rawTenants.filter(t => {
          if (!t.id || seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
        });
        if (this.tenants.length !== rawTenants.length) {
          this.saveTenants();
        }
      } else {
        const seen = new Set<string>();
        this.tenants = [...INITIAL_PROVISIONED_TENANTS, ...INITIAL_CLONED_TENANTS].filter(t => {
          if (!t.id || seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
        });
        this.saveTenants();
      }

      if (fs.existsSync(STUDENTS_FILE)) {
        this.students = JSON.parse(fs.readFileSync(STUDENTS_FILE, 'utf8'));
      } else {
        // Seed default students mapped to initial tenants
        const initialTenantId = this.tenants[0]?.id || 'tenant_apex_001';
        this.students = MOCK_STUDENT_PROFILES.map((s: any, idx) => ({
          id: s.studentId || s.id || `stu_${idx + 1}`,
          tenantId: initialTenantId,
          admissionNumber: s.admissionNumber || `ADM-2026-${1000 + idx}`,
          fullName: s.studentName || s.name || `Student ${idx + 1}`,
          classGrade: s.classGrade || 'SS 2',
          gender: s.gender || (idx % 2 === 0 ? 'Female' : 'Male'),
          parentName: s.parentName || s.parentGuardian?.name || 'Alhaji & Mrs. Mustapha',
          parentPhone: s.parentPhone || s.parentGuardian?.phone || '+234 803 123 4567',
          status: 'Active' as const,
          feeStatus: (s.bursaryStatus?.outstandingBalanceNgn === 0 ? 'Paid' : 'Pending') as 'Paid' | 'Pending'
        }));
        this.saveStudents();
      }

      if (fs.existsSync(ATTENDANCE_FILE)) {
        this.attendance = JSON.parse(fs.readFileSync(ATTENDANCE_FILE, 'utf8'));
      } else {
        const initialTenantId = this.tenants[0]?.id || 'tenant_apex_001';
        this.attendance = [
          {
            id: 'att_001',
            tenantId: initialTenantId,
            studentId: this.students[0]?.id || 'stu_1',
            studentName: this.students[0]?.fullName || 'Zainab Mustapha',
            classGrade: 'SS 2',
            date: new Date().toISOString().split('T')[0],
            status: 'Present',
            method: 'RFID_GATE',
            timestamp: new Date().toISOString()
          }
        ];
        this.saveAttendance();
      }
    } catch (e) {
      console.error('Error loading ServerSchoolManager persistence:', e);
      this.tenants = [...INITIAL_PROVISIONED_TENANTS];
    }
  }

  private saveTenants(): void {
    try {
      fs.writeFileSync(TENANTS_FILE, JSON.stringify(this.tenants, null, 2), 'utf8');
    } catch (e) {
      console.error('Error saving tenants:', e);
    }
  }

  private saveStudents(): void {
    try {
      fs.writeFileSync(STUDENTS_FILE, JSON.stringify(this.students, null, 2), 'utf8');
    } catch (e) {
      console.error('Error saving students:', e);
    }
  }

  private saveAttendance(): void {
    try {
      fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify(this.attendance, null, 2), 'utf8');
    } catch (e) {
      console.error('Error saving attendance:', e);
    }
  }

  // =============================================================
  // TENANT MANAGEMENT METHODS
  // =============================================================

  public getTenants(): TenantSchoolApp[] {
    return this.tenants;
  }

  public getTenantById(tenantId: string): TenantSchoolApp | undefined {
    return this.tenants.find(t => t.id === tenantId || t.appId === tenantId);
  }

  public getSchoolProfile(tenantId: string): SchoolInstanceProfileResponse | undefined {
    const tenant = this.getTenantById(tenantId);
    if (!tenant) return undefined;

    const storage = StorageAndDatabaseManager.getStorageConfig(tenant.id);
    const database = StorageAndDatabaseManager.getDatabaseRecord(tenant.id);

    return {
      tenantId: tenant.id,
      appId: tenant.appId,
      schoolName: tenant.schoolName,
      tagline: tenant.brandProfile?.motto || 'Excellence in Academics & Moral Guidance',
      subdomain: tenant.subdomain,
      domain: (tenant as any).domain || tenant.customDomain || `${tenant.subdomain}.curriculumflow.com.ng`,
      principalName: tenant.principalName,
      studentCapacity: tenant.studentCapacity,
      enrolledStudentsCount: tenant.activeStudentsCount,
      facultyCount: tenant.facultyCount,
      enabledFeatures: tenant.enabledFeatures,
      storageStrategy: storage ? storage.strategy : 'hybrid',
      databaseIsolation: database ? database.strategy : 'dedicated_database',
      status: tenant.status === 'active' ? 'ACTIVE' : 'SUSPENDED'
    };
  }

  public provisionTenant(data: {
    schoolName: string;
    subdomain: string;
    state: string;
    lga: string;
    businessModel: 'monthly' | 'yearly' | 'lease_to_own';
    studentCapacity: number;
    principalName: string;
    principalEmail: string;
    principalPhone: string;
    enabledModules: string[];
    storageStrategy?: 'private_drive' | 'platform_storage' | 'hybrid';
    databaseStrategy?: 'shared_schema_isolated' | 'dedicated_database' | 'dedicated_customer_gcp_project';
  }): TenantSchoolApp {
    const id = `tenant_${data.subdomain.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}_${Date.now().toString(36)}`;
    const randNum = Math.floor(100 + Math.random() * 900);
    const appId = `CF-${data.state.slice(0, 3).toUpperCase()}-${randNum}`;

    const enabledFeaturesMap: Record<string, boolean> = {
      ai_curriculum_advisor: true,
      adaptive_remedial_engine: data.enabledModules.includes('adaptive_remedial_engine'),
      biometric_rfid_gate: data.enabledModules.includes('biometric_rfid_gate'),
      secure_cbt_lockdown: true,
      bursary_psp_multi_split: data.enabledModules.includes('bursary_psp_multi_split'),
      parent_ward_security_hub: true,
      custom_domain_whitelabel: data.enabledModules.includes('custom_domain_whitelabel'),
      hybrid_offline_sync: false,
      whatsapp_sms_broadcast: data.enabledModules.includes('whatsapp_sms_broadcast'),
      spanner_audit_trail: true
    };

    const newTenant: any = {
      id,
      appId,
      schoolName: data.schoolName,
      subdomain: `${data.subdomain}.curriculumflow.com.ng`,
      domain: `${data.subdomain}.sch.ng`,
      locationState: data.state,
      lga: data.lga,
      studentCapacity: data.studentCapacity,
      activeStudentsCount: 0,
      facultyCount: 15,
      principalName: data.principalName,
      principalEmail: data.principalEmail,
      principalPhone: data.principalPhone,
      businessModel: data.businessModel,
      billingCycle: data.businessModel === 'yearly' ? 'yearly' : 'monthly',
      status: 'active',
      subscriptionTier: data.businessModel === 'lease_to_own' ? 'Apex Enterprise' : 'Pro College',
      enabledFeatures: enabledFeaturesMap as any,
      provisionedAt: new Date().toISOString(),
      shardNodeId: `shard-${data.state.slice(0, 3).toLowerCase()}-01`,
      databaseIsolationStrategy: data.databaseStrategy || 'dedicated_database',
      storageStrategy: data.storageStrategy || 'hybrid',
      brandProfile: {
        id: `brand_${id}`,
        schoolName: data.schoolName,
        shortName: data.schoolName.split(' ')[0],
        motto: 'Empowering Next-Generation Scholars',
        establishedYear: 2026,
        schoolType: 'Secondary School',
        accreditationNumber: `NERDC/${data.state.toUpperCase().substring(0, 3)}/2026/PROV`,
        examCentreNumbers: {
          waec: `WAEC/${Math.floor(1000000 + Math.random() * 9000000)}`,
          neco: `NECO/${Math.floor(1000000 + Math.random() * 9000000)}`
        },
        crestLogoUrl: '',
        logoShape: 'shield',
        logoIconType: 'school',
        crestBadgePreset: 'emerald_prestige',
        principalSignatureUrl: '',
        principalName: data.principalName,
        principalTitle: 'Principal & Executive Director',
        stampSealUrl: '',
        watermarkText: `${data.schoolName.toUpperCase()} • OFFICIAL`,
        brandTheme: {
          primaryColor: '#059669',
          secondaryColor: '#0284c7',
          accentColor: '#d97706',
          presetKey: 'emerald_prestige'
        },
        contact: {
          primaryEmail: data.principalEmail,
          admissionsEmail: `admissions@${data.subdomain}.sch.ng`,
          bursaryEmail: `bursar@${data.subdomain}.sch.ng`,
          principalEmail: data.principalEmail,
          primaryPhone: data.principalPhone,
          alternatePhone: '+234 800 000 0000',
          whatsappSupport: data.principalPhone,
          emergencyHelpline: '+234 800 911 0000',
          officialWebsite: `https://${data.subdomain}.sch.ng`,
          studentPortalUrl: `https://${data.subdomain}.curriculumflow.com.ng`
        }
      }
    };

    this.tenants.unshift(newTenant);
    this.saveTenants();

    // Auto-configure storage & database isolation in Phase 7 engine
    StorageAndDatabaseManager.configureDatabaseIsolation(
      newTenant.id,
      newTenant.id,
      newTenant.schoolName,
      data.databaseStrategy || 'dedicated_database'
    );

    StorageAndDatabaseManager.configureCustomerStorage(
      newTenant.id,
      newTenant.id,
      newTenant.schoolName,
      data.storageStrategy || 'hybrid',
      data.storageStrategy === 'private_drive' ? 'google_drive' : 'google_cloud_storage',
      data.storageStrategy === 'hybrid' ? 'google_cloud_storage' : undefined,
      undefined,
      50,
      1825,
      data.principalEmail
    );

    TamperEvidentAuditService.logPlatformAction({
      actor: 'platform_control_plane',
      actorRole: 'super_admin',
      tenantId: newTenant.id,
      tenantSchoolName: newTenant.schoolName,
      action: 'tenant_provisioned',
      target: newTenant.appId,
      result: 'SUCCESS',
      outcome: 'SUCCESS',
      details: `Provisioned instance with ${data.databaseStrategy || 'dedicated_database'} and ${data.storageStrategy || 'hybrid'} storage.`
    });

    return newTenant;
  }

  public toggleTenantStatus(tenantId: string): TenantSchoolApp | undefined {
    const tenant = this.getTenantById(tenantId);
    if (!tenant) return undefined;

    tenant.status = tenant.status === 'active' ? 'suspended' : 'active';
    this.saveTenants();

    TamperEvidentAuditService.logPlatformAction({
      actor: 'platform_control_plane',
      actorRole: 'super_admin',
      tenantId: tenant.id,
      tenantSchoolName: tenant.schoolName,
      action: tenant.status === 'active' ? 'tenant_reactivated' : 'tenant_suspended',
      target: tenant.id,
      result: 'SUCCESS',
      outcome: 'SUCCESS',
      details: `Instance status updated to: ${tenant.status.toUpperCase()}`
    });

    return tenant;
  }

  public setTenantStatus(tenantId: string, status: 'active' | 'suspended'): TenantSchoolApp | undefined {
    const tenant = this.getTenantById(tenantId);
    if (!tenant) return undefined;

    tenant.status = status;
    this.saveTenants();
    return tenant;
  }

  // =============================================================
  // STUDENT & ATTENDANCE METHODS (TENANT-SCOPED)
  // =============================================================

  public getStudentsByTenant(tenantId: string): SchoolStudentSummary[] {
    const cleanId = tenantId.trim().toLowerCase();
    const matches = this.students.filter(s => s.tenantId.toLowerCase() === cleanId);
    if (matches.length > 0) return matches;

    // If tenant has no specific students yet, synthesize a seeded directory for that tenant
    const seeded: SchoolStudentSummary[] = MOCK_STUDENT_PROFILES.map((s: any, idx) => ({
      id: `stu_${cleanId.slice(0, 8)}_${idx + 1}`,
      tenantId: cleanId,
      admissionNumber: `ADM-${new Date().getFullYear()}-${1000 + idx}`,
      fullName: s.studentName || s.name || `Student ${idx + 1}`,
      classGrade: s.classGrade || 'SS 2',
      gender: s.gender || (idx % 2 === 0 ? 'Female' : 'Male'),
      parentName: s.parentName || s.parentGuardian?.name || 'Guardian Records',
      parentPhone: s.parentPhone || s.parentGuardian?.phone || '+234 803 000 0000',
      status: 'Active' as const,
      feeStatus: (idx % 3 === 0 ? 'Pending' : 'Paid') as 'Paid' | 'Pending'
    }));

    this.students.push(...seeded);
    this.saveStudents();
    return seeded;
  }

  public getAttendanceByTenant(tenantId: string): SchoolAttendanceRecord[] {
    const cleanId = tenantId.trim().toLowerCase();
    return this.attendance.filter(a => a.tenantId.toLowerCase() === cleanId);
  }

  public recordAttendance(tenantId: string, record: Omit<SchoolAttendanceRecord, 'id' | 'tenantId' | 'timestamp'>): SchoolAttendanceRecord {
    const newRecord: SchoolAttendanceRecord = {
      id: `att_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
      tenantId: tenantId.trim().toLowerCase(),
      ...record,
      timestamp: new Date().toISOString()
    };

    this.attendance.unshift(newRecord);
    this.saveAttendance();

    TamperEvidentAuditService.logPlatformAction({
      actor: 'rfid_biometric_gate',
      actorRole: 'attendance_daemon',
      tenantId,
      action: 'attendance_logged',
      target: newRecord.studentId,
      result: 'SUCCESS',
      outcome: 'SUCCESS',
      details: `Logged ${newRecord.status} attendance for ${newRecord.studentName} via ${newRecord.method}`
    });

    return newRecord;
  }

  public getMetrics(): any {
    const active = this.tenants.filter(t => t.status === 'active').length;
    const suspended = this.tenants.filter(t => t.status === 'suspended').length;
    const pending = this.tenants.filter(t => (t.status as string) === 'pending' || t.status === 'trialing').length;
    const leaseToOwn = this.tenants.filter(t => t.businessModel === 'lease_to_own').length;
    const studentsTotal = this.tenants.reduce((acc, t) => acc + (t.activeStudentsCount || 800), 0);
    const facultyTotal = this.tenants.reduce((acc, t) => acc + (t.facultyCount || 25), 0);

    return {
      totalTenants: this.tenants.length,
      totalProvisionedTenants: this.tenants.length,
      activeTenants: active,
      trialingTenants: pending,
      leaseToOwnTenants: leaseToOwn,
      totalManagedStudents: studentsTotal,
      activeStudentsAcrossFleet: studentsTotal,
      totalManagedFaculty: facultyTotal,
      monthlyRecurringRevenueNGN: INITIAL_SAAS_METRICS.monthlyRecurringRevenueNGN,
      annualRecurringRevenueNGN: INITIAL_SAAS_METRICS.annualRecurringRevenueNGN,
      totalLeaseEquityPoolNGN: INITIAL_SAAS_METRICS.totalLeaseEquityPoolNGN,
      databaseHealth: 'healthy',
      storageHealth: 'healthy',
      globalUptimePercent: 99.98,
      platformVersion: 'Curriculum Server Multi-Tenant Core v3.0',
      activeInstances: {
        active,
        suspended,
        pending
      }
    };
  }
}

export const serverSchoolManager = ServerSchoolManager.getInstance();
