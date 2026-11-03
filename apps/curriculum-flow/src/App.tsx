import React, { useState, useEffect } from 'react';
import { CurriculumFlowSidebar, FlowNavTab } from './components/CurriculumFlowSidebar';
import { CurriculumFlowHeader } from './components/CurriculumFlowHeader';
import { setActiveApplication } from '../../../src/services/domainRouter';

// School ERP Modular Tab Components
import { CommandCenterTab } from '../../../src/components/CommandCenterTab';
import { CurriculumExplorerTab } from '../../../src/components/CurriculumExplorerTab';
import { LessonApprovalChainTab } from '../../../src/components/LessonApprovalChainTab';
import { TeacherDeliveryTrackerTab } from '../../../src/components/TeacherDeliveryTrackerTab';
import { QuestionBankTab } from '../../../src/components/QuestionBankTab';
import { SecureExaminationTab } from '../../../src/components/SecureExaminationTab';
import { TaughtAssessmentTab } from '../../../src/components/TaughtAssessmentTab';
import { AdaptiveRemedialTab } from '../../../src/components/AdaptiveRemedialTab';
import { AcademicRecordsTab } from '../../../src/components/AcademicRecordsTab';
import { AcademicAnalyticsTab } from '../../../src/components/AcademicAnalyticsTab';
import { StudentRegistersTab } from '../../../src/components/StudentRegistersTab';
import { BiometricAttendanceTab } from '../../../src/components/BiometricAttendanceTab';
import { AccountManagementTab } from '../../../src/components/AccountManagementTab';
import { TeacherDashboardTab } from '../../../src/components/TeacherDashboardTab';
import { TeacherPoolTab } from '../../../src/components/TeacherPoolTab';
import { ClassGroupsTab } from '../../../src/components/ClassGroupsTab';
import { SchoolTimetableTab } from '../../../src/components/SchoolTimetableTab';
import { AcademicCalendarTab } from '../../../src/components/AcademicCalendarTab';
import { StudentDashboardTab } from '../../../src/components/StudentDashboardTab';
import { ParentDashboardTab } from '../../../src/components/ParentDashboardTab';
import { AdminAssistantDashboardTab } from '../../../src/components/AdminAssistantDashboardTab';
import { LogisticsSupportSuiteTab } from '../../../src/components/LogisticsSupportSuiteTab';
import { QualityAssuranceTab } from '../../../src/components/QualityAssuranceTab';

// Modals
import { LessonPlanModal } from '../../../src/components/LessonPlanModal';
import { SchemeOfWorkModal } from '../../../src/components/SchemeOfWorkModal';
import { ExamBuilderModal } from '../../../src/components/ExamBuilderModal';
import { SubjectDetailModal } from '../../../src/components/SubjectDetailModal';

// Mock Data
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
} from '../../../src/data/curriculumFlowData';
import { INITIAL_SCHOOL_BRAND } from '../../../src/data/brandManagementData';
import { UserProfile, SubjectCurriculum, UserRole } from '../../../src/types';
import { NERDC_SUBJECTS_DATABASE } from '../../../src/data/nerdcDatabase';
import { unifiedApiClient } from '../../../src/services/unifiedApiClient';
import { CurriculumFlowPublicHome } from '../../../src/components/CurriculumFlowPublicHome';
import { UniversalCustomerOnboardingWizard } from '../../../src/components/UniversalCustomerOnboardingWizard';

export const CurriculumFlowApp: React.FC = () => {
  const [viewMode, setViewMode] = useState<'public_homepage' | 'school_workspace'>('public_homepage');
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(MOCK_USERS[0]); // Default: Principal Dr. Mustapha
  const [activeTab, setActiveTab] = useState<FlowNavTab>('command_center');
  const [schoolBrand, setSchoolBrand] = useState(INITIAL_SCHOOL_BRAND);
  const [activeTenantId, setActiveTenantId] = useState<string>('tenant_apex_001');
  const [schoolProfile, setSchoolProfile] = useState<any>(null);

  // Authenticate and synchronize school configuration from authoritative unified backend
  useEffect(() => {
    let isMounted = true;
    const syncSchoolContext = async () => {
      try {
        // Authenticate into school instance with backend
        await unifiedApiClient.loginSchool(
          activeTenantId,
          currentUser.email || currentUser.id,
          undefined,
          currentUser.role
        ).catch(() => null);

        // Fetch authoritative school profile & branding from PostgreSQL
        const profile = await unifiedApiClient.getSchoolProfile(activeTenantId).catch(() => null);

        if (isMounted && profile) {
          setSchoolProfile(profile);
          setSchoolBrand(prev => ({
            ...prev,
            schoolName: profile.schoolName,
            motto: profile.tagline || prev.motto
          }));
        }
      } catch (err) {
        console.warn('Curriculum Flow backend sync warning:', err);
      }
    };

    syncSchoolContext();
    return () => { isMounted = false; };
  }, [activeTenantId, currentUser.role]);

  // Modals state
  const [selectedSubjectDetail, setSelectedSubjectDetail] = useState<SubjectCurriculum | null>(null);
  const [isExamBuilderOpen, setIsExamBuilderOpen] = useState(false);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [isSchemeModalOpen, setIsSchemeModalOpen] = useState(false);

  // Handle URL hash changes
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#/', '').replace('#', '');
      if (hash === 'home' || hash === 'landing' || hash === 'flow_home' || hash === 'about' || !hash) {
        setViewMode('public_homepage');
      } else {
        setViewMode('school_workspace');
        if (hash === 'command_center' || hash === 'overview') setActiveTab('command_center');
        else if (hash === 'curriculum_explorer' || hash === 'curriculum') setActiveTab('curriculum_explorer');
        else if (hash === 'lesson_approval_chain' || hash === 'lessons') setActiveTab('lesson_approval_chain');
        else if (hash === 'delivery_tracker' || hash === 'delivery') setActiveTab('delivery_tracker');
        else if (hash === 'question_bank' || hash === 'questions') setActiveTab('question_bank');
        else if (hash === 'secure_examination' || hash === 'cbt' || hash === 'exams') setActiveTab('secure_examination');
        else if (hash === 'academic_records' || hash === 'broadsheet') setActiveTab('academic_records');
        else if (hash === 'student_registers' || hash === 'students') setActiveTab('student_registers');
        else if (hash === 'biometric_attendance' || hash === 'biometric') setActiveTab('biometric_attendance');
        else if (hash === 'account_management' || hash === 'bursary') setActiveTab('account_management');
        else if (hash === 'teacher_dashboard') setActiveTab('teacher_dashboard');
        else if (hash === 'student_dashboard') setActiveTab('student_dashboard');
        else if (hash === 'parent_dashboard') setActiveTab('parent_dashboard');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleSelectTab = (tab: FlowNavTab) => {
    setActiveTab(tab);
    window.location.hash = `#/${tab}`;
  };

  const handleSwitchToServer = () => {
    setActiveApplication('curriculum_server');
  };

  if (viewMode === 'public_homepage') {
    return (
      <div className="relative w-full min-h-screen bg-slate-950">
        <CurriculumFlowPublicHome
          onEnterSchoolWorkspace={() => setViewMode('school_workspace')}
          onSelectRoleLogin={(role) => {
            const match = MOCK_USERS.find(u => u.role === role) || MOCK_USERS[0];
            setCurrentUser(match);
            setViewMode('school_workspace');
          }}
          onOpenUniversalOnboarding={() => setIsOnboardingModalOpen(true)}
          onSwitchToServer={handleSwitchToServer}
        />

        {isOnboardingModalOpen && (
          <UniversalCustomerOnboardingWizard
            isOpen={isOnboardingModalOpen}
            onClose={() => setIsOnboardingModalOpen(false)}
            onProvisionSuccess={() => {
              setIsOnboardingModalOpen(false);
              setViewMode('school_workspace');
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased">
      {/* Role-Aware Sidebar */}
      <CurriculumFlowSidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        userRole={currentUser.role}
        schoolName={schoolBrand.schoolName}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <CurriculumFlowHeader
          currentUser={currentUser}
          onChangeUserRole={setCurrentUser}
          onSwitchToServerApp={handleSwitchToServer}
          onViewPublicHomepage={() => setViewMode('public_homepage')}
          schoolName={schoolBrand.schoolName}
        />

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {activeTab === 'command_center' && (
              <CommandCenterTab
                onOpenLessonModal={() => setIsLessonModalOpen(true)}
                onOpenExamBuilder={() => setIsExamBuilderOpen(true)}
                onOpenSchemeModal={() => setIsSchemeModalOpen(true)}
                onNavigateTab={(tab) => handleSelectTab(tab as any)}
                kpis={MOCK_KPIS}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'curriculum_explorer' && (
              <CurriculumExplorerTab
                onSelectSubject={(subject) => setSelectedSubjectDetail(subject)}
              />
            )}

            {activeTab === 'lesson_approval_chain' && (
              <LessonApprovalChainTab
                onOpenLessonModal={() => setIsLessonModalOpen(true)}
              />
            )}

            {activeTab === 'delivery_tracker' && (
              <TeacherDeliveryTrackerTab
                currentUser={currentUser}
              />
            )}

            {activeTab === 'question_bank' && (
              <QuestionBankTab
                onOpenExamBuilder={() => setIsExamBuilderOpen(true)}
              />
            )}

            {activeTab === 'secure_examination' && (
              <SecureExaminationTab
                currentUser={currentUser}
                onOpenExamBuilder={() => setIsExamBuilderOpen(true)}
              />
            )}

            {activeTab === 'taught_assessment' && (
              <TaughtAssessmentTab />
            )}

            {activeTab === 'remedial_hub' && (
              <AdaptiveRemedialTab />
            )}

            {activeTab === 'academic_records' && (
              <AcademicRecordsTab />
            )}

            {activeTab === 'academic_analytics' && (
              <AcademicAnalyticsTab />
            )}

            {activeTab === 'student_registers' && (
              <StudentRegistersTab />
            )}

            {activeTab === 'biometric_attendance' && (
              <BiometricAttendanceTab />
            )}

            {activeTab === 'account_management' && (
              <AccountManagementTab />
            )}

            {activeTab === 'teacher_dashboard' && (
              <TeacherDashboardTab
                currentUser={currentUser}
              />
            )}

            {activeTab === 'teacher_pool' && (
              <TeacherPoolTab />
            )}

            {activeTab === 'class_groups' && (
              <ClassGroupsTab />
            )}

            {activeTab === 'school_timetable' && (
              <SchoolTimetableTab />
            )}

            {activeTab === 'academic_calendar' && (
              <AcademicCalendarTab />
            )}

            {activeTab === 'student_dashboard' && (
              <StudentDashboardTab
                studentProfile={MOCK_STUDENT_PROFILES[0]}
              />
            )}

            {activeTab === 'parent_dashboard' && (
              <ParentDashboardTab />
            )}

            {activeTab === 'admin_assistant_dashboard' && (
              <AdminAssistantDashboardTab />
            )}

            {activeTab === 'logistics_suite' && (
              <LogisticsSupportSuiteTab />
            )}

            {activeTab === 'quality_assurance' && (
              <QualityAssuranceTab />
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      {selectedSubjectDetail && (
        <SubjectDetailModal
          isOpen={Boolean(selectedSubjectDetail)}
          onClose={() => setSelectedSubjectDetail(null)}
          subject={selectedSubjectDetail}
        />
      )}

      {isExamBuilderOpen && (
        <ExamBuilderModal
          isOpen={isExamBuilderOpen}
          onClose={() => setIsExamBuilderOpen(false)}
        />
      )}

      {isLessonModalOpen && (
        <LessonPlanModal
          isOpen={isLessonModalOpen}
          onClose={() => setIsLessonModalOpen(false)}
        />
      )}

      {isSchemeModalOpen && (
        <SchemeOfWorkModal
          isOpen={isSchemeModalOpen}
          onClose={() => setIsSchemeModalOpen(false)}
        />
      )}
    </div>
  );
};

export default CurriculumFlowApp;
