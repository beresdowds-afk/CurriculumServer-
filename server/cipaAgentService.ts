import crypto from 'crypto';

export type CipaRequestCategory = 
  | 'Full School Management Instance'
  | 'Custom Architecture Instance'
  | 'Feature Collection Instance'
  | 'Shared Infrastructure Instance'
  | 'Dedicated Cloud Run Instance'
  | 'Dedicated GCP Project Instance'
  | 'Hybrid Instance';

export type CipaLifecycleState = 
  | 'Draft'
  | 'Submitted'
  | 'Requirements Validation'
  | 'Architecture Evaluation'
  | 'Awaiting Architecture Approval'
  | 'Awaiting Privileged Approval'
  | 'Approved'
  | 'Ready for Execution'
  | 'Project Creation'
  | 'Infrastructure Deployment'
  | 'Container Deployment'
  | 'Database Configuration'
  | 'Storage Configuration'
  | 'Domain Configuration'
  | 'Verification'
  | 'Completed'
  | 'Failed'
  | 'Suspended'
  | 'Cancelled'
  | 'Rollback Required'
  | 'Rolled Back';

export interface CipaExtractedRequirements {
  schoolName: string;
  organisation: string;
  country: string;
  region: string;
  schoolType: string;
  studentPopulation: number;
  staffPopulation: number;
  concurrentUsers: number;
  requiredApplications: string[];
  requiredFeatures: string[];
  storageRequirementsGb: number;
  databaseRequirements: string;
  domainRequirements: string;
  securityIsolation: 'shared' | 'dedicated_service' | 'sovereign_project' | 'hybrid';
  availabilitySla: string;
  budgetConstraintNgn?: number;
  missingInfo: string[];
}

export interface CipaArchitectureRecommendation {
  recommendedTopology: CipaRequestCategory;
  rationale: string;
  tradeOffs: string[];
  estimatedMonthlyCostNgn: number;
  setupFeeNgn: number;
  recommendedGcpRegion: string;
  databaseStrategy: string;
  storageStrategy: string;
}

export interface CipaProvisioningPlanStep {
  stepNumber: number;
  stepName: string;
  description: string;
  component: string;
  identityRequired: string;
  requiresPiamApproval: boolean;
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

export interface CipaProvisioningRequestRecord {
  requestId: string;
  rawPrompt: string;
  classification: CipaRequestCategory;
  requirements: CipaExtractedRequirements;
  recommendation?: CipaArchitectureRecommendation;
  architectureProfileId?: string;
  plan: CipaProvisioningPlanStep[];
  lifecycleState: CipaLifecycleState;
  piamApprovalStatus: 'not_required' | 'pending_approval' | 'approved' | 'rejected';
  approverEmail?: string;
  approvalNotes?: string;
  createdAt: string;
  updatedAt: string;
  correlationId: string;
}

class CipaAgentService {
  private requests: Map<string, CipaProvisioningRequestRecord> = new Map();

  constructor() {
    // Seed an initial sample request for Greenfield International School
    const sampleId = 'cipa_req_greenfield_01';
    this.requests.set(sampleId, {
      requestId: sampleId,
      rawPrompt: 'Provision a fully equipped school management platform for Greenfield International School, with 2,000 students, 150 staff members, a dedicated school domain and independent database.',
      classification: 'Dedicated GCP Project Instance',
      requirements: {
        schoolName: 'Greenfield International School',
        organisation: 'Greenfield Education Foundation',
        country: 'Nigeria',
        region: 'europe-west1',
        schoolType: 'K-12 Secondary & College',
        studentPopulation: 2000,
        staffPopulation: 150,
        concurrentUsers: 500,
        requiredApplications: ['Curriculum Server', 'Curriculum Flow School ERP'],
        requiredFeatures: ['AI Curriculum Advisor', 'Biometric RFID Gate', 'Secure CBT Lockdown', 'Bursary Multi-Split'],
        storageRequirementsGb: 50,
        databaseRequirements: 'Dedicated Cloud SQL PostgreSQL Instance',
        domainRequirements: 'greenfield.edu.ng',
        securityIsolation: 'sovereign_project',
        availabilitySla: '99.9% Regional High Availability',
        budgetConstraintNgn: 4500000,
        missingInfo: []
      },
      recommendation: {
        recommendedTopology: 'Dedicated GCP Project Instance',
        rationale: 'High student population (2,000) and dedicated database requirement necessitate sovereign Cloud Project isolation with a dedicated Cloud SQL instance.',
        tradeOffs: [
          'Higher initial setup cost offset by complete administrative autonomy and resource isolation.',
          'Requires PIAM human approval for GCP project creation and billing association.'
        ],
        estimatedMonthlyCostNgn: 380000,
        setupFeeNgn: 150000,
        recommendedGcpRegion: 'europe-west1',
        databaseStrategy: 'Dedicated Cloud SQL Enterprise PostgreSQL (2 vCPU, 8GB RAM)',
        storageStrategy: 'Tenant-isolated GCS Bucket with Uniform Bucket Access'
      },
      plan: [
        { stepNumber: 1, stepName: 'Validate School & Org Records', description: 'Validate institutional registration and legal entity records.', component: 'Control Plane', identityRequired: 'backend-runtime', requiresPiamApproval: false, status: 'completed' },
        { stepNumber: 2, stepName: 'Create Tenant Record', description: 'Register tenant ID and school slug in control_plane schema.', component: 'Control Plane', identityRequired: 'backend-runtime', requiresPiamApproval: false, status: 'completed' },
        { stepNumber: 3, stepName: 'Submit PIAM Authorisation for Project', description: 'Request human approval for dedicated GCP project creation and billing association.', component: 'PIAM', identityRequired: 'project-factory', requiresPiamApproval: true, status: 'pending' },
        { stepNumber: 4, stepName: 'Execute Project Factory', description: 'Create isolated GCP project and apply security baselines.', component: 'Project Factory', identityRequired: 'project-factory', requiresPiamApproval: false, status: 'pending' },
        { stepNumber: 5, stepName: 'Deploy Cloud Run Services', description: 'Deploy Curriculum Server and Curriculum Flow container revisions.', component: 'Infrastructure Deployer', identityRequired: 'infrastructure-deployer', requiresPiamApproval: false, status: 'pending' },
        { stepNumber: 6, stepName: 'Provision Dedicated Cloud SQL', description: 'Provision curriculum_platform database and control_plane/curriculum_flow schemas.', component: 'Infrastructure Deployer', identityRequired: 'infrastructure-deployer', requiresPiamApproval: false, status: 'pending' },
        { stepNumber: 7, stepName: 'Configure Custom Domain & SSL', description: 'Map greenfield.edu.ng with Google-managed SSL certificate.', component: 'Domain Manager', identityRequired: 'domain-manager', requiresPiamApproval: false, status: 'pending' },
        { stepNumber: 8, stepName: 'Verify Activation Health', description: 'Perform automated health checks, database connectivity, and tenant isolation tests.', component: 'Orchestrator', identityRequired: 'provisioning-orchestrator', requiresPiamApproval: false, status: 'pending' }
      ],
      lifecycleState: 'Awaiting Privileged Approval',
      piamApprovalStatus: 'pending_approval',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date().toISOString(),
      correlationId: 'corr_greenfield_' + crypto.randomBytes(3).toString('hex')
    });
  }

  public analyzeAndExtract(rawPrompt: string): CipaExtractedRequirements {
    const lower = rawPrompt.toLowerCase();
    
    // Natural language requirement extraction heuristic
    let schoolName = 'Greenfield Model Academy';
    if (lower.includes('for ')) {
      const parts = rawPrompt.split('for ');
      if (parts[1]) {
        schoolName = parts[1].split(',')[0].split('.')[0].trim();
      }
    }

    let students = 1000;
    const studentMatch = rawPrompt.match(/(\d+[\d,]*)\s*students/i);
    if (studentMatch && studentMatch[1]) {
      students = parseInt(studentMatch[1].replace(/,/g, ''), 10);
    }

    let staff = 80;
    const staffMatch = rawPrompt.match(/(\d+[\d,]*)\s*(staff|teachers|members)/i);
    if (staffMatch && staffMatch[1]) {
      staff = parseInt(staffMatch[1].replace(/,/g, ''), 10);
    }

    let isolation: 'shared' | 'dedicated_service' | 'sovereign_project' | 'hybrid' = 'shared';
    if (lower.includes('dedicated project') || students > 1500) {
      isolation = 'sovereign_project';
    } else if (lower.includes('dedicated database') || lower.includes('independent database')) {
      isolation = 'dedicated_service';
    }

    return {
      schoolName,
      organisation: `${schoolName} Foundation`,
      country: 'Nigeria',
      region: 'europe-west1',
      schoolType: students > 1500 ? 'Secondary College & Preparatory' : 'Primary & Secondary Academy',
      studentPopulation: students,
      staffPopulation: staff,
      concurrentUsers: Math.round(students * 0.25),
      requiredApplications: ['Curriculum Server', 'Curriculum Flow School ERP'],
      requiredFeatures: ['AI Curriculum Advisor', 'Biometric RFID Gate', 'Secure CBT Lockdown', 'Bursary Multi-Split'],
      storageRequirementsGb: students > 1000 ? 50 : 20,
      databaseRequirements: isolation === 'sovereign_project' ? 'Dedicated Cloud SQL PostgreSQL Instance' : 'Shared Sharded PostgreSQL Schema',
      domainRequirements: `${schoolName.toLowerCase().replace(/[^a-z0-9]/g, '')}.edu.ng`,
      securityIsolation: isolation,
      availabilitySla: '99.9% High Availability',
      budgetConstraintNgn: 3500000,
      missingInfo: []
    };
  }

  public classifyRequest(req: CipaExtractedRequirements): CipaRequestCategory {
    if (req.securityIsolation === 'sovereign_project') return 'Dedicated GCP Project Instance';
    if (req.securityIsolation === 'dedicated_service') return 'Dedicated Cloud Run Instance';
    if (req.studentPopulation > 2000) return 'Custom Architecture Instance';
    return 'Full School Management Instance';
  }

  public evaluateIIAPE(req: CipaExtractedRequirements, classification: CipaRequestCategory): CipaArchitectureRecommendation {
    const monthlyCost = classification === 'Dedicated GCP Project Instance' ? 380000 : classification === 'Dedicated Cloud Run Instance' ? 220000 : 95000;
    return {
      recommendedTopology: classification,
      rationale: `Evaluated student population (${req.studentPopulation}), staff count (${req.staffPopulation}), and isolation requirement (${req.securityIsolation}). Recommended ${classification} topology to ensure robust performance and security governance.`,
      tradeOffs: [
        'Balanced resource allocation optimized for Nigerian academic workloads and offline-first LAN sync.',
        classification === 'Dedicated GCP Project Instance' ? 'Sovereign project isolation requires manual PIAM approval.' : 'Shared high-performance cluster with isolated tenant database schemas.'
      ],
      estimatedMonthlyCostNgn: monthlyCost,
      setupFeeNgn: 75000,
      recommendedGcpRegion: 'europe-west1',
      databaseStrategy: classification === 'Dedicated GCP Project Instance' ? 'Dedicated Cloud SQL Enterprise (2 vCPU, 8GB RAM)' : 'Shared Clustered PostgreSQL with Row-Level Security',
      storageStrategy: 'Tenant-Isolated GCS Bucket with Uniform Bucket Access'
    };
  }

  public generatePlan(): CipaProvisioningPlanStep[] {
    return [
      { stepNumber: 1, stepName: 'Validate School & Org Records', description: 'Validate institutional registration and legal entity records.', component: 'Control Plane', identityRequired: 'backend-runtime', requiresPiamApproval: false, status: 'completed' },
      { stepNumber: 2, stepName: 'Create Tenant Record', description: 'Register tenant ID and school slug in control_plane schema.', component: 'Control Plane', identityRequired: 'backend-runtime', requiresPiamApproval: false, status: 'completed' },
      { stepNumber: 3, stepName: 'Submit PIAM Authorisation for Project', description: 'Request human approval for dedicated GCP project creation and billing association.', component: 'PIAM', identityRequired: 'project-factory', requiresPiamApproval: true, status: 'pending' },
      { stepNumber: 4, stepName: 'Execute Project Factory', description: 'Create isolated GCP project and apply security baselines.', component: 'Project Factory', identityRequired: 'project-factory', requiresPiamApproval: false, status: 'pending' },
      { stepNumber: 5, stepName: 'Deploy Cloud Run Services', description: 'Deploy Curriculum Server and Curriculum Flow container revisions.', component: 'Infrastructure Deployer', identityRequired: 'infrastructure-deployer', requiresPiamApproval: false, status: 'pending' },
      { stepNumber: 6, stepName: 'Provision Dedicated Cloud SQL', description: 'Provision curriculum_platform database and control_plane/curriculum_flow schemas.', component: 'Infrastructure Deployer', identityRequired: 'infrastructure-deployer', requiresPiamApproval: false, status: 'pending' },
      { stepNumber: 7, stepName: 'Configure Custom Domain & SSL', description: 'Map institutional domain with Google-managed SSL certificate.', component: 'Domain Manager', identityRequired: 'domain-manager', requiresPiamApproval: false, status: 'pending' },
      { stepNumber: 8, stepName: 'Verify Activation Health', description: 'Perform automated health checks, database connectivity, and tenant isolation tests.', component: 'Orchestrator', identityRequired: 'provisioning-orchestrator', requiresPiamApproval: false, status: 'pending' }
    ];
  }

  public createRequest(rawPrompt: string): CipaProvisioningRequestRecord {
    const reqId = `cipa_req_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
    const requirements = this.analyzeAndExtract(rawPrompt);
    const classification = this.classifyRequest(requirements);
    const recommendation = this.evaluateIIAPE(requirements, classification);
    const plan = this.generatePlan();

    const record: CipaProvisioningRequestRecord = {
      requestId: reqId,
      rawPrompt,
      classification,
      requirements,
      recommendation,
      plan,
      lifecycleState: 'Awaiting Architecture Approval',
      piamApprovalStatus: 'pending_approval',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      correlationId: `corr_${crypto.randomBytes(4).toString('hex')}`
    };

    this.requests.set(reqId, record);
    return record;
  }

  public getRequest(requestId: string): CipaProvisioningRequestRecord | undefined {
    return this.requests.get(requestId);
  }

  public getAllRequests(): CipaProvisioningRequestRecord[] {
    return Array.from(this.requests.values());
  }

  public updateLifecycle(requestId: string, newState: CipaLifecycleState): CipaProvisioningRequestRecord | undefined {
    const rec = this.requests.get(requestId);
    if (!rec) return undefined;
    rec.lifecycleState = newState;
    rec.updatedAt = new Date().toISOString();
    return rec;
  }

  public piamApprovalAction(requestId: string, action: 'approve' | 'reject', approverEmail: string, notes: string): CipaProvisioningRequestRecord | undefined {
    const rec = this.requests.get(requestId);
    if (!rec) return undefined;
    rec.piamApprovalStatus = action === 'approve' ? 'approved' : 'rejected';
    rec.approverEmail = approverEmail;
    rec.approvalNotes = notes;
    rec.lifecycleState = action === 'approve' ? 'Approved' : 'Cancelled';
    rec.updatedAt = new Date().toISOString();
    return rec;
  }
}

export const cipaAgentService = new CipaAgentService();
