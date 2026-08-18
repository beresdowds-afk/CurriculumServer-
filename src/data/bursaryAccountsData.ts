import {
  ClassGrade,
  Term,
  FeeItem,
  FeeSchedule,
  StudentInvoice,
  PaymentTransaction,
  OfficialReceipt,
  ReconciliationRecord,
  PaymentNotification,
  StudentAccountSummary,
  InstallmentPolicy,
  InstallmentTranche,
  InstallmentPresetType,
  PolicyAuditEntry,
  StudentInstallmentAgreement,
  CustomStudentTranche,
  MonthlyRevenueBudgetData,
  AcademicTermBudgetSummary,
  SundryPaymentOrder
} from '../types';

// -----------------------------------------------------------------
// 1. FEE CATALOG & SCHEDULES (PRINCIPAL GOVERNANCE)
// -----------------------------------------------------------------
export const INITIAL_FEE_ITEMS: FeeItem[] = [
  {
    id: 'fee-tui-ss',
    code: 'TUI-SS-001',
    name: 'Senior Secondary Tuition & Instructional Fee',
    category: 'tuition',
    amount: 95000,
    isCompulsory: true,
    applicableGrades: ['SS 1', 'SS 2', 'SS 3'],
    description: 'Core instructional delivery, faculty teaching, and classroom learning materials.',
    frequency: 'per_term',
    targetAudience: 'all_students',
    approvalStatus: 'approved_published',
    approvedBy: 'Dr. (Mrs.) Margaret Adebayo (Principal)',
    approvedAt: '2026-04-10',
    designatedAccount: 'School Operations Account - Access Bank (0092817345)',
    installmentEligible: true,
    tags: ['Academic', 'Core', 'Termly']
  },
  {
    id: 'fee-tui-jss',
    code: 'TUI-JSS-002',
    name: 'Junior Secondary Tuition & Instructional Fee',
    category: 'tuition',
    amount: 75000,
    isCompulsory: true,
    applicableGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    description: 'Foundational instructional delivery and classroom learning materials.',
    frequency: 'per_term',
    targetAudience: 'all_students',
    approvalStatus: 'approved_published',
    approvedBy: 'Dr. (Mrs.) Margaret Adebayo (Principal)',
    approvedAt: '2026-04-10',
    designatedAccount: 'School Operations Account - Access Bank (0092817345)',
    installmentEligible: true,
    tags: ['Academic', 'Core', 'Termly']
  },
  {
    id: 'fee-stem-lab',
    code: 'LAB-STEM-003',
    name: 'Science, Robotics & Engineering Lab Practical Levy',
    category: 'science_lab',
    amount: 25000,
    isCompulsory: true,
    applicableGrades: ['SS 1', 'SS 2', 'SS 3', 'JSS 1', 'JSS 2', 'JSS 3'],
    description: 'Laboratory apparatus, chemicals, STEM kits, and workshop consumables.',
    frequency: 'per_term',
    targetAudience: 'all_students',
    approvalStatus: 'approved_published',
    approvedBy: 'Dr. (Mrs.) Margaret Adebayo (Principal)',
    approvedAt: '2026-04-10',
    designatedAccount: 'STEM & Laboratories Escrow - Zenith Bank (1012938472)',
    installmentEligible: true,
    tags: ['Laboratory', 'Practical', 'Science']
  },
  {
    id: 'fee-ict-lms',
    code: 'ICT-LMS-004',
    name: 'ICT, CBT Testing & CurriculumFlow Digital LMS Levy',
    category: 'ict_lms',
    amount: 15000,
    isCompulsory: true,
    applicableGrades: ['SS 1', 'SS 2', 'SS 3', 'JSS 1', 'JSS 2', 'JSS 3'],
    description: 'Computer laboratory internet connectivity, CBT examination portal, and digital curriculum platform access.',
    frequency: 'per_term',
    targetAudience: 'all_students',
    approvalStatus: 'approved_published',
    approvedBy: 'Dr. (Mrs.) Margaret Adebayo (Principal)',
    approvedAt: '2026-04-10',
    designatedAccount: 'ICT Technology Account - Access Bank (0092817345)',
    installmentEligible: true,
    tags: ['ICT', 'LMS', 'CBT']
  },
  {
    id: 'fee-dev-levy',
    code: 'DEV-FAC-005',
    name: 'School Infrastructure & Physical Development Levy',
    category: 'development_levy',
    amount: 20000,
    isCompulsory: true,
    applicableGrades: ['SS 1', 'SS 2', 'SS 3', 'JSS 1', 'JSS 2', 'JSS 3'],
    description: 'Facility upgrades, solar energy maintenance, and classroom amenities.',
    frequency: 'per_term',
    targetAudience: 'all_students',
    approvalStatus: 'approved_published',
    approvedBy: 'Dr. (Mrs.) Margaret Adebayo (Principal)',
    approvedAt: '2026-04-10',
    designatedAccount: 'Capital Development Fund - First Bank (2039485712)',
    installmentEligible: true,
    tags: ['Infrastructure', 'Solar', 'Capital']
  },
  {
    id: 'fee-pta-levy',
    code: 'PTA-WEL-006',
    name: 'Parent-Teacher Association (PTA) Welfare Levy',
    category: 'pta',
    amount: 10000,
    isCompulsory: true,
    applicableGrades: ['SS 1', 'SS 2', 'SS 3', 'JSS 1', 'JSS 2', 'JSS 3'],
    description: 'PTA community projects and student welfare emergency fund.',
    frequency: 'per_term',
    targetAudience: 'all_students',
    approvalStatus: 'approved_published',
    approvedBy: 'Dr. (Mrs.) Margaret Adebayo (Principal)',
    approvedAt: '2026-04-10',
    designatedAccount: 'PTA Executive Account - Zenith Bank (1019283746)',
    installmentEligible: false,
    tags: ['PTA', 'Welfare']
  },
  {
    id: 'fee-med-ins',
    code: 'MED-INS-007',
    name: 'Medical Clinic & Emergency Healthcare Insurance',
    category: 'medical_insurance',
    amount: 8000,
    isCompulsory: true,
    applicableGrades: ['SS 1', 'SS 2', 'SS 3', 'JSS 1', 'JSS 2', 'JSS 3'],
    description: 'Full-time registered nursing staff, first-aid clinic medicines, and emergency triage insurance.',
    frequency: 'per_term',
    targetAudience: 'all_students',
    approvalStatus: 'approved_published',
    approvedBy: 'Dr. (Mrs.) Margaret Adebayo (Principal)',
    approvedAt: '2026-04-10',
    designatedAccount: 'Health & Wellness Escrow - Access Bank (0092817345)',
    installmentEligible: false,
    tags: ['Medical', 'Health', 'Clinic']
  },
  {
    id: 'fee-exam-waec',
    code: 'EXM-WAEC-008',
    name: 'WAEC / NECO / BECE Assessment Registration & Continuous Assessment Entry',
    category: 'exam_fees',
    amount: 35000,
    isCompulsory: false,
    applicableGrades: ['SS 2', 'SS 3', 'JSS 3'],
    description: 'National and regional standardized examination council registration and mock testing.',
    frequency: 'annual_session',
    targetAudience: 'specific_grades',
    approvalStatus: 'approved_published',
    approvedBy: 'Dr. (Mrs.) Margaret Adebayo (Principal)',
    approvedAt: '2026-04-10',
    designatedAccount: 'National Examination Board Escrow - First Bank (2039485712)',
    installmentEligible: false,
    dueDate: '2026-05-30',
    tags: ['Examinations', 'WAEC', 'NECO', 'BECE']
  },
  {
    id: 'fee-boarding',
    code: 'BRD-HSTL-009',
    name: 'Boarding House Hostel & Meal Catering Subscription',
    category: 'uniform_boarding',
    amount: 175000,
    isCompulsory: false,
    applicableGrades: ['SS 1', 'SS 2', 'SS 3', 'JSS 1', 'JSS 2', 'JSS 3'],
    description: 'Residential dormitories, 3 daily nutritionist-supervised hot meals, laundry, and housemaster care.',
    frequency: 'per_term',
    targetAudience: 'boarding_only',
    approvalStatus: 'approved_published',
    approvedBy: 'Dr. (Mrs.) Margaret Adebayo (Principal)',
    approvedAt: '2026-04-10',
    designatedAccount: 'Boarding & Catering Services - Zenith Bank (1012938472)',
    installmentEligible: true,
    tags: ['Hostel', 'Boarding', 'Meals']
  },
  {
    id: 'fee-bus-transport',
    code: 'TRN-BUS-010',
    name: 'School Bus Transit Route (Round-Trip Route A)',
    category: 'transport',
    amount: 45000,
    isCompulsory: false,
    applicableGrades: ['SS 1', 'SS 2', 'SS 3', 'JSS 1', 'JSS 2', 'JSS 3'],
    description: 'Air-conditioned GPS-tracked student bus transit with verified driver and assistant.',
    frequency: 'per_term',
    targetAudience: 'day_only',
    approvalStatus: 'approved_published',
    approvedBy: 'Dr. (Mrs.) Margaret Adebayo (Principal)',
    approvedAt: '2026-04-10',
    designatedAccount: 'Logistics & Fleet Operations - Access Bank (0092817345)',
    installmentEligible: true,
    tags: ['Transit', 'School Bus', 'Transport']
  },
  // Additional Sundry Payments & Special Levies created by Principal
  {
    id: 'fee-excursion-space',
    code: 'EXC-SPC-011',
    name: 'National Space Research & Observatory Educational Excursion',
    category: 'excursion',
    amount: 18500,
    isCompulsory: false,
    applicableGrades: ['JSS 2', 'JSS 3', 'SS 1', 'SS 2'],
    description: 'Full-day STEM guided tour, planetarium telescope observation, luxury bus charter, and buffet lunch.',
    frequency: 'one_off_event',
    targetAudience: 'all_students',
    approvalStatus: 'approved_published',
    approvedBy: 'Dr. (Mrs.) Margaret Adebayo (Principal)',
    approvedAt: '2026-04-12',
    designatedAccount: 'Excursions & Field Trips - Zenith Bank (1012938472)',
    installmentEligible: false,
    dueDate: '2026-06-10',
    maxEnrollmentSlots: 80,
    enrolledStudentsCount: 42,
    tags: ['Excursion', 'STEM', 'Field Trip']
  },
  {
    id: 'fee-club-robotics',
    code: 'CLB-ROB-012',
    name: 'CurriculumFlow Robotics & Artificial Intelligence Club Kit & Dues',
    category: 'clubs_societies',
    amount: 12000,
    isCompulsory: false,
    applicableGrades: ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'],
    description: 'Arduino microcontroller kit, sensors, soldering consumables, and National Robotics Olympiad entry fee.',
    frequency: 'annual_session',
    targetAudience: 'elective_club',
    approvalStatus: 'approved_published',
    approvedBy: 'Dr. (Mrs.) Margaret Adebayo (Principal)',
    approvedAt: '2026-04-12',
    designatedAccount: 'Co-Curricular & Student Societies - Access Bank (0092817345)',
    installmentEligible: false,
    maxEnrollmentSlots: 50,
    enrolledStudentsCount: 28,
    tags: ['Robotics', 'Club', 'AI', 'STEM']
  },
  {
    id: 'fee-sports-jersey',
    code: 'SPT-JRS-013',
    name: 'Inter-House Sports Customized Athletic Jersey & Tracksuit Set',
    category: 'sports_uniform',
    amount: 14500,
    isCompulsory: false,
    applicableGrades: ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'],
    description: 'Breathable team color house jersey, serialized name print, sports shorts, and athletic socks.',
    frequency: 'one_off_event',
    targetAudience: 'all_students',
    approvalStatus: 'approved_published',
    approvedBy: 'Dr. (Mrs.) Margaret Adebayo (Principal)',
    approvedAt: '2026-04-14',
    designatedAccount: 'Sports & Physical Education Fund - Zenith Bank (1012938472)',
    installmentEligible: false,
    tags: ['Inter-House', 'Sports', 'Uniform', 'Jersey']
  },
  {
    id: 'fee-blazer-crest',
    code: 'UNF-BLZ-014',
    name: 'Senior School Ceremonial Blazer with Gold Embroidered Crest',
    category: 'sports_uniform',
    amount: 22000,
    isCompulsory: false,
    applicableGrades: ['SS 1', 'SS 2', 'SS 3'],
    description: 'Navy blue wool-blend tailored ceremonial blazer with embossed brass buttons and metallic monogram crest.',
    frequency: 'one_off_event',
    targetAudience: 'specific_grades',
    approvalStatus: 'approved_published',
    approvedBy: 'Dr. (Mrs.) Margaret Adebayo (Principal)',
    approvedAt: '2026-04-14',
    designatedAccount: 'School Uniform & Regalia Account - First Bank (2039485712)',
    installmentEligible: true,
    tags: ['Uniform', 'Blazer', 'Senior Secondary']
  },
  {
    id: 'fee-grad-gown',
    code: 'GRD-GWN-015',
    name: 'Valedictory Service, Academic Gown Rental & Deluxe Yearbook Levy',
    category: 'graduation_valedictory',
    amount: 28000,
    isCompulsory: false,
    applicableGrades: ['SS 3', 'JSS 3'],
    description: 'Custom academic gown rental, mortarboard cap, hardbound colored graduation yearbook, and banquet seat.',
    frequency: 'annual_session',
    targetAudience: 'specific_grades',
    approvalStatus: 'approved_published',
    approvedBy: 'Dr. (Mrs.) Margaret Adebayo (Principal)',
    approvedAt: '2026-04-14',
    designatedAccount: 'Graduation & Valedictory Committee - Zenith Bank (1012938472)',
    installmentEligible: true,
    dueDate: '2026-06-25',
    tags: ['Graduation', 'Valedictory', 'Yearbook']
  },
  {
    id: 'fee-extramural-coaching',
    code: 'EXT-UTME-016',
    name: 'Evening Masterclass & UTME/JAMB/SAT Intensive Weekend Coaching',
    category: 'coaching_extramural',
    amount: 20000,
    isCompulsory: false,
    applicableGrades: ['SS 2', 'SS 3'],
    description: 'Past questions masterclass, CBT speed drilling, weekend physical sessions by seasoned examiners.',
    frequency: 'per_term',
    targetAudience: 'specific_grades',
    approvalStatus: 'approved_published',
    approvedBy: 'Dr. (Mrs.) Margaret Adebayo (Principal)',
    approvedAt: '2026-04-15',
    designatedAccount: 'Academic Enrichment & Masterclasses - Access Bank (0092817345)',
    installmentEligible: false,
    tags: ['JAMB', 'UTME', 'SAT', 'Coaching']
  },
  {
    id: 'fee-late-penalty',
    code: 'ADM-LAT-017',
    name: 'Late Term Registration & Administrative Demurrage Surcharge',
    category: 'late_penalty',
    amount: 5000,
    isCompulsory: false,
    applicableGrades: ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'],
    description: 'Administrative penalty charge for term clearance completed after the statutory published deadline.',
    frequency: 'on_demand',
    targetAudience: 'all_students',
    approvalStatus: 'approved_published',
    approvedBy: 'Dr. (Mrs.) Margaret Adebayo (Principal)',
    approvedAt: '2026-04-15',
    designatedAccount: 'School Operations Account - Access Bank (0092817345)',
    installmentEligible: false,
    tags: ['Penalty', 'Demurrage', 'Late Fee']
  }
];

export const INITIAL_FEE_SCHEDULES: FeeSchedule[] = [
  {
    id: 'sched-ss2-t3-2026',
    code: 'SCHED-SS2-DAY-T3',
    name: 'SS 2 Trinity Term Standard Day Schedule',
    academicSession: '2025/2026',
    term: 'Term 3',
    classGrade: 'SS 2',
    studentType: 'day',
    feeItems: INITIAL_FEE_ITEMS.filter(f => ['fee-tui-ss', 'fee-stem-lab', 'fee-ict-lms', 'fee-dev-levy', 'fee-pta-levy', 'fee-med-ins'].includes(f.id)),
    totalAmount: 173000,
    approvalStatus: 'approved_published',
    approvedBy: 'Dr. (Mrs.) Margaret Adebayo (Principal)',
    approvedAt: '2026-04-10',
    notes: 'Approved standard compulsory tuition and academic levies for all Senior Secondary 2 day students.'
  },
  {
    id: 'sched-ss2-brd-t3-2026',
    code: 'SCHED-SS2-BRD-T3',
    name: 'SS 2 Trinity Term Full Boarding Schedule',
    academicSession: '2025/2026',
    term: 'Term 3',
    classGrade: 'SS 2',
    studentType: 'boarding',
    feeItems: INITIAL_FEE_ITEMS.filter(f => ['fee-tui-ss', 'fee-stem-lab', 'fee-ict-lms', 'fee-dev-levy', 'fee-pta-levy', 'fee-med-ins', 'fee-boarding'].includes(f.id)),
    totalAmount: 348000,
    approvalStatus: 'approved_published',
    approvedBy: 'Dr. (Mrs.) Margaret Adebayo (Principal)',
    approvedAt: '2026-04-10',
    notes: 'Approved residential tuition, hostel accommodation, and 3-meal catering package.'
  },
  {
    id: 'sched-ss3-waec-t3-2026',
    code: 'SCHED-SS3-WAEC-T3',
    name: 'SS 3 Trinity Term Final WAEC Candidate Package',
    academicSession: '2025/2026',
    term: 'Term 3',
    classGrade: 'SS 3',
    studentType: 'day',
    feeItems: INITIAL_FEE_ITEMS.filter(f => ['fee-tui-ss', 'fee-stem-lab', 'fee-ict-lms', 'fee-dev-levy', 'fee-pta-levy', 'fee-med-ins', 'fee-exam-waec', 'fee-grad-gown'].includes(f.id)),
    totalAmount: 236000,
    approvalStatus: 'approved_published',
    approvedBy: 'Dr. (Mrs.) Margaret Adebayo (Principal)',
    approvedAt: '2026-04-10',
    notes: 'Comprehensive terminal schedule including WAEC council registration and Valedictory regalia.'
  },
  {
    id: 'sched-jss2-t3-2026',
    code: 'SCHED-JSS2-DAY-T3',
    name: 'JSS 2 Trinity Term Standard Day Schedule',
    academicSession: '2025/2026',
    term: 'Term 3',
    classGrade: 'JSS 2',
    studentType: 'day',
    feeItems: INITIAL_FEE_ITEMS.filter(f => ['fee-tui-jss', 'fee-stem-lab', 'fee-ict-lms', 'fee-dev-levy', 'fee-pta-levy', 'fee-med-ins'].includes(f.id)),
    totalAmount: 153000,
    approvalStatus: 'approved_published',
    approvedBy: 'Dr. (Mrs.) Margaret Adebayo (Principal)',
    approvedAt: '2026-04-10',
    notes: 'Standard compulsory foundational fee bundle for JSS 2 students.'
  },
  {
    id: 'sched-jss3-bece-t3-2026',
    code: 'SCHED-JSS3-BECE-T3',
    name: 'JSS 3 Trinity Term BECE Candidate Schedule',
    academicSession: '2025/2026',
    term: 'Term 3',
    classGrade: 'JSS 3',
    studentType: 'day',
    feeItems: INITIAL_FEE_ITEMS.filter(f => ['fee-tui-jss', 'fee-stem-lab', 'fee-ict-lms', 'fee-dev-levy', 'fee-pta-levy', 'fee-med-ins', 'fee-exam-waec', 'fee-grad-gown'].includes(f.id)),
    totalAmount: 216000,
    approvalStatus: 'approved_published',
    approvedBy: 'Dr. (Mrs.) Margaret Adebayo (Principal)',
    approvedAt: '2026-04-10',
    notes: 'Junior secondary completion package including State BECE council fees and basic graduation gown.'
  }
];

export const INITIAL_SUNDRY_PAYMENTS: SundryPaymentOrder[] = [
  {
    id: 'snd-2026-001',
    orderNumber: 'SND-2026-001',
    feeItemId: 'fee-excursion-space',
    feeItemName: 'National Space Research & Observatory Educational Excursion',
    category: 'excursion',
    studentId: 'std-ss2-01',
    studentName: 'Chinedu Eze',
    admissionNumber: 'CF/2024/SS2/001',
    classGrade: 'SS 2',
    parentName: 'Chief O. Eze',
    parentPhone: '+234 807 444 5566',
    parentEmail: 'bursar@curriculumflow.edu.ng',
    amount: 18500,
    paymentStatus: 'paid',
    paymentDate: '2026-04-20',
    receiptNumber: 'REC-EXC-2026-018',
    transactionReference: 'PSTK_EXC_99214',
    paymentChannel: 'paystack',
    additionalDetails: {
      excursionConsentSigned: true,
      customNote: 'Dietary preference: Vegetarian lunch requested'
    },
    issuedAt: '2026-04-18',
    issuedBy: 'Principal Admin Portal'
  },
  {
    id: 'snd-2026-002',
    orderNumber: 'SND-2026-002',
    feeItemId: 'fee-club-robotics',
    feeItemName: 'CurriculumFlow Robotics & Artificial Intelligence Club Kit & Dues',
    category: 'clubs_societies',
    studentId: 'std-ss2-02',
    studentName: 'Amina Bello',
    admissionNumber: 'CF/2024/SS2/002',
    classGrade: 'SS 2',
    parentName: 'Alhaji M. Bello',
    parentPhone: '+234 802 333 4455',
    parentEmail: 'amina.parents@gmail.com',
    amount: 12000,
    paymentStatus: 'paid',
    paymentDate: '2026-04-22',
    receiptNumber: 'REC-ROB-2026-009',
    transactionReference: 'OPAY_ROB_77182',
    paymentChannel: 'opay',
    additionalDetails: {
      clubRole: 'Hardware Lead - SS 2 Team A',
      customNote: 'Arduino UNO Starter Kit Issued'
    },
    issuedAt: '2026-04-19',
    issuedBy: 'Principal Admin Portal'
  },
  {
    id: 'snd-2026-003',
    orderNumber: 'SND-2026-003',
    feeItemId: 'fee-blazer-crest',
    feeItemName: 'Senior School Ceremonial Blazer with Gold Embroidered Crest',
    category: 'sports_uniform',
    studentId: 'std-ss2-03',
    studentName: 'Tunde Bakare',
    admissionNumber: 'CF/2024/SS2/003',
    classGrade: 'SS 2',
    parentName: 'Pastor D. Bakare',
    parentPhone: '+234 803 555 6677',
    parentEmail: 'pastor.bakare@yahoo.com',
    amount: 22000,
    paymentStatus: 'pending',
    additionalDetails: {
      uniformSize: 'Size 40 (Slim Fit)',
      customNote: 'Fitted at Tailoring Bay on 19th April'
    },
    issuedAt: '2026-04-20',
    issuedBy: 'Principal Admin Portal'
  },
  {
    id: 'snd-2026-004',
    orderNumber: 'SND-2026-004',
    feeItemId: 'fee-sports-jersey',
    feeItemName: 'Inter-House Sports Customized Athletic Jersey & Tracksuit Set',
    category: 'sports_uniform',
    studentId: 'std-ss2-04',
    studentName: 'Ngozi Okonjo',
    admissionNumber: 'CF/2024/SS2/004',
    classGrade: 'SS 2',
    parentName: 'Dr. K. Okonjo',
    parentPhone: '+234 805 666 7788',
    parentEmail: 'dr.okonjo@gmail.com',
    amount: 14500,
    paymentStatus: 'paid',
    paymentDate: '2026-04-25',
    receiptNumber: 'REC-SPT-2026-044',
    transactionReference: 'NIP/GTB/449102',
    paymentChannel: 'bank_transfer',
    additionalDetails: {
      uniformSize: 'Medium (Yellow House - Coral Pavilion)',
      customNote: 'Serial No #07'
    },
    issuedAt: '2026-04-21',
    issuedBy: 'Principal Admin Portal'
  },
  {
    id: 'snd-2026-005',
    orderNumber: 'SND-2026-005',
    feeItemId: 'fee-extramural-coaching',
    feeItemName: 'Evening Masterclass & UTME/JAMB/SAT Intensive Weekend Coaching',
    category: 'coaching_extramural',
    studentId: 'std-ss2-05',
    studentName: 'Emeka Nwosu',
    admissionNumber: 'CF/2024/SS2/005',
    classGrade: 'SS 2',
    parentName: 'Engr. B. Nwosu',
    parentPhone: '+234 809 777 8899',
    amount: 20000,
    paymentStatus: 'pending',
    additionalDetails: {
      examSubjectsSelected: ['Physics', 'Chemistry', 'Biology', 'Advanced Math'],
      customNote: 'Saturday 8:00 AM - 1:00 PM Cohort'
    },
    issuedAt: '2026-04-22',
    issuedBy: 'Principal Admin Portal'
  }
];

// Helper to format Naira in words
export function numberToWordsNaira(num: number): string {
  if (num === 0) return 'Zero Naira Only';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertGroup(n: number): string {
    let str = '';
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += b[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += a[n] + ' ';
    }
    return str.trim();
  }

  const millions = Math.floor(num / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const remainder = Math.floor(num % 1000);

  let result = '';
  if (millions > 0) result += convertGroup(millions) + ' Million ';
  if (thousands > 0) result += convertGroup(thousands) + ' Thousand ';
  if (remainder > 0) result += convertGroup(remainder) + ' ';

  return (result.trim() + ' Naira Only');
}

export function generatePaystackReference(): string {
  return `PSTK_CF_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
}

export function generateOpayReference(): string {
  return `OPAY_TX_${Date.now().toString().slice(-8)}${Math.floor(100 + Math.random() * 900)}`;
}

export function generateVirtualNuban(admissionNo: string): { bankName: string; accountNumber: string; accountName: string } {
  // Generate deterministic 10-digit virtual NUBAN e.g. 9920XXXXXX
  const digits = admissionNo.replace(/\D/g, '').padEnd(6, '7');
  const accountNumber = `9920${digits.slice(0, 6)}`;
  return {
    bankName: 'OPay / Wema Bank Virtual Ingress',
    accountNumber,
    accountName: `CurriculumFlow / ${admissionNo}`
  };
}

// -----------------------------------------------------------------
// 2. INITIAL STUDENT INVOICES
// -----------------------------------------------------------------
export const INITIAL_STUDENT_INVOICES: StudentInvoice[] = [
  {
    id: 'inv-ss2-001',
    invoiceNumber: 'INV-2026-T3-001',
    studentId: 'std-ss2-01',
    studentName: 'Chinedu Eze',
    admissionNumber: 'CF/2024/SS2/001',
    classGrade: 'SS 2',
    classGroupId: 'grp-ss2-scia',
    classGroupName: 'SS 2 Science A',
    parentName: 'Chief O. Eze',
    parentEmail: 'bursar@curriculumflow.edu.ng',
    parentPhone: '+234 807 444 5566',
    term: 'Term 3',
    academicSession: '2025/2026',
    issueDate: '2026-04-15',
    dueDate: '2026-05-15',
    lineItems: [
      { feeItemId: 'fee-tui-ss', name: 'Senior Secondary Tuition & Instructional Fee', category: 'tuition', amount: 95000, discountAmount: 0, netAmount: 95000 },
      { feeItemId: 'fee-stem-lab', name: 'Science, Robotics & Practical Lab Levy', category: 'science_lab', amount: 25000, discountAmount: 0, netAmount: 25000 },
      { feeItemId: 'fee-ict-lms', name: 'ICT, CBT Testing & CurriculumFlow LMS Levy', category: 'ict_lms', amount: 15000, discountAmount: 0, netAmount: 15000 },
      { feeItemId: 'fee-dev-levy', name: 'Infrastructure & Facility Development Levy', category: 'development_levy', amount: 20000, discountAmount: 0, netAmount: 20000 },
      { feeItemId: 'fee-pta-levy', name: 'Parent-Teacher Association (PTA) Levy', category: 'pta', amount: 10000, discountAmount: 0, netAmount: 10000 },
      { feeItemId: 'fee-med-ins', name: 'Medical Clinic & Health Insurance', category: 'medical_insurance', amount: 8000, discountAmount: 0, netAmount: 8000 }
    ],
    totalAmount: 173000,
    totalDiscount: 0,
    amountPaid: 173000,
    balanceDue: 0,
    status: 'paid',
    qrCodeHash: 'CF-INV-2026-T3-001-AUTH-7839-CLEARED',
    notes: 'Payment completed in full via Paystack. Official clearance issued.',
    createdAt: '2026-04-15T08:00:00.000Z'
  },
  {
    id: 'inv-ss2-002',
    invoiceNumber: 'INV-2026-T3-002',
    studentId: 'std-ss2-02',
    studentName: 'Amina Bello',
    admissionNumber: 'CF/2024/SS2/002',
    classGrade: 'SS 2',
    classGroupId: 'grp-ss2-scia',
    classGroupName: 'SS 2 Science A',
    parentName: 'Alhaji Danladi Bello',
    parentEmail: 'd.bello@gmail.com',
    parentPhone: '+234 803 222 1199',
    term: 'Term 3',
    academicSession: '2025/2026',
    issueDate: '2026-04-15',
    dueDate: '2026-05-15',
    lineItems: [
      { feeItemId: 'fee-tui-ss', name: 'Senior Secondary Tuition & Instructional Fee', category: 'tuition', amount: 95000, discountAmount: 10000, netAmount: 85000 },
      { feeItemId: 'fee-stem-lab', name: 'Science, Robotics & Practical Lab Levy', category: 'science_lab', amount: 25000, discountAmount: 0, netAmount: 25000 },
      { feeItemId: 'fee-ict-lms', name: 'ICT, CBT Testing & CurriculumFlow LMS Levy', category: 'ict_lms', amount: 15000, discountAmount: 0, netAmount: 15000 },
      { feeItemId: 'fee-dev-levy', name: 'Infrastructure & Facility Development Levy', category: 'development_levy', amount: 20000, discountAmount: 0, netAmount: 20000 },
      { feeItemId: 'fee-pta-levy', name: 'Parent-Teacher Association (PTA) Levy', category: 'pta', amount: 10000, discountAmount: 0, netAmount: 10000 },
      { feeItemId: 'fee-med-ins', name: 'Medical Clinic & Health Insurance', category: 'medical_insurance', amount: 8000, discountAmount: 0, netAmount: 8000 }
    ],
    totalAmount: 173000,
    totalDiscount: 10000,
    amountPaid: 163000,
    balanceDue: 0,
    status: 'paid',
    qrCodeHash: 'CF-INV-2026-T3-002-AUTH-8891-CLEARED',
    notes: '₦10,000 Academic Excellence Merit Scholarship applied. Paid in full via OPay Wallet.',
    createdAt: '2026-04-15T08:00:00.000Z'
  },
  {
    id: 'inv-ss2-003',
    invoiceNumber: 'INV-2026-T3-003',
    studentId: 'std-ss2-03',
    studentName: 'Ngozi Adeleke',
    admissionNumber: 'CF/2024/SS2/003',
    classGrade: 'SS 2',
    classGroupId: 'grp-ss2-scia',
    classGroupName: 'SS 2 Science A',
    parentName: 'Engr. T. Adeleke',
    parentEmail: 't.adeleke@adeleke-eng.com',
    parentPhone: '+234 802 888 7766',
    term: 'Term 3',
    academicSession: '2025/2026',
    issueDate: '2026-04-15',
    dueDate: '2026-05-15',
    lineItems: [
      { feeItemId: 'fee-tui-ss', name: 'Senior Secondary Tuition & Instructional Fee', category: 'tuition', amount: 95000, discountAmount: 0, netAmount: 95000 },
      { feeItemId: 'fee-stem-lab', name: 'Science, Robotics & Practical Lab Levy', category: 'science_lab', amount: 25000, discountAmount: 0, netAmount: 25000 },
      { feeItemId: 'fee-ict-lms', name: 'ICT, CBT Testing & CurriculumFlow LMS Levy', category: 'ict_lms', amount: 15000, discountAmount: 0, netAmount: 15000 },
      { feeItemId: 'fee-dev-levy', name: 'Infrastructure & Facility Development Levy', category: 'development_levy', amount: 20000, discountAmount: 0, netAmount: 20000 },
      { feeItemId: 'fee-pta-levy', name: 'Parent-Teacher Association (PTA) Levy', category: 'pta', amount: 10000, discountAmount: 0, netAmount: 10000 },
      { feeItemId: 'fee-med-ins', name: 'Medical Clinic & Health Insurance', category: 'medical_insurance', amount: 8000, discountAmount: 0, netAmount: 8000 },
      { feeItemId: 'fee-bus-transport', name: 'School Bus Transit Route (Round-Trip Route A)', category: 'transport', amount: 45000, discountAmount: 0, netAmount: 45000 }
    ],
    totalAmount: 218000,
    totalDiscount: 0,
    amountPaid: 150000,
    balanceDue: 68000,
    status: 'partially_paid',
    qrCodeHash: 'CF-INV-2026-T3-003-AUTH-1092-PARTIAL',
    notes: 'Part payment of ₦150,000 received via Direct Bank Transfer. Outstanding balance: ₦68,000.',
    createdAt: '2026-04-15T08:00:00.000Z'
  },
  {
    id: 'inv-ss2-004',
    invoiceNumber: 'INV-2026-T3-004',
    studentId: 'std-ss2-04',
    studentName: 'Tunde Bakare',
    admissionNumber: 'CF/2024/SS2/004',
    classGrade: 'SS 2',
    classGroupId: 'grp-ss2-scia',
    classGroupName: 'SS 2 Science A',
    parentName: 'Mrs. Yewande Bakare',
    parentEmail: 'y.bakare@lagoslaw.ng',
    parentPhone: '+234 805 123 4567',
    term: 'Term 3',
    academicSession: '2025/2026',
    issueDate: '2026-04-15',
    dueDate: '2026-05-15',
    lineItems: [
      { feeItemId: 'fee-tui-ss', name: 'Senior Secondary Tuition & Instructional Fee', category: 'tuition', amount: 95000, discountAmount: 0, netAmount: 95000 },
      { feeItemId: 'fee-stem-lab', name: 'Science, Robotics & Practical Lab Levy', category: 'science_lab', amount: 25000, discountAmount: 0, netAmount: 25000 },
      { feeItemId: 'fee-ict-lms', name: 'ICT, CBT Testing & CurriculumFlow LMS Levy', category: 'ict_lms', amount: 15000, discountAmount: 0, netAmount: 15000 },
      { feeItemId: 'fee-dev-levy', name: 'Infrastructure & Facility Development Levy', category: 'development_levy', amount: 20000, discountAmount: 0, netAmount: 20000 },
      { feeItemId: 'fee-pta-levy', name: 'Parent-Teacher Association (PTA) Levy', category: 'pta', amount: 10000, discountAmount: 0, netAmount: 10000 },
      { feeItemId: 'fee-med-ins', name: 'Medical Clinic & Health Insurance', category: 'medical_insurance', amount: 8000, discountAmount: 0, netAmount: 8000 }
    ],
    totalAmount: 173000,
    totalDiscount: 0,
    amountPaid: 0,
    balanceDue: 173000,
    status: 'unpaid',
    qrCodeHash: 'CF-INV-2026-T3-004-AUTH-9902-UNPAID',
    notes: 'Invoice dispatched to parent portal & SMS notice transmitted.',
    createdAt: '2026-04-15T08:00:00.000Z'
  },
  {
    id: 'inv-jss2-001',
    invoiceNumber: 'INV-2026-T3-005',
    studentId: 'std-jss2-01',
    studentName: 'Fatima Mohammed',
    admissionNumber: 'CF/2024/JSS2/001',
    classGrade: 'JSS 2',
    classGroupId: 'grp-jss2-a',
    classGroupName: 'JSS 2 Diamond',
    parentName: 'Dr. Usman Mohammed',
    parentEmail: 'u.mohammed@abu.edu.ng',
    parentPhone: '+234 809 333 4411',
    term: 'Term 3',
    academicSession: '2025/2026',
    issueDate: '2026-04-15',
    dueDate: '2026-05-15',
    lineItems: [
      { feeItemId: 'fee-tui-jss', name: 'Junior Secondary Tuition & Instructional Fee', category: 'tuition', amount: 75000, discountAmount: 0, netAmount: 75000 },
      { feeItemId: 'fee-stem-lab', name: 'Science, Robotics & Practical Lab Levy', category: 'science_lab', amount: 25000, discountAmount: 0, netAmount: 25000 },
      { feeItemId: 'fee-ict-lms', name: 'ICT, CBT Testing & CurriculumFlow LMS Levy', category: 'ict_lms', amount: 15000, discountAmount: 0, netAmount: 15000 },
      { feeItemId: 'fee-dev-levy', name: 'Infrastructure & Facility Development Levy', category: 'development_levy', amount: 20000, discountAmount: 0, netAmount: 20000 },
      { feeItemId: 'fee-pta-levy', name: 'Parent-Teacher Association (PTA) Levy', category: 'pta', amount: 10000, discountAmount: 0, netAmount: 10000 },
      { feeItemId: 'fee-med-ins', name: 'Medical Clinic & Health Insurance', category: 'medical_insurance', amount: 8000, discountAmount: 0, netAmount: 8000 }
    ],
    totalAmount: 153000,
    totalDiscount: 0,
    amountPaid: 153000,
    balanceDue: 0,
    status: 'paid',
    qrCodeHash: 'CF-INV-2026-T3-005-AUTH-3321-CLEARED',
    notes: 'Paid in full via Paystack card payment. Cleared for term exams.',
    createdAt: '2026-04-15T08:00:00.000Z'
  },
  {
    id: 'inv-jss2-002',
    invoiceNumber: 'INV-2026-T3-006',
    studentId: 'std-jss2-02',
    studentName: 'Chukwuma Obi',
    admissionNumber: 'CF/2024/JSS2/002',
    classGrade: 'JSS 2',
    classGroupId: 'grp-jss2-a',
    classGroupName: 'JSS 2 Diamond',
    parentName: 'Mr. Kenneth Obi',
    parentEmail: 'k.obi@obigroup.com',
    parentPhone: '+234 803 777 8899',
    term: 'Term 3',
    academicSession: '2025/2026',
    issueDate: '2026-04-15',
    dueDate: '2026-05-15',
    lineItems: [
      { feeItemId: 'fee-tui-jss', name: 'Junior Secondary Tuition & Instructional Fee', category: 'tuition', amount: 75000, discountAmount: 0, netAmount: 75000 },
      { feeItemId: 'fee-stem-lab', name: 'Science, Robotics & Practical Lab Levy', category: 'science_lab', amount: 25000, discountAmount: 0, netAmount: 25000 },
      { feeItemId: 'fee-ict-lms', name: 'ICT, CBT Testing & CurriculumFlow LMS Levy', category: 'ict_lms', amount: 15000, discountAmount: 0, netAmount: 15000 },
      { feeItemId: 'fee-dev-levy', name: 'Infrastructure & Facility Development Levy', category: 'development_levy', amount: 20000, discountAmount: 0, netAmount: 20000 },
      { feeItemId: 'fee-pta-levy', name: 'Parent-Teacher Association (PTA) Levy', category: 'pta', amount: 10000, discountAmount: 0, netAmount: 10000 },
      { feeItemId: 'fee-med-ins', name: 'Medical Clinic & Health Insurance', category: 'medical_insurance', amount: 8000, discountAmount: 0, netAmount: 8000 }
    ],
    totalAmount: 153000,
    totalDiscount: 0,
    amountPaid: 80000,
    balanceDue: 73000,
    status: 'partially_paid',
    qrCodeHash: 'CF-INV-2026-T3-006-AUTH-5541-PARTIAL',
    notes: 'First installment ₦80,000 paid via OPay Virtual Transfer.',
    createdAt: '2026-04-15T08:00:00.000Z'
  }
];

// -----------------------------------------------------------------
// 3. INITIAL PAYMENT TRANSACTIONS
// -----------------------------------------------------------------
export const INITIAL_PAYMENT_TRANSACTIONS: PaymentTransaction[] = [
  {
    id: 'tx-2026-001',
    receiptNumber: 'REC-2026-T3-0041',
    transactionReference: 'PSTK_CF_2026_987412',
    invoiceId: 'inv-ss2-001',
    invoiceNumber: 'INV-2026-T3-001',
    studentId: 'std-ss2-01',
    studentName: 'Chinedu Eze',
    admissionNumber: 'CF/2024/SS2/001',
    classGrade: 'SS 2',
    amountPaid: 173000,
    gatewayFee: 2595, // 1.5% capped at N2000 or custom rate
    netAmount: 170405,
    paymentChannel: 'paystack',
    channelDetails: {
      cardLast4: '4242',
      cardBrand: 'Mastercard',
      pspReference: 'pstk_chg_982348911',
      senderAccountName: 'Chief O. Eze'
    },
    paymentDate: '2026-04-18T10:14:22.000Z',
    status: 'successful',
    verifiedBy: 'System Webhook (Paystack Gateway)',
    verifiedAt: '2026-04-18T10:14:25.000Z',
    notes: 'Automated instant payment webhook confirmation.'
  },
  {
    id: 'tx-2026-002',
    receiptNumber: 'REC-2026-T3-0042',
    transactionReference: 'OPAY_TX_89234102',
    invoiceId: 'inv-ss2-002',
    invoiceNumber: 'INV-2026-T3-002',
    studentId: 'std-ss2-02',
    studentName: 'Amina Bello',
    admissionNumber: 'CF/2024/SS2/002',
    classGrade: 'SS 2',
    amountPaid: 163000,
    gatewayFee: 815, // OPay preferential merchant rate 0.5%
    netAmount: 162185,
    paymentChannel: 'opay',
    channelDetails: {
      virtualAccountNumber: '9920240002',
      pspReference: 'OPAY_COLL_998124',
      senderAccountName: 'Alhaji Danladi Bello'
    },
    paymentDate: '2026-04-20T14:32:10.000Z',
    status: 'successful',
    verifiedBy: 'System Webhook (OPay Business)',
    verifiedAt: '2026-04-20T14:32:12.000Z',
    notes: 'OPay direct merchant collection confirmed.'
  },
  {
    id: 'tx-2026-003',
    receiptNumber: 'REC-2026-T3-0043',
    transactionReference: 'BNK_TRF_ZENITH_881920',
    invoiceId: 'inv-ss2-003',
    invoiceNumber: 'INV-2026-T3-003',
    studentId: 'std-ss2-03',
    studentName: 'Ngozi Adeleke',
    admissionNumber: 'CF/2024/SS2/003',
    classGrade: 'SS 2',
    amountPaid: 150000,
    gatewayFee: 0,
    netAmount: 150000,
    paymentChannel: 'bank_transfer',
    channelDetails: {
      bankName: 'Zenith Bank PLC',
      senderAccountName: 'Adeleke Engineering Ltd',
      senderAccountNumber: '1012398471',
      tellerNumber: 'NIP/ZEN/20260421/00918',
      proofOfPaymentUrl: 'https://storage.curriculumflow.edu.ng/proofs/tel-9912.pdf'
    },
    paymentDate: '2026-04-21T09:45:00.000Z',
    status: 'successful',
    verifiedBy: 'Chief O. Eze (Bursar)',
    verifiedAt: '2026-04-21T11:20:00.000Z',
    notes: 'Direct bank transfer teller matched with Zenith Bank statement.'
  },
  {
    id: 'tx-2026-004',
    receiptNumber: 'REC-2026-T3-0044',
    transactionReference: 'PSTK_CF_2026_110943',
    invoiceId: 'inv-jss2-001',
    invoiceNumber: 'INV-2026-T3-005',
    studentId: 'std-jss2-01',
    studentName: 'Fatima Mohammed',
    admissionNumber: 'CF/2024/JSS2/001',
    classGrade: 'JSS 2',
    amountPaid: 153000,
    gatewayFee: 2295,
    netAmount: 150705,
    paymentChannel: 'paystack',
    channelDetails: {
      cardLast4: '1182',
      cardBrand: 'Visa',
      pspReference: 'pstk_chg_77192834',
      senderAccountName: 'Dr. Usman Mohammed'
    },
    paymentDate: '2026-04-22T16:05:40.000Z',
    status: 'successful',
    verifiedBy: 'System Webhook (Paystack Gateway)',
    verifiedAt: '2026-04-22T16:05:42.000Z',
    notes: 'Paystack online card checkout.'
  },
  {
    id: 'tx-2026-005',
    receiptNumber: 'REC-2026-T3-0045',
    transactionReference: 'OPAY_TX_77391024',
    invoiceId: 'inv-jss2-002',
    invoiceNumber: 'INV-2026-T3-006',
    studentId: 'std-jss2-02',
    studentName: 'Chukwuma Obi',
    admissionNumber: 'CF/2024/JSS2/002',
    classGrade: 'JSS 2',
    amountPaid: 80000,
    gatewayFee: 400,
    netAmount: 79600,
    paymentChannel: 'opay',
    channelDetails: {
      virtualAccountNumber: '9920240006',
      pspReference: 'OPAY_COLL_112938',
      senderAccountName: 'Kenneth Obi'
    },
    paymentDate: '2026-04-23T11:15:20.000Z',
    status: 'successful',
    verifiedBy: 'System Webhook (OPay Business)',
    verifiedAt: '2026-04-23T11:15:22.000Z',
    notes: 'First installment via OPay instant virtual NUBAN transfer.'
  }
];

// -----------------------------------------------------------------
// 4. INITIAL OFFICIAL RECEIPTS
// -----------------------------------------------------------------
export const INITIAL_OFFICIAL_RECEIPTS: OfficialReceipt[] = [
  {
    id: 'rec-001',
    receiptNumber: 'REC-2026-T3-0041',
    transactionId: 'tx-2026-001',
    transactionReference: 'PSTK_CF_2026_987412',
    invoiceId: 'inv-ss2-001',
    invoiceNumber: 'INV-2026-T3-001',
    studentId: 'std-ss2-01',
    studentName: 'Chinedu Eze',
    admissionNumber: 'CF/2024/SS2/001',
    classGrade: 'SS 2',
    parentName: 'Chief O. Eze',
    parentPhone: '+234 807 444 5566',
    parentEmail: 'bursar@curriculumflow.edu.ng',
    amountInFigures: 173000,
    amountInWords: 'One Hundred and Seventy-Three Thousand Naira Only',
    paymentChannel: 'paystack',
    paymentDate: '2026-04-18T10:14:22.000Z',
    totalInvoiceAmount: 173000,
    amountPaidThisTransaction: 173000,
    totalCumulativePaid: 173000,
    balanceRemaining: 0,
    authorizedBursarName: 'Chief O. Eze (Bursar & Financial Controller)',
    qrVerificationCode: 'CF-REC-2026-T3-0041-SEC-9841-VERIFIED',
    generatedAt: '2026-04-18T10:14:25.000Z'
  },
  {
    id: 'rec-002',
    receiptNumber: 'REC-2026-T3-0042',
    transactionId: 'tx-2026-002',
    transactionReference: 'OPAY_TX_89234102',
    invoiceId: 'inv-ss2-002',
    invoiceNumber: 'INV-2026-T3-002',
    studentId: 'std-ss2-02',
    studentName: 'Amina Bello',
    admissionNumber: 'CF/2024/SS2/002',
    classGrade: 'SS 2',
    parentName: 'Alhaji Danladi Bello',
    parentPhone: '+234 803 222 1199',
    parentEmail: 'd.bello@gmail.com',
    amountInFigures: 163000,
    amountInWords: 'One Hundred and Sixty-Three Thousand Naira Only',
    paymentChannel: 'opay',
    paymentDate: '2026-04-20T14:32:10.000Z',
    totalInvoiceAmount: 163000,
    amountPaidThisTransaction: 163000,
    totalCumulativePaid: 163000,
    balanceRemaining: 0,
    authorizedBursarName: 'Chief O. Eze (Bursar & Financial Controller)',
    qrVerificationCode: 'CF-REC-2026-T3-0042-SEC-1192-VERIFIED',
    generatedAt: '2026-04-20T14:32:12.000Z'
  },
  {
    id: 'rec-003',
    receiptNumber: 'REC-2026-T3-0043',
    transactionId: 'tx-2026-003',
    transactionReference: 'BNK_TRF_ZENITH_881920',
    invoiceId: 'inv-ss2-003',
    invoiceNumber: 'INV-2026-T3-003',
    studentId: 'std-ss2-03',
    studentName: 'Ngozi Adeleke',
    admissionNumber: 'CF/2024/SS2/003',
    classGrade: 'SS 2',
    parentName: 'Engr. T. Adeleke',
    parentPhone: '+234 802 888 7766',
    parentEmail: 't.adeleke@adeleke-eng.com',
    amountInFigures: 150000,
    amountInWords: 'One Hundred and Fifty Thousand Naira Only',
    paymentChannel: 'bank_transfer',
    paymentDate: '2026-04-21T09:45:00.000Z',
    totalInvoiceAmount: 218000,
    amountPaidThisTransaction: 150000,
    totalCumulativePaid: 150000,
    balanceRemaining: 68000,
    authorizedBursarName: 'Chief O. Eze (Bursar & Financial Controller)',
    qrVerificationCode: 'CF-REC-2026-T3-0043-SEC-7761-VERIFIED',
    generatedAt: '2026-04-21T11:20:00.000Z'
  }
];

// -----------------------------------------------------------------
// 5. INITIAL RECONCILIATION AUDIT RECORDS
// -----------------------------------------------------------------
export const INITIAL_RECONCILIATION_RECORDS: ReconciliationRecord[] = [
  {
    id: 'rec-rec-001',
    settlementBatchId: 'PSTK-SETTLE-2026-0419',
    date: '2026-04-19',
    channel: 'paystack',
    externalTransactionRef: 'PSTK_CF_2026_987412',
    studentId: 'std-ss2-01',
    studentName: 'Chinedu Eze',
    admissionNumber: 'CF/2024/SS2/001',
    invoiceId: 'inv-ss2-001',
    invoiceNumber: 'INV-2026-T3-001',
    grossAmount: 173000,
    processingFee: 2595,
    netSettlementAmount: 170405,
    status: 'auto_matched',
    bankSettlementRef: 'CBN-NIP-PSTK-00192847',
    notes: 'Settled to Zenith Bank Main Account 1019982341 (CurriculumFlow Academy).'
  },
  {
    id: 'rec-rec-002',
    settlementBatchId: 'OPAY-SETTLE-2026-0421',
    date: '2026-04-21',
    channel: 'opay',
    externalTransactionRef: 'OPAY_TX_89234102',
    studentId: 'std-ss2-02',
    studentName: 'Amina Bello',
    admissionNumber: 'CF/2024/SS2/002',
    invoiceId: 'inv-ss2-002',
    invoiceNumber: 'INV-2026-T3-002',
    grossAmount: 163000,
    processingFee: 815,
    netSettlementAmount: 162185,
    status: 'auto_matched',
    bankSettlementRef: 'CBN-NIP-OPAY-88231945',
    notes: 'OPay merchant daily sweeping completed successfully.'
  },
  {
    id: 'rec-rec-003',
    settlementBatchId: 'ZENITH-NIP-2026-0421',
    date: '2026-04-21',
    channel: 'bank_transfer',
    externalTransactionRef: 'BNK_TRF_ZENITH_881920',
    studentId: 'std-ss2-03',
    studentName: 'Ngozi Adeleke',
    admissionNumber: 'CF/2024/SS2/003',
    invoiceId: 'inv-ss2-003',
    invoiceNumber: 'INV-2026-T3-003',
    grossAmount: 150000,
    processingFee: 0,
    netSettlementAmount: 150000,
    status: 'manual_matched',
    bankSettlementRef: 'ZENITH-STMT-LN-9821',
    notes: 'Verified by Bursar against Zenith corporate internet banking bank statement.'
  },
  {
    id: 'rec-rec-004',
    settlementBatchId: 'UNALLOCATED-BATCH-2026-0424',
    date: '2026-04-24',
    channel: 'bank_transfer',
    externalTransactionRef: 'NIP/ACCESS/TRF/0091823',
    grossAmount: 173000,
    processingFee: 0,
    netSettlementAmount: 173000,
    status: 'unallocated_deposit',
    bankSettlementRef: 'ZENITH-STMT-LN-9904',
    notes: 'Direct NIP deposit from "K. A. ALABI - SCH FEES" with missing admission number. Awaiting bursar allocation to student ledger.'
  }
];

// -----------------------------------------------------------------
// 6. INITIAL PAYMENT CONFIRMATION NOTIFICATIONS
// -----------------------------------------------------------------
export const INITIAL_PAYMENT_NOTIFICATIONS: PaymentNotification[] = [
  {
    id: 'notif-001',
    type: 'sms',
    recipient: '+234 807 444 5566',
    recipientName: 'Chief O. Eze',
    studentName: 'Chinedu Eze (SS 2)',
    title: 'Payment Received & Confirmed',
    message: 'Dear Chief Eze, payment of ₦173,000 for Chinedu Eze (SS2A) via Paystack is confirmed. Receipt #REC-2026-T3-0041. Term 3 Balance: ₦0.00 (Fully Cleared). Thank you.',
    timestamp: '2026-04-18T10:14:26.000Z',
    status: 'delivered',
    relatedReceiptNumber: 'REC-2026-T3-0041',
    relatedInvoiceNumber: 'INV-2026-T3-001'
  },
  {
    id: 'notif-002',
    type: 'email',
    recipient: 'bursar@curriculumflow.edu.ng',
    recipientName: 'Chief O. Eze',
    studentName: 'Chinedu Eze (SS 2)',
    title: 'Official School Receipt & Term 3 Clearance - Chinedu Eze',
    message: 'Your official digital payment receipt (#REC-2026-T3-0041) is attached. Chinedu Eze has been granted 100% academic examination and broadsheet clearance.',
    timestamp: '2026-04-18T10:14:27.000Z',
    status: 'delivered',
    relatedReceiptNumber: 'REC-2026-T3-0041',
    relatedInvoiceNumber: 'INV-2026-T3-001'
  },
  {
    id: 'notif-003',
    type: 'sms',
    recipient: '+234 803 222 1199',
    recipientName: 'Alhaji Danladi Bello',
    studentName: 'Amina Bello (SS 2)',
    title: 'Payment Received & Confirmed',
    message: 'Dear Alhaji Bello, payment of ₦163,000 for Amina Bello (SS2A) via OPay is confirmed. Receipt #REC-2026-T3-0042. Term 3 Balance: ₦0.00. Thank you.',
    timestamp: '2026-04-20T14:32:15.000Z',
    status: 'delivered',
    relatedReceiptNumber: 'REC-2026-T3-0042',
    relatedInvoiceNumber: 'INV-2026-T3-002'
  },
  {
    id: 'notif-004',
    type: 'sms',
    recipient: '+234 802 888 7766',
    recipientName: 'Engr. T. Adeleke',
    studentName: 'Ngozi Adeleke (SS 2)',
    title: 'Part Payment Confirmed (Bank Transfer)',
    message: 'Dear Engr. Adeleke, part payment of ₦150,000 for Ngozi Adeleke (SS2A) has been verified. Receipt #REC-2026-T3-0043. Outstanding Balance: ₦68,000. Thank you.',
    timestamp: '2026-04-21T11:20:05.000Z',
    status: 'delivered',
    relatedReceiptNumber: 'REC-2026-T3-0043',
    relatedInvoiceNumber: 'INV-2026-T3-003'
  }
];

// -----------------------------------------------------------------
// 7. PRINCIPAL'S INSTALLMENT PAYMENT POLICY & AGREEMENTS
// -----------------------------------------------------------------
export const DEFAULT_INSTALLMENT_POLICY: InstallmentPolicy = {
  id: 'pol-inst-2026-t3',
  policyTitle: 'CurriculumFlow Standard 3-Tranche Fee Installment & Clearance Policy',
  academicSession: '2025/2026',
  term: 'Term 3',
  isActive: true,
  allowInstallmentPayments: true,
  presetType: '3_tranche_standard',
  minimumInitialDepositPercent: 50,
  gracePeriodDays: 7,
  latePenaltyRatePercent: 5,
  enableLatePenalties: true,
  enableAutomaticClearanceGates: true,
  midtermClearanceMinimumPercent: 80,
  finalExamClearanceMinimumPercent: 100,
  hardshipDiscretionAllowed: true,
  autoRemindersEnabled: true,
  reminderDaysBeforeDue: [7, 3, 0],
  tranches: [
    {
      id: 'tranche-1',
      trancheNumber: 1,
      name: 'Tranche 1: Resumption & Class Admission',
      shortCode: 'T1 (Resumption)',
      percentage: 50,
      deadlineWeek: 'Week 1 (Resumption)',
      dueDate: '2026-05-08',
      academicClearanceScope: 'Classroom Physical Access, Student ID Card, LMS Account & Textbooks Release',
      isCompulsoryForAdmission: true,
      latePenaltySurchargePercent: 0,
      description: 'Mandatory 50% deposit required prior to student resumption or entry into boarding/classroom facilities.'
    },
    {
      id: 'tranche-2',
      trancheNumber: 2,
      name: 'Tranche 2: Mid-Term Examination & CBT Docket Clearance',
      shortCode: 'T2 (Mid-Term)',
      percentage: 30,
      deadlineWeek: 'Week 6 (Mid-Term Assessment)',
      dueDate: '2026-06-12',
      academicClearanceScope: 'Continuous Assessment Tests, CBT Laboratory Access & Mid-term Progress Slip',
      isCompulsoryForAdmission: false,
      latePenaltySurchargePercent: 5,
      description: 'Brings total cumulative payment to 80%. Required for student examination docket clearance during Mid-Term CA tests.'
    },
    {
      id: 'tranche-3',
      trancheNumber: 3,
      name: 'Tranche 3: Revision & Final Terminal Examination Clearance',
      shortCode: 'T3 (Terminal Exams)',
      percentage: 20,
      deadlineWeek: 'Week 10 (Revision Week)',
      dueDate: '2026-07-10',
      academicClearanceScope: 'Final Terminal Examination, WAEC/NECO Practical Workshops & Broadsheet Result Release',
      isCompulsoryForAdmission: false,
      latePenaltySurchargePercent: 5,
      description: 'Final 20% tranche bringing account to 100% full liquidation. Required for terminal exam entry and report card publication.'
    }
  ],
  principalApproval: {
    principalName: 'Dr. (Mrs.) Folashade Adeleke, Ph.D',
    principalId: 'usr-principal-01',
    approvedAt: '2026-04-10T09:30:00.000Z',
    approvalStamp: 'CURRICULUMFLOW-EXCO-AUTH-2026/04/INST',
    digitalSignatureHash: 'SHA256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    remarks: 'Approved in Council. Bursary department is empowered to enforce automated biometric & LMS clearance gates in accordance with this 50-30-20 framework. Hardship petitions must be routed through the Principal\'s Office.'
  },
  policyGuidelines: `1. APPLICABILITY: This installment payment framework applies to all enrolled students for the 2025/2026 Academic Session across JSS 1 through SS 3.
2. MINIMUM RESUMPTION THRESHOLD: No student shall be admitted into boarding houses, classrooms, or practical STEM workshops without a minimum verified first tranche payment of 50% or an approved Principal's Hardship Concession.
3. MID-TERM CBT CLEARANCE: By Week 6, cumulative payments must reach 80% (Tranche 1 + Tranche 2). Students with unpaid Tranche 2 shall receive provisional access warnings and automated SMS reminders to parents.
4. FINAL EXAMINATION PASS: Final 20% balance must be liquidated by Week 10 (Revision Week). Students with outstanding balances will have official terminal report cards and WAEC/NECO practical passes withheld.
5. LATE PAYMENT SURCHARGE: Payments defaulted past the 7-day grace period post-deadline may attract a 5% administrative surcharge unless explicitly waived by the Principal in writing.
6. HARDSHIP & STAFF DISCRETION: Parents facing documented financial exigencies may apply for a modified custom installment agreement subject to direct Principal review and approval.`,
  auditTrail: [
    {
      id: 'audit-001',
      timestamp: '2026-04-10T09:30:00.000Z',
      modifiedBy: 'Dr. (Mrs.) Folashade Adeleke, Ph.D',
      modifierRole: 'principal',
      changeSummary: 'Established Term 3 3-Tranche Installment Policy (50% - 30% - 20%) with automated CBT/Exam clearance gates.',
      signatureHash: 'SHA256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069'
    },
    {
      id: 'audit-002',
      timestamp: '2026-04-15T14:10:00.000Z',
      modifiedBy: 'Dr. (Mrs.) Folashade Adeleke, Ph.D',
      modifierRole: 'principal',
      changeSummary: 'Extended Grace Period from 5 days to 7 days for economic flexibility; enabled automated multi-channel parent reminders.',
      signatureHash: 'SHA256:88a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcde'
    }
  ]
};

export const PRESET_TRANCHE_TEMPLATES: Record<InstallmentPresetType, { name: string; description: string; minDeposit: number; tranches: Omit<InstallmentTranche, 'id'>[] }> = {
  '3_tranche_standard': {
    name: 'Standard 3-Tranche (50% - 30% - 20%)',
    description: 'Recommended institutional standard. 50% on Resumption, 30% before Mid-Term Tests, 20% before Final Exams.',
    minDeposit: 50,
    tranches: [
      {
        trancheNumber: 1,
        name: 'Tranche 1: Resumption & Orientation',
        shortCode: 'T1 (Resumption)',
        percentage: 50,
        deadlineWeek: 'Week 1 (Resumption)',
        dueDate: '2026-05-08',
        academicClearanceScope: 'Classroom Physical Access, Student ID Card, LMS Account & Textbooks Release',
        isCompulsoryForAdmission: true,
        latePenaltySurchargePercent: 0,
        description: 'Mandatory 50% deposit for student resumption and class register placement.'
      },
      {
        trancheNumber: 2,
        name: 'Tranche 2: Mid-Term Examination Clearance',
        shortCode: 'T2 (Mid-Term)',
        percentage: 30,
        deadlineWeek: 'Week 6 (Mid-Term Assessment)',
        dueDate: '2026-06-12',
        academicClearanceScope: 'Continuous Assessment Tests, CBT Laboratory Access & Mid-term Progress Slip',
        isCompulsoryForAdmission: false,
        latePenaltySurchargePercent: 5,
        description: 'Brings cumulative payment to 80%. Required for Mid-Term exam docket clearance.'
      },
      {
        trancheNumber: 3,
        name: 'Tranche 3: Revision & Final Terminal Exams',
        shortCode: 'T3 (Terminal Exams)',
        percentage: 20,
        deadlineWeek: 'Week 10 (Revision Week)',
        dueDate: '2026-07-10',
        academicClearanceScope: 'Final Terminal Examination, WAEC/NECO Practical Workshops & Broadsheet Result Release',
        isCompulsoryForAdmission: false,
        latePenaltySurchargePercent: 5,
        description: 'Final 20% tranche bringing account to 100% full liquidation.'
      }
    ]
  },
  '2_tranche_60_40': {
    name: '2-Tranche Front-Weighted (60% - 40%)',
    description: 'Two substantial tranches. 60% on Resumption, 40% before Mid-Term week.',
    minDeposit: 60,
    tranches: [
      {
        trancheNumber: 1,
        name: 'Tranche 1: Resumption & Operational Allocation',
        shortCode: 'T1 (Resumption)',
        percentage: 60,
        deadlineWeek: 'Week 1 (Resumption)',
        dueDate: '2026-05-08',
        academicClearanceScope: 'Class Admission, Uniforms, LMS Access, Science Labs',
        isCompulsoryForAdmission: true,
        latePenaltySurchargePercent: 0,
        description: '60% initial deposit required at start of academic term.'
      },
      {
        trancheNumber: 2,
        name: 'Tranche 2: Term Liquidation & Exam Clearance',
        shortCode: 'T2 (Term Completion)',
        percentage: 40,
        deadlineWeek: 'Week 7 (Post Mid-Term)',
        dueDate: '2026-06-19',
        academicClearanceScope: 'All Terminal Examinations, Practical Lab Assessments & Broadsheets',
        isCompulsoryForAdmission: false,
        latePenaltySurchargePercent: 5,
        description: 'Final 40% payment completing full session obligations.'
      }
    ]
  },
  '2_tranche_50_50': {
    name: 'Equal Bi-Tranche Split (50% - 50%)',
    description: 'Equal two-part split. 50% at Resumption, 50% at Mid-Term.',
    minDeposit: 50,
    tranches: [
      {
        trancheNumber: 1,
        name: 'First Half (50%): Term Resumption',
        shortCode: 'T1 (1st Half)',
        percentage: 50,
        deadlineWeek: 'Week 1 (Resumption)',
        dueDate: '2026-05-08',
        academicClearanceScope: 'Class Admission, First Half Instructional Materials',
        isCompulsoryForAdmission: true,
        latePenaltySurchargePercent: 0,
        description: 'First half payment for school resumption.'
      },
      {
        trancheNumber: 2,
        name: 'Second Half (50%): Mid-Term & Final',
        shortCode: 'T2 (2nd Half)',
        percentage: 50,
        deadlineWeek: 'Week 6 (Mid-Term Assessment)',
        dueDate: '2026-06-12',
        academicClearanceScope: 'All Continuous Assessments, Exams & Term Results',
        isCompulsoryForAdmission: false,
        latePenaltySurchargePercent: 5,
        description: 'Second half payment for exam docket and academic clearance.'
      }
    ]
  },
  '4_tranche_flexi': {
    name: 'Flexi-Parent 4-Tranche (40% - 20% - 20% - 20%)',
    description: 'Monthly installment structure designed for families requiring frequent smaller installments.',
    minDeposit: 40,
    tranches: [
      {
        trancheNumber: 1,
        name: 'Installment 1: Resumption & Registration',
        shortCode: 'T1 (Month 1)',
        percentage: 40,
        deadlineWeek: 'Week 1 (Resumption)',
        dueDate: '2026-05-08',
        academicClearanceScope: 'Class Admission & LMS Access',
        isCompulsoryForAdmission: true,
        latePenaltySurchargePercent: 0,
        description: 'Initial deposit for term resumption.'
      },
      {
        trancheNumber: 2,
        name: 'Installment 2: Early Term Milestone',
        shortCode: 'T2 (Month 2)',
        percentage: 20,
        deadlineWeek: 'Week 4 (Continuous Assessment 1)',
        dueDate: '2026-05-29',
        academicClearanceScope: 'CA 1 Examination & Practical Sessions',
        isCompulsoryForAdmission: false,
        latePenaltySurchargePercent: 3,
        description: 'Second installment reaching 60% cumulative.'
      },
      {
        trancheNumber: 3,
        name: 'Installment 3: Mid-Term Milestone',
        shortCode: 'T3 (Month 3)',
        percentage: 20,
        deadlineWeek: 'Week 7 (Mid-Term Assessment)',
        dueDate: '2026-06-19',
        academicClearanceScope: 'Mid-term Exams & Laboratory Practical Tests',
        isCompulsoryForAdmission: false,
        latePenaltySurchargePercent: 3,
        description: 'Third installment reaching 80% cumulative.'
      },
      {
        trancheNumber: 4,
        name: 'Installment 4: Terminal Clearance',
        shortCode: 'T4 (Month 4)',
        percentage: 20,
        deadlineWeek: 'Week 11 (Terminal Exams)',
        dueDate: '2026-07-17',
        academicClearanceScope: 'Final Exams, WAEC Practical Passes & Broadsheet',
        isCompulsoryForAdmission: false,
        latePenaltySurchargePercent: 5,
        description: 'Final installment completing 100% fees.'
      }
    ]
  },
  'custom': {
    name: 'Custom Tailored Policy',
    description: 'Custom defined tranches, custom percentages and flexible milestone dates.',
    minDeposit: 30,
    tranches: []
  }
};

export const INITIAL_STUDENT_AGREEMENTS: StudentInstallmentAgreement[] = [
  {
    id: 'agr-001',
    studentId: 'std-ss2-001',
    studentName: 'Chinedu Eze',
    admissionNumber: 'CF/2024/SS2/001',
    classGrade: 'SS 2',
    invoiceId: 'inv-2026-t3-001',
    invoiceNumber: 'INV-2026-T3-001',
    parentName: 'Chief O. Eze',
    parentPhone: '+234 803 111 2233',
    parentEmail: 'eze.family@nigeria.ng',
    totalInvoiceAmount: 173000,
    agreedPlanType: 'standard_policy',
    customTranches: [
      {
        trancheNumber: 1,
        name: 'Tranche 1: Resumption (50%)',
        amount: 86500,
        percentage: 50,
        dueDate: '2026-05-08',
        status: 'paid',
        paidAmount: 86500,
        paidDate: '2026-04-18',
        receiptNumber: 'REC-2026-T3-0041',
        clearanceMilestone: 'Class Admission & LMS'
      },
      {
        trancheNumber: 2,
        name: 'Tranche 2: Mid-Term (30%)',
        amount: 51900,
        percentage: 30,
        dueDate: '2026-06-12',
        status: 'paid',
        paidAmount: 51900,
        paidDate: '2026-04-18',
        receiptNumber: 'REC-2026-T3-0041',
        clearanceMilestone: 'Mid-Term CBT Docket'
      },
      {
        trancheNumber: 3,
        name: 'Tranche 3: Final Exams (20%)',
        amount: 34600,
        percentage: 20,
        dueDate: '2026-07-10',
        status: 'paid',
        paidAmount: 34600,
        paidDate: '2026-04-18',
        receiptNumber: 'REC-2026-T3-0041',
        clearanceMilestone: 'Terminal Exam & Broadsheet'
      }
    ],
    principalApprovalStatus: 'approved',
    approvedByPrincipalName: 'Dr. (Mrs.) Folashade Adeleke, Ph.D',
    approvedAt: '2026-04-18T10:15:00.000Z',
    specialNotes: 'Full payment cleared in single Paystack transaction at start of term. Complete 100% academic clearance granted.',
    createdAt: '2026-04-18T10:00:00.000Z'
  },
  {
    id: 'agr-002',
    studentId: 'std-ss2-003',
    studentName: 'Ngozi Adeleke',
    admissionNumber: 'CF/2024/SS2/003',
    classGrade: 'SS 2',
    invoiceId: 'inv-2026-t3-003',
    invoiceNumber: 'INV-2026-T3-003',
    parentName: 'Engr. Tunde Adeleke',
    parentPhone: '+234 802 888 7766',
    parentEmail: 'tunde.adeleke@oilgas.ng',
    totalInvoiceAmount: 218000,
    agreedPlanType: 'standard_policy',
    customTranches: [
      {
        trancheNumber: 1,
        name: 'Tranche 1: Resumption (50% = ₦109,000)',
        amount: 109000,
        percentage: 50,
        dueDate: '2026-05-08',
        status: 'paid',
        paidAmount: 109000,
        paidDate: '2026-04-21',
        receiptNumber: 'REC-2026-T3-0043',
        clearanceMilestone: 'Class Admission & LMS'
      },
      {
        trancheNumber: 2,
        name: 'Tranche 2: Mid-Term (30% = ₦65,400)',
        amount: 65400,
        percentage: 30,
        dueDate: '2026-06-12',
        status: 'paid',
        paidAmount: 41000,
        paidDate: '2026-04-21',
        receiptNumber: 'REC-2026-T3-0043',
        clearanceMilestone: 'Mid-Term CBT Docket (Partially Met - ₦24,400 balance on T2)'
      },
      {
        trancheNumber: 3,
        name: 'Tranche 3: Final Exams (20% = ₦43,600)',
        amount: 43600,
        percentage: 20,
        dueDate: '2026-07-10',
        status: 'due',
        paidAmount: 0,
        clearanceMilestone: 'Terminal Exam & Broadsheet'
      }
    ],
    principalApprovalStatus: 'approved',
    approvedByPrincipalName: 'Dr. (Mrs.) Folashade Adeleke, Ph.D',
    approvedAt: '2026-04-21T11:25:00.000Z',
    specialNotes: 'Parent paid ₦150,000 upfront (clearing Tranche 1 in full and partially crediting Tranche 2). Total balance outstanding: ₦68,000.',
    createdAt: '2026-04-21T11:00:00.000Z'
  },
  {
    id: 'agr-003',
    studentId: 'std-ss2-004',
    studentName: 'Ibrahim Yusuf',
    admissionNumber: 'CF/2024/SS2/004',
    classGrade: 'SS 2',
    invoiceId: 'inv-2026-t3-004',
    invoiceNumber: 'INV-2026-T3-004',
    parentName: 'Hajiya Fatima Yusuf',
    parentPhone: '+234 809 333 4455',
    parentEmail: 'fatima.yusuf@kdn.gov.ng',
    totalInvoiceAmount: 183000,
    agreedPlanType: 'custom_hardship_plan',
    customTranches: [
      {
        trancheNumber: 1,
        name: 'Tranche 1: Resumption Hardship Minimum (35%)',
        amount: 64050,
        percentage: 35,
        dueDate: '2026-05-15',
        status: 'due',
        paidAmount: 0,
        clearanceMilestone: 'Class Admission & LMS (Principal Discretion Granted)'
      },
      {
        trancheNumber: 2,
        name: 'Tranche 2: Mid-Term Milestone (35%)',
        amount: 64050,
        percentage: 35,
        dueDate: '2026-06-19',
        status: 'due',
        paidAmount: 0,
        clearanceMilestone: 'Mid-Term CBT Docket'
      },
      {
        trancheNumber: 3,
        name: 'Tranche 3: End of Term Milestone (30%)',
        amount: 54900,
        percentage: 30,
        dueDate: '2026-07-15',
        status: 'due',
        paidAmount: 0,
        clearanceMilestone: 'Terminal Exam & Broadsheet'
      }
    ],
    principalApprovalStatus: 'approved',
    approvedByPrincipalName: 'Dr. (Mrs.) Folashade Adeleke, Ph.D',
    approvedAt: '2026-04-22T08:45:00.000Z',
    specialNotes: 'Principal Special Hardship Concession: Resumption minimum deposit adjusted to 35% with 7-day payment extension. Full clearance subject to adherence.',
    createdAt: '2026-04-22T08:30:00.000Z'
  }
];

export function calculateInstallmentSplit(
  totalAmount: number,
  tranches: InstallmentTranche[]
): { tranche: InstallmentTranche; amount: number; percentage: number }[] {
  return tranches.map(t => ({
    tranche: t,
    percentage: t.percentage,
    amount: Math.round((totalAmount * t.percentage) / 100)
  }));
}

export function validatePolicyTranches(tranches: InstallmentTranche[]): { isValid: boolean; sumPercentage: number; error?: string } {
  const sum = tranches.reduce((acc, t) => acc + (Number(t.percentage) || 0), 0);
  if (Math.abs(sum - 100) > 0.01) {
    return {
      isValid: false,
      sumPercentage: sum,
      error: `Total tranche percentages must equal 100%. Current sum: ${sum}%`
    };
  }
  if (tranches.some(t => !t.name.trim() || t.percentage <= 0)) {
    return {
      isValid: false,
      sumPercentage: sum,
      error: 'Every tranche must have a valid name and a percentage greater than 0%.'
    };
  }
  return {
    isValid: true,
    sumPercentage: sum
  };
}

// -----------------------------------------------------------------
// 8. COMPILED STUDENT ACCOUNT SUMMARIES (LEDGER WITH INSTALLMENT STATUS)
// -----------------------------------------------------------------
export function compileStudentAccountSummaries(
  invoices: StudentInvoice[],
  transactions: PaymentTransaction[],
  policy: InstallmentPolicy = DEFAULT_INSTALLMENT_POLICY,
  agreements: StudentInstallmentAgreement[] = INITIAL_STUDENT_AGREEMENTS
): StudentAccountSummary[] {
  const map = new Map<string, StudentAccountSummary>();

  invoices.forEach(inv => {
    if (!map.has(inv.studentId)) {
      const nuban = generateVirtualNuban(inv.admissionNumber);
      map.set(inv.studentId, {
        studentId: inv.studentId,
        studentName: inv.studentName,
        admissionNumber: inv.admissionNumber,
        classGrade: inv.classGrade,
        classGroupName: inv.classGroupName,
        parentName: inv.parentName,
        parentPhone: inv.parentPhone,
        parentEmail: inv.parentEmail,
        totalBilled: 0,
        totalPaid: 0,
        totalDiscounts: 0,
        currentBalance: 0,
        clearanceStatus: 'blocked_debtor',
        invoicesCount: 0,
        receiptsCount: 0,
        lastPaymentDate: undefined,
        virtualNubanAccount: nuban,
        activeInstallmentPlan: undefined
      });
    }

    const acc = map.get(inv.studentId)!;
    acc.totalBilled += inv.totalAmount;
    acc.totalDiscounts += inv.totalDiscount;
    acc.totalPaid += inv.amountPaid;
    acc.invoicesCount += 1;
  });

  // Check transactions for receipts count and last payment date
  transactions.forEach(tx => {
    if (map.has(tx.studentId) && tx.status === 'successful') {
      const acc = map.get(tx.studentId)!;
      acc.receiptsCount += 1;
      if (!acc.lastPaymentDate || new Date(tx.paymentDate) > new Date(acc.lastPaymentDate)) {
        acc.lastPaymentDate = tx.paymentDate;
      }
    }
  });

  // Calculate final balances, installment milestone tracking, and clearance statuses
  map.forEach(acc => {
    acc.currentBalance = Math.max(0, acc.totalBilled - acc.totalDiscounts - acc.totalPaid);
    const netBill = Math.max(1, acc.totalBilled - acc.totalDiscounts);
    const percentPaid = Math.round((acc.totalPaid / netBill) * 100);

    // Check if student has custom agreement or falls under standard policy
    const agr = agreements.find(a => a.studentId === acc.studentId && a.principalApprovalStatus === 'approved');

    if (agr) {
      const totalTranches = agr.customTranches.length;
      const completedTranches = agr.customTranches.filter(t => t.status === 'paid').length;
      const nextTranche = agr.customTranches.find(t => t.status === 'due' || t.status === 'overdue');
      acc.activeInstallmentPlan = {
        planName: agr.agreedPlanType === 'custom_hardship_plan' ? 'Custom Hardship Plan' : 'Standard 3-Tranche Plan',
        completedTranches,
        totalTranches,
        nextDueTranche: nextTranche?.name,
        nextDueAmount: nextTranche?.amount,
        nextDueDate: nextTranche?.dueDate
      };
    } else {
      // Standard policy calculation
      const totalTranches = policy.tranches.length;
      let completedTranches = 0;
      let cumPercent = 0;
      let nextDueTranche: InstallmentTranche | undefined;

      policy.tranches.forEach(t => {
        cumPercent += t.percentage;
        if (percentPaid >= cumPercent) {
          completedTranches += 1;
        } else if (!nextDueTranche) {
          nextDueTranche = t;
        }
      });

      acc.activeInstallmentPlan = {
        planName: policy.policyTitle,
        completedTranches,
        totalTranches,
        nextDueTranche: nextDueTranche?.name,
        nextDueAmount: nextDueTranche ? Math.round((netBill * nextDueTranche.percentage) / 100) : 0,
        nextDueDate: nextDueTranche?.dueDate
      };
    }

    // Dynamic Clearance Gate Enforcement by Principal Policy
    if (acc.currentBalance === 0 && acc.totalBilled > 0) {
      acc.clearanceStatus = 'fully_cleared';
    } else if (percentPaid >= policy.midtermClearanceMinimumPercent) {
      acc.clearanceStatus = 'provisional_cleared';
    } else if (percentPaid >= policy.minimumInitialDepositPercent) {
      acc.clearanceStatus = 'provisional_cleared';
    } else {
      acc.clearanceStatus = 'blocked_debtor';
    }
  });

  return Array.from(map.values());
}

// -----------------------------------------------------------------
// 8. MONTHLY REVENUE COLLECTIONS VS PROJECTED ACADEMIC TERM BUDGET DATA
// -----------------------------------------------------------------
export const INITIAL_MONTHLY_REVENUE_BUDGET_DATA: MonthlyRevenueBudgetData[] = [
  // --- TERM 1 (Autumn Term 2025/2026) ---
  {
    id: 'mrb-2025-09',
    monthKey: '2025-09',
    monthLabel: 'Sep 2025',
    academicSession: '2025/2026',
    term: 'Term 1',
    termPhase: 'Resumption & 1st Tranche 50% Deposit',
    projectedRevenueTarget: 18500000,
    actualRevenueCollected: 19250000,
    tuitionRevenue: 12500000,
    stemIctLevies: 3400000,
    boardingTransportRevenue: 2350000,
    otherLevies: 1000000,
    projectedOperationalBudget: 14200000,
    actualOperationalExpenditure: 13800000,
    expenditureBreakdown: {
      facultyStaffSalaries: 8500000,
      stemIctLabsEnergy: 2100000,
      boardingCateringLogistics: 1600000,
      facilityMaintenanceCapEx: 1100000,
      academicRegulatoryExamFees: 500000
    },
    collectionAttainmentRate: 104.1,
    revenueVariance: 750000,
    netOperatingSurplus: 5450000,
    collectionEfficiencyStatus: 'surpassed_target',
    activeTransactionsCount: 142,
    channelBreakdown: {
      paystack: 10500000,
      opay: 5850000,
      bankTransfer: 2900000
    },
    notes: 'Resumption week saw heavy Paystack & OPay instant settlements.'
  },
  {
    id: 'mrb-2025-10',
    monthKey: '2025-10',
    monthLabel: 'Oct 2025',
    academicSession: '2025/2026',
    term: 'Term 1',
    termPhase: 'Mid-Term Clearance & Tranche 2 (30%)',
    projectedRevenueTarget: 12800000,
    actualRevenueCollected: 13400000,
    tuitionRevenue: 8600000,
    stemIctLevies: 2400000,
    boardingTransportRevenue: 1700000,
    otherLevies: 700000,
    projectedOperationalBudget: 11500000,
    actualOperationalExpenditure: 11200000,
    expenditureBreakdown: {
      facultyStaffSalaries: 8500000,
      stemIctLabsEnergy: 1100000,
      boardingCateringLogistics: 900000,
      facilityMaintenanceCapEx: 500000,
      academicRegulatoryExamFees: 200000
    },
    collectionAttainmentRate: 104.7,
    revenueVariance: 600000,
    netOperatingSurplus: 2200000,
    collectionEfficiencyStatus: 'surpassed_target',
    activeTransactionsCount: 98,
    channelBreakdown: {
      paystack: 7200000,
      opay: 4300000,
      bankTransfer: 1900000
    },
    notes: 'Mid-term continuous assessment clearance enforcement drove prompt tranches.'
  },
  {
    id: 'mrb-2025-11',
    monthKey: '2025-11',
    monthLabel: 'Nov 2025',
    academicSession: '2025/2026',
    term: 'Term 1',
    termPhase: 'Final Exam Docket Clearance Tranche 3 (20%)',
    projectedRevenueTarget: 9400000,
    actualRevenueCollected: 8950000,
    tuitionRevenue: 5800000,
    stemIctLevies: 1600000,
    boardingTransportRevenue: 1100000,
    otherLevies: 450000,
    projectedOperationalBudget: 10800000,
    actualOperationalExpenditure: 10500000,
    expenditureBreakdown: {
      facultyStaffSalaries: 8500000,
      stemIctLabsEnergy: 800000,
      boardingCateringLogistics: 700000,
      facilityMaintenanceCapEx: 300000,
      academicRegulatoryExamFees: 200000
    },
    collectionAttainmentRate: 95.2,
    revenueVariance: -450000,
    netOperatingSurplus: -1550000,
    collectionEfficiencyStatus: 'on_track',
    activeTransactionsCount: 76,
    channelBreakdown: {
      paystack: 4800000,
      opay: 2950000,
      bankTransfer: 1200000
    },
    notes: 'Examination docket gate cleared 94% of cohort before Term 1 finals.'
  },
  {
    id: 'mrb-2025-12',
    monthKey: '2025-12',
    monthLabel: 'Dec 2025',
    academicSession: '2025/2026',
    term: 'Term 1',
    termPhase: 'Term 1 Closeout & Vacation Arrears Recovery',
    projectedRevenueTarget: 4500000,
    actualRevenueCollected: 4820000,
    tuitionRevenue: 3100000,
    stemIctLevies: 820000,
    boardingTransportRevenue: 600000,
    otherLevies: 300000,
    projectedOperationalBudget: 6500000,
    actualOperationalExpenditure: 6150000,
    expenditureBreakdown: {
      facultyStaffSalaries: 4500000,
      stemIctLabsEnergy: 500000,
      boardingCateringLogistics: 350000,
      facilityMaintenanceCapEx: 600000,
      academicRegulatoryExamFees: 200000
    },
    collectionAttainmentRate: 107.1,
    revenueVariance: 320000,
    netOperatingSurplus: -1330000,
    collectionEfficiencyStatus: 'surpassed_target',
    activeTransactionsCount: 44,
    channelBreakdown: {
      paystack: 2600000,
      opay: 1520000,
      bankTransfer: 700000
    },
    notes: 'Report card collection clearance successfully resolved outstanding balances.'
  },

  // --- TERM 2 (Lent Term 2025/2026) ---
  {
    id: 'mrb-2026-01',
    monthKey: '2026-01',
    monthLabel: 'Jan 2026',
    academicSession: '2025/2026',
    term: 'Term 2',
    termPhase: 'Term 2 Resumption & Tranche 1 Deposit',
    projectedRevenueTarget: 20500000,
    actualRevenueCollected: 21100000,
    tuitionRevenue: 13600000,
    stemIctLevies: 3800000,
    boardingTransportRevenue: 2600000,
    otherLevies: 1100000,
    projectedOperationalBudget: 15800000,
    actualOperationalExpenditure: 15400000,
    expenditureBreakdown: {
      facultyStaffSalaries: 9000000,
      stemIctLabsEnergy: 2400000,
      boardingCateringLogistics: 2000000,
      facilityMaintenanceCapEx: 1400000,
      academicRegulatoryExamFees: 600000
    },
    collectionAttainmentRate: 102.9,
    revenueVariance: 600000,
    netOperatingSurplus: 5700000,
    collectionEfficiencyStatus: 'surpassed_target',
    activeTransactionsCount: 155,
    channelBreakdown: {
      paystack: 11800000,
      opay: 6500000,
      bankTransfer: 2800000
    },
    notes: 'High compliance at resumption with increased boarding registrations.'
  },
  {
    id: 'mrb-2026-02',
    monthKey: '2026-02',
    monthLabel: 'Feb 2026',
    academicSession: '2025/2026',
    term: 'Term 2',
    termPhase: 'Mid-Term Clearance & Tranche 2 (30%)',
    projectedRevenueTarget: 13500000,
    actualRevenueCollected: 13950000,
    tuitionRevenue: 8900000,
    stemIctLevies: 2550000,
    boardingTransportRevenue: 1750000,
    otherLevies: 750000,
    projectedOperationalBudget: 12200000,
    actualOperationalExpenditure: 11900000,
    expenditureBreakdown: {
      facultyStaffSalaries: 9000000,
      stemIctLabsEnergy: 1200000,
      boardingCateringLogistics: 1000000,
      facilityMaintenanceCapEx: 500000,
      academicRegulatoryExamFees: 200000
    },
    collectionAttainmentRate: 103.3,
    revenueVariance: 450000,
    netOperatingSurplus: 2050000,
    collectionEfficiencyStatus: 'surpassed_target',
    activeTransactionsCount: 106,
    channelBreakdown: {
      paystack: 7800000,
      opay: 4550000,
      bankTransfer: 1600000
    },
    notes: 'Inter-house sports and mid-term assessments stimulated prompt fee clearances.'
  },
  {
    id: 'mrb-2026-03',
    monthKey: '2026-03',
    monthLabel: 'Mar 2026',
    academicSession: '2025/2026',
    term: 'Term 2',
    termPhase: 'Final Exam Docket Clearance Tranche 3 (20%)',
    projectedRevenueTarget: 10200000,
    actualRevenueCollected: 9800000,
    tuitionRevenue: 6300000,
    stemIctLevies: 1800000,
    boardingTransportRevenue: 1200000,
    otherLevies: 500000,
    projectedOperationalBudget: 11900000,
    actualOperationalExpenditure: 11600000,
    expenditureBreakdown: {
      facultyStaffSalaries: 9000000,
      stemIctLabsEnergy: 1000000,
      boardingCateringLogistics: 900000,
      facilityMaintenanceCapEx: 400000,
      academicRegulatoryExamFees: 300000
    },
    collectionAttainmentRate: 96.1,
    revenueVariance: -400000,
    netOperatingSurplus: -1800000,
    collectionEfficiencyStatus: 'on_track',
    activeTransactionsCount: 82,
    channelBreakdown: {
      paystack: 5400000,
      opay: 3100000,
      bankTransfer: 1300000
    },
    notes: 'Term 2 exam docket clearance rate achieved 95.8%.'
  },
  {
    id: 'mrb-2026-04',
    monthKey: '2026-04',
    monthLabel: 'Apr 2026',
    academicSession: '2025/2026',
    term: 'Term 2',
    termPhase: 'Term 2 Closeout & Term 3 Pre-Registrations',
    projectedRevenueTarget: 7500000,
    actualRevenueCollected: 8250000,
    tuitionRevenue: 5300000,
    stemIctLevies: 1450000,
    boardingTransportRevenue: 1050000,
    otherLevies: 450000,
    projectedOperationalBudget: 8400000,
    actualOperationalExpenditure: 8100000,
    expenditureBreakdown: {
      facultyStaffSalaries: 5500000,
      stemIctLabsEnergy: 800000,
      boardingCateringLogistics: 600000,
      facilityMaintenanceCapEx: 900000,
      academicRegulatoryExamFees: 300000
    },
    collectionAttainmentRate: 110.0,
    revenueVariance: 750000,
    netOperatingSurplus: 150000,
    collectionEfficiencyStatus: 'surpassed_target',
    activeTransactionsCount: 68,
    channelBreakdown: {
      paystack: 4600000,
      opay: 2650000,
      bankTransfer: 1000000
    },
    notes: 'Early-bird prepayments received for Trinity Term 3.'
  },

  // --- TERM 3 (Trinity Term 2025/2026 - Current Active Term) ---
  {
    id: 'mrb-2026-05',
    monthKey: '2026-05',
    monthLabel: 'May 2026',
    academicSession: '2025/2026',
    term: 'Term 3',
    termPhase: 'Resumption & 50% Initial Deposit Tranche',
    projectedRevenueTarget: 22000000,
    actualRevenueCollected: 23450000,
    tuitionRevenue: 15100000,
    stemIctLevies: 4200000,
    boardingTransportRevenue: 2850000,
    otherLevies: 1300000,
    projectedOperationalBudget: 16500000,
    actualOperationalExpenditure: 15900000,
    expenditureBreakdown: {
      facultyStaffSalaries: 9500000,
      stemIctLabsEnergy: 2600000,
      boardingCateringLogistics: 2100000,
      facilityMaintenanceCapEx: 1100000,
      academicRegulatoryExamFees: 600000
    },
    collectionAttainmentRate: 106.6,
    revenueVariance: 1450000,
    netOperatingSurplus: 7550000,
    collectionEfficiencyStatus: 'surpassed_target',
    activeTransactionsCount: 168,
    channelBreakdown: {
      paystack: 13200000,
      opay: 7450000,
      bankTransfer: 2800000
    },
    notes: 'Record collection rate with automated SMS installment reminders deployed.'
  },
  {
    id: 'mrb-2026-06',
    monthKey: '2026-06',
    monthLabel: 'Jun 2026',
    academicSession: '2025/2026',
    term: 'Term 3',
    termPhase: 'Mid-Term Clearance & Tranche 2 (30%)',
    projectedRevenueTarget: 14000000,
    actualRevenueCollected: 14600000,
    tuitionRevenue: 9400000,
    stemIctLevies: 2650000,
    boardingTransportRevenue: 1800000,
    otherLevies: 750000,
    projectedOperationalBudget: 12800000,
    actualOperationalExpenditure: 12400000,
    expenditureBreakdown: {
      facultyStaffSalaries: 9500000,
      stemIctLabsEnergy: 1200000,
      boardingCateringLogistics: 1000000,
      facilityMaintenanceCapEx: 500000,
      academicRegulatoryExamFees: 200000
    },
    collectionAttainmentRate: 104.3,
    revenueVariance: 600000,
    netOperatingSurplus: 2200000,
    collectionEfficiencyStatus: 'surpassed_target',
    activeTransactionsCount: 112,
    channelBreakdown: {
      paystack: 8300000,
      opay: 4700000,
      bankTransfer: 1600000
    },
    notes: 'Mid-term continuous assessment tests completed with 98% fee clearance gate.'
  },
  {
    id: 'mrb-2026-07',
    monthKey: '2026-07',
    monthLabel: 'Jul 2026',
    academicSession: '2025/2026',
    term: 'Term 3',
    termPhase: 'Promotion & WAEC/BECE Final Examination Clearance',
    projectedRevenueTarget: 11500000,
    actualRevenueCollected: 11900000,
    tuitionRevenue: 7600000,
    stemIctLevies: 2200000,
    boardingTransportRevenue: 1500000,
    otherLevies: 600000,
    projectedOperationalBudget: 13200000,
    actualOperationalExpenditure: 12750000,
    expenditureBreakdown: {
      facultyStaffSalaries: 9500000,
      stemIctLabsEnergy: 1100000,
      boardingCateringLogistics: 1050000,
      facilityMaintenanceCapEx: 600000,
      academicRegulatoryExamFees: 500000
    },
    collectionAttainmentRate: 103.5,
    revenueVariance: 400000,
    netOperatingSurplus: -850000,
    collectionEfficiencyStatus: 'surpassed_target',
    activeTransactionsCount: 94,
    channelBreakdown: {
      paystack: 6700000,
      opay: 3800000,
      bankTransfer: 1400000
    },
    notes: 'Promotion exam hall passes generated with full QR-verified receipts.'
  },
  {
    id: 'mrb-2026-08',
    monthKey: '2026-08',
    monthLabel: 'Aug 2026',
    academicSession: '2025/2026',
    term: 'Term 3',
    termPhase: 'Valedictory, Summer Prep & Next Session Advance',
    projectedRevenueTarget: 6800000,
    actualRevenueCollected: 5950000,
    tuitionRevenue: 3800000,
    stemIctLevies: 1100000,
    boardingTransportRevenue: 750000,
    otherLevies: 300000,
    projectedOperationalBudget: 7200000,
    actualOperationalExpenditure: 6800000,
    expenditureBreakdown: {
      facultyStaffSalaries: 5000000,
      stemIctLabsEnergy: 600000,
      boardingCateringLogistics: 400000,
      facilityMaintenanceCapEx: 600000,
      academicRegulatoryExamFees: 200000
    },
    collectionAttainmentRate: 87.5,
    revenueVariance: -850000,
    netOperatingSurplus: -850000,
    collectionEfficiencyStatus: 'lagging_behind',
    activeTransactionsCount: 52,
    channelBreakdown: {
      paystack: 3300000,
      opay: 1950000,
      bankTransfer: 700000
    },
    notes: 'Summer closeout and maintenance capital outlay underway.'
  }
];

export const INITIAL_ACADEMIC_TERM_BUDGET_SUMMARIES: AcademicTermBudgetSummary[] = [
  {
    term: 'Term 1',
    academicSession: '2025/2026',
    termTitle: 'Term 1 (Autumn Term 2025/2026)',
    totalProjectedBudget: 43000000,
    totalTargetRevenue: 45200000,
    totalActualCollected: 46420000,
    totalExpenditureSpent: 41650000,
    netSurplusDeficit: 4770000,
    collectionRate: 102.7,
    budgetUtilizationRate: 96.9,
    monthsCovered: ['Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025']
  },
  {
    term: 'Term 2',
    academicSession: '2025/2026',
    termTitle: 'Term 2 (Lent Term 2025/2026)',
    totalProjectedBudget: 48300000,
    totalTargetRevenue: 51700000,
    totalActualCollected: 53100000,
    totalExpenditureSpent: 47000000,
    netSurplusDeficit: 6100000,
    collectionRate: 102.7,
    budgetUtilizationRate: 97.3,
    monthsCovered: ['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026']
  },
  {
    term: 'Term 3',
    academicSession: '2025/2026',
    termTitle: 'Term 3 (Trinity Term 2025/2026 - Active)',
    totalProjectedBudget: 49700000,
    totalTargetRevenue: 54300000,
    totalActualCollected: 55900000,
    totalExpenditureSpent: 47850000,
    netSurplusDeficit: 8050000,
    collectionRate: 102.9,
    budgetUtilizationRate: 96.3,
    monthsCovered: ['May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026']
  }
];

// Helper to compute dynamic term aggregates from monthly records
export function calculateTermFinancials(
  records: MonthlyRevenueBudgetData[],
  selectedTerm?: Term | 'All'
): {
  totalTarget: number;
  totalCollected: number;
  totalBudget: number;
  totalSpent: number;
  netSurplus: number;
  overallAttainmentRate: number;
  budgetRunwayPercent: number;
  chartData: any[];
  cumulativeData: any[];
  categoryBreakdown: { name: string; value: number; color: string }[];
  expenditureBreakdown: { name: string; value: number; color: string }[];
  channelShare: { name: string; value: number; percent: number; color: string }[];
} {
  const filtered = selectedTerm && selectedTerm !== 'All'
    ? records.filter(r => r.term === selectedTerm)
    : records;

  const totalTarget = filtered.reduce((sum, r) => sum + r.projectedRevenueTarget, 0);
  const totalCollected = filtered.reduce((sum, r) => sum + r.actualRevenueCollected, 0);
  const totalBudget = filtered.reduce((sum, r) => sum + r.projectedOperationalBudget, 0);
  const totalSpent = filtered.reduce((sum, r) => sum + r.actualOperationalExpenditure, 0);
  const netSurplus = totalCollected - totalSpent;
  const overallAttainmentRate = totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 1000) / 10 : 0;
  const budgetRunwayPercent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 1000) / 10 : 0;

  // Chart data for monthly bars
  const chartData = filtered.map(r => ({
    month: r.monthLabel,
    monthKey: r.monthKey,
    term: r.term,
    target: r.projectedRevenueTarget,
    collected: r.actualRevenueCollected,
    budget: r.projectedOperationalBudget,
    spent: r.actualOperationalExpenditure,
    variance: r.actualRevenueCollected - r.projectedRevenueTarget,
    surplus: r.actualRevenueCollected - r.actualOperationalExpenditure,
    attainment: r.collectionAttainmentRate,
    phase: r.termPhase
  }));

  // Cumulative trajectory
  let runningTarget = 0;
  let runningCollected = 0;
  let runningBudget = 0;
  let runningSpent = 0;

  const cumulativeData = filtered.map(r => {
    runningTarget += r.projectedRevenueTarget;
    runningCollected += r.actualRevenueCollected;
    runningBudget += r.projectedOperationalBudget;
    runningSpent += r.actualOperationalExpenditure;
    return {
      month: r.monthLabel,
      term: r.term,
      cumTarget: runningTarget,
      cumCollected: runningCollected,
      cumBudget: runningBudget,
      cumSpent: runningSpent,
      cumSurplus: runningCollected - runningSpent
    };
  });

  // Category revenue totals
  const totalTuition = filtered.reduce((sum, r) => sum + r.tuitionRevenue, 0);
  const totalStem = filtered.reduce((sum, r) => sum + r.stemIctLevies, 0);
  const totalBoarding = filtered.reduce((sum, r) => sum + r.boardingTransportRevenue, 0);
  const totalOther = filtered.reduce((sum, r) => sum + r.otherLevies, 0);

  const categoryBreakdown = [
    { name: 'Tuition & Instruction', value: totalTuition, color: '#10b981' },
    { name: 'STEM & ICT / LMS Levies', value: totalStem, color: '#3b82f6' },
    { name: 'Boarding & Transport', value: totalBoarding, color: '#f59e0b' },
    { name: 'PTA, Medical & Dev', value: totalOther, color: '#8b5cf6' }
  ];

  // Expenditure breakdown
  const salaries = filtered.reduce((sum, r) => sum + r.expenditureBreakdown.facultyStaffSalaries, 0);
  const stemEnergy = filtered.reduce((sum, r) => sum + r.expenditureBreakdown.stemIctLabsEnergy, 0);
  const boardingLogistics = filtered.reduce((sum, r) => sum + r.expenditureBreakdown.boardingCateringLogistics, 0);
  const maintenance = filtered.reduce((sum, r) => sum + r.expenditureBreakdown.facilityMaintenanceCapEx, 0);
  const exams = filtered.reduce((sum, r) => sum + r.expenditureBreakdown.academicRegulatoryExamFees, 0);

  const expenditureBreakdown = [
    { name: 'Faculty & Staff Salaries', value: salaries, color: '#6366f1' },
    { name: 'STEM Labs & Solar Energy', value: stemEnergy, color: '#06b6d4' },
    { name: 'Boarding & Catering', value: boardingLogistics, color: '#f97316' },
    { name: 'Facility CapEx Maintenance', value: maintenance, color: '#eab308' },
    { name: 'WAEC/BECE Regulatory Fees', value: exams, color: '#ec4899' }
  ];

  // Channels
  const pstkTotal = filtered.reduce((sum, r) => sum + r.channelBreakdown.paystack, 0);
  const opayTotal = filtered.reduce((sum, r) => sum + r.channelBreakdown.opay, 0);
  const bankTotal = filtered.reduce((sum, r) => sum + r.channelBreakdown.bankTransfer, 0);
  const channelSum = Math.max(1, pstkTotal + opayTotal + bankTotal);

  const channelShare = [
    { name: 'Paystack Automated Gateway', value: pstkTotal, percent: Math.round((pstkTotal / channelSum) * 100), color: '#0ea5e9' },
    { name: 'OPay Virtual NUBAN Instant', value: opayTotal, percent: Math.round((opayTotal / channelSum) * 100), color: '#10b981' },
    { name: 'Bank Zenith/NIP Direct Tellers', value: bankTotal, percent: Math.round((bankTotal / channelSum) * 100), color: '#6366f1' }
  ];

  return {
    totalTarget,
    totalCollected,
    totalBudget,
    totalSpent,
    netSurplus,
    overallAttainmentRate,
    budgetRunwayPercent,
    chartData,
    cumulativeData,
    categoryBreakdown,
    expenditureBreakdown,
    channelShare
  };
}

