import {
  StudentAssignmentItem,
  StudentPerformanceEntry,
  StudentTimetableSlot,
  StudentExamScheduleItem,
  StudentStudyResourceItem,
  PortalMessageItem,
  PortalAnnouncementItem,
  ParentFeeInvoice,
  ParentConsentSlip,
  ParentPickupPassData
} from '../types';

export const INITIAL_STUDENT_TIMETABLE: StudentTimetableSlot[] = [
  {
    id: 'tt-01',
    time: '8:00 AM',
    endTime: '8:45 AM',
    subject: 'Mathematics',
    teacher: 'Mr. Daniel Adeyemi',
    room: 'Room 204 (Maths Lab)',
    dayOfWeek: 'Tuesday',
    currentActive: false
  },
  {
    id: 'tt-02',
    time: '9:00 AM',
    endTime: '9:45 AM',
    subject: 'English Language',
    teacher: 'Mrs. Ngozi Okonjo',
    room: 'Room 102 (Language Suite)',
    dayOfWeek: 'Tuesday',
    currentActive: true
  },
  {
    id: 'tt-03',
    time: '11:00 AM',
    endTime: '11:45 AM',
    subject: 'Basic Science',
    teacher: 'Mrs. Amina Yusuf',
    room: 'Science Lab 2',
    dayOfWeek: 'Tuesday',
    currentActive: false
  },
  {
    id: 'tt-04',
    time: '1:00 PM',
    endTime: '1:45 PM',
    subject: 'French',
    teacher: 'Mme. Claire Dubois',
    room: 'Audio-Visual Lab 1',
    dayOfWeek: 'Tuesday',
    currentActive: false
  },
  {
    id: 'tt-05',
    time: '2:00 PM',
    endTime: '2:45 PM',
    subject: 'Civic Education',
    teacher: 'Mr. Kelechi Nwosu',
    room: 'Room 201',
    dayOfWeek: 'Tuesday',
    currentActive: false
  }
];

export const INITIAL_STUDENT_ASSIGNMENTS: StudentAssignmentItem[] = [
  {
    id: 'asg-01',
    studentId: 'usr-student-01',
    subject: 'Mathematics',
    title: 'Algebra Worksheet — Quadratic Factorization',
    dueDate: '2026-05-22',
    formattedDue: 'Due May 22',
    status: 'pending',
    maxScore: 20,
    teacherName: 'Mr. Daniel Adeyemi',
    instructions: 'Complete exercises 1 through 15 on page 84. Show all working steps clearly.'
  },
  {
    id: 'asg-02',
    studentId: 'usr-student-01',
    subject: 'English Language',
    title: 'Essay Writing — "The Impact of Artificial Intelligence on Future Careers"',
    dueDate: '2026-05-23',
    formattedDue: 'Due May 23',
    status: 'pending',
    maxScore: 20,
    teacherName: 'Mrs. Ngozi Okonjo',
    instructions: 'Write a persuasive essay of not less than 450 words following formal essay format.'
  },
  {
    id: 'asg-03',
    studentId: 'usr-student-01',
    subject: 'Basic Science',
    title: 'Lab Report — Osmosis in Plant Tissues',
    dueDate: '2026-05-24',
    formattedDue: 'Due May 24',
    status: 'pending',
    maxScore: 20,
    teacherName: 'Mrs. Amina Yusuf',
    instructions: 'Submit your typed laboratory observation chart with labelled apparatus diagram.'
  },
  {
    id: 'asg-04',
    studentId: 'usr-student-01',
    subject: 'French',
    title: 'French Conjugation & Dialogue Translation',
    dueDate: '2026-05-18',
    formattedDue: 'Submitted May 18',
    status: 'graded',
    score: 18,
    maxScore: 20,
    teacherName: 'Mme. Claire Dubois',
    submissionDate: '2026-05-18',
    instructions: 'Translate dialogue on page 32 into English and conjugate passé composé verbs.',
    teacherFeedback: 'Excellent vocabulary accuracy and neat presentation. Keep it up, David!'
  }
];

export const INITIAL_STUDENT_PERFORMANCE: StudentPerformanceEntry[] = [
  {
    subject: 'Mathematics',
    score: 80,
    termGrade: 'A',
    ca1Score: 18,
    ca2Score: 17,
    examScore: 45,
    subjectTeacher: 'Mr. Daniel Adeyemi',
    remarks: 'Strong analytical skills in algebraic geometry.'
  },
  {
    subject: 'English Language',
    score: 78,
    termGrade: 'B+',
    ca1Score: 16,
    ca2Score: 17,
    examScore: 45,
    subjectTeacher: 'Mrs. Ngozi Okonjo',
    remarks: 'Commendable grammar; encourage more descriptive prose.'
  },
  {
    subject: 'Basic Science',
    score: 88,
    termGrade: 'A+',
    ca1Score: 19,
    ca2Score: 19,
    examScore: 50,
    subjectTeacher: 'Mrs. Amina Yusuf',
    remarks: 'Top in class for practical scientific inquiry.'
  },
  {
    subject: 'French',
    score: 76,
    termGrade: 'B+',
    ca1Score: 15,
    ca2Score: 16,
    examScore: 45,
    subjectTeacher: 'Mme. Claire Dubois',
    remarks: 'Good oral pronunciation; focus on irregular verb endings.'
  },
  {
    subject: 'Civic Education',
    score: 81,
    termGrade: 'A',
    ca1Score: 17,
    ca2Score: 18,
    examScore: 46,
    subjectTeacher: 'Mr. Kelechi Nwosu',
    remarks: 'Excellent grasp of constitutional principles.'
  },
  {
    subject: 'Computer Studies (ICT)',
    score: 92,
    termGrade: 'A+',
    ca1Score: 20,
    ca2Score: 19,
    examScore: 53,
    subjectTeacher: 'Mr. David Sanusi',
    remarks: 'Outstanding aptitude in Python logic and web concepts.'
  }
];

export const INITIAL_PORTAL_ANNOUNCEMENTS: PortalAnnouncementItem[] = [
  {
    id: 'ann-01',
    title: 'Mid-term assessments begin May 22nd',
    category: 'Examination',
    publishedBy: 'Directorate of Examinations',
    publishedDate: '2026-05-17',
    timeAgo: '1d ago',
    content: 'All students are reminded to download their CBT login credentials from the portal. Hall passes must be presented at the computer suites.',
    isPinned: true
  },
  {
    id: 'ann-02',
    title: 'Library open till 5:00 PM today',
    category: 'Academic',
    publishedBy: 'Central E-Library Desk',
    publishedDate: '2026-05-16',
    timeAgo: '2d ago',
    content: 'Extended study hours and science tutoring desks are available in the Senior Block wing until 5:00 PM.'
  },
  {
    id: 'ann-03',
    title: 'Annual Inter-House STEM Quiz & Debate Championship',
    category: 'Sports',
    publishedBy: 'Office of the Principal',
    publishedDate: '2026-05-15',
    timeAgo: '3d ago',
    content: 'Auditorium rehearsals for Emerald Falcon and Gold Eagle house representatives take place Thursday period 6.'
  }
];

export const INITIAL_PORTAL_MESSAGES: PortalMessageItem[] = [
  {
    id: 'msg-01',
    senderName: 'Mr. Daniel Adeyemi',
    senderRole: 'Senior Mathematics Master',
    senderAvatar: 'DA',
    recipientId: 'usr-student-01',
    subject: 'Good work on the trigonometry quiz!',
    preview: 'Good work in class! Your proof for angle sum identities was very clear.',
    fullMessage: 'Hello David,\n\nI reviewed your trigonometry solution from yesterday. Your proof was mathematically rigorous and showed great maturity. Keep up this momentum for the upcoming mid-term exam.\n\nBest regards,\nMr. Adeyemi',
    timestamp: '2026-05-18T08:30:00Z',
    timeAgo: '2h ago',
    isRead: false,
    isImportant: true
  },
  {
    id: 'msg-02',
    senderName: 'Office of the Principal',
    senderRole: 'Executive Secretariat',
    senderAvatar: 'PR',
    recipientId: 'usr-student-01',
    subject: 'Field trip on Friday — STEM Robotics Hub',
    preview: 'Field trip on Friday: Please ensure your parent signs the digital permission slip.',
    fullMessage: 'Dear Student,\n\nThe school excursion to the Tech Innovation Hub is scheduled for Friday. Please ensure your parent or guardian approves the digital permission slip in the Parent Portal by Thursday 4:00 PM.',
    timestamp: '2026-05-17T14:00:00Z',
    timeAgo: '1d ago',
    isRead: true
  }
];

export const INITIAL_STUDY_RESOURCES: StudentStudyResourceItem[] = [
  {
    id: 'res-01',
    title: 'Comprehensive Mathematics Formula Handbook & Worked Solutions',
    subject: 'Mathematics',
    type: 'Study Materials',
    fileSize: '4.8 MB PDF',
    downloadsCount: 342,
    downloadUrl: '#'
  },
  {
    id: 'res-02',
    title: 'WAEC / BECE 10-Year Past Questions & Model Answers (2015-2025)',
    subject: 'All Core Subjects',
    type: 'Past Questions',
    fileSize: '12.4 MB PDF',
    downloadsCount: 890,
    downloadUrl: '#'
  },
  {
    id: 'res-03',
    title: 'Oxford Senior English Grammar & Descriptive Composition Guide',
    subject: 'English Language',
    type: 'E-Library',
    fileSize: '8.1 MB EPUB',
    downloadsCount: 512,
    downloadUrl: '#'
  },
  {
    id: 'res-04',
    title: 'Interactive Physics & Chemistry Virtual Lab Simulations',
    subject: 'Basic Science',
    type: 'Video Tutorial',
    fileSize: 'Cloud Stream',
    downloadsCount: 278,
    downloadUrl: '#'
  }
];

export const INITIAL_STUDENT_EXAMS: StudentExamScheduleItem[] = [
  {
    id: 'exm-01',
    subject: 'General Mathematics (Paper 1 - CBT Objective)',
    examDate: '2026-05-25',
    time: '09:00 AM - 10:30 AM',
    venue: 'Digital ICT CBT Suite 1',
    seatNumber: 'DESK-042',
    format: 'CBT Computer-Based',
    durationMinutes: 90,
    hallPassVerified: true
  },
  {
    id: 'exm-02',
    subject: 'English Language (Paper 1 & 2 - Theory & Comprehension)',
    examDate: '2026-05-26',
    time: '09:00 AM - 11:30 AM',
    venue: 'Main Auditorium Wing A',
    seatNumber: 'HALL-A-18',
    format: 'Written Paper',
    durationMinutes: 150,
    hallPassVerified: true
  },
  {
    id: 'exm-03',
    subject: 'Basic Science & Technology (Practical & Objectives)',
    examDate: '2026-05-28',
    time: '11:00 AM - 12:30 PM',
    venue: 'Digital ICT CBT Suite 2',
    seatNumber: 'DESK-088',
    format: 'CBT Computer-Based',
    durationMinutes: 90,
    hallPassVerified: true
  }
];

export const INITIAL_PARENT_FEE_INVOICES: ParentFeeInvoice[] = [
  {
    id: 'inv-01',
    invoiceNumber: 'INV-2026-TER2-092',
    wardId: 'usr-student-01',
    wardName: 'David K. (JSS 2A)',
    term: 'Term 2, 2025/2026 Session',
    items: [
      { description: 'Term 2 Tuition & Instructional Development', amount: 320000 },
      { description: 'STEM & Robotics Lab Consumables Fee', amount: 35000 },
      { description: 'E-Library & Digital CBT Portal Subscription', amount: 20000 },
      { description: 'PTA Termly Development Levy', amount: 15000 },
      { description: 'Comprehensive Medical & First Aid Retainer', amount: 10000 }
    ],
    totalAmount: 400000,
    amountPaid: 400000,
    balanceDue: 0,
    dueDate: '2026-01-15',
    status: 'paid',
    receiptNumber: 'RCP-2026-88129',
    paymentGatewayRef: 'PAYSTACK-TRX-99482910'
  },
  {
    id: 'inv-02',
    invoiceNumber: 'INV-2026-TER3-018',
    wardId: 'usr-student-01',
    wardName: 'David K. (JSS 2A)',
    term: 'Term 3, 2025/2026 Session (Upcoming)',
    items: [
      { description: 'Term 3 Tuition & Curriculum Delivery', amount: 320000 },
      { description: 'End-of-Session Promotional Exam & WAEC Prep', amount: 45000 },
      { description: 'PTA Termly Levy', amount: 15000 }
    ],
    totalAmount: 380000,
    amountPaid: 0,
    balanceDue: 380000,
    dueDate: '2026-06-05',
    status: 'pending'
  }
];

export const INITIAL_PARENT_CONSENT_SLIPS: ParentConsentSlip[] = [
  {
    id: 'cst-01',
    wardId: 'usr-student-01',
    wardName: 'David K. (JSS 2A)',
    eventTitle: 'Educational Excursion to Lekki Tech Innovation Hub & Robotics Studio',
    eventDate: '2026-05-29',
    location: 'Lekki Phase 1, Lagos',
    cost: 15000,
    deadline: '2026-05-24',
    description: 'Guided technological immersion including hands-on Arduino microcontroller programming and renewable energy demonstrations. School luxury air-conditioned bus transport with licensed security escort provided.',
    status: 'approved',
    approvedAt: '2026-05-18T10:15:00Z',
    parentNotes: 'Approved. David has our full permission to attend.'
  },
  {
    id: 'cst-02',
    wardId: 'usr-student-01',
    wardName: 'David K. (JSS 2A)',
    eventTitle: 'National Junior Mathematics Olympiad State Finals (Ibadan Center)',
    eventDate: '2026-06-12',
    location: 'University of Ibadan Conference Center',
    cost: 0, // School sponsored
    deadline: '2026-06-01',
    description: 'State finals for top math qualifiers. Greenfield Academy provides chaperoned travel, hotel lodging, and teacher mentorship.',
    status: 'pending'
  }
];

export const INITIAL_PARENT_PICKUP_PASSES: ParentPickupPassData[] = [
  {
    id: 'pck-01',
    wardId: 'usr-student-01',
    wardName: 'David K. (JSS 2A)',
    authorizedPersonName: 'Chief Okechukwu Eze (Father)',
    relationship: 'Father / Primary Guardian',
    phone: '+234 803 765 4321',
    vehicleRegNumber: 'LND-492-AA (Toyota Land Cruiser)',
    qrCodeData: 'https://greenfieldacademy.edu.ng/verify-pickup/PCK-8812-EZE',
    passPin: '8812',
    validUntil: '2026-12-31',
    status: 'active'
  },
  {
    id: 'pck-02',
    wardId: 'usr-student-01',
    wardName: 'David K. (JSS 2A)',
    authorizedPersonName: 'Dr. (Mrs.) Ifeoma Eze (Mother)',
    relationship: 'Mother / Authorized Guardian',
    phone: '+234 802 111 9900',
    vehicleRegNumber: 'KJA-108-BX (Lexus RX 350)',
    qrCodeData: 'https://greenfieldacademy.edu.ng/verify-pickup/PCK-8813-EZE',
    passPin: '8813',
    validUntil: '2026-12-31',
    status: 'active'
  }
];
