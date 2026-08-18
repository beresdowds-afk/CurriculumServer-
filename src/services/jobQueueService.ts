import { BackgroundJob, JobType, JobPriority, JobStatus, TenantResourcePolicy } from '../types';

export const INITIAL_BACKGROUND_JOBS: BackgroundJob[] = [
  {
    jobId: 'job_exam_9921',
    tenantId: 'tenant-kings-college',
    tenantSchoolName: "King's College Lagos",
    jobType: 'EXAM_PAPER_GENERATION',
    priority: 'HIGH',
    status: 'COMPLETED',
    createdAt: '2026-08-17T03:15:00Z',
    startedAt: '2026-08-17T03:15:02Z',
    completedAt: '2026-08-17T03:15:28Z',
    progressPercent: 100,
    retryCount: 0,
    maxRetries: 3,
    payloadSummary: 'SS 2 Chemistry Term 3 End-of-Term Examination (60 MCQs + 5 Theory Papers)',
    resultPayload: { examId: 'CF-EXAM-SS2-CHE-TERM3-8812', generatedQuestionsCount: 65 }
  },
  {
    jobId: 'job_mark_9922',
    tenantId: 'tenant-kings-college',
    tenantSchoolName: "King's College Lagos",
    jobType: 'MARKING_SCHEME_GENERATION',
    priority: 'MEDIUM',
    status: 'COMPLETED',
    createdAt: '2026-08-17T03:16:00Z',
    startedAt: '2026-08-17T03:16:02Z',
    completedAt: '2026-08-17T03:16:14Z',
    progressPercent: 100,
    retryCount: 0,
    maxRetries: 3,
    payloadSummary: 'Detailed WAEC/NERDC Rubric & Marking Scheme for SS 2 Chemistry',
    resultPayload: { markingSchemeId: 'CF-SCHEME-SS2-CHE-TERM3-8812' }
  },
  {
    jobId: 'job_snap_9923',
    tenantId: 'tenant-atlantic-crest',
    tenantSchoolName: 'Atlantic Crest Academy',
    jobType: 'DATABASE_BACKUP_SNAPSHOT',
    priority: 'LOW',
    status: 'COMPLETED',
    createdAt: '2026-08-17T02:00:00Z',
    startedAt: '2026-08-17T02:00:01Z',
    completedAt: '2026-08-17T02:00:19Z',
    progressPercent: 100,
    retryCount: 0,
    maxRetries: 3,
    payloadSummary: 'Nightly automated database & storage snapshot (48 tables, 142 MB)',
    resultPayload: { snapshotId: 'snap_atlantic_20260817' }
  },
  {
    jobId: 'job_rem_9924',
    tenantId: 'tenant-corona-schools',
    tenantSchoolName: 'Corona Secondary School Agbara',
    jobType: 'ADAPTIVE_REMEDIAL_BATCH',
    priority: 'HIGH',
    status: 'PROCESSING',
    createdAt: '2026-08-17T05:10:00Z',
    startedAt: '2026-08-17T05:10:03Z',
    progressPercent: 68,
    retryCount: 0,
    maxRetries: 3,
    payloadSummary: 'JSS 3 Mathematics Diagnostic Analysis (Quadratic Equations & Circle Theorems for 84 students)'
  },
  {
    jobId: 'job_dns_9925',
    tenantId: 'tenant-loyola-jesuit',
    tenantSchoolName: 'Loyola Jesuit College Abuja',
    jobType: 'DNS_PROPAGATION_POLL',
    priority: 'MEDIUM',
    status: 'QUEUED',
    createdAt: '2026-08-17T05:22:00Z',
    progressPercent: 0,
    retryCount: 0,
    maxRetries: 5,
    payloadSummary: 'Anycast multi-node verification for portal.loyolajesuit.edu.ng'
  }
];

export class TenantJobQueueManager {
  private jobs: BackgroundJob[] = [...INITIAL_BACKGROUND_JOBS];
  private tenantPolicies: Map<string, TenantResourcePolicy> = new Map();

  constructor() {
    // Seed default policy for tenants
    this.tenantPolicies.set('tenant-kings-college', {
      cpuLimitCores: 2.0,
      memoryLimitMb: 4096,
      storageQuotaMb: 10240,
      rateLimitReqPerMin: 1200,
      maxConcurrentBackgroundJobs: 4,
      aiMonthlyTokenLimit: 15000000,
      aiTokensUsedCurrentCycle: 3420000,
      aiExamsGeneratedCount: 88,
      maxStudentsLimit: 3000,
      maxTeachersLimit: 150
    });
  }

  getJobs(tenantId?: string): BackgroundJob[] {
    if (tenantId) {
      return this.jobs.filter(j => j.tenantId === tenantId);
    }
    return this.jobs;
  }

  getTenantPolicy(tenantId: string): TenantResourcePolicy {
    return this.tenantPolicies.get(tenantId) || {
      cpuLimitCores: 1.0,
      memoryLimitMb: 2048,
      storageQuotaMb: 5120,
      rateLimitReqPerMin: 600,
      maxConcurrentBackgroundJobs: 2,
      aiMonthlyTokenLimit: 5000000,
      aiTokensUsedCurrentCycle: 1200000,
      aiExamsGeneratedCount: 24,
      maxStudentsLimit: 1000,
      maxTeachersLimit: 50
    };
  }

  canEnqueueJob(tenantId: string): { allowed: boolean; reason?: string } {
    const policy = this.getTenantPolicy(tenantId);
    const activeJobs = this.jobs.filter(
      j => j.tenantId === tenantId && (j.status === 'QUEUED' || j.status === 'PROCESSING')
    );

    if (activeJobs.length >= policy.maxConcurrentBackgroundJobs) {
      return {
        allowed: false,
        reason: `Tenant concurrent background job limit reached (${activeJobs.length}/${policy.maxConcurrentBackgroundJobs}). Throttled to preserve isolated resource stability.`
      };
    }

    if (policy.aiTokensUsedCurrentCycle >= policy.aiMonthlyTokenLimit) {
      return {
        allowed: false,
        reason: `Monthly AI generation token quota reached for current cycle (${policy.aiTokensUsedCurrentCycle.toLocaleString()} / ${policy.aiMonthlyTokenLimit.toLocaleString()} tokens). Upgrade tier or wait for renewal.`
      };
    }

    return { allowed: true };
  }

  enqueueJob(
    tenantId: string,
    tenantSchoolName: string,
    jobType: JobType,
    priority: JobPriority,
    payloadSummary: string
  ): { job?: BackgroundJob; error?: string } {
    const check = this.canEnqueueJob(tenantId);
    if (!check.allowed) {
      return { error: check.reason };
    }

    const newJob: BackgroundJob = {
      jobId: `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      tenantSchoolName,
      jobType,
      priority,
      status: 'QUEUED',
      createdAt: new Date().toISOString(),
      progressPercent: 0,
      retryCount: 0,
      maxRetries: 3,
      payloadSummary
    };

    this.jobs.unshift(newJob);
    return { job: newJob };
  }

  updateJobProgress(jobId: string, progress: number, status?: JobStatus, resultPayload?: any, error?: string): void {
    const job = this.jobs.find(j => j.jobId === jobId);
    if (job) {
      job.progressPercent = progress;
      if (status) job.status = status;
      if (resultPayload) job.resultPayload = resultPayload;
      if (error) job.error = error;
      if (status === 'COMPLETED') job.completedAt = new Date().toISOString();
      if (status === 'PROCESSING' && !job.startedAt) job.startedAt = new Date().toISOString();
    }
  }
}

export const globalJobQueue = new TenantJobQueueManager();
