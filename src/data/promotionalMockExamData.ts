import { 
  PromotionRuleCriteria, 
  StudentPromotionRecord, 
  MockExamSchedule, 
  MockCandidateScore 
} from '../types';

export const DEFAULT_PROMOTION_RULES: PromotionRuleCriteria[] = [
  {
    id: 'rule-jss1-jss2',
    targetClassGrade: 'JSS 1',
    promotedToGrade: 'JSS 2',
    minimumCumulativeAverage: 50.0,
    mustPassEnglish: true,
    mustPassMathematics: true,
    minimumCreditPassesCount: 6,
    minimumAttendancePercentage: 75.0,
    maxAllowedFails: 2,
    trialEligibilityMargin: 4.0
  },
  {
    id: 'rule-jss2-jss3',
    targetClassGrade: 'JSS 2',
    promotedToGrade: 'JSS 3',
    minimumCumulativeAverage: 50.0,
    mustPassEnglish: true,
    mustPassMathematics: true,
    minimumCreditPassesCount: 6,
    minimumAttendancePercentage: 75.0,
    maxAllowedFails: 2,
    trialEligibilityMargin: 4.0
  },
  {
    id: 'rule-jss3-ss1',
    targetClassGrade: 'JSS 3',
    promotedToGrade: 'SS 1',
    minimumCumulativeAverage: 55.0,
    mustPassEnglish: true,
    mustPassMathematics: true,
    minimumCreditPassesCount: 6,
    minimumAttendancePercentage: 80.0,
    maxAllowedFails: 1,
    trialEligibilityMargin: 3.0
  },
  {
    id: 'rule-ss1-ss2',
    targetClassGrade: 'SS 1',
    promotedToGrade: 'SS 2',
    minimumCumulativeAverage: 50.0,
    mustPassEnglish: true,
    mustPassMathematics: true,
    minimumCreditPassesCount: 5,
    minimumAttendancePercentage: 75.0,
    maxAllowedFails: 2,
    trialEligibilityMargin: 4.0
  },
  {
    id: 'rule-ss2-ss3',
    targetClassGrade: 'SS 2',
    promotedToGrade: 'SS 3',
    minimumCumulativeAverage: 55.0, // Strict WAEC pre-qualification
    mustPassEnglish: true,
    mustPassMathematics: true,
    minimumCreditPassesCount: 5, // Minimum 5 credits including English & Maths
    minimumAttendancePercentage: 80.0,
    maxAllowedFails: 1,
    trialEligibilityMargin: 3.0
  }
];

export const INITIAL_PROMOTION_CANDIDATES: StudentPromotionRecord[] = [
  {
    studentId: 'std-ss2-001',
    studentName: 'Chukwuebuka Obi',
    admissionNumber: 'KCL/2022/SS/0418',
    classGrade: 'SS 2',
    classArm: 'SS 2 Alpha',
    term1Average: 83.8,
    term2Average: 84.3,
    term3Average: 86.5,
    annualCumulativeAverage: 84.87,
    totalCreditsCount: 8,
    passedEnglish: true,
    passedMathematics: true,
    overallAttendanceRate: 98.3,
    computedOutcome: 'promoted',
    finalDecision: 'promoted',
    councilRemarks: 'Unanimous promotion with honors to SS 3 Science Alpha. Recommended for Science Olympiad.',
    deliberatedBy: 'Principal & Academic Board',
    deliberatedAt: '2026-07-24'
  },
  {
    studentId: 'std-ss2-002',
    studentName: 'Amina Yusuf',
    admissionNumber: 'KCL/2022/SS/0419',
    classGrade: 'SS 2',
    classArm: 'SS 2 Alpha',
    term1Average: 89.2,
    term2Average: 90.0,
    term3Average: 91.4,
    annualCumulativeAverage: 90.20,
    totalCreditsCount: 8,
    passedEnglish: true,
    passedMathematics: true,
    overallAttendanceRate: 100.0,
    computedOutcome: 'promoted',
    finalDecision: 'promoted',
    councilRemarks: 'Unanimous promotion. Valedictorian candidate for SS 3.',
    deliberatedBy: 'Principal & Academic Board',
    deliberatedAt: '2026-07-24'
  },
  {
    studentId: 'std-ss2-003',
    studentName: 'Femi Balogun',
    admissionNumber: 'KCL/2022/SS/0420',
    classGrade: 'SS 2',
    classArm: 'SS 2 Beta',
    term1Average: 76.5,
    term2Average: 78.9,
    term3Average: 80.2,
    annualCumulativeAverage: 78.53,
    totalCreditsCount: 8,
    passedEnglish: true,
    passedMathematics: true,
    overallAttendanceRate: 95.0,
    computedOutcome: 'promoted',
    finalDecision: 'promoted',
    councilRemarks: 'Promoted to SS 3 Commercial Alpha with strong standing in Financial Accounting.',
    deliberatedBy: 'Principal & Academic Board',
    deliberatedAt: '2026-07-24'
  },
  {
    studentId: 'std-ss2-004',
    studentName: 'Blessing Okon',
    admissionNumber: 'KCL/2022/SS/0421',
    classGrade: 'SS 2',
    classArm: 'SS 2 Beta',
    term1Average: 52.0,
    term2Average: 53.4,
    term3Average: 54.1,
    annualCumulativeAverage: 53.17,
    totalCreditsCount: 5,
    passedEnglish: true,
    passedMathematics: false, // Scored 47% in Maths
    overallAttendanceRate: 88.5,
    computedOutcome: 'promoted_on_trial',
    finalDecision: 'promoted_on_trial',
    councilRemarks: 'Promoted on Trial to SS 3 Arts. Compulsory vacation remedial mathematics clinic required with re-test in September.',
    deliberatedBy: 'Principal & Academic Board',
    deliberatedAt: '2026-07-24'
  },
  {
    studentId: 'std-ss2-005',
    studentName: 'Tunde Adeleke',
    admissionNumber: 'KCL/2022/SS/0422',
    classGrade: 'SS 2',
    classArm: 'SS 2 Gamma',
    term1Average: 42.1,
    term2Average: 44.0,
    term3Average: 43.5,
    annualCumulativeAverage: 43.20,
    totalCreditsCount: 2,
    passedEnglish: false,
    passedMathematics: false,
    overallAttendanceRate: 64.0,
    computedOutcome: 'repeat_class',
    finalDecision: 'repeat_class',
    councilRemarks: 'Fails to meet SS 3 promotion threshold (43.2% vs 55% cutoff). Class repetition in SS 2 recommended with parental counseling.',
    deliberatedBy: 'Principal & Academic Board',
    deliberatedAt: '2026-07-24'
  }
];

export const INITIAL_MOCK_EXAMS: MockExamSchedule[] = [
  {
    id: 'mock-waec-2026',
    title: '2026 SS 3 Joint WAEC Pre-National Mock Examination',
    examType: 'waec_mock',
    academicSession: '2025/2026',
    targetGrades: ['SS 3'],
    startDate: '2026-03-09',
    endDate: '2026-03-27',
    status: 'published',
    totalCandidates: 148,
    participatingArms: ['SS 3 Science Alpha', 'SS 3 Science Beta', 'SS 3 Commercial', 'SS 3 Arts'],
    chiefExaminer: 'Dr. Amina Bello (Chief Exam Officer)',
    centerCode: 'CTR-WAEC-90412-LAG'
  },
  {
    id: 'mock-bece-2026',
    title: '2026 JSS 3 State Joint BECE / Junior WAEC Mock Exam',
    examType: 'bece_mock',
    academicSession: '2025/2026',
    targetGrades: ['JSS 3'],
    startDate: '2026-04-13',
    endDate: '2026-04-24',
    status: 'scheduled',
    totalCandidates: 165,
    participatingArms: ['JSS 3 Alpha', 'JSS 3 Beta', 'JSS 3 Gamma', 'JSS 3 Delta'],
    chiefExaminer: 'Mr. Babatunde Lawal',
    centerCode: 'CTR-BECE-44102-LAG'
  },
  {
    id: 'mock-utme-2026',
    title: '2026 JAMB/UTME Speed CBT Trial Simulation 1',
    examType: 'jamb_utme_trial',
    academicSession: '2025/2026',
    targetGrades: ['SS 3'],
    startDate: '2026-02-14',
    endDate: '2026-02-16',
    status: 'published',
    totalCandidates: 142,
    participatingArms: ['All SS 3 Candidates'],
    chiefExaminer: 'Mr. Segun Oladipo (CBT Lab Director)',
    centerCode: 'CTR-JAMB-SIM-01'
  }
];

export const INITIAL_MOCK_SCORES: MockCandidateScore[] = [
  {
    id: 'mscore-001',
    mockExamId: 'mock-waec-2026',
    studentId: 'std-ss3-001',
    studentName: 'Chukwuebuka Obi',
    admissionNumber: 'KCL/2022/SS/0418',
    indexNumber: 'WAEC/MOCK/2026/014',
    classArm: 'SS 3 Science Alpha',
    subjectScores: [
      {
        subjectName: 'English Language',
        subjectCode: 'ENG',
        paper1ObjScore: 36,
        paper2TheoryScore: 48,
        totalScore: 84,
        grade: 'A1',
        predictedWaecScore: 'Guaranteed Distinction (A1)'
      },
      {
        subjectName: 'General Mathematics',
        subjectCode: 'MTH',
        paper1ObjScore: 38,
        paper2TheoryScore: 52,
        totalScore: 90,
        grade: 'A1',
        predictedWaecScore: 'Guaranteed Distinction (A1)'
      },
      {
        subjectName: 'Physics',
        subjectCode: 'PHY',
        paper1ObjScore: 37,
        paper2TheoryScore: 49,
        totalScore: 86,
        grade: 'A1',
        predictedWaecScore: 'Guaranteed Distinction (A1)'
      },
      {
        subjectName: 'Chemistry',
        subjectCode: 'CHM',
        paper1ObjScore: 34,
        paper2TheoryScore: 44,
        totalScore: 78,
        grade: 'B2',
        predictedWaecScore: 'Likely Distinction (A1-B2)'
      },
      {
        subjectName: 'Biology',
        subjectCode: 'BIO',
        paper1ObjScore: 35,
        paper2TheoryScore: 47,
        totalScore: 82,
        grade: 'A1',
        predictedWaecScore: 'Guaranteed Distinction (A1)'
      },
      {
        subjectName: 'Civic Education',
        subjectCode: 'CVE',
        paper1ObjScore: 39,
        paper2TheoryScore: 54,
        totalScore: 93,
        grade: 'A1',
        predictedWaecScore: 'Guaranteed Distinction (A1)'
      }
    ],
    totalAggregatePoints: 8, // 1+1+1+2+1+1 (Lower is better in WAEC scale)
    aggregateAverage: 85.5,
    waecReadinessIndex: 'High Distinction'
  },
  {
    id: 'mscore-002',
    mockExamId: 'mock-waec-2026',
    studentId: 'std-ss3-002',
    studentName: 'Amina Yusuf',
    admissionNumber: 'KCL/2022/SS/0419',
    indexNumber: 'WAEC/MOCK/2026/001',
    classArm: 'SS 3 Science Alpha',
    subjectScores: [
      {
        subjectName: 'English Language',
        subjectCode: 'ENG',
        paper1ObjScore: 38,
        paper2TheoryScore: 52,
        totalScore: 90,
        grade: 'A1',
        predictedWaecScore: 'Guaranteed Distinction (A1)'
      },
      {
        subjectName: 'General Mathematics',
        subjectCode: 'MTH',
        paper1ObjScore: 39,
        paper2TheoryScore: 56,
        totalScore: 95,
        grade: 'A1',
        predictedWaecScore: 'Guaranteed Distinction (A1)'
      },
      {
        subjectName: 'Physics',
        subjectCode: 'PHY',
        paper1ObjScore: 38,
        paper2TheoryScore: 54,
        totalScore: 92,
        grade: 'A1',
        predictedWaecScore: 'Guaranteed Distinction (A1)'
      },
      {
        subjectName: 'Chemistry',
        subjectCode: 'CHM',
        paper1ObjScore: 37,
        paper2TheoryScore: 51,
        totalScore: 88,
        grade: 'A1',
        predictedWaecScore: 'Guaranteed Distinction (A1)'
      },
      {
        subjectName: 'Biology',
        subjectCode: 'BIO',
        paper1ObjScore: 38,
        paper2TheoryScore: 53,
        totalScore: 91,
        grade: 'A1',
        predictedWaecScore: 'Guaranteed Distinction (A1)'
      },
      {
        subjectName: 'Civic Education',
        subjectCode: 'CVE',
        paper1ObjScore: 40,
        paper2TheoryScore: 58,
        totalScore: 98,
        grade: 'A1',
        predictedWaecScore: 'Guaranteed Distinction (A1)'
      }
    ],
    totalAggregatePoints: 6, // Straight 6 A1s
    aggregateAverage: 92.3,
    waecReadinessIndex: 'High Distinction'
  }
];
