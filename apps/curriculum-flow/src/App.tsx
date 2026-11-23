import React, { useState, useEffect } from 'react';
import { CurriculumFlowSidebar, FlowNavTab } from './components/CurriculumFlowSidebar';
import { CurriculumFlowHeader } from './components/CurriculumFlowHeader';
import { setActiveApplication } from '../../../src/services/domainRouter';

// School ERP Modular Tab Components
import { CommandCenterTab } from '../../../src/components/CommandCenterTab';
import { CurriculumExplorerTab } from '../../../src/components/CurriculumExplorerTab';
import { LessonApprovalChainTab } from '../../../src/components/LessonApprovalChainTab';
import { TeacherDeliveryTrackerTab } from '../../../src/components/TeacherDeliveryTrackerTab';
import { AssessmentSuiteUnavailable } from '../../../src/components/AssessmentSuiteUnavailable';
import { RemedialEvidenceWorkspace } from '../../../src/components/RemedialEvidenceWorkspace';
import { TaughtAssessmentTab } from '../../../src/components/TaughtAssessmentTab';
import { AcademicRecordsWorkspace } from '../../../src/components/AcademicRecordsWorkspace';
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
import { UserProfilesTab } from '../../../src/components/UserProfilesTab';

// Modals
import { LessonPlanModal } from '../../../src/components/LessonPlanModal';
import { SchemeOfWorkModal } from '../../../src/components/SchemeOfWorkModal';
import { SubjectDetailModal } from '../../../src/components/SubjectDetailModal';

// Dev role login presets & non-Phase-A feature placeholders
import { 
  MOCK_USERS, 
  MOCK_STUDENT_PROFILES 
} from '../../../src/data/curriculumFlowData';
import { INITIAL_SCHOOL_BRAND } from '../../../src/data/brandManagementData';
import { UserProfile, SubjectCurriculum, UserRole } from '../../../src/types';
import { NERDC_SUBJECTS_DATABASE } from '../../../src/data/nerdcDatabase';
import { unifiedApiClient, type AuthenticatedSessionClaims } from '../../../src/services/unifiedApiClient';
import { CurriculumFlowPublicHome } from '../../../src/components/CurriculumFlowPublicHome';
import { SchoolRegistrationWizard } from '../../../src/components/SchoolRegistrationWizard';

export const CurriculumFlowApp: React.FC = () => {
  const [viewMode, setViewMode] = useState<'public_homepage' | 'school_workspace'>('public_homepage');
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(MOCK_USERS[0]); // Default: Principal Dr. Mustapha
  const [activeTab, setActiveTab] = useState<FlowNavTab>('command_center');
  const [schoolBrand, setSchoolBrand] = useState(INITIAL_SCHOOL_BRAND);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const authenticatedUser: AuthenticatedSessionClaims | null = unifiedApiClient.getSchoolFlowSession();

  // Synchronize school configuration only from an already authenticated session.
  useEffect(() => {
    let isMounted = true;
    const syncSchoolContext = async () => {
      if (!unifiedApiClient.isAuthenticated('school_flow')) return;
      try {
        const profile = await unifiedApiClient.getMySchool();

        if (isMounted && profile) {
          setSchoolBrand(prev => ({
            ...prev,
            schoolName: profile.displayName,
            motto: profile.motto || prev.motto
          }));
        }
      } catch (err) {
        console.warn('Curriculum Flow authenticated school profile is unavailable:', err);
      }
    };

    syncSchoolContext();
    return () => { isMounted = false; };
  }, [authenticatedUser?.tenantId]);

  // Modals state
  const [selectedSubjectDetail, setSelectedSubjectDetail] = useState<SubjectCurriculum | null>(null);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [isSchemeModalOpen, setIsSchemeModalOpen] = useState(false);

const handleHash = () => {
  const hash = window.location.hash.replace('#/', '').replace('#', '');

  // These hashes belong to the public landing page.
  const publicLandingAnchors = [
    'about',
    'academics',
    'teaching',
    'finance',
    'security',
    'faq',
    'portal-login'
  ];

  if (
    !hash ||
    hash === 'home' ||
    hash === 'landing' ||
    hash === 'flow_home' ||
    publicLandingAnchors.includes(hash)
  ) {
    setViewMode('public_homepage');
    return;
  }

  setViewMode('school_workspace');

  if (hash === 'command_center' || hash === 'overview') {
    setActiveTab('command_center');
  } else if (
    hash === 'curriculum_explorer' ||
    hash === 'curriculum'
  ) {
    setActiveTab('curriculum_explorer');
  } else if (
    hash === 'lesson_approval_chain' ||
    hash === 'lessons'
  ) {
    setActiveTab('lesson_approval_chain');
  } else if (
    hash === 'delivery_tracker' ||
    hash === 'delivery'
  ) {
    setActiveTab('delivery_tracker');
  } else if (
    hash === 'question_bank' ||
    hash === 'questions'
  ) {
    setActiveTab('question_bank');
  } else if (
    hash === 'secure_examination' ||
    hash === 'cbt' ||
    hash === 'exams'
  ) {
    setActiveTab('secure_examination');
  } else if (
    hash === 'academic_records' ||
    hash === 'broadsheet'
  ) {
    setActiveTab('academic_records');
  } else if (
    hash === 'student_registers' ||
    hash === 'students'
  ) {
    setActiveTab('student_registers');
  } else if (
    hash === 'biometric_attendance' ||
    hash === 'biometric'
  ) {
    setActiveTab('biometric_attendance');
  } else if (
    hash === 'account_management' ||
    hash === 'bursary'
  ) {
    setActiveTab('account_management');
  } else if (hash === 'taught_assessment') {
    setActiveTab('taught_assessment');
  } else if (hash === 'remedial_hub') {
    setActiveTab('remedial_hub');
  } else if (hash === 'academic_analytics') {
    setActiveTab('academic_analytics');
  } else if (hash === 'teacher_dashboard') {
    setActiveTab('teacher_dashboard');
  } else if (hash === 'teacher_pool' || hash === 'staff') {
    setActiveTab('teacher_pool');
  } else if (hash === 'class_groups' || hash === 'classes' || hash === 'departments') {
    setActiveTab('class_groups');
  } else if (hash === 'academic_calendar' || hash === 'calendar' || hash === 'sessions') {
    setActiveTab('academic_calendar');
  } else if (hash === 'user_profiles' || hash === 'iam' || hash === 'guardians') {
    setActiveTab('user_profiles');
  } else if (hash === 'student_dashboard') {
    setActiveTab('student_dashboard');
  } else if (hash === 'parent_dashboard') {
    setActiveTab('parent_dashboard');
  }
};

  useEffect(() => {
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
          <SchoolRegistrationWizard
            isOpen={isOnboardingModalOpen}
            onClose={() => setIsOnboardingModalOpen(false)}
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
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
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
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {activeTab === 'command_center' && (
              <CommandCenterTab
                onLaunchLessonModal={() => setIsLessonModalOpen(true)}
                onLaunchExamModal={() => handleSelectTab('secure_examination')}
                onNavigateTab={(tab) => handleSelectTab(tab as any)}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'curriculum_explorer' && (
              <CurriculumExplorerTab
                subjects={NERDC_SUBJECTS_DATABASE}
                onSelectSubject={(subject) => setSelectedSubjectDetail(subject)}
                onOpenLessonPlan={(subject, topic) => {
                  setSelectedSubjectDetail(subject);
                  setIsLessonModalOpen(true);
                }}
                onOpenScheme={(subject) => {
                  setSelectedSubjectDetail(subject);
                  setIsSchemeModalOpen(true);
                }}
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

            {(activeTab === 'question_bank' || activeTab === 'secure_examination') && (
              <AssessmentSuiteUnavailable />
            )}

            {activeTab === 'remedial_hub' && <RemedialEvidenceWorkspace />}

            {activeTab === 'taught_assessment' && (
              <TaughtAssessmentTab currentUser={currentUser} />
            )}


            {activeTab === 'academic_records' && (
              <AcademicRecordsWorkspace />
            )}

            {activeTab === 'academic_analytics' && (
              <AcademicAnalyticsTab />
            )}

            {activeTab === 'student_registers' && (
              <StudentRegistersTab currentUser={currentUser} onNavigateTab={handleSelectTab} />
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
              <TeacherPoolTab currentUser={currentUser} onNavigateTab={handleSelectTab} />
            )}

            {activeTab === 'class_groups' && (
              <ClassGroupsTab currentUser={currentUser} onNavigateTab={handleSelectTab} />
            )}

            {activeTab === 'school_timetable' && (
              <SchoolTimetableTab />
            )}

            {activeTab === 'academic_calendar' && (
              <AcademicCalendarTab currentUser={currentUser} onNavigateTab={handleSelectTab} />
            )}

            {activeTab === 'user_profiles' && (
              <UserProfilesTab currentUser={currentUser} onNavigateTab={handleSelectTab} />
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
              <LogisticsSupportSuiteTab authenticatedUser={authenticatedUser} />
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
