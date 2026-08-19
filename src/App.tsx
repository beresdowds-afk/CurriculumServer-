import React, { useState, useEffect } from 'react';
import { 
  UserProfile, 
  UserRole,
  SubjectCurriculum, 
  CurriculumTopic,
  StandardLessonNote,
  AssignedLessonDelivery,
  AdaptiveRemedialUnit,
  QuestionBankItem,
  SecureExaminationPaper,
  SecureMarkingScheme,
  DeliveryStatus,
  TeacherFeedback,
  Teacher,
  ClassGroup,
  Student,
  TimetableSlot,
  ClassAttendanceRegister,
  BiometricDevice,
  BiometricMovementLog,
  TeacherAttendanceRecord,
  MovementPass,
  BiometricEnrollmentProfile,
  AcademicTermConfig,
  PublicHoliday,
  SchoolEvent,
  AcademicSessionInfo,
  StudentSubjectScore,
  ClassAcademicRecord,
  StudentTermSummary,
  AdminRoleDefinition,
  UserAuthAccount,
  IAMSecurityPolicy,
  IAMSecurityAuditLog,
  SchoolBrandProfile,
  TenantSchoolApp,
  PlatformViewMode,
  CurriculumServerSaaSMetrics,
  TenantBillingInvoice,
  OptionalFeatureKey,
  CurriculumFlowBundleKey
} from './types';
import { NERDC_SUBJECTS_DATABASE } from './data/nerdcDatabase';
import { 
  MOCK_USERS, 
  MOCK_KPIS, 
  MOCK_LESSON_NOTES, 
  MOCK_DELIVERIES, 
  MOCK_REMEDIALS, 
  MOCK_QUESTION_BANK, 
  MOCK_SECURE_EXAMS, 
  MOCK_MARKING_SCHEMES, 
  MOCK_STUDENT_PROFILES 
} from './data/curriculumFlowData';
import {
  INITIAL_TEACHERS,
  INITIAL_CLASS_GROUPS,
  INITIAL_STUDENTS,
  INITIAL_TIMETABLE_SLOTS,
  INITIAL_ATTENDANCE_REGISTERS
} from './data/schoolManagementData';
import {
  INITIAL_BIOMETRIC_DEVICES,
  INITIAL_BIOMETRIC_LOGS,
  INITIAL_TEACHER_ATTENDANCE_RECORDS,
  INITIAL_MOVEMENT_PASSES,
  INITIAL_BIOMETRIC_PROFILES
} from './data/biometricAttendanceData';
import {
  INITIAL_ACADEMIC_SESSIONS,
  INITIAL_TERMS_CONFIG,
  INITIAL_PUBLIC_HOLIDAYS,
  INITIAL_SCHOOL_EVENTS
} from './data/academicCalendarData';
import {
  INITIAL_STUDENT_SUBJECT_SCORES,
  INITIAL_CLASS_ACADEMIC_RECORDS,
  compileClassBroadsheet
} from './data/academicRecordsData';
import {
  INITIAL_ADMIN_ROLES,
  INITIAL_AUTH_ACCOUNTS,
  INITIAL_SECURITY_POLICY,
  INITIAL_IAM_AUDIT_LOGS,
  checkAccountPermission
} from './data/iamAuthData';
import { INITIAL_SCHOOL_BRAND } from './data/brandManagementData';
import { 
  INITIAL_CLONED_TENANTS, 
  INITIAL_SAAS_METRICS, 
  INITIAL_SAAS_INVOICES,
  OPTIONAL_FEATURE_DEFINITIONS
} from './mockCurriculumServerData';

// Top Nav & Modular Tab Components
import { Navbar, MainTabType } from './components/Navbar';
import { CurriculumServerLandingPage } from './components/CurriculumServerLandingPage';
import { CurriculumServerDashboard } from './components/CurriculumServerDashboard';
import { TenantControlCenter } from './components/TenantControlCenter';
import { CustomerSelfServicePortal } from './components/CustomerSelfServicePortal';
import { ApiWebhooksPortal } from './components/ApiWebhooksPortal';
import { CurriculumServerPublicHero } from './components/CurriculumServerPublicHero';
import { DomainManagementPortal } from './components/DomainManagementPortal';
import { CommandCenterTab } from './components/CommandCenterTab';
import { TeacherDashboardTab } from './components/TeacherDashboardTab';
import { AdminAssistantDashboardTab } from './components/AdminAssistantDashboardTab';
import { StudentDashboardTab } from './components/StudentDashboardTab';
import { ParentDashboardTab } from './components/ParentDashboardTab';
import { GlobalPageNavigator } from './components/GlobalPageNavigator';
import { IAMGovernanceTab } from './components/IAMGovernanceTab';
import { BrandManagementTab } from './components/BrandManagementTab';
import { AcademicCalendarTab } from './components/AcademicCalendarTab';
import { CurriculumExplorerTab } from './components/CurriculumExplorerTab';
import { LessonApprovalChainTab } from './components/LessonApprovalChainTab';
import { TeacherDeliveryTrackerTab } from './components/TeacherDeliveryTrackerTab';
import { AdaptiveRemedialTab } from './components/AdaptiveRemedialTab';
import { QuestionBankTab } from './components/QuestionBankTab';
import { SecureExaminationTab } from './components/SecureExaminationTab';
import { TaughtAssessmentTab } from './components/TaughtAssessmentTab';
import { AcademicAnalyticsTab } from './components/AcademicAnalyticsTab';
import { TeacherPoolTab } from './components/TeacherPoolTab';
import { ClassGroupsTab } from './components/ClassGroupsTab';
import { SchoolTimetableTab } from './components/SchoolTimetableTab';
import { StudentRegistersTab } from './components/StudentRegistersTab';
import { AcademicRecordsTab } from './components/AcademicRecordsTab';
import { BiometricAttendanceTab } from './components/BiometricAttendanceTab';
import { AccountManagementTab } from './components/AccountManagementTab';
import { PrincipalFeatureGovernanceTab } from './components/PrincipalFeatureGovernanceTab';
import { UserProfilesTab } from './components/UserProfilesTab';
import { ParentDatabaseTab } from './components/ParentDatabaseTab';
import { UserOnboardingSuiteTab } from './components/UserOnboardingSuiteTab';
import { TerminalReportCardStudio } from './components/TerminalReportCardStudio';
import { PromotionalMockExamPortal } from './components/PromotionalMockExamPortal';
import { DockerOrchestrationConsole } from './components/DockerOrchestrationConsole';
import { NavigationDrawer } from './components/NavigationDrawer';
import { CurriculumAdvisorModal } from './components/CurriculumAdvisorModal';

// Modals
import { LessonPlanModal } from './components/LessonPlanModal';
import { SchemeOfWorkModal } from './components/SchemeOfWorkModal';
import { ExamBuilderModal } from './components/ExamBuilderModal';
import { SubjectDetailModal } from './components/SubjectDetailModal';
import { InstallShareModal } from './components/InstallShareModal';
import { AuthModal } from './components/AuthModal';
import { CloneSchoolModal } from './components/CloneSchoolModal';
import { TenantCredentialsModal } from './components/TenantCredentialsModal';
import { TenantFeaturesModal } from './components/TenantFeaturesModal';
import { LeaseToOwnTrackerModal } from './components/LeaseToOwnTrackerModal';
import { TenantConnectModal } from './components/TenantConnectModal';
import { ProvisioningTerminalModal } from './components/ProvisioningTerminalModal';
import { TenantIsolationTestModal } from './components/TenantIsolationTestModal';
import { VersionRolloutModal } from './components/VersionRolloutModal';

import { 
  GraduationCap, 
  ExternalLink, 
  ShieldCheck, 
  BookOpen, 
  CheckCircle2, 
  Lock 
} from 'lucide-react';

export default function App() {
  // Active User Profile & RBAC
  const [allUsersList, setAllUsersList] = useState<UserProfile[]>(MOCK_USERS);
  const [currentUser, setCurrentUser] = useState<UserProfile>(MOCK_USERS[0]); // Default: Principal Dr. Mustapha
  const [activeTab, setActiveTab] = useState<MainTabType>('command_center');

  // Core Dynamic Data State
  const [kpis, setKpis] = useState(MOCK_KPIS);
  const [lessonNotes, setLessonNotes] = useState<StandardLessonNote[]>(MOCK_LESSON_NOTES);
  const [deliveries, setDeliveries] = useState<AssignedLessonDelivery[]>(MOCK_DELIVERIES);
  const [remedials, setRemedials] = useState<AdaptiveRemedialUnit[]>(MOCK_REMEDIALS);
  const [questionBank, setQuestionBank] = useState<QuestionBankItem[]>(MOCK_QUESTION_BANK);
  const [exams, setExams] = useState<SecureExaminationPaper[]>(MOCK_SECURE_EXAMS);
  const [markingSchemes, setMarkingSchemes] = useState<SecureMarkingScheme[]>(MOCK_MARKING_SCHEMES);
  const [studentProfiles, setStudentProfiles] = useState(MOCK_STUDENT_PROFILES);

  // Administrative Data State (Teachers, Classes, Students, Timetable, Registers)
  const [teachers, setTeachers] = useState<Teacher[]>(INITIAL_TEACHERS);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>(INITIAL_CLASS_GROUPS);
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>(INITIAL_TIMETABLE_SLOTS);
  const [attendanceRegisters, setAttendanceRegisters] = useState<ClassAttendanceRegister[]>(INITIAL_ATTENDANCE_REGISTERS);
  const [selectedTimetableClassId, setSelectedTimetableClassId] = useState<string | undefined>(undefined);
  const [selectedTimetableTeacherId, setSelectedTimetableTeacherId] = useState<string | undefined>(undefined);
  const [selectedRegisterClassId, setSelectedRegisterClassId] = useState<string | undefined>(undefined);

  // Biometric & Movement Hardware Monitoring State
  const [biometricDevices, setBiometricDevices] = useState<BiometricDevice[]>(INITIAL_BIOMETRIC_DEVICES);
  const [movementLogs, setMovementLogs] = useState<BiometricMovementLog[]>(INITIAL_BIOMETRIC_LOGS);
  const [teacherAttendanceRecords, setTeacherAttendanceRecords] = useState<TeacherAttendanceRecord[]>(INITIAL_TEACHER_ATTENDANCE_RECORDS);
  const [movementPasses, setMovementPasses] = useState<MovementPass[]>(INITIAL_MOVEMENT_PASSES);
  const [biometricProfiles, setBiometricProfiles] = useState<BiometricEnrollmentProfile[]>(INITIAL_BIOMETRIC_PROFILES);

  // Academic Calendar, Term Dates, Holidays & School Events State
  const [academicSessions, setAcademicSessions] = useState<AcademicSessionInfo[]>(INITIAL_ACADEMIC_SESSIONS);
  const [termsConfig, setTermsConfig] = useState<AcademicTermConfig[]>(INITIAL_TERMS_CONFIG);
  const [publicHolidays, setPublicHolidays] = useState<PublicHoliday[]>(INITIAL_PUBLIC_HOLIDAYS);
  const [schoolEvents, setSchoolEvents] = useState<SchoolEvent[]>(INITIAL_SCHOOL_EVENTS);

  // Academic Records, Continuous Assessment (CA), Broadsheets & RLS Gradebooks
  const [subjectScores, setSubjectScores] = useState<StudentSubjectScore[]>(INITIAL_STUDENT_SUBJECT_SCORES);
  const [classAcademicRecords, setClassAcademicRecords] = useState<ClassAcademicRecord[]>(INITIAL_CLASS_ACADEMIC_RECORDS);

  // Identity and Access Management (IAM), Roles & Auth State
  const [adminRoles, setAdminRoles] = useState<AdminRoleDefinition[]>(INITIAL_ADMIN_ROLES);
  const [authAccounts, setAuthAccounts] = useState<UserAuthAccount[]>(INITIAL_AUTH_ACCOUNTS);
  const [currentAccount, setCurrentAccount] = useState<UserAuthAccount>(INITIAL_AUTH_ACCOUNTS[0]);
  const [securityPolicy, setSecurityPolicy] = useState<IAMSecurityPolicy>(INITIAL_SECURITY_POLICY);
  const [auditLogs, setAuditLogs] = useState<IAMSecurityAuditLog[]>(INITIAL_IAM_AUDIT_LOGS);

  // School Brand Management & Institutional Identity State (Principal Governed)
  const [schoolBrand, setSchoolBrand] = useState<SchoolBrandProfile>(INITIAL_SCHOOL_BRAND);

  // Auth & IAM Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'phone_verify' | 'google_sso' | 'mfa_challenge' | 'switch_account'>('signin');
  const [mfaReason, setMfaReason] = useState<string>('');

  // Modals state
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isLessonPlanModalOpen, setIsLessonPlanModalOpen] = useState(false);
  const [lessonTargetSubject, setLessonTargetSubject] = useState<SubjectCurriculum | null>(null);
  const [lessonTargetTopic, setLessonTargetTopic] = useState<CurriculumTopic | null>(null);

  const [isSchemeModalOpen, setIsSchemeModalOpen] = useState(false);
  const [schemeTargetSubject, setSchemeTargetSubject] = useState<SubjectCurriculum | null>(null);

  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [examTargetSubject, setExamTargetSubject] = useState<SubjectCurriculum | null>(null);
  const [examTargetTopic, setExamTargetTopic] = useState<CurriculumTopic | null>(null);

  const [activeSubjectDetail, setActiveSubjectDetail] = useState<SubjectCurriculum | null>(null);
  const [selectedParentIdForDb, setSelectedParentIdForDb] = useState<string | undefined>(undefined);

  // Vertical Navigation Drawer State
  const [isDrawerOpenMobile, setIsDrawerOpenMobile] = useState(false);
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);

  // --- CURRICULUM SERVER Multi-Tenant SaaS State ---
  const [platformMode, setPlatformMode] = useState<PlatformViewMode>('tenant_school_instance');
  const [clonedTenants, setClonedTenants] = useState<TenantSchoolApp[]>(INITIAL_CLONED_TENANTS);
  const [activeTenant, setActiveTenant] = useState<TenantSchoolApp>(INITIAL_CLONED_TENANTS[0]);
  const [saasMetrics, setSaasMetrics] = useState<CurriculumServerSaaSMetrics>(INITIAL_SAAS_METRICS);
  const [saasInvoices, setSaasInvoices] = useState<TenantBillingInvoice[]>(INITIAL_SAAS_INVOICES);

  // SaaS Modals State
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [selectedTenantForCredentials, setSelectedTenantForCredentials] = useState<TenantSchoolApp | null>(null);
  const [isFeaturesModalOpen, setIsFeaturesModalOpen] = useState(false);
  const [selectedTenantForFeatures, setSelectedTenantForFeatures] = useState<TenantSchoolApp | null>(null);
  const [isLeaseTrackerModalOpen, setIsLeaseTrackerModalOpen] = useState(false);
  const [selectedTenantForLease, setSelectedTenantForLease] = useState<TenantSchoolApp | null>(null);
  
  // Control Plane 12-Step Provisioning, Isolation Tests & Version Rollout States
  const [isProvisioningModalOpen, setIsProvisioningModalOpen] = useState(false);
  const [provisioningDraft, setProvisioningDraft] = useState<Partial<TenantSchoolApp> | null>(null);
  const [isIsolationTestModalOpen, setIsIsolationTestModalOpen] = useState(false);
  const [isVersionRolloutModalOpen, setIsVersionRolloutModalOpen] = useState(false);

  // Provision newly cloned school
  const handleCloneNewTenant = (newTenant: TenantSchoolApp) => {
    setClonedTenants(prev => [newTenant, ...prev]);
    setActiveTenant(newTenant);
    if (newTenant.brandProfile) {
      setSchoolBrand(newTenant.brandProfile);
    }
    
    const baseFee = newTenant.businessModel === 'yearly' 
      ? newTenant.subscriptionPricePerYear 
      : newTenant.subscriptionPricePerMonth;

    // Update SaaS financial metrics
    setSaasMetrics(prev => ({
      ...prev,
      totalTenants: prev.totalTenants + 1,
      activeSubscriptions: prev.activeSubscriptions + (newTenant.businessModel !== 'lease_to_own' ? 1 : 0),
      leaseToOwnTenants: prev.leaseToOwnTenants + (newTenant.businessModel === 'lease_to_own' ? 1 : 0),
      totalManagedStudents: prev.totalManagedStudents + newTenant.studentCapacity,
      monthlyRecurringRevenueNGN: prev.monthlyRecurringRevenueNGN + (newTenant.businessModel === 'monthly' ? newTenant.subscriptionPricePerMonth : 0)
    }));

    // Create onboarding invoice
    const newInvoice: TenantBillingInvoice = {
      id: `inv-${Date.now()}`,
      tenantSchoolName: newTenant.schoolName,
      tenantAppId: newTenant.appId,
      invoiceNumber: `INV-2026-CS-${Math.floor(1000 + Math.random() * 9000)}`,
      billingPeriod: 'Onboarding & License Activation',
      businessModel: newTenant.businessModel,
      amount: baseFee,
      taxVat: Math.round(baseFee * 0.075),
      totalAmount: Math.round(baseFee * 1.075),
      status: 'paid',
      dueDate: new Date().toISOString().split('T')[0],
      paidDate: new Date().toISOString().split('T')[0],
      pspChannel: 'Paystack',
      paymentGatewayRef: `pstk_live_onboard_${Math.random().toString(36).substring(2, 9)}`,
      notes: 'Initial license activation and isolated database shard allocation.'
    };
    setSaasInvoices(prev => [newInvoice, ...prev]);
  };

  const handleUpdateTenantSecret = (tenantId: string, newSecret: string) => {
    setClonedTenants(prev => prev.map(t => {
      if (t.id === tenantId) {
        return {
          ...t,
          appSecret: newSecret,
          auditLogsCount: (t.auditLogsCount || 0) + 1
        };
      }
      return t;
    }));
    if (activeTenant?.id === tenantId) {
      setActiveTenant(prev => prev ? ({ ...prev, appSecret: newSecret, auditLogsCount: (prev.auditLogsCount || 0) + 1 }) : prev);
    }
  };

  const handleUpdateTenantFeatures = (
    tenantId: string, 
    features: Record<OptionalFeatureKey, boolean>,
    bundles?: Record<CurriculumFlowBundleKey, boolean>,
    overrides?: Record<string, boolean>
  ) => {
    setClonedTenants(prev => prev.map(t => {
      if (t.id === tenantId) {
        return {
          ...t,
          enabledFeatures: features,
          licensedBundles: bundles || t.licensedBundles,
          inAppFeatureOverrides: overrides || t.inAppFeatureOverrides
        };
      }
      return t;
    }));
    if (activeTenant?.id === tenantId) {
      setActiveTenant(prev => prev ? ({ 
        ...prev, 
        enabledFeatures: features,
        licensedBundles: bundles || prev.licensedBundles,
        inAppFeatureOverrides: overrides || prev.inAppFeatureOverrides 
      }) : prev);
    }
  };

  const handleUpdateTenantApp = (updatedTenant: TenantSchoolApp) => {
    setClonedTenants(prev => prev.map(t => t.id === updatedTenant.id ? updatedTenant : t));
    if (activeTenant?.id === updatedTenant.id) {
      setActiveTenant(updatedTenant);
    }
  };

  const handleEarlyBuyout = (tenantId: string, finalAmount: number) => {
    setClonedTenants(prev => prev.map(t => {
      if (t.id === tenantId && t.leaseToOwnContract) {
        return {
          ...t,
          status: 'lease_handover',
          leaseToOwnContract: {
            ...t.leaseToOwnContract,
            contractStatus: 'perpetual_license_granted',
            monthsPaid: t.leaseToOwnContract.amortizationPeriodMonths,
            totalEquityAccumulated: t.leaseToOwnContract.totalBuyoutPrice,
            earlyBuyoutDiscountApplied: true
          }
        };
      }
      return t;
    }));
    if (activeTenant?.id === tenantId && activeTenant.leaseToOwnContract) {
      setActiveTenant(prev => ({
        ...prev,
        status: 'lease_handover',
        leaseToOwnContract: {
          ...prev.leaseToOwnContract!,
          contractStatus: 'perpetual_license_granted',
          monthsPaid: prev.leaseToOwnContract!.amortizationPeriodMonths,
          totalEquityAccumulated: prev.leaseToOwnContract!.totalBuyoutPrice,
          earlyBuyoutDiscountApplied: true
        }
      }));
    }
  };

  const handleToggleTenantStatus = (tenantId: string) => {
    setClonedTenants(prev => prev.map(t => {
      if (t.id === tenantId) {
        const nextStatus = t.status === 'active' ? 'suspended' : 'active';
        return { ...t, status: nextStatus };
      }
      return t;
    }));
  };

  const handleSelectTenantToLaunch = (tenant: TenantSchoolApp) => {
    setActiveTenant(tenant);
    if (tenant.brandProfile) {
      setSchoolBrand(tenant.brandProfile);
    }
    setPlatformMode('tenant_school_instance');
    setActiveTab('command_center');
  };

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsDrawerCollapsed(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Notification counts
  const pendingApprovalsCount = lessonNotes.filter(
    l => l.status === 'pending_principal_approval' || l.status === 'pending_coordinator_review'
  ).length;
  const pendingRemedialsCount = remedials.filter(r => r.status === 'recommended').length;

  const handleSelectUser = (user: UserProfile) => {
    setCurrentUser(user);
    if (user.role === 'teacher') {
      setActiveTab('teacher_dashboard');
    } else if (user.role === 'admin_assistant' || (user.role as string) === 'administrative_assistant') {
      setActiveTab('admin_assistant_dashboard');
    } else if (user.role === 'student') {
      setActiveTab('student_dashboard');
    } else if (user.role === 'parent') {
      setActiveTab('parent_dashboard');
    } else if (user.role === 'principal' || user.role === 'principal_admin') {
      if (activeTab === 'teacher_dashboard' || activeTab === 'admin_assistant_dashboard' || activeTab === 'student_dashboard' || activeTab === 'parent_dashboard') {
        setActiveTab('command_center');
      }
    }
  };

  // --- Handlers for Principal & Governance Pipeline ---
  const handleApproveLesson = (lessonId: string) => {
    setLessonNotes(prev => prev.map(lesson => {
      if (lesson.id === lessonId) {
        return {
          ...lesson,
          status: 'approved',
          approvedBy: currentUser.name,
          approvedAt: new Date().toISOString()
        };
      }
      return lesson;
    }));
  };

  const handleRejectLesson = (lessonId: string, reason: string) => {
    setLessonNotes(prev => prev.map(lesson => {
      if (lesson.id === lessonId) {
        return {
          ...lesson,
          status: 'rejected',
          reviewComment: `Modification Requested: ${reason}`,
          reviewedBy: currentUser.name,
          reviewedAt: new Date().toISOString()
        };
      }
      return lesson;
    }));
  };

  const handleReviewLesson = (lessonId: string, comment: string) => {
    setLessonNotes(prev => prev.map(lesson => {
      if (lesson.id === lessonId) {
        return {
          ...lesson,
          status: 'pending_principal_approval',
          reviewComment: comment,
          reviewedBy: currentUser.name,
          reviewedAt: new Date().toISOString()
        };
      }
      return lesson;
    }));
  };

  // --- Handlers for Teacher Delivery Tracking ---
  const handleUpdateDeliveryStatus = (deliveryId: string, status: DeliveryStatus) => {
    setDeliveries(prev => prev.map(d => {
      if (d.id === deliveryId) {
        return {
          ...d,
          status: status,
          isDelayed: false
        };
      }
      return d;
    }));
  };

  const handleSubmitFeedback = (deliveryId: string, feedback: TeacherFeedback) => {
    setDeliveries(prev => prev.map(d => {
      if (d.id === deliveryId) {
        return {
          ...d,
          status: 'completed',
          feedback: feedback,
          isDelayed: false
        };
      }
      return d;
    }));

    // If remedial requested or understanding fair/poor, add to remedials
    if (feedback.requestAdditionalLesson) {
      const targetDelivery = deliveries.find(d => d.id === deliveryId);
      if (targetDelivery) {
        const newRemedial: AdaptiveRemedialUnit = {
          id: `rem-${Date.now()}`,
          originalLessonId: targetDelivery.lessonNoteId,
          subjectName: targetDelivery.subjectName,
          classGrade: targetDelivery.classGrade,
          topicTitle: `Adaptive Remedial: ${targetDelivery.topicTitle}`,
          weaknessIdentified: feedback.comments,
          masteryScore: feedback.understandingLevel === 'poor' ? 45 : 58,
          remedialObjectives: [
            `Reinforce foundational understanding of ${targetDelivery.subTopic}`,
            'Provide alternative visual and concrete representations',
            'Conduct diagnostic error analysis with guided examples'
          ],
          remedialStrategies: [
            'Concrete-Representational-Abstract (CRA) progression',
            'Peer collaborative problem-solving',
            'Step-by-step formula breakdown sheets'
          ],
          simplifiedExplanation: `Deconstructing ${targetDelivery.topicTitle}: Simplifying key concepts into digestible steps before proceeding.`,
          scaffoldedPracticeExercises: [
            {
              level: 'Basic',
              prompt: `Basic starter question on ${targetDelivery.subTopic}`,
              guidanceHint: 'Recall standard definitions and initial rules.'
            },
            {
              level: 'Intermediate',
              prompt: `Standard intermediate question on ${targetDelivery.subTopic}`,
              guidanceHint: 'Apply the two-step formula.'
            },
            {
              level: 'Mastery',
              prompt: `Challenge problem on ${targetDelivery.subTopic}`,
              guidanceHint: 'Solve and check by substitution.'
            }
          ],
          reassessmentQuestions: [
            `Verify mastery of ${targetDelivery.subTopic} with 2 diagnostic exit problems.`
          ],
          status: 'recommended',
          createdAt: new Date().toISOString()
        };

        setRemedials(prev => [newRemedial, ...prev]);
      }
    }
  };

  const handleTriggerRemedialFromDelivery = (delivery: AssignedLessonDelivery) => {
    setActiveTab('adaptive_remedial');
  };

  // --- Handlers for Adaptive Remedial ---
  const handleAddRemedialUnit = (unit: AdaptiveRemedialUnit) => {
    setRemedials(prev => [unit, ...prev]);
  };

  const handleScheduleRemedialToTimetable = (unitId: string) => {
    const rem = remedials.find(r => r.id === unitId);
    if (!rem) return;

    const newDelivery: AssignedLessonDelivery = {
      id: `del-rem-${Date.now()}`,
      lessonNoteId: rem.originalLessonId,
      subjectName: rem.subjectName,
      classGrade: rem.classGrade,
      classSection: `${rem.classGrade} Science (Remedial)`,
      teacherId: currentUser.id,
      teacherName: currentUser.name,
      dayOfWeek: 'Friday',
      period: 5,
      scheduledTime: '12:30 PM - 01:10 PM',
      topicTitle: rem.topicTitle,
      subTopic: 'Targeted Remedial Session',
      week: 5,
      status: 'assigned',
      assignedAt: new Date().toISOString(),
      isDelayed: false
    };

    setDeliveries(prev => [newDelivery, ...prev]);
    setRemedials(prev => prev.map(r => r.id === unitId ? { ...r, status: 'scheduled' } : r));
    setActiveTab('delivery_tracking');
  };

  // --- Handlers for Secure Exams & Marking Schemes ---
  const handleLockExam = (examId: string) => {
    setExams(prev => prev.map(e => {
      if (e.id === examId) {
        return {
          ...e,
          isLocked: true,
          securityAuditLog: [
            ...e.securityAuditLog,
            {
              action: 'locked',
              performedBy: currentUser.name,
              timestamp: new Date().toISOString(),
              ipHash: '102.89.44.12'
            }
          ]
        };
      }
      return e;
    }));
  };

  const handleAuthorizeExam = (examId: string) => {
    setExams(prev => prev.map(e => {
      if (e.id === examId) {
        return {
          ...e,
          isAuthorizedByPrincipal: true,
          securityAuditLog: [
            ...e.securityAuditLog,
            {
              action: 'authorized',
              performedBy: currentUser.name,
              timestamp: new Date().toISOString(),
              ipHash: '102.89.44.12'
            }
          ]
        };
      }
      return e;
    }));
  };

  const handleUnlockMarkingScheme = (markingSchemeId: string) => {
    setExams(prev => prev.map(e => {
      if (e.markingSchemeId === markingSchemeId) {
        return {
          ...e,
          markingSchemeUnlocked: true,
          securityAuditLog: [
            ...e.securityAuditLog,
            {
              action: 'marking_scheme_accessed',
              performedBy: currentUser.name,
              timestamp: new Date().toISOString(),
              ipHash: '102.89.44.12'
            }
          ]
        };
      }
      return e;
    }));

    setMarkingSchemes(prev => prev.map(m => {
      if (m.id === markingSchemeId) {
        return {
          ...m,
          isConfidential: false,
          unlockedAt: new Date().toISOString(),
          unlockedBy: currentUser.name
        };
      }
      return m;
    }));
  };

  const handleAddExam = (newExam: SecureExaminationPaper, newScheme: SecureMarkingScheme) => {
    setExams(prev => [newExam, ...prev]);
    setMarkingSchemes(prev => [newScheme, ...prev]);
  };

  // --- Handlers for Question Bank ---
  const handleAddQuestion = (item: QuestionBankItem) => {
    setQuestionBank(prev => [item, ...prev]);
  };

  // --- Handlers for Quick Navigation & Modals ---
  const handleLaunchLessonPlan = (subject: SubjectCurriculum, topic?: CurriculumTopic) => {
    setLessonTargetSubject(subject);
    setLessonTargetTopic(topic || null);
    setIsLessonPlanModalOpen(true);
  };

  const handleLaunchScheme = (subject: SubjectCurriculum) => {
    setSchemeTargetSubject(subject);
    setIsSchemeModalOpen(true);
  };

  const handleLaunchExam = (subject: SubjectCurriculum, topic?: CurriculumTopic) => {
    setExamTargetSubject(subject);
    setExamTargetTopic(topic || null);
    setIsExamModalOpen(true);
  };

  const handleOpenVariableQuestionsFromCurriculum = (subject: SubjectCurriculum, topic?: CurriculumTopic) => {
    setActiveTab('question_bank');
  };

  const handleOpenTaughtAssessmentFromCurriculum = (subject: SubjectCurriculum) => {
    setActiveTab('taught_assessment');
  };

  const handleGeneratePersonalizedWorksheet = (studentId: string) => {
    setActiveTab('taught_assessment');
  };

  // --- Teacher Pool Handlers ---
  const handleAddTeacher = (teacher: Teacher) => {
    setTeachers(prev => [teacher, ...prev]);
  };

  const handleUpdateTeacher = (updated: Teacher) => {
    setTeachers(prev => prev.map(t => t.id === updated.id ? updated : t));
  };

  const handleDeleteTeacher = (teacherId: string) => {
    setTeachers(prev => prev.filter(t => t.id !== teacherId));
  };

  // --- Class Groups Handlers ---
  const handleAddClassGroup = (group: ClassGroup) => {
    setClassGroups(prev => [group, ...prev]);
  };

  const handleUpdateClassGroup = (updated: ClassGroup) => {
    setClassGroups(prev => prev.map(cg => cg.id === updated.id ? updated : cg));
  };

  const handleDeleteClassGroup = (groupId: string) => {
    setClassGroups(prev => prev.filter(cg => cg.id !== groupId));
  };

  // --- Timetable Portal Handlers ---
  const handleAddTimetableSlot = (slot: TimetableSlot) => {
    setTimetableSlots(prev => [...prev, slot]);
    setTeachers(prev => prev.map(t => {
      if (t.id === slot.teacherId) {
        return { ...t, currentPeriodsCount: t.currentPeriodsCount + 1 };
      }
      return t;
    }));
  };

  const handleUpdateTimetableSlot = (updated: TimetableSlot) => {
    setTimetableSlots(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  const handleDeleteTimetableSlot = (slotId: string) => {
    const target = timetableSlots.find(s => s.id === slotId);
    if (target) {
      setTeachers(prev => prev.map(t => {
        if (t.id === target.teacherId) {
          return { ...t, currentPeriodsCount: Math.max(0, t.currentPeriodsCount - 1) };
        }
        return t;
      }));
    }
    setTimetableSlots(prev => prev.filter(s => s.id !== slotId));
  };

  const handleSyncTimetableToDeliveryTracker = (slots: TimetableSlot[]) => {
    const newDeliveries: AssignedLessonDelivery[] = slots.map((slot, idx) => {
      return {
        id: `del-sync-${slot.id}`,
        lessonNoteId: 'lp-math-ss2-001',
        teacherId: slot.teacherId,
        teacherName: slot.teacherName,
        classGrade: slot.classGrade,
        classSection: slot.classGroupName,
        subjectName: slot.subjectName,
        topicTitle: slot.isRemedial ? `[Remedial] ${slot.subjectName}` : `${slot.subjectName} Modular Lesson`,
        subTopic: `Period ${slot.periodNumber} Teaching Block (${slot.roomNumber})`,
        week: 5,
        dayOfWeek: slot.dayOfWeek,
        period: slot.periodNumber,
        scheduledTime: `${slot.startTime} - ${slot.endTime}`,
        status: slot.isRemedial ? 'completed' : 'assigned',
        assignedAt: new Date().toISOString()
      };
    });

    setDeliveries(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const filteredNew = newDeliveries.filter(d => !existingIds.has(d.id));
      return [...filteredNew, ...prev];
    });
  };

  // --- Student & Attendance Register Handlers ---
  const handleAddStudent = (student: Student) => {
    setStudents(prev => [student, ...prev]);
    setClassGroups(prev => prev.map(cg => {
      if (cg.id === student.classGroupId) {
        return { ...cg, studentCount: cg.studentCount + 1 };
      }
      return cg;
    }));
  };

  const handleUpdateStudent = (updated: Student) => {
    setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  const handleSaveAttendanceRegister = (register: ClassAttendanceRegister) => {
    setAttendanceRegisters(prev => {
      const filtered = prev.filter(r => !(r.classGroupId === register.classGroupId && r.date === register.date));
      return [register, ...filtered];
    });
  };

  // --- Biometric & Movement Monitoring Handlers ---
  const handleAddMovementLog = (log: BiometricMovementLog) => {
    setMovementLogs(prev => [log, ...prev]);
    // Increment device total scans
    setBiometricDevices(prev => prev.map(d => {
      if (d.id === log.deviceId) {
        return { ...d, totalScansToday: d.totalScansToday + 1, lastHeartbeat: 'Just now' };
      }
      return d;
    }));
  };

  const handleUpdateTeacherAttendance = (record: TeacherAttendanceRecord) => {
    setTeacherAttendanceRecords(prev => prev.map(r => r.id === record.id ? record : r));
  };

  const handleAddMovementPass = (pass: MovementPass) => {
    setMovementPasses(prev => [pass, ...prev]);
  };

  const handleUpdateMovementPass = (pass: MovementPass) => {
    setMovementPasses(prev => prev.map(p => p.id === pass.id ? pass : p));
  };

  const handleUpdateBiometricProfile = (profile: BiometricEnrollmentProfile) => {
    setBiometricProfiles(prev => prev.map(p => p.personId === profile.personId ? profile : p));
  };

  const handleSyncClassRegisterFromBiometrics = (classGroupId: string, date: string) => {
    const targetGroup = classGroups.find(cg => cg.id === classGroupId);
    if (!targetGroup) return;

    const groupStudents = students.filter(s => s.classGroupId === classGroupId);
    const dateLogs = movementLogs.filter(l => l.date === date && l.movementType === 'entry_gate');

    const entries = groupStudents.map(student => {
      const matchLog = dateLogs.find(l => l.personId === student.id || l.personIdentifier === student.admissionNumber);
      const isLate = matchLog?.punctualityStatus === 'late';
      const isPresent = !!matchLog;

      return {
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        fullName: student.fullName,
        gender: student.gender,
        status: isLate ? ('late' as const) : isPresent ? ('present' as const) : ('absent' as const),
        arrivalTime: matchLog?.timeFormatted || (isPresent ? '07:45 AM' : undefined),
        remarks: matchLog ? `Biometric Verified via ${matchLog.deviceName}` : 'Unverified Absence'
      };
    });

    const presentCount = entries.filter(e => e.status === 'present').length;
    const lateCount = entries.filter(e => e.status === 'late').length;
    const absentCount = entries.filter(e => e.status === 'absent').length;
    const total = entries.length;
    const rate = total > 0 ? Math.round(((presentCount + lateCount) / total) * 100) : 100;

    const syncedRegister: ClassAttendanceRegister = {
      id: `reg-${classGroupId}-${date}`,
      date,
      classGroupId: targetGroup.id,
      classGroupName: targetGroup.name,
      classGrade: targetGroup.grade,
      term: targetGroup.term,
      week: 5,
      session: 'Full Day',
      takenById: currentUser.id,
      takenByName: `${currentUser.name} (Biometric Gate Sync)`,
      takenAt: new Date().toISOString(),
      entries,
      totalEnrolled: total,
      totalPresent: presentCount,
      totalAbsent: absentCount,
      totalLate: lateCount,
      totalExcused: 0,
      attendanceRatePercentage: rate,
      generalRemarks: `Synchronized automatically with biometric campus gate turnstiles and corridor sensors on ${date}.`,
      isSubmitted: true,
      biometricSyncStatus: 'fully_synced',
      lastBiometricSyncTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    };

    handleSaveAttendanceRegister(syncedRegister);
  };

  // Inter-tab Navigation Jump Helpers
  const handleSelectTeacherForTimetable = (teacherId: string) => {
    setSelectedTimetableTeacherId(teacherId);
    setActiveTab('school_timetable');
  };

  const handleSelectClassForTimetable = (classGroupId: string) => {
    setSelectedTimetableClassId(classGroupId);
    setActiveTab('school_timetable');
  };

  const handleSelectClassForRegister = (classGroupId: string) => {
    setSelectedRegisterClassId(classGroupId);
    setActiveTab('student_registers');
  };

  // Academic Calendar CRUD Handlers
  const handleUpdateTermConfig = (updatedTerm: AcademicTermConfig) => {
    setTermsConfig(prev => prev.map(t => t.id === updatedTerm.id ? updatedTerm : t));
  };

  const handleAddSchoolEvent = (newEvent: SchoolEvent) => {
    setSchoolEvents(prev => [...prev, newEvent]);
  };

  const handleUpdateSchoolEvent = (updatedEvent: SchoolEvent) => {
    setSchoolEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
  };

  const handleDeleteSchoolEvent = (eventId: string) => {
    setSchoolEvents(prev => prev.filter(e => e.id !== eventId));
  };

  const handleAddPublicHoliday = (newHoliday: PublicHoliday) => {
    setPublicHolidays(prev => [...prev, newHoliday]);
  };

  const handleUpdatePublicHoliday = (updatedHoliday: PublicHoliday) => {
    setPublicHolidays(prev => prev.map(h => h.id === updatedHoliday.id ? updatedHoliday : h));
  };

  const handleDeletePublicHoliday = (holidayId: string) => {
    setPublicHolidays(prev => prev.filter(h => h.id !== holidayId));
  };

  // --- Academic Records, Continuous Assessment & Broadsheet Handlers ---
  const handleUpdateSubjectScore = (updatedScore: StudentSubjectScore) => {
    setSubjectScores(prev => {
      const nextScores = prev.map(s => s.id === updatedScore.id ? updatedScore : s);
      // Recompile affected class broadsheet
      setClassAcademicRecords(prevRecords => {
        return prevRecords.map(record => {
          if (record.classGroupId === updatedScore.classGroupId && record.term === updatedScore.term) {
            return compileClassBroadsheet(record.classGroupId, classGroups, students, nextScores, record.term, record.academicSession);
          }
          return record;
        });
      });
      return nextScores;
    });
  };

  const handleBatchUpdateScores = (updatedScores: StudentSubjectScore[]) => {
    const updatedMap = new Map(updatedScores.map(s => [s.id, s]));
    setSubjectScores(prev => {
      const nextScores = prev.map(s => updatedMap.get(s.id) || s);
      if (updatedScores.length > 0) {
        const first = updatedScores[0];
        setClassAcademicRecords(prevRecords => {
          return prevRecords.map(record => {
            if (record.classGroupId === first.classGroupId && record.term === first.term) {
              return compileClassBroadsheet(record.classGroupId, classGroups, students, nextScores, record.term, record.academicSession);
            }
            return record;
          });
        });
      }
      return nextScores;
    });
  };

  const handleUpdateStudentTermSummary = (classGroupId: string, summary: StudentTermSummary) => {
    setClassAcademicRecords(prev => prev.map(record => {
      if (record.classGroupId === classGroupId && record.term === summary.term) {
        const nextSummaries = record.studentSummaries.map(s => s.studentId === summary.studentId ? summary : s);
        return {
          ...record,
          studentSummaries: nextSummaries,
          lastUpdated: new Date().toISOString()
        };
      }
      return record;
    }));
  };

  const handleLockSubjectScores = (subjectId: string, classGroupId: string) => {
    setSubjectScores(prev => prev.map(s => {
      if (s.subjectId === subjectId && s.classGroupId === classGroupId) {
        return { ...s, isLocked: true, lockedAt: new Date().toISOString() };
      }
      return s;
    }));
  };

  const handleUnlockSubjectScores = (subjectId: string, classGroupId: string) => {
    setSubjectScores(prev => prev.map(s => {
      if (s.subjectId === subjectId && s.classGroupId === classGroupId) {
        return { ...s, isLocked: false, unlockedAt: new Date().toISOString() };
      }
      return s;
    }));
  };

  const handleApproveBroadsheet = (classRecordId: string) => {
    setClassAcademicRecords(prev => prev.map(r => {
      if (r.id === classRecordId) {
        return {
          ...r,
          status: 'approved_by_principal',
          endorsedByPrincipal: true,
          publishedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        };
      }
      return r;
    }));
  };

  // --- IAM & Identity Access Management Governance Handlers ---
  const handleAssignAdminRole = (userId: string, roleType: any, isActing?: boolean, expiryDate?: string) => {
    // 1. Update Auth Accounts
    setAuthAccounts(prev => prev.map(acc => {
      if (acc.userId === userId || acc.id === userId) {
        const existingRoles = acc.assignedAdminRoles || [];
        const newRoles = existingRoles.includes(roleType) ? existingRoles : [...existingRoles, roleType];
        return {
          ...acc,
          assignedAdminRoles: newRoles,
          assignedByPrincipalDate: new Date().toISOString().split('T')[0]
        };
      }
      return acc;
    }));

    // 2. Audit Trail Logging
    const target = authAccounts.find(a => a.userId === userId || a.id === userId);
    const roleDef = adminRoles.find(r => r.roleType === roleType);
    const newLog: any = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: currentAccount.id,
      actorName: currentAccount.fullName,
      actorRole: currentAccount.primaryRole === 'principal_admin' ? 'Principal & Chief Executive Officer' : currentAccount.primaryRole,
      actionType: 'ROLE_ASSIGNED',
      targetUserId: target?.id,
      targetUserName: target?.fullName,
      targetRole: roleDef?.title || roleType,
      ipAddress: '197.210.226.45',
      details: isActing 
        ? `Office of the Principal issued temporary/acting role assignment (${roleDef?.title}) valid until ${expiryDate}.`
        : `Office of the Principal granted permanent administrative mandate: ${roleDef?.title}.`,
      status: 'success'
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleRevokeAdminRole = (userId: string, roleType: any) => {
    setAuthAccounts(prev => prev.map(acc => {
      if (acc.userId === userId || acc.id === userId) {
        return {
          ...acc,
          assignedAdminRoles: acc.assignedAdminRoles.filter(r => r !== roleType)
        };
      }
      return acc;
    }));

    const target = authAccounts.find(a => a.userId === userId || a.id === userId);
    const newLog: any = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: currentAccount.id,
      actorName: currentAccount.fullName,
      actorRole: 'Principal & Chief Executive Officer',
      actionType: 'ROLE_REVOKED',
      targetUserId: target?.id,
      targetUserName: target?.fullName,
      targetRole: roleType,
      ipAddress: '197.210.226.45',
      details: `Office of the Principal revoked administrative role: ${roleType}.`,
      status: 'success'
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleCreateCustomRole = (newRole: any) => {
    setAdminRoles(prev => [...prev, newRole]);
    const newLog: any = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: currentAccount.id,
      actorName: currentAccount.fullName,
      actorRole: 'Principal & Chief Executive Officer',
      actionType: 'ROLE_ASSIGNED',
      ipAddress: '197.210.226.45',
      details: `Created custom institutional administrative role: ${newRole.title} (${newRole.department}).`,
      status: 'success'
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleUpdateSecurityPolicy = (newPolicy: any) => {
    setSecurityPolicy(newPolicy);
    const newLog: any = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: currentAccount.id,
      actorName: currentAccount.fullName,
      actorRole: 'Principal & Chief Executive Officer',
      actionType: 'POLICY_UPDATED',
      ipAddress: '197.210.226.45',
      details: `Updated institutional IAM security policy and verification constraints.`,
      status: 'success'
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleToggleMFA = (userId: string) => {
    setAuthAccounts(prev => prev.map(acc => {
      if (acc.userId === userId || acc.id === userId) {
        const nextState = !acc.mfaEnabled;
        return {
          ...acc,
          mfaEnabled: nextState,
          mfaMethod: nextState ? 'sms_phone' : undefined
        };
      }
      return acc;
    }));
  };

  const handleRevokeSession = (userId: string) => {
    const target = authAccounts.find(a => a.userId === userId || a.id === userId);
    const newLog: any = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: currentAccount.id,
      actorName: currentAccount.fullName,
      actorRole: 'Principal & Chief Executive Officer',
      actionType: 'SESSION_REVOKED',
      targetUserId: target?.id,
      targetUserName: target?.fullName,
      ipAddress: '197.210.226.45',
      details: `Terminated and invalidated all active login sessions for ${target?.fullName}.`,
      status: 'success'
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleTriggerPhoneVerification = (account: any) => {
    setCurrentAccount(account);
    setAuthModalMode('phone_verify');
    setIsAuthModalOpen(true);
  };

  const handleLoginSuccess = (account: any, method: any) => {
    setCurrentAccount(account);
    // Find matching profile or update currentUser
    const matchingProfile = MOCK_USERS.find(u => u.id === account.userId || u.id === account.id);
    if (matchingProfile) {
      setCurrentUser(matchingProfile);
    } else {
      setCurrentUser({
        id: account.userId || account.id,
        name: account.fullName,
        title: account.primaryRole === 'principal_admin' ? 'Principal & Chief Executive Officer' : account.primaryRole,
        role: account.primaryRole as any,
        avatar: account.avatar || 'FA',
        department: 'Institutional Leadership',
        officeTitle: 'Office of the Principal',
        email: account.email,
        phone: account.phone,
        isEmailVerified: account.isEmailVerified,
        isPhoneVerified: account.isPhoneVerified,
        isGoogleLinked: account.isGoogleLinked,
        mfaEnabled: account.mfaEnabled
      });
    }

    const newLog: any = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: account.id,
      actorName: account.fullName,
      actorRole: account.primaryRole,
      actionType: 'LOGIN_SUCCESS',
      ipAddress: '197.210.226.45',
      details: `Successful sign in via ${method.toUpperCase()} authentication provider.`,
      status: 'success'
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleUpdateAccount = (updatedAccount: any) => {
    setAuthAccounts(prev => prev.map(a => a.id === updatedAccount.id ? updatedAccount : a));
    if (currentAccount.id === updatedAccount.id) {
      setCurrentAccount(updatedAccount);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans selection:bg-emerald-500 selection:text-white">
      {/* Collapsible Vertical Navigation Side Drawer */}
      <NavigationDrawer
        currentUser={currentUser}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isOpen={isDrawerOpenMobile}
        isCollapsed={isDrawerCollapsed}
        onToggleCollapse={() => setIsDrawerCollapsed(prev => !prev)}
        onCloseMobile={() => setIsDrawerOpenMobile(false)}
        pendingApprovalsCount={pendingApprovalsCount}
        pendingRemedialsCount={pendingRemedialsCount}
        brandProfile={schoolBrand}
        onOpenAdvisorModal={() => setIsAdvisorOpen(true)}
        onOpenAuthModal={() => {
          setAuthModalMode('signin');
          setIsAuthModalOpen(true);
        }}
      />

      {/* Main Content Area Frame (Adjusts with Drawer Collapse on Desktop) */}
      <div className={`min-h-screen flex flex-col flex-1 w-full transition-all duration-300 ${
        isDrawerCollapsed ? 'lg:pl-20' : 'lg:pl-72'
      }`}>
        {/* Top Universal Navbar Header */}
        <Navbar
          currentUser={currentUser}
          allUsers={allUsersList}
          onSelectUser={handleSelectUser}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenAdvisorModal={() => setIsAdvisorOpen(true)}
          onOpenInstallModal={() => setIsInstallModalOpen(true)}
          onOpenAuthModal={() => {
            setAuthModalMode('signin');
            setIsAuthModalOpen(true);
          }}
          pendingApprovalsCount={pendingApprovalsCount}
          pendingRemedialsCount={pendingRemedialsCount}
          brandProfile={schoolBrand}
          onToggleDrawer={() => setIsDrawerOpenMobile(prev => !prev)}
          isDrawerCollapsed={isDrawerCollapsed}
          onToggleCollapse={() => setIsDrawerCollapsed(prev => !prev)}
          platformMode={platformMode}
          activeTenant={activeTenant}
          allTenants={clonedTenants}
          onSelectTenant={(t) => handleSelectTenantToLaunch(t)}
          onSwitchPlatformMode={(mode) => setPlatformMode(mode)}
          onOpenCloneModal={() => setIsCloneModalOpen(true)}
          onOpenConnectModal={() => setIsConnectModalOpen(true)}
        />

        {/* Global Page Navigation Bar, Breadcrumbs, History & Quick Jump */}
        <GlobalPageNavigator
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          currentUser={currentUser}
          brandProfile={schoolBrand}
          activeTenant={activeTenant}
        />

        {/* Main Tab Content */}
        <main className={`flex-1 w-full ${activeTab === 'curriculum_server_landing' || activeTab === 'command_center' || activeTab === 'teacher_dashboard' ? 'p-0 max-w-none' : 'max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8'}`}>
        {activeTab === 'curriculum_server_landing' && (
          <CurriculumServerLandingPage
            tenants={clonedTenants}
            metrics={saasMetrics}
            onLaunchTenant={handleSelectTenantToLaunch}
            onOpenCloneModal={() => setIsCloneModalOpen(true)}
            onOpenConnectModal={() => setIsConnectModalOpen(true)}
            onNavigateToMasterConsole={() => setActiveTab('tenant_control_center')}
            onNavigateToDomainPortal={() => setActiveTab('domain_management')}
            onStartProvisioning={(draft) => {
              setProvisioningDraft(draft || null);
              setIsProvisioningModalOpen(true);
            }}
            onOpenAuthModal={() => {
              setAuthModalMode('signin');
              setIsAuthModalOpen(true);
            }}
            onEnterSelfService={() => setActiveTab('customer_self_service')}
            onOpenIsolationTests={() => setIsIsolationTestModalOpen(true)}
            onOpenApiWebhooks={() => setActiveTab('api_webhooks')}
          />
        )}

        {activeTab === 'tenant_control_center' && (
          <TenantControlCenter
            tenants={clonedTenants}
            metrics={saasMetrics}
            invoices={saasInvoices}
            onSelectTenantToLaunch={handleSelectTenantToLaunch}
            onOpenProvisionTerminal={(draft) => {
              setProvisioningDraft(draft || null);
              setIsProvisioningModalOpen(true);
            }}
            onOpenIsolationTestModal={() => setIsIsolationTestModalOpen(true)}
            onOpenVersionRolloutModal={() => setIsVersionRolloutModalOpen(true)}
            onOpenDomainPortal={() => setActiveTab('domain_management')}
            onOpenApiWebhooks={() => setActiveTab('api_webhooks')}
            onToggleTenantStatus={handleToggleTenantStatus}
            onUpdateTenantFeatures={handleUpdateTenantFeatures}
          />
        )}

        {activeTab === 'customer_self_service' && (
          <CustomerSelfServicePortal
            tenants={clonedTenants}
            invoices={saasInvoices}
            onLaunchTenant={handleSelectTenantToLaunch}
            onUpdateTenant={(updated) => {
              setClonedTenants(prev => prev.map(t => t.id === updated.id ? updated : t));
              if (activeTenant.id === updated.id) {
                setActiveTenant(updated);
              }
            }}
            onBackToAdmin={() => setActiveTab('tenant_control_center')}
          />
        )}

        {activeTab === 'api_webhooks' && (
          <ApiWebhooksPortal
            tenants={clonedTenants}
            onBack={() => setActiveTab('tenant_control_center')}
          />
        )}

        {activeTab === 'curriculum_server' && (
          <CurriculumServerDashboard
            tenants={clonedTenants}
            metrics={saasMetrics}
            invoices={saasInvoices}
            onSelectTenantToLaunch={handleSelectTenantToLaunch}
            onOpenCloneModal={() => setIsCloneModalOpen(true)}
            onOpenConnectModal={() => setIsConnectModalOpen(true)}
            onOpenCredentialsModal={(t) => {
              setSelectedTenantForCredentials(t);
              setIsCredentialsModalOpen(true);
            }}
            onOpenFeaturesModal={(t) => {
              setSelectedTenantForFeatures(t);
              setIsFeaturesModalOpen(true);
            }}
            onOpenLeaseTrackerModal={(t) => {
              setSelectedTenantForLease(t);
              setIsLeaseTrackerModalOpen(true);
            }}
            onToggleTenantStatus={handleToggleTenantStatus}
            onNavigateToLanding={() => setActiveTab('curriculum_server_landing')}
            onNavigateToDomainPortal={() => setActiveTab('domain_management')}
          />
        )}

        {activeTab === 'domain_management' && (
          <DomainManagementPortal
            tenants={clonedTenants}
            activeTenant={activeTenant}
            onUpdateTenantDomain={(tenantId, domainName) => {
              setClonedTenants(prev => prev.map(t => {
                if (t.id === tenantId) {
                  return {
                    ...t,
                    customDomain: domainName,
                    subdomain: domainName
                  };
                }
                return t;
              }));
            }}
            onNavigateToMasterConsole={() => setActiveTab('curriculum_server')}
          />
        )}

        {activeTab === 'command_center' && (
          <CommandCenterTab
            currentUser={currentUser}
            kpis={kpis}
            lessonNotes={lessonNotes}
            deliveries={deliveries}
            remedials={remedials}
            exams={exams}
            onNavigateTab={setActiveTab}
            onApproveLesson={handleApproveLesson}
            onLaunchLessonModal={() => {
              setLessonTargetSubject(null);
              setLessonTargetTopic(null);
              setIsLessonPlanModalOpen(true);
            }}
            onLaunchExamModal={() => {
              setActiveTab('secure_exams');
            }}
            brandProfile={schoolBrand}
            activeTenant={activeTenant}
            onOpenAuthModal={() => {
              setAuthModalMode('signin');
              setIsAuthModalOpen(true);
            }}
          />
        )}

        {activeTab === 'teacher_dashboard' && (
          <TeacherDashboardTab
            currentUser={currentUser}
            kpis={kpis}
            lessonNotes={lessonNotes}
            deliveries={deliveries}
            remedials={remedials}
            exams={exams}
            onNavigateTab={setActiveTab}
            onLaunchLessonModal={() => {
              setLessonTargetSubject(null);
              setLessonTargetTopic(null);
              setIsLessonPlanModalOpen(true);
            }}
            onLaunchExamModal={() => {
              setActiveTab('secure_exams');
            }}
            brandProfile={schoolBrand}
            activeTenant={activeTenant}
            onOpenAuthModal={() => {
              setAuthModalMode('signin');
              setIsAuthModalOpen(true);
            }}
            onOpenAdvisorModal={() => setIsAdvisorOpen(true)}
          />
        )}

        {activeTab === 'admin_assistant_dashboard' && (
          <AdminAssistantDashboardTab
            currentUser={currentUser}
            kpis={kpis}
            lessonNotes={lessonNotes}
            deliveries={deliveries}
            remedials={remedials}
            exams={exams}
            onNavigateTab={setActiveTab}
            brandProfile={schoolBrand}
            activeTenant={activeTenant}
            onOpenAuthModal={() => {
              setAuthModalMode('signin');
              setIsAuthModalOpen(true);
            }}
            onOpenAdvisorModal={() => setIsAdvisorOpen(true)}
          />
        )}

        {activeTab === 'student_dashboard' && (
          <StudentDashboardTab
            currentUser={currentUser}
            brandProfile={schoolBrand}
            activeTenant={activeTenant}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'parent_dashboard' && (
          <ParentDashboardTab
            currentUser={currentUser}
            brandProfile={schoolBrand}
            activeTenant={activeTenant}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'principal_governance' && (
          <PrincipalFeatureGovernanceTab
            currentUser={currentUser}
            tenant={activeTenant || clonedTenants[0]}
            onUpdateTenant={handleUpdateTenantApp}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'user_onboarding' && (
          <UserOnboardingSuiteTab
            currentUser={currentUser}
            brandProfile={schoolBrand}
            activeTenant={activeTenant}
            onNavigateTab={setActiveTab}
            allUsers={allUsersList}
            onAddNewUser={(newUser) => {
              setAllUsersList(prev => [newUser, ...prev]);
            }}
          />
        )}

        {activeTab === 'brand_management' && (
          <BrandManagementTab
            currentUser={currentUser}
            brandProfile={schoolBrand}
            onUpdateBrand={setSchoolBrand}
            onPublishBrand={setSchoolBrand}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'bursary_accounts' && (
          <AccountManagementTab
            currentUser={currentUser}
          />
        )}

        {activeTab === 'iam_governance' && (
          <IAMGovernanceTab
            currentUser={currentUser}
            currentAccount={currentAccount}
            allAccounts={authAccounts}
            adminRoles={adminRoles}
            securityPolicy={securityPolicy}
            auditLogs={auditLogs}
            onAssignRole={handleAssignAdminRole}
            onRevokeRole={handleRevokeAdminRole}
            onCreateCustomRole={handleCreateCustomRole}
            onUpdatePolicy={handleUpdateSecurityPolicy}
            onToggleMFA={handleToggleMFA}
            onRevokeSession={handleRevokeSession}
            onTriggerPhoneVerification={handleTriggerPhoneVerification}
            onOpenAuthModal={() => {
              setAuthModalMode('signin');
              setIsAuthModalOpen(true);
            }}
          />
        )}

        {activeTab === 'user_profiles' && (
          <UserProfilesTab
            currentUser={currentUser}
            brandProfile={schoolBrand}
            onNavigateTab={setActiveTab}
            onSelectStudentParent={(parentId) => {
              setSelectedParentIdForDb(parentId);
              setActiveTab('parent_database');
            }}
          />
        )}

        {activeTab === 'parent_database' && (
          <ParentDatabaseTab
            currentUser={currentUser}
            brandProfile={schoolBrand}
            initialSelectedParentId={selectedParentIdForDb}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'academic_calendar' && (
          <AcademicCalendarTab
            currentUser={currentUser}
            academicSessions={academicSessions}
            termsConfig={termsConfig}
            publicHolidays={publicHolidays}
            schoolEvents={schoolEvents}
            onUpdateTermConfig={handleUpdateTermConfig}
            onAddSchoolEvent={handleAddSchoolEvent}
            onUpdateSchoolEvent={handleUpdateSchoolEvent}
            onDeleteSchoolEvent={handleDeleteSchoolEvent}
            onAddPublicHoliday={handleAddPublicHoliday}
            onUpdatePublicHoliday={handleUpdatePublicHoliday}
            onDeletePublicHoliday={handleDeletePublicHoliday}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'teacher_pool' && (
          <TeacherPoolTab
            currentUser={currentUser}
            teachers={teachers}
            onAddTeacher={handleAddTeacher}
            onUpdateTeacher={handleUpdateTeacher}
            onDeleteTeacher={handleDeleteTeacher}
            onSelectTeacherForTimetable={handleSelectTeacherForTimetable}
          />
        )}

        {activeTab === 'class_groups' && (
          <ClassGroupsTab
            currentUser={currentUser}
            classGroups={classGroups}
            teachers={teachers}
            onAddClassGroup={handleAddClassGroup}
            onUpdateClassGroup={handleUpdateClassGroup}
            onDeleteClassGroup={handleDeleteClassGroup}
            onSelectClassForTimetable={handleSelectClassForTimetable}
            onSelectClassForRegister={handleSelectClassForRegister}
          />
        )}

        {activeTab === 'school_timetable' && (
          <SchoolTimetableTab
            currentUser={currentUser}
            timetableSlots={timetableSlots}
            teachers={teachers}
            classGroups={classGroups}
            onAddSlot={handleAddTimetableSlot}
            onUpdateSlot={handleUpdateTimetableSlot}
            onDeleteSlot={handleDeleteTimetableSlot}
            onSyncWithDeliveryTracker={handleSyncTimetableToDeliveryTracker}
            initialSelectedClassGroupId={selectedTimetableClassId}
            initialSelectedTeacherId={selectedTimetableTeacherId}
          />
        )}

        {activeTab === 'student_registers' && (
          <StudentRegistersTab
            currentUser={currentUser}
            students={students}
            classGroups={classGroups}
            teachers={teachers}
            attendanceRegisters={attendanceRegisters}
            movementLogs={movementLogs}
            onAddStudent={handleAddStudent}
            onUpdateStudent={handleUpdateStudent}
            onSaveAttendanceRegister={handleSaveAttendanceRegister}
            initialSelectedClassGroupId={selectedRegisterClassId}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'academic_records' && (
          <AcademicRecordsTab
            currentUser={currentUser}
            classGroups={classGroups}
            teachers={teachers}
            students={students}
            subjectScores={subjectScores}
            classRecords={classAcademicRecords}
            onUpdateSubjectScore={handleUpdateSubjectScore}
            onBatchUpdateScores={handleBatchUpdateScores}
            onUpdateStudentTermSummary={handleUpdateStudentTermSummary}
            onLockSubjectScores={handleLockSubjectScores}
            onUnlockSubjectScores={handleUnlockSubjectScores}
            onApproveBroadsheet={handleApproveBroadsheet}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'biometric_attendance' && (
          <BiometricAttendanceTab
            currentUser={currentUser}
            teachers={teachers}
            classGroups={classGroups}
            students={students}
            devices={biometricDevices}
            movementLogs={movementLogs}
            teacherAttendanceRecords={teacherAttendanceRecords}
            movementPasses={movementPasses}
            biometricProfiles={biometricProfiles}
            onAddMovementLog={handleAddMovementLog}
            onUpdateTeacherAttendance={handleUpdateTeacherAttendance}
            onAddMovementPass={handleAddMovementPass}
            onUpdateMovementPass={handleUpdateMovementPass}
            onUpdateBiometricProfile={handleUpdateBiometricProfile}
            onSyncClassRegisterFromBiometrics={handleSyncClassRegisterFromBiometrics}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'curriculum_source' && (
          <CurriculumExplorerTab
            subjects={NERDC_SUBJECTS_DATABASE}
            onOpenLessonPlan={handleLaunchLessonPlan}
            onOpenScheme={handleLaunchScheme}
            onOpenVariableQuestions={handleOpenVariableQuestionsFromCurriculum}
            onOpenTaughtAssessment={handleOpenTaughtAssessmentFromCurriculum}
          />
        )}

        {activeTab === 'lesson_chain' && (
          <LessonApprovalChainTab
            currentUser={currentUser}
            lessonNotes={lessonNotes}
            onApproveLesson={handleApproveLesson}
            onRejectLesson={handleRejectLesson}
            onReviewLesson={handleReviewLesson}
            onOpenDraftModal={() => {
              setLessonTargetSubject(null);
              setLessonTargetTopic(null);
              setIsLessonPlanModalOpen(true);
            }}
          />
        )}

        {activeTab === 'delivery_tracking' && (
          <TeacherDeliveryTrackerTab
            currentUser={currentUser}
            deliveries={deliveries}
            onUpdateDeliveryStatus={handleUpdateDeliveryStatus}
            onSubmitFeedback={handleSubmitFeedback}
            onTriggerRemedial={handleTriggerRemedialFromDelivery}
          />
        )}

        {activeTab === 'adaptive_remedial' && (
          <AdaptiveRemedialTab
            currentUser={currentUser}
            remedials={remedials}
            onAddRemedial={handleAddRemedialUnit}
            onScheduleRemedialToTimetable={handleScheduleRemedialToTimetable}
          />
        )}

        {activeTab === 'question_bank' && (
          <QuestionBankTab
            currentUser={currentUser}
            questionBank={questionBank}
            onAddQuestion={handleAddQuestion}
          />
        )}

        {activeTab === 'secure_exams' && (
          <SecureExaminationTab
            currentUser={currentUser}
            exams={exams}
            markingSchemes={markingSchemes}
            onLockExam={handleLockExam}
            onAuthorizeExam={handleAuthorizeExam}
            onUnlockMarkingScheme={handleUnlockMarkingScheme}
            onAddExam={handleAddExam}
          />
        )}

        {activeTab === 'taught_assessment' && (
          <TaughtAssessmentTab
            currentUser={currentUser}
            subjects={NERDC_SUBJECTS_DATABASE}
          />
        )}

        {activeTab === 'academic_analytics' && (
          <AcademicAnalyticsTab
            currentUser={currentUser}
            kpis={kpis}
            studentProfiles={studentProfiles}
            onGeneratePersonalizedWorksheet={handleGeneratePersonalizedWorksheet}
          />
        )}

        {activeTab === 'report_card_studio' && (
          <TerminalReportCardStudio
            currentUser={currentUser}
            brandProfile={schoolBrand}
            activeTenant={activeTenant}
          />
        )}

        {activeTab === 'promotional_mock_exams' && (
          <PromotionalMockExamPortal
            currentUser={currentUser}
            brandProfile={schoolBrand}
            activeTenant={activeTenant}
          />
        )}

        {activeTab === 'docker_orchestration' && (
          <DockerOrchestrationConsole
            tenants={clonedTenants}
            currentUser={currentUser}
            onBackToCockpit={() => setActiveTab('tenant_control_center')}
          />
        )}
      </main>

      {/* Official Government & Academic Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-10 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-bold shadow">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-200 block text-sm">
                  CurriculumFlow • Academic Management Platform
                </span>
                <span className="text-slate-500 text-xs">
                  Grounded in the Nigerian Educational Research and Development Council (NERDC) National Curriculum
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <button
                onClick={() => setIsInstallModalOpen(true)}
                className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer bg-sky-950/40 px-2.5 py-1 rounded-lg border border-sky-800/40"
              >
                <span>📲 Download & Install App (Android / iOS / PC)</span>
              </button>
              <span>•</span>
              <a
                href="https://www.nerdc.gov.ng/content_manager/jss1-3.html"
                target="_blank"
                rel="noreferrer"
                className="hover:text-emerald-400 flex items-center gap-1 transition-colors"
              >
                <span>NERDC JSS 1-3 Syllabus Source</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span>•</span>
              <a
                href="https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html"
                target="_blank"
                rel="noreferrer"
                className="hover:text-emerald-400 flex items-center gap-1 transition-colors"
              >
                <span>NERDC Senior Secondary Source</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-xs">
            <p>
              Operating the Controlled Digital Chain: Approved Curriculum → Lesson Planning → Principal Review → Teacher Delivery → Taught Assessment → Secure Examination.
            </p>
            <p className="font-mono">
              WAEC • NECO • BECE • JAMB Aligned Standard
            </p>
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <InstallShareModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      <CurriculumAdvisorModal
        isOpen={isAdvisorOpen}
        onClose={() => setIsAdvisorOpen(false)}
        currentUser={currentUser}
      />

      <LessonPlanModal
        isOpen={isLessonPlanModalOpen}
        onClose={() => setIsLessonPlanModalOpen(false)}
        initialSubject={lessonTargetSubject}
        initialTopic={lessonTargetTopic}
      />

      <SchemeOfWorkModal
        isOpen={isSchemeModalOpen}
        onClose={() => setIsSchemeModalOpen(false)}
        initialSubject={schemeTargetSubject}
      />

      <ExamBuilderModal
        isOpen={isExamModalOpen}
        onClose={() => setIsExamModalOpen(false)}
        initialSubject={examTargetSubject}
        initialTopic={examTargetTopic}
      />

      <SubjectDetailModal
        subject={activeSubjectDetail}
        onClose={() => setActiveSubjectDetail(null)}
        onLaunchLessonPlan={(sub, topic) => {
          setActiveSubjectDetail(null);
          handleLaunchLessonPlan(sub, topic);
        }}
        onLaunchScheme={(sub) => {
          setActiveSubjectDetail(null);
          handleLaunchScheme(sub);
        }}
        onLaunchExam={(sub, topic) => {
          setActiveSubjectDetail(null);
          handleLaunchExam(sub, topic);
        }}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        currentAccount={currentAccount}
        allAccounts={authAccounts}
        onLoginSuccess={handleLoginSuccess}
        onUpdateAccount={handleUpdateAccount}
        mfaReason={mfaReason}
      />

      {/* SaaS Master Platform Modals */}
      <CloneSchoolModal
        isOpen={isCloneModalOpen}
        onClose={() => setIsCloneModalOpen(false)}
        onProvisionTenant={handleCloneNewTenant}
      />

      <TenantCredentialsModal
        tenant={selectedTenantForCredentials}
        isOpen={isCredentialsModalOpen}
        onClose={() => {
          setIsCredentialsModalOpen(false);
          setSelectedTenantForCredentials(null);
        }}
        onRotateSecret={handleUpdateTenantSecret}
      />

      <TenantFeaturesModal
        tenant={selectedTenantForFeatures}
        isOpen={isFeaturesModalOpen}
        onClose={() => {
          setIsFeaturesModalOpen(false);
          setSelectedTenantForFeatures(null);
        }}
        onSaveFeatures={handleUpdateTenantFeatures}
      />

      <LeaseToOwnTrackerModal
        tenant={selectedTenantForLease}
        isOpen={isLeaseTrackerModalOpen}
        onClose={() => {
          setIsLeaseTrackerModalOpen(false);
          setSelectedTenantForLease(null);
        }}
        onEarlyBuyout={handleEarlyBuyout}
      />

      <TenantConnectModal
        allTenants={clonedTenants}
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onConnectTenant={handleSelectTenantToLaunch}
      />

      {/* Control Plane Enterprise Provisioning Terminal */}
      <ProvisioningTerminalModal
        isOpen={isProvisioningModalOpen}
        onClose={() => {
          setIsProvisioningModalOpen(false);
          setProvisioningDraft(null);
        }}
        tenantDraft={provisioningDraft}
        onProvisionComplete={(completedTenant) => {
          handleCloneNewTenant(completedTenant);
          setIsProvisioningModalOpen(false);
          setProvisioningDraft(null);
        }}
      />

      {/* Multi-Tenant Security & Isolation Test Runner (Section 34) */}
      <TenantIsolationTestModal
        isOpen={isIsolationTestModalOpen}
        onClose={() => setIsIsolationTestModalOpen(false)}
        tenants={clonedTenants}
      />

      {/* Canary Version Management & Container Rollout (Section 20) */}
      <VersionRolloutModal
        isOpen={isVersionRolloutModalOpen}
        onClose={() => setIsVersionRolloutModalOpen(false)}
        tenants={clonedTenants}
        onUpgradeTenants={(version, tenantIds) => {
          setClonedTenants(prev => prev.map(t => {
            if (tenantIds.includes(t.id)) {
              return {
                ...t,
                clonedFromTemplateVersion: version,
                auditLogsCount: (t.auditLogsCount || 0) + 1
              };
            }
            return t;
          }));
        }}
      />
      </div>
    </div>
  );
}
