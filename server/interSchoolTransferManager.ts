import fs from 'fs';
import path from 'path';
import { ClassGrade } from '../src/types';
import { TamperEvidentAuditService } from '../src/services/tamperEvidentAuditService';

const TRANSFER_DIR = path.join(process.cwd(), 'data', 'transfers');
const TRANSFER_STORE_FILE = path.join(TRANSFER_DIR, 'inter_school_transfers.json');

export interface InterSchoolTransferApplication {
  transferId: string;
  studentName: string;
  currentClass: ClassGrade;
  targetSchoolName: string;
  previousSchoolName: string;
  previousSchoolState: string;
  reasonForTransfer: string;
  parentPhone: string;
  parentEmail: string;
  previousAdmissionNo?: string;
  transferCertificateCode: string;
  status: 'pending_clearance' | 'approved' | 'rejected' | 'enrolled';
  submittedAt: string;
  reviewedAt?: string;
  reviewerNotes?: string;
}

export class InterSchoolTransferManager {
  private static instance: InterSchoolTransferManager;
  private applications: InterSchoolTransferApplication[] = [];

  private constructor() {
    this.ensureStorage();
    this.loadPersistence();
  }

  public static getInstance(): InterSchoolTransferManager {
    if (!InterSchoolTransferManager.instance) {
      InterSchoolTransferManager.instance = new InterSchoolTransferManager();
    }
    return InterSchoolTransferManager.instance;
  }

  private ensureStorage(): void {
    if (!fs.existsSync(TRANSFER_DIR)) {
      fs.mkdirSync(TRANSFER_DIR, { recursive: true, mode: 0o700 });
    }
  }

  private loadPersistence(): void {
    try {
      if (fs.existsSync(TRANSFER_STORE_FILE)) {
        this.applications = JSON.parse(fs.readFileSync(TRANSFER_STORE_FILE, 'utf8'));
      }
    } catch (e) {
      this.applications = [];
    }
  }

  private savePersistence(): void {
    try {
      this.ensureStorage();
      fs.writeFileSync(TRANSFER_STORE_FILE, JSON.stringify(this.applications, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save inter-school transfer applications:', e);
    }
  }

  public submitTransfer(data: {
    studentName: string;
    currentClass: ClassGrade;
    targetSchoolName: string;
    previousSchoolName: string;
    previousSchoolState: string;
    reasonForTransfer: string;
    parentPhone: string;
    parentEmail: string;
    previousAdmissionNo?: string;
  }): InterSchoolTransferApplication {
    const transferId = `TRF-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const transferCertificateCode = `CERT-TRF-${Math.floor(100000 + Math.random() * 900000)}`;

    const newApp: InterSchoolTransferApplication = {
      transferId,
      studentName: data.studentName,
      currentClass: data.currentClass,
      targetSchoolName: data.targetSchoolName,
      previousSchoolName: data.previousSchoolName,
      previousSchoolState: data.previousSchoolState,
      reasonForTransfer: data.reasonForTransfer,
      parentPhone: data.parentPhone,
      parentEmail: data.parentEmail,
      previousAdmissionNo: data.previousAdmissionNo,
      transferCertificateCode,
      status: 'pending_clearance',
      submittedAt: new Date().toISOString()
    };

    this.applications.unshift(newApp);
    this.savePersistence();

    TamperEvidentAuditService.logPlatformAction({
      actor: data.parentPhone,
      actorRole: 'parent',
      tenantId: 'platform_control_plane',
      action: 'security_profile_applied',
      target: `transfer:${transferId}:submitted`,
      result: 'SUCCESS',
      outcome: 'SUCCESS',
      details: `Inter-school transfer application submitted for student ${data.studentName} (${data.currentClass}) from ${data.previousSchoolName} to ${data.targetSchoolName}`,
      ipAddress: '127.0.0.1'
    });

    return newApp;
  }

  public getTransfers(): InterSchoolTransferApplication[] {
    return this.applications;
  }

  public getTransferById(transferId: string): InterSchoolTransferApplication | undefined {
    return this.applications.find(t => t.transferId === transferId);
  }

  public reviewTransfer(transferId: string, status: 'approved' | 'rejected' | 'enrolled', reviewerNotes?: string): InterSchoolTransferApplication | null {
    const app = this.getTransferById(transferId);
    if (!app) return null;

    app.status = status;
    app.reviewedAt = new Date().toISOString();
    if (reviewerNotes) app.reviewerNotes = reviewerNotes;

    this.savePersistence();
    return app;
  }
}

export const interSchoolTransferManager = InterSchoolTransferManager.getInstance();
