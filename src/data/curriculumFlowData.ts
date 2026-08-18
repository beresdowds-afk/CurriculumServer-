import {
  UserProfile,
  StandardLessonNote,
  AssignedLessonDelivery,
  AdaptiveRemedialUnit,
  QuestionBankItem,
  SecureExaminationPaper,
  SecureMarkingScheme,
  SubjectCoverageBreakdown,
  TeacherPerformanceMetric,
  StudentLearningProfile,
  SchoolAcademicCommandKPIs
} from '../types';

export const USER_PROFILES: UserProfile[] = [
  {
    id: 'usr-principal-01',
    name: 'Dr. (Mrs.) Funke Adeyemi',
    title: 'Principal & Chief Executive Officer',
    role: 'principal_admin',
    avatar: 'FA',
    department: 'Office of the Principal',
    officeTitle: 'Office of the Principal',
    email: 'principal@curriculumflow.edu.ng',
    isEmailVerified: true,
    phone: '+234 803 111 2233',
    isPhoneVerified: true,
    isGoogleLinked: true,
    mfaEnabled: true,
    assignedAdminRoles: ['principal_admin'],
    isSystemRoot: true
  },
  {
    id: 'usr-coord-01',
    name: 'Mr. Emeka Okonkwo',
    title: 'Vice Principal (Academics)',
    role: 'vice_principal_academic',
    avatar: 'EO',
    department: 'Academic Operations',
    officeTitle: 'Office of the VP Academics',
    email: 'e.okonkwo@curriculumflow.edu.ng',
    isEmailVerified: true,
    phone: '+234 802 222 3344',
    isPhoneVerified: true,
    isGoogleLinked: true,
    mfaEnabled: true,
    assignedAdminRoles: ['vice_principal_academic', 'academic_coordinator']
  },
  {
    id: 'usr-vp-admin-01',
    name: 'Mrs. Amina Yusuf',
    title: 'Vice Principal (Administration) & HOD Sciences',
    role: 'vice_principal_admin',
    avatar: 'AY',
    department: 'School Administration & Sciences',
    officeTitle: 'Office of the VP Administration',
    email: 'a.yusuf@curriculumflow.edu.ng',
    isEmailVerified: true,
    phone: '+234 805 333 4455',
    isPhoneVerified: true,
    isGoogleLinked: true,
    mfaEnabled: false,
    assignedAdminRoles: ['vice_principal_admin', 'hod_sciences']
  },
  {
    id: 'usr-exam-01',
    name: 'Mr. David Sanusi',
    title: 'Chief Examination & Quality Officer',
    role: 'exam_officer',
    avatar: 'DS',
    department: 'Examinations & Records Board',
    officeTitle: 'Directorate of Examinations',
    email: 'd.sanusi@curriculumflow.edu.ng',
    isEmailVerified: true,
    phone: '+234 805 678 1234',
    isPhoneVerified: true,
    isGoogleLinked: true,
    mfaEnabled: true,
    assignedAdminRoles: ['examination_officer']
  },
  {
    id: 'usr-admin-assistant-adeleke',
    name: 'Mrs. Folashade Adeleke',
    title: 'Executive Administrative Assistant to the Principal',
    role: 'admin_assistant',
    avatar: 'FA',
    department: 'Office of the Principal & Central Registry',
    officeTitle: 'Principal Executive Secretariat & Registry Desk',
    email: 'registry.desk@greenfieldacademy.edu.ng',
    isEmailVerified: true,
    phone: '+234 800 123 4567',
    isPhoneVerified: true,
    isGoogleLinked: true,
    mfaEnabled: true,
    assignedAdminRoles: ['administrative_assistant']
  },
  {
    id: 'usr-teacher-adeyemi',
    name: 'Mr. Daniel Adeyemi',
    title: 'Senior Mathematics & Further Maths Master',
    role: 'teacher',
    avatar: 'DA',
    assignedSubjects: ['General Mathematics', 'Further Mathematics'],
    assignedClasses: ['JSS 2', 'SS 1', 'SS 2'],
    department: 'Science & Mathematics',
    officeTitle: 'Faculty of Mathematics',
    email: 'd.adeyemi@greenfieldacademy.edu.ng',
    isEmailVerified: true,
    phone: '+234 800 123 4567',
    isPhoneVerified: true,
    isGoogleLinked: true,
    mfaEnabled: false
  },
  {
    id: 'usr-teacher-01',
    name: 'Mr. Babatunde Adewale',
    title: 'Senior Mathematics & Physics Master',
    role: 'teacher',
    avatar: 'BA',
    assignedSubjects: ['General Mathematics', 'Further Mathematics', 'Physics'],
    assignedClasses: ['JSS 2', 'SS 2', 'SS 3'],
    department: 'Science & Mathematics',
    email: 'b.adewale@curriculumflow.edu.ng',
    isEmailVerified: true,
    phone: '+234 803 456 7890',
    isPhoneVerified: true,
    isGoogleLinked: true,
    mfaEnabled: false
  },
  {
    id: 'usr-teacher-02',
    name: 'Mrs. Ngozi Okonjo',
    title: 'Senior English Studies Mistress',
    role: 'teacher',
    avatar: 'NO',
    assignedSubjects: ['English Studies', 'Literature-in-English'],
    assignedClasses: ['JSS 1', 'JSS 3', 'SS 1'],
    department: 'Humanities',
    email: 'n.okonjo@curriculumflow.edu.ng',
    isEmailVerified: true,
    phone: '+234 802 345 6789',
    isPhoneVerified: true,
    isGoogleLinked: false,
    mfaEnabled: false
  },
  {
    id: 'usr-student-01',
    name: 'David K.',
    title: 'Student (JSS 2A)',
    role: 'student',
    avatar: 'DK',
    assignedClasses: ['JSS 2'],
    department: 'Junior Secondary 2',
    email: 'david.k@greenfield.edu.ng',
    isEmailVerified: true,
    phone: '+234 809 111 0000',
    isPhoneVerified: true,
    isGoogleLinked: false,
    mfaEnabled: false
  },
  {
    id: 'usr-parent-01',
    name: 'Chief Okechukwu Eze',
    title: 'Parent & PTA Executive Chairman',
    role: 'parent',
    avatar: 'OE',
    department: 'Parent-Teacher Association (PTA)',
    officeTitle: 'Parent & Guardian Executive',
    email: 'o.eze@atlanticlogistics.ng',
    isEmailVerified: true,
    phone: '+234 803 765 4321',
    isPhoneVerified: true,
    isGoogleLinked: true,
    mfaEnabled: true
  }
];

export const INITIAL_SCHOOL_KPIS: SchoolAcademicCommandKPIs = {
  overallCurriculumCoverage: 84,
  lessonsDeliveredPercentage: 91,
  teacherComplianceRate: 94,
  studentAssessmentAverage: 68,
  outstandingLessonsCount: 17,
  classesRequiringAttentionCount: 4,
  subjectsBehindScheduleCount: 3,
  pendingPrincipalApprovalsCount: 5,
  pendingExamsForLockCount: 2
};

export const INITIAL_LESSON_NOTES: StandardLessonNote[] = [
  {
    id: 'ln-mth-ss2-wk5-02',
    subjectId: 'sss-general-mathematics',
    subjectName: 'General Mathematics',
    classGrade: 'SS 2',
    term: 'Term 1',
    week: 5,
    lessonNumber: 2,
    topicTitle: 'Algebraic Processes: Quadratic Equations',
    subTopic: 'Solution of Quadratic Equations by Factorisation & Completing the Square',
    durationMinutes: 80,
    averageAge: '15 - 16 years',
    previousKnowledge: 'Students can expand binomial expressions, find common factors, and solve linear equations in one variable.',
    learningObjectives: [
      'Define a quadratic expression and identify standard form ax² + bx + c = 0 where a ≠ 0.',
      'Factorise quadratic trinomials with integer coefficients.',
      'Solve quadratic equations by equating individual factors to zero.',
      'Apply the method of completing the square to solve non-factorisable quadratic equations.'
    ],
    instructionalMaterials: [
      'NERDC Approved Mathematics Textbook for Senior Secondary 2',
      'Algebra tiles and graphical coordinate grid chart',
      'Scientific calculators (WAEC approved)'
    ],
    referenceBooks: [
      'New General Mathematics for Senior Secondary Schools Book 2 by M.F. Macrae et al.',
      'NERDC National Curriculum for Senior Secondary Schools (Mathematics)'
    ],
    introduction: {
      duration: '8 mins',
      activity: 'Teacher reviews binomial expansion (x + 3)(x - 2) on the board and asks students to reverse the process.'
    },
    presentationSteps: [
      {
        stepNumber: 1,
        title: 'Standard Form & Factorisation Principle',
        durationMinutes: 18,
        teacherActivity: 'Explains the zero product property: if A × B = 0, then A = 0 or B = 0. Demonstrates factorising x² - 5x + 6 = 0 into (x - 2)(x - 3) = 0.',
        studentActivity: 'Solve along on mini-whiteboards and verify solutions by back-substitution.',
        learningPoint: 'Every quadratic equation in standard form can have up to two distinct real roots.'
      },
      {
        stepNumber: 2,
        title: 'Equations with Leading Coefficient a > 1',
        durationMinutes: 20,
        teacherActivity: 'Guides students through factoring 2x² + 7x + 3 = 0 using the product-sum method (ac = 6, sum = 7).',
        studentActivity: 'Work in pairs to split the middle term and factor by grouping: 2x(x + 3) + 1(x + 3) = 0.',
        learningPoint: 'Splitting the middle term preserves equality while creating factorable pairs.'
      },
      {
        stepNumber: 3,
        title: 'Completing the Square Algorithm',
        durationMinutes: 22,
        teacherActivity: 'Demonstrates dividing by leading coefficient and adding (b/2)² to both sides to form a perfect square trinomial.',
        studentActivity: 'Execute steps on notebook: x² + 6x = 7 → x² + 6x + 9 = 7 + 9 → (x + 3)² = 16 → x = -3 ± 4.',
        learningPoint: 'Completing the square provides the algebraic basis for the general quadratic formula.'
      }
    ],
    guidedPractice: 'Solve 3x² - 10x + 3 = 0 on the board with student volunteers explaining each step.',
    independentPractice: 'Students solve 5 exercises from New General Math Ex 5b Nos 1, 4, 7, 11, 15.',
    evaluationQuestions: [
      'What are the roots of 2x² - 8x = 0?',
      'Solve x² + 8x - 20 = 0 by factorisation.',
      'What term must be added to x² - 12x to make it a perfect square?'
    ],
    summaryAndConclusion: 'Teacher recaps that factorisation works when roots are rational; completing the square works universally and leads to the quadratic formula.',
    homework: [
      'Solve by factorisation: 6x² + 11x - 10 = 0',
      'Solve by completing the square: 2x² - 6x - 5 = 0 (leave answers in surd form)',
      'WAEC 2022 Theory Question 4a: A rectangle has area 84 cm² and perimeter 38 cm. Find its dimensions.'
    ],
    teacherRemarks: 'Approved for delivery across all SS 2 Science and Commercial streams.',
    status: 'approved',
    createdBy: 'Mr. Babatunde Adewale',
    createdAt: '2026-08-10T10:15:00Z',
    reviewedBy: 'Mr. Emeka Okonkwo (VP Academic)',
    reviewedAt: '2026-08-11T14:30:00Z',
    reviewComment: 'Thorough, aligned with NERDC SSS syllabus. Ensure extra time for surd simplification.',
    approvedBy: 'Dr. (Mrs.) Funke Adeyemi (Principal)',
    approvedAt: '2026-08-12T09:00:00Z',
    version: 1
  },
  {
    id: 'ln-mth-jss2-wk4-01',
    subjectId: 'jss-mathematics',
    subjectName: 'Mathematics',
    classGrade: 'JSS 2',
    term: 'Term 1',
    week: 4,
    lessonNumber: 1,
    topicTitle: 'Fractions and Decimals',
    subTopic: 'Addition and Subtraction of Algebraic and Numerical Fractions',
    durationMinutes: 40,
    averageAge: '12 - 13 years',
    previousKnowledge: 'Learners understand LCM of whole numbers and equivalent fractions.',
    learningObjectives: [
      'Find the LCM of algebraic and numerical denominators.',
      'Convert fractions with unlike denominators into equivalent fractions with common denominator.',
      'Add and subtract mixed numerical and simple algebraic fractions accurately.'
    ],
    instructionalMaterials: [
      'Fraction chart, fraction circles/tiles',
      'NERDC Basic Education Mathematics Book 2'
    ],
    referenceBooks: ['NERDC Universal Basic Education Mathematics for JSS 2'],
    introduction: {
      duration: '5 mins',
      activity: 'Flash cards showing 1/2 + 1/4; students answer with mini-cards.'
    },
    presentationSteps: [
      {
        stepNumber: 1,
        title: 'Finding the Common Denominator',
        durationMinutes: 10,
        teacherActivity: 'Explains finding LCM for denominators e.g., 3x and 4x is 12x.',
        studentActivity: 'Compute LCMs for given pairs in their workbooks.',
        learningPoint: 'The common denominator must be a multiple of every individual denominator.'
      },
      {
        stepNumber: 2,
        title: 'Combining Numerators',
        durationMinutes: 15,
        teacherActivity: 'Demonstrates (2/3x) + (5/4x) = (8 + 15)/12x = 23/12x.',
        studentActivity: 'Complete 3 guided problems in pairs.',
        learningPoint: 'Keep the common denominator and perform arithmetic on the converted numerators.'
      }
    ],
    evaluationQuestions: [
      'Simplify: 3/4 + 2/5',
      'Simplify: 2/a - 3/2a'
    ],
    summaryAndConclusion: 'Recap finding LCM first before performing addition or subtraction.',
    homework: [
      'Basic Math Workbook page 28, questions 1 - 8.'
    ],
    status: 'approved',
    createdBy: 'Mr. Babatunde Adewale',
    createdAt: '2026-08-08T08:00:00Z',
    approvedBy: 'Dr. (Mrs.) Funke Adeyemi',
    approvedAt: '2026-08-09T11:00:00Z',
    version: 1
  },
  {
    id: 'ln-bio-ss2-wk5-01',
    subjectId: 'sss-biology',
    subjectName: 'Biology',
    classGrade: 'SS 2',
    term: 'Term 1',
    week: 5,
    lessonNumber: 1,
    topicTitle: 'Plant Nutrition and Energy Flow',
    subTopic: 'Mechanism and Light/Dark Reactions of Photosynthesis',
    durationMinutes: 80,
    averageAge: '15 - 16 years',
    previousKnowledge: 'Learners know basic plant anatomy, leaf cross-section, and stomata.',
    learningObjectives: [
      'State the balanced chemical equation for photosynthesis.',
      'Differentiate between the light-dependent stage (photolysis) and light-independent stage (Calvin cycle).',
      'List the essential internal and external conditions necessary for photosynthesis.'
    ],
    instructionalMaterials: ['Fresh variegated leaf, iodine solution, boiling tube, water bath, Bunsen burner, ethanol'],
    referenceBooks: ['Modern Biology for Senior Secondary Schools by Sarojini T. Ramalingam'],
    introduction: {
      duration: '7 mins',
      activity: 'Show a destarched potted plant and ask why plants are termed autotrophs.'
    },
    presentationSteps: [
      {
        stepNumber: 1,
        title: 'The Photosynthesis Equation and Chloroplast Organelle',
        durationMinutes: 20,
        teacherActivity: 'Draws chloroplast showing thylakoids and stroma. Writes 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂.',
        studentActivity: 'Draw and label the chloroplast in notebooks.',
        learningPoint: 'Chlorophyll inside thylakoid membranes traps photons to drive photolysis of water.'
      },
      {
        stepNumber: 2,
        title: 'Light and Dark Reactions',
        durationMinutes: 25,
        teacherActivity: 'Explains photolysis producing ATP and NADPH, followed by CO₂ fixation in stroma.',
        studentActivity: 'Create a comparison table between light and dark stages.',
        learningPoint: 'Oxygen gas released as a byproduct originates from the splitting of water molecules.'
      }
    ],
    evaluationQuestions: [
      'Write the balanced equation of photosynthesis.',
      'Explain the role of light in the photolysis of water.'
    ],
    summaryAndConclusion: 'Summarized two phases and energy storage in glucose bonds.',
    homework: ['Diagrammatically explain the experiment to test for starch in a leaf.'],
    status: 'pending_principal_approval',
    createdBy: 'Mrs. Amina Yusuf',
    createdAt: '2026-08-12T11:20:00Z',
    reviewedBy: 'Mr. Emeka Okonkwo',
    reviewedAt: '2026-08-13T09:15:00Z',
    reviewComment: 'Excellent practical alignment. Ready for Principal approval.',
    version: 1
  },
  {
    id: 'ln-eng-ss1-wk6-01',
    subjectId: 'sss-english-language',
    subjectName: 'English Language',
    classGrade: 'SS 1',
    term: 'Term 1',
    week: 6,
    lessonNumber: 1,
    topicTitle: 'Grammar and Syntax: Modal Auxiliary Verbs',
    subTopic: 'Expressing Ability, Obligation, Probability, and Permission (Can, Could, Must, May, Should)',
    durationMinutes: 40,
    averageAge: '14 - 15 years',
    previousKnowledge: 'Primary auxiliary verbs (be, have, do).',
    learningObjectives: [
      'Identify modal auxiliaries in sentence contexts.',
      'Distinguish degrees of certainty and obligation expressed by different modals.'
    ],
    instructionalMaterials: ['Sentence context strips, classroom projector'],
    referenceBooks: ['NERDC Senior Secondary English Course Book 1'],
    introduction: {
      duration: '5 mins',
      activity: 'Compare "You may leave" vs "You must leave" to examine tone.'
    },
    presentationSteps: [
      {
        stepNumber: 1,
        title: 'Types and Functions of Modals',
        durationMinutes: 15,
        teacherActivity: 'Classifies modals into permission, obligation, and deduction.',
        studentActivity: 'Construct 4 sentences using must, ought to, may, and can.',
        learningPoint: 'Modals do not take -s in the third person singular.'
      }
    ],
    evaluationQuestions: ['Fill the gap: You ___ submit your assignment before 2pm (obligation).'],
    summaryAndConclusion: 'Recapped nuance between should, must, and may.',
    homework: ['NOSEC Book 1 page 74 Exercise 3.'],
    status: 'pending_coordinator_review',
    createdBy: 'Mrs. Ngozi Okonjo',
    createdAt: '2026-08-13T16:00:00Z',
    version: 1
  }
];

export const INITIAL_ASSIGNED_DELIVERIES: AssignedLessonDelivery[] = [
  {
    id: 'del-001',
    lessonNoteId: 'ln-mth-jss2-wk4-01',
    subjectName: 'Mathematics',
    classGrade: 'JSS 2',
    classSection: 'JSS 2A',
    teacherId: 'usr-teacher-01',
    teacherName: 'Mr. Babatunde Adewale',
    dayOfWeek: 'Monday',
    period: 2,
    scheduledTime: '08:45 AM - 09:25 AM',
    topicTitle: 'Fractions — Addition and Subtraction',
    subTopic: 'Addition and Subtraction of Algebraic Fractions',
    week: 4,
    status: 'completed',
    assignedAt: '2026-08-10T07:00:00Z',
    acknowledgedAt: '2026-08-10T07:45:00Z',
    taughtAt: '2026-08-10T08:45:00Z',
    completedAt: '2026-08-10T09:30:00Z',
    feedback: {
      understandingLevel: 'good',
      engagementRating: 4,
      comments: 'Students grasped numerical fractions quickly; a few struggled with algebraic denominators with coefficients. Completed 8 sample questions on board.',
      requestAdditionalLesson: false,
      requestCurriculumModification: false,
      submittedAt: '2026-08-10T09:35:00Z'
    }
  },
  {
    id: 'del-002',
    lessonNoteId: 'ln-mth-ss2-wk5-02',
    subjectName: 'General Mathematics',
    classGrade: 'SS 2',
    classSection: 'SS 2 Science A',
    teacherId: 'usr-teacher-01',
    teacherName: 'Mr. Babatunde Adewale',
    dayOfWeek: 'Tuesday',
    period: 3,
    scheduledTime: '10:00 AM - 11:20 AM',
    topicTitle: 'Algebraic Processes: Quadratic Equations',
    subTopic: 'Solution of Quadratic Equations by Factorisation & Completing the Square',
    week: 5,
    status: 'completed',
    assignedAt: '2026-08-11T07:00:00Z',
    acknowledgedAt: '2026-08-11T08:15:00Z',
    taughtAt: '2026-08-11T10:00:00Z',
    completedAt: '2026-08-11T11:25:00Z',
    feedback: {
      understandingLevel: 'fair',
      engagementRating: 3,
      comments: 'Students struggled with factorisation where leading coefficient a > 1 (e.g., 6x² + 11x - 10). Approximately 45% of class failed the exit quiz. Highly recommend a remedial session before proceeding to the quadratic formula.',
      uncoveredObjectives: ['Factorisation with non-unit leading coefficients'],
      suggestedRemedialTopic: 'Targeted Remedial: Quadratic Factorisation via Product-Sum Grouping',
      requestAdditionalLesson: true,
      requestCurriculumModification: false,
      submittedAt: '2026-08-11T11:40:00Z'
    },
    adaptiveRemedialTriggered: true
  },
  {
    id: 'del-003',
    lessonNoteId: 'ln-bio-ss2-wk5-01',
    subjectName: 'Biology',
    classGrade: 'SS 2',
    classSection: 'SS 2 Science B',
    teacherId: 'usr-hod-01',
    teacherName: 'Mrs. Amina Yusuf',
    dayOfWeek: 'Wednesday',
    period: 4,
    scheduledTime: '11:40 AM - 01:00 PM',
    topicTitle: 'Plant Nutrition: Photosynthesis Mechanisms',
    subTopic: 'Light Reaction (Photolysis) and Calvin Cycle',
    week: 5,
    status: 'acknowledged',
    assignedAt: '2026-08-12T07:00:00Z',
    acknowledgedAt: '2026-08-12T09:30:00Z'
  },
  {
    id: 'del-004',
    lessonNoteId: 'ln-eng-ss1-wk6-01',
    subjectName: 'English Language',
    classGrade: 'SS 1',
    classSection: 'SS 1 Arts',
    teacherId: 'usr-teacher-02',
    teacherName: 'Mrs. Ngozi Okonjo',
    dayOfWeek: 'Thursday',
    period: 1,
    scheduledTime: '08:00 AM - 08:40 AM',
    topicTitle: 'Modal Auxiliary Verbs',
    subTopic: 'Expressing Obligation and Probability',
    week: 6,
    status: 'received',
    assignedAt: '2026-08-13T07:00:00Z'
  },
  {
    id: 'del-005',
    lessonNoteId: 'ln-phy-ss3-wk4-01',
    subjectName: 'Physics',
    classGrade: 'SS 3',
    classSection: 'SS 3 Science',
    teacherId: 'usr-teacher-01',
    teacherName: 'Mr. Babatunde Adewale',
    dayOfWeek: 'Friday',
    period: 2,
    scheduledTime: '08:45 AM - 09:25 AM',
    topicTitle: 'Electric Fields & Coulomb Law',
    subTopic: 'Calculations on Electrostatic Force and Permittivity',
    week: 4,
    status: 'assigned',
    assignedAt: '2026-08-14T07:00:00Z',
    isDelayed: true
  }
];

export const INITIAL_ADAPTIVE_REMEDIAL_UNITS: AdaptiveRemedialUnit[] = [
  {
    id: 'rem-ss2-mth-quad-01',
    originalLessonId: 'ln-mth-ss2-wk5-02',
    subjectName: 'General Mathematics',
    classGrade: 'SS 2',
    topicTitle: 'Adaptive Remedial: Quadratic Factorisation with a > 1',
    weaknessIdentified: '45% of students failed to identify the correct factor pairs when ac is negative and leading coefficient a ≠ 1 (e.g. 6x² + 11x - 10 = 0).',
    masteryScore: 54,
    remedialObjectives: [
      'Master the 4-step "ac" Box Method to identify product-sum integer pairs.',
      'Factorise expressions by grouping 4 terms with 100% sign fidelity.',
      'Check answers using synthetic binomial expansion before submission.'
    ],
    remedialStrategies: [
      'Visual Grid / Box decomposition technique',
      'Sign rule cheat sheet: if c < 0, factors must have opposite signs; larger factor takes sign of b',
      'Scaffolded peer-check pairs with step-by-step verification'
    ],
    simplifiedExplanation: 'When factoring ax² + bx + c, multiply a × c = ac. Find two numbers that multiply to give "ac" and add to give "b". Rewrite bx using these two numbers, then factor the first two and last two terms separately.',
    scaffoldedPracticeExercises: [
      {
        level: 'Basic',
        prompt: 'Factorise: 2x² + 5x + 3 = 0 (ac = 6, sum = 5 → numbers are 2 and 3)',
        guidanceHint: 'Rewrite as 2x² + 2x + 3x + 3 = 0 → 2x(x + 1) + 3(x + 1) = 0.'
      },
      {
        level: 'Intermediate',
        prompt: 'Factorise: 3x² - 10x + 8 = 0 (ac = 24, sum = -10 → numbers are -4 and -6)',
        guidanceHint: 'Notice both numbers must be negative because ac is positive and b is negative.'
      },
      {
        level: 'Mastery',
        prompt: 'Factorise: 6x² + 11x - 10 = 0 (ac = -60, sum = +11 → numbers are +15 and -4)',
        guidanceHint: 'Group: 6x² + 15x - 4x - 10 = 0 → 3x(2x + 5) - 2(2x + 5) = (3x - 2)(2x + 5) = 0.'
      }
    ],
    reassessmentQuestions: [
      'Solve 4x² + 8x + 3 = 0 by factorisation.',
      'Solve 2x² - x - 15 = 0 and state the roots.',
      'A rectangular plot of land has area (6x² - 7x - 5) m². Find expressions for its length and width.'
    ],
    status: 'recommended',
    createdAt: '2026-08-11T12:00:00Z'
  }
];

export const INITIAL_QUESTION_BANK: QuestionBankItem[] = [
  {
    id: 'qb-mth-001',
    subject: 'General Mathematics',
    classGrade: 'SS 2',
    term: 'Term 1',
    topic: 'Algebraic Processes: Quadratic Equations',
    subtopic: 'Solution by Factorisation',
    curriculumObjective: 'Solve quadratic equations by equating individual factors to zero',
    questionType: 'multiple_choice',
    difficulty: 'Medium',
    cognitiveLevel: 'Applying',
    questionText: 'Find the roots of the quadratic equation 2x² - 5x - 3 = 0.',
    options: [
      { key: 'A', text: 'x = -1/2, x = 3' },
      { key: 'B', text: 'x = 1/2, x = -3' },
      { key: 'C', text: 'x = -2, x = 3/2' },
      { key: 'D', text: 'x = 2, x = -3/2' }
    ],
    expectedAnswer: 'A',
    stepByStepSolution: '2x² - 5x - 3 = 0 → ac = -6, sum = -5 → numbers: -6, +1. 2x² - 6x + x - 3 = 0 → 2x(x - 3) + 1(x - 3) = (2x + 1)(x - 3) = 0. Therefore 2x + 1 = 0 => x = -1/2 or x - 3 = 0 => x = 3.',
    markAllocation: 2,
    source: 'WAEC',
    version: 1,
    usageCount: 14,
    isVariableTemplate: true,
    variableFormula: 'ax² + bx + c = 0 where a in [2,3,4,5], b in [-7..7], roots rational'
  },
  {
    id: 'qb-mth-002',
    subject: 'General Mathematics',
    classGrade: 'SS 2',
    term: 'Term 1',
    topic: 'Algebraic Processes: Quadratic Equations',
    subtopic: 'Application & Word Problems',
    curriculumObjective: 'Formulate and solve quadratic equations from real-life geometric and rate problems',
    questionType: 'structured_theory',
    difficulty: 'Hard',
    cognitiveLevel: 'Analyzing',
    questionText: 'The length of a rectangular school assembly field is 7 metres longer than its width. If the area of the field is 120 m², calculate: (a) the dimensions of the field, (b) the total cost of fencing the field at ₦1,500 per metre.',
    expectedAnswer: '(a) Width = 8 m, Length = 15 m; (b) Perimeter = 46 m, Cost = ₦69,000.',
    stepByStepSolution: '(a) Let width = w. Length = w + 7. Area = w(w + 7) = 120 → w² + 7w - 120 = 0. Factor: (w + 15)(w - 8) = 0 → w = 8 m (since distance > 0). Length = 8 + 7 = 15 m. (b) Perimeter = 2(15 + 8) = 46 m. Cost = 46 × ₦1,500 = ₦69,000.',
    markAllocation: 8,
    source: 'WAEC',
    version: 1,
    usageCount: 8,
    isVariableTemplate: true
  },
  {
    id: 'qb-bio-001',
    subject: 'Biology',
    classGrade: 'SS 2',
    term: 'Term 1',
    topic: 'Plant Nutrition and Energy Flow',
    subtopic: 'Mechanism of Photosynthesis',
    curriculumObjective: 'Explain the role of light energy in the photolysis of water',
    questionType: 'multiple_choice',
    difficulty: 'Medium',
    cognitiveLevel: 'Understanding',
    questionText: 'During the light-dependent stage of photosynthesis, oxygen gas is released as a byproduct due to the:',
    options: [
      { key: 'A', text: 'Splitting of carbon dioxide molecules by rubisco' },
      { key: 'B', text: 'Photolysis of water molecules activated by chlorophyll' },
      { key: 'C', text: 'Reduction of NADP⁺ in the stroma' },
      { key: 'D', text: 'Breakdown of stored starch granules' }
    ],
    expectedAnswer: 'B',
    stepByStepSolution: 'Light absorbed by chlorophyll splits water (2H₂O → 4H⁺ + 4e⁻ + O₂). The protons reduce NADP, electrons replace those lost by chlorophyll, and O₂ is released as gas.',
    markAllocation: 2,
    source: 'NECO',
    version: 2,
    usageCount: 22
  },
  {
    id: 'qb-eng-001',
    subject: 'English Studies',
    classGrade: 'JSS 2',
    term: 'Term 1',
    topic: 'Reading and Comprehension',
    subtopic: 'Critical Reading & Main Ideas',
    curriculumObjective: 'Identify topic sentences and summarize main points without auxiliary details',
    questionType: 'short_answer',
    difficulty: 'Easy',
    cognitiveLevel: 'Understanding',
    questionText: 'In summary writing, what is the primary function of a topic sentence in an expository paragraph?',
    expectedAnswer: 'It encapsulates and expresses the central or controlling idea of the entire paragraph.',
    stepByStepSolution: '1 mark for stating it contains the main idea; 1 mark for noting it guides the supporting sentences.',
    markAllocation: 2,
    source: 'BECE',
    version: 1,
    usageCount: 19
  }
];

export const INITIAL_SECURE_EXAMS: SecureExaminationPaper[] = [
  {
    id: 'exam-ss2-mth-2026-t1',
    examId: 'CF-EXAM-SS2-MTH-2026-T1-9482',
    generationHash: 'sha256-e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    subjectName: 'General Mathematics',
    classGrade: 'SS 2',
    term: 'Term 1',
    academicSession: '2026/2027 Session',
    title: 'Senior Secondary 2 First Term Unified Terminal Examination',
    durationMinutes: 120,
    totalMarks: 100,
    instructions: [
      'Write your Examination Number, Class, and Seat Number clearly on your answer booklet.',
      'Answer ALL questions in Section A (Objective) on the provided OMR Optical Sheet.',
      'Answer any FOUR (4) questions from Section B (Theory). Show all working clearly.',
      'Electronic calculators with graphical or programmable functions are strictly prohibited.'
    ],
    sections: [
      {
        sectionName: 'Section A (Objective/MCQ)',
        instructions: 'Answer all 40 questions. Each question carries 1 mark. (40 Marks Total)',
        marks: 40,
        questions: [
          {
            questionNumber: 1,
            section: 'Section A (Objective/MCQ)',
            questionType: 'multiple_choice',
            questionText: 'Solve for x: 2x² - 5x - 3 = 0.',
            options: [
              { key: 'A', text: 'x = -1/2 or x = 3' },
              { key: 'B', text: 'x = 1/2 or x = -3' },
              { key: 'C', text: 'x = -2 or x = 3/2' },
              { key: 'D', text: 'x = 2 or x = -3/2' }
            ],
            marks: 1,
            topic: 'Quadratic Equations',
            cognitiveLevel: 'Applying',
            difficulty: 'Medium'
          },
          {
            questionNumber: 2,
            section: 'Section A (Objective/MCQ)',
            questionType: 'multiple_choice',
            questionText: 'What value of k makes x² - 12x + k a perfect square trinomial?',
            options: [
              { key: 'A', text: '6' },
              { key: 'B', text: '12' },
              { key: 'C', text: '36' },
              { key: 'D', text: '144' }
            ],
            marks: 1,
            topic: 'Quadratic Equations: Completing the Square',
            cognitiveLevel: 'Understanding',
            difficulty: 'Easy'
          },
          {
            questionNumber: 3,
            section: 'Section A (Objective/MCQ)',
            questionType: 'multiple_choice',
            questionText: 'Simplify: log₁₀(25) + log₁₀(40) - log₁₀(10).',
            options: [
              { key: 'A', text: '1' },
              { key: 'B', text: '2' },
              { key: 'C', text: '3' },
              { key: 'D', text: '4' }
            ],
            marks: 1,
            topic: 'Logarithms & Indices',
            cognitiveLevel: 'Applying',
            difficulty: 'Medium'
          }
        ]
      },
      {
        sectionName: 'Section B (Theory & Structured)',
        instructions: 'Answer FOUR questions from this section. All questions carry equal marks (15 marks each = 60 Marks Total).',
        marks: 60,
        questions: [
          {
            questionNumber: 4,
            section: 'Section B (Theory & Structured)',
            questionType: 'structured_theory',
            questionText: '(a) Solve by completing the square: 2x² - 8x - 5 = 0. Leave your answer in surd form. (b) The hypotenuse of a right-angled triangle is 13 cm. If one of the legs is 7 cm longer than the other, find the perimeter and area of the triangle.',
            marks: 15,
            topic: 'Quadratic Equations & Geometric Application',
            cognitiveLevel: 'Analyzing',
            difficulty: 'Hard'
          },
          {
            questionNumber: 5,
            section: 'Section B (Theory & Structured)',
            questionType: 'structured_theory',
            questionText: '(a) Given that log₁₀ 2 = 0.3010 and log₁₀ 3 = 0.4771, evaluate log₁₀(72) without using mathematical tables. (b) Solve the simultaneous equations: 2x + y = 7 and 3x² - y² = 11.',
            marks: 15,
            topic: 'Logarithms & Simultaneous Equations (Linear/Quadratic)',
            cognitiveLevel: 'Analyzing',
            difficulty: 'Hard'
          }
        ]
      }
    ],
    isLocked: true,
    lockedAt: '2026-08-12T16:45:00Z',
    lockedBy: 'Mr. David Sanusi (Exam Officer)',
    releaseDate: '2026-11-28T08:00:00Z',
    isReleasedForPrinting: false,
    authorizedByPrincipal: true,
    authorizedBy: 'Dr. (Mrs.) Funke Adeyemi',
    markingSchemeId: 'ms-ss2-mth-2026-t1',
    markingSchemeUnlocked: false,
    auditTrail: [
      {
        id: 'aud-001',
        timestamp: '2026-08-12T14:10:00Z',
        userId: 'usr-exam-01',
        userName: 'Mr. David Sanusi',
        userRole: 'exam_officer',
        action: 'generated',
        notes: 'Generated randomized 50-item specification (40 MCQ, 10 Theory pool) aligned with NERDC SSS syllabus.'
      },
      {
        id: 'aud-002',
        timestamp: '2026-08-12T15:20:00Z',
        userId: 'usr-principal-01',
        userName: 'Dr. (Mrs.) Funke Adeyemi',
        userRole: 'principal',
        action: 'authorized',
        notes: 'Chief Executive verification complete. Authorized for printing freeze schedule.'
      },
      {
        id: 'aud-003',
        timestamp: '2026-08-12T16:45:00Z',
        userId: 'usr-exam-01',
        userName: 'Mr. David Sanusi',
        userRole: 'exam_officer',
        action: 'locked',
        notes: 'Cryptographic SHA-256 fingerprint sealed. Paper locked until scheduled printing date.'
      }
    ]
  }
];

export const INITIAL_MARKING_SCHEMES: SecureMarkingScheme[] = [
  {
    id: 'ms-ss2-mth-2026-t1',
    examId: 'CF-EXAM-SS2-MTH-2026-T1-9482',
    generationHash: 'sha256-e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    subjectName: 'General Mathematics',
    classGrade: 'SS 2',
    term: 'Term 1',
    title: 'Official Confidential Marking Scheme & Grading Guide (SS 2 General Mathematics)',
    totalMarks: 100,
    generalMarkingInstructions: [
      'Award method marks (M) for correct mathematical reasoning even if final arithmetic contains slips.',
      'Accuracy marks (A) are strictly contingent upon preceding method marks.',
      'Deduct 1 mark once for omission of essential units (cm, m², ₦) per question.',
      'Accept valid alternative algebraic or graphic methods provided working is mathematically sound.'
    ],
    items: [
      {
        questionNumber: 1,
        section: 'Section A (MCQ)',
        correctAnswer: 'A (x = -1/2 or x = 3)',
        modelAnswer: 'Factorisation: (2x + 1)(x - 3) = 0 → x = -1/2 or x = 3.',
        totalMarks: 1,
        stepBreakdown: [
          { stepDescription: 'Correct key selection (A)', marksAwarded: 1 }
        ],
        partialCreditRules: 'No partial marks in Section A.',
        examinerNotes: 'Common student trap is reversing the signs to (1/2, -3).'
      },
      {
        questionNumber: 2,
        section: 'Section A (MCQ)',
        correctAnswer: 'C (36)',
        modelAnswer: 'For x² - 12x + k to be a square, k = (-12/2)² = (-6)² = 36.',
        totalMarks: 1,
        stepBreakdown: [
          { stepDescription: 'Correct key selection (C)', marksAwarded: 1 }
        ],
        partialCreditRules: 'No partial marks in Section A.'
      },
      {
        questionNumber: 4,
        section: 'Section B (Theory)',
        correctAnswer: '(a) x = 2 ± (√26)/2; (b) Legs = 5 cm and 12 cm, Perimeter = 30 cm, Area = 30 cm².',
        modelAnswer: '(a) 2x² - 8x = 5 → x² - 4x = 5/2 → x² - 4x + 4 = 5/2 + 4 = 13/2 → (x - 2)² = 13/2 → x - 2 = ±√(13/2) = ±(√26)/2 → x = 2 ± (√26)/2. (b) Let legs be a and a + 7. By Pythagoras: a² + (a + 7)² = 13² → a² + a² + 14a + 49 = 169 → 2a² + 14a - 120 = 0 → a² + 7a - 60 = 0 → (a + 12)(a - 5) = 0 → a = 5 cm (as a > 0). Leg 2 = 12 cm. Perimeter = 5 + 12 + 13 = 30 cm. Area = 1/2 × 5 × 12 = 30 cm².',
        totalMarks: 15,
        stepBreakdown: [
          { stepDescription: '(a) Dividing by 2 and moving constant: x² - 4x = 5/2', marksAwarded: 1 },
          { stepDescription: '(a) Adding (b/2)² = 4 to both sides', marksAwarded: 2 },
          { stepDescription: '(a) Expressing as perfect square (x - 2)² = 13/2', marksAwarded: 2 },
          { stepDescription: '(a) Correct surd rationalization x = 2 ± (√26)/2', marksAwarded: 2 },
          { stepDescription: '(b) Setting up Pythagorean equation a² + (a+7)² = 169', marksAwarded: 2 },
          { stepDescription: '(b) Simplifying to quadratic a² + 7a - 60 = 0', marksAwarded: 2 },
          { stepDescription: '(b) Solving for positive root a = 5 cm and other leg = 12 cm', marksAwarded: 2 },
          { stepDescription: '(b) Correct calculation of Perimeter (30 cm) and Area (30 cm²)', marksAwarded: 2 }
        ],
        partialCreditRules: 'If student solves (b) by inspection without algebraic working, award max 3 out of 8 marks.',
        examinerNotes: 'Scoring must penalize lack of units on final perimeter and area.'
      }
    ],
    createdAt: '2026-08-12T14:30:00Z',
    isReleasedToTeachers: false
  }
];

export const INITIAL_SUBJECT_COVERAGES: SubjectCoverageBreakdown[] = [
  {
    subjectId: 'sss-general-mathematics',
    subjectName: 'General Mathematics',
    classGrade: 'SS 2',
    teacherName: 'Mr. Babatunde Adewale',
    overallCoveragePercentage: 72,
    currentWeek: 5,
    expectedWeek: 5,
    status: 'on_track',
    delayedTopicsCount: 1,
    terms: [
      { term: 'Term 1', plannedLessons: 40, deliveredLessons: 38, coveragePercentage: 95 },
      { term: 'Term 2', plannedLessons: 40, deliveredLessons: 27, coveragePercentage: 68 },
      { term: 'Term 3', plannedLessons: 36, deliveredLessons: 0, coveragePercentage: 0 }
    ]
  },
  {
    subjectId: 'sss-biology',
    subjectName: 'Biology',
    classGrade: 'SS 2',
    teacherName: 'Mrs. Amina Yusuf',
    overallCoveragePercentage: 88,
    currentWeek: 5,
    expectedWeek: 5,
    status: 'on_track',
    delayedTopicsCount: 0,
    terms: [
      { term: 'Term 1', plannedLessons: 36, deliveredLessons: 36, coveragePercentage: 100 },
      { term: 'Term 2', plannedLessons: 36, deliveredLessons: 31, coveragePercentage: 86 },
      { term: 'Term 3', plannedLessons: 32, deliveredLessons: 0, coveragePercentage: 0 }
    ]
  },
  {
    subjectId: 'sss-physics',
    subjectName: 'Physics',
    classGrade: 'SS 3',
    teacherName: 'Mr. Babatunde Adewale',
    overallCoveragePercentage: 64,
    currentWeek: 4,
    expectedWeek: 5,
    status: 'critical_delay',
    delayedTopicsCount: 3,
    terms: [
      { term: 'Term 1', plannedLessons: 36, deliveredLessons: 23, coveragePercentage: 64 },
      { term: 'Term 2', plannedLessons: 36, deliveredLessons: 0, coveragePercentage: 0 },
      { term: 'Term 3', plannedLessons: 30, deliveredLessons: 0, coveragePercentage: 0 }
    ]
  },
  {
    subjectId: 'sss-english-language',
    subjectName: 'English Language',
    classGrade: 'SS 1',
    teacherName: 'Mrs. Ngozi Okonjo',
    overallCoveragePercentage: 91,
    currentWeek: 6,
    expectedWeek: 6,
    status: 'on_track',
    delayedTopicsCount: 0,
    terms: [
      { term: 'Term 1', plannedLessons: 40, deliveredLessons: 39, coveragePercentage: 98 },
      { term: 'Term 2', plannedLessons: 40, deliveredLessons: 34, coveragePercentage: 85 },
      { term: 'Term 3', plannedLessons: 36, deliveredLessons: 0, coveragePercentage: 0 }
    ]
  },
  {
    subjectId: 'jss-mathematics',
    subjectName: 'Mathematics',
    classGrade: 'JSS 2',
    teacherName: 'Mr. Babatunde Adewale',
    overallCoveragePercentage: 86,
    currentWeek: 4,
    expectedWeek: 4,
    status: 'on_track',
    delayedTopicsCount: 0,
    terms: [
      { term: 'Term 1', plannedLessons: 40, deliveredLessons: 36, coveragePercentage: 90 },
      { term: 'Term 2', plannedLessons: 40, deliveredLessons: 33, coveragePercentage: 82 },
      { term: 'Term 3', plannedLessons: 36, deliveredLessons: 0, coveragePercentage: 0 }
    ]
  }
];

export const INITIAL_TEACHER_PERFORMANCES: TeacherPerformanceMetric[] = [
  {
    teacherId: 'usr-teacher-01',
    teacherName: 'Mr. Babatunde Adewale',
    department: 'Science & Mathematics',
    assignedClasses: ['JSS 2A', 'SS 2 Science A', 'SS 3 Science'],
    lessonCompletionRate: 94,
    curriculumCoverageRate: 88,
    timelinessScore: 92,
    assessmentFrequencyScore: 90,
    studentMasteryAverage: 72,
    remedialComplianceRate: 100,
    feedbackSubmissionRate: 96,
    ratingBadge: 'Master Educator'
  },
  {
    teacherId: 'usr-teacher-02',
    teacherName: 'Mrs. Ngozi Okonjo',
    department: 'Humanities & Languages',
    assignedClasses: ['JSS 1B', 'JSS 3A', 'SS 1 Arts'],
    lessonCompletionRate: 98,
    curriculumCoverageRate: 95,
    timelinessScore: 96,
    assessmentFrequencyScore: 92,
    studentMasteryAverage: 78,
    remedialComplianceRate: 100,
    feedbackSubmissionRate: 98,
    ratingBadge: 'Master Educator'
  },
  {
    teacherId: 'usr-hod-01',
    teacherName: 'Mrs. Amina Yusuf',
    department: 'Science & Mathematics',
    assignedClasses: ['SS 2 Science B', 'SS 3 Biology'],
    lessonCompletionRate: 96,
    curriculumCoverageRate: 93,
    timelinessScore: 95,
    assessmentFrequencyScore: 94,
    studentMasteryAverage: 80,
    remedialComplianceRate: 100,
    feedbackSubmissionRate: 97,
    ratingBadge: 'Master Educator'
  }
];

export const INITIAL_STUDENT_PROFILES: StudentLearningProfile[] = [
  {
    studentId: 'usr-student-01',
    studentName: 'Chinedu Eze',
    classGrade: 'SS 2',
    classSection: 'SS 2 Science A',
    parentName: 'Chief O. Eze',
    parentEmail: 'chief.eze@nigeria-parents.org',
    overallAverage: 76,
    subjects: [
      {
        subjectName: 'General Mathematics',
        averageScore: 71,
        topics: [
          { topic: 'Fractions & Surds', masteryPercentage: 86, status: 'mastered', lastAssessed: '2026-08-04' },
          { topic: 'Logarithms & Indices', masteryPercentage: 78, status: 'satisfactory', lastAssessed: '2026-08-07' },
          { topic: 'Algebraic Processes & Factorisation', masteryPercentage: 72, status: 'satisfactory', lastAssessed: '2026-08-10' },
          { topic: 'Quadratic Equations (a > 1)', masteryPercentage: 54, status: 'needs_practice', lastAssessed: '2026-08-11' },
          { topic: 'Coordinate Geometry', masteryPercentage: 91, status: 'mastered', lastAssessed: '2026-07-28' }
        ],
        priorityWeakAreas: ['Quadratic Equations with Leading Coefficient a > 1', 'Surd Rationalisation in Theory'],
        recommendedPracticeUnit: 'Adaptive Remedial Unit: Quadratic Factorisation via Box Method & Practice 5b'
      },
      {
        subjectName: 'Biology',
        averageScore: 84,
        topics: [
          { topic: 'Cell Structure & Organization', masteryPercentage: 92, status: 'mastered', lastAssessed: '2026-08-02' },
          { topic: 'Plant Nutrition & Photosynthesis', masteryPercentage: 82, status: 'satisfactory', lastAssessed: '2026-08-12' },
          { topic: 'Ecology & Nutrient Cycles', masteryPercentage: 88, status: 'mastered', lastAssessed: '2026-08-08' }
        ],
        priorityWeakAreas: ['Calvin Cycle biochemical steps']
      },
      {
        subjectName: 'English Language',
        averageScore: 78,
        topics: [
          { topic: 'Reading Comprehension', masteryPercentage: 85, status: 'mastered', lastAssessed: '2026-08-05' },
          { topic: 'Modal Auxiliary Verbs', masteryPercentage: 74, status: 'satisfactory', lastAssessed: '2026-08-11' },
          { topic: 'Formal Letter Writing', masteryPercentage: 80, status: 'satisfactory', lastAssessed: '2026-08-01' }
        ],
        priorityWeakAreas: ['Subjunctive mood after modals']
      }
    ]
  }
];

export const MOCK_STUDENT_PROFILES = [
  {
    studentId: 'usr-student-01',
    studentName: 'Chinedu Eze',
    classGrade: 'SS 2' as const,
    classSection: 'SS 2 Science A',
    overallMasteryPercentage: 76,
    rankInClass: 4,
    topicMasteryBreakdown: [
      { topicTitle: 'Surds & Radicals Rationalisation', masteryPercentage: 86, assessmentsTaken: 3 },
      { topicTitle: 'Logarithms & Indices', masteryPercentage: 78, assessmentsTaken: 2 },
      { topicTitle: 'Algebraic Factorisation & Trinomials', masteryPercentage: 72, assessmentsTaken: 4 },
      { topicTitle: 'Quadratic Equations (a > 1)', masteryPercentage: 54, assessmentsTaken: 2 },
      { topicTitle: 'Photosynthesis & Photolysis', masteryPercentage: 82, assessmentsTaken: 3 }
    ],
    identifiedWeaknesses: [
      'Struggles with factoring trinomials where a > 1 (e.g., 6x² + 11x - 10)',
      'Omission of negative sign rules during cross-multiplication in fractions'
    ],
    recommendedInterventions: [
      'Assign Adaptive Remedial Unit on "ac Box Method"',
      '15-minute peer-guided practice with teacher step-by-step review'
    ]
  },
  {
    studentId: 'usr-student-02',
    studentName: 'Fatima Garba',
    classGrade: 'SS 2' as const,
    classSection: 'SS 2 Science A',
    overallMasteryPercentage: 88,
    rankInClass: 1,
    topicMasteryBreakdown: [
      { topicTitle: 'Surds & Radicals Rationalisation', masteryPercentage: 94, assessmentsTaken: 3 },
      { topicTitle: 'Logarithms & Indices', masteryPercentage: 90, assessmentsTaken: 2 },
      { topicTitle: 'Algebraic Factorisation & Trinomials', masteryPercentage: 88, assessmentsTaken: 4 },
      { topicTitle: 'Quadratic Equations (a > 1)', masteryPercentage: 82, assessmentsTaken: 2 },
      { topicTitle: 'Photosynthesis & Photolysis', masteryPercentage: 90, assessmentsTaken: 3 }
    ],
    identifiedWeaknesses: [
      'Occasional arithmetic speed errors on double-angle coordinate geometry'
    ],
    recommendedInterventions: [
      'Provide WAEC Olympiad extension challenges and past theory questions'
    ]
  },
  {
    studentId: 'usr-student-03',
    studentName: 'Emeka Nwosu',
    classGrade: 'SS 2' as const,
    classSection: 'SS 2 Science B',
    overallMasteryPercentage: 62,
    rankInClass: 28,
    topicMasteryBreakdown: [
      { topicTitle: 'Surds & Radicals Rationalisation', masteryPercentage: 65, assessmentsTaken: 3 },
      { topicTitle: 'Logarithms & Indices', masteryPercentage: 60, assessmentsTaken: 2 },
      { topicTitle: 'Algebraic Factorisation & Trinomials', masteryPercentage: 58, assessmentsTaken: 4 },
      { topicTitle: 'Quadratic Equations (a > 1)', masteryPercentage: 42, assessmentsTaken: 2 },
      { topicTitle: 'Photosynthesis & Photolysis', masteryPercentage: 70, assessmentsTaken: 3 }
    ],
    identifiedWeaknesses: [
      'Foundational algebraic substitution difficulties',
      'Requires concrete representations for quadratic expressions'
    ],
    recommendedInterventions: [
      'Mandatory Friday remedial clinic',
      'Algebra tile manipulatives assignment'
    ]
  }
];

// Aliases for seamless imports
export const MOCK_USERS = USER_PROFILES;
export const MOCK_KPIS = INITIAL_SCHOOL_KPIS;
export const MOCK_LESSON_NOTES = INITIAL_LESSON_NOTES;
export const MOCK_DELIVERIES = INITIAL_ASSIGNED_DELIVERIES;
export const MOCK_REMEDIALS = INITIAL_ADAPTIVE_REMEDIAL_UNITS;
export const MOCK_QUESTION_BANK = INITIAL_QUESTION_BANK;
export const MOCK_SECURE_EXAMS = INITIAL_SECURE_EXAMS;
export const MOCK_MARKING_SCHEMES = INITIAL_MARKING_SCHEMES;

