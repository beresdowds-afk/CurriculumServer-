import {
  PrincipalMemoDispatch,
  VisitorLogEntry,
  TeacherReliefAssignment,
  OfficialDocumentRequest,
  FacilityBookingEntry,
  DelegatedPrincipalRBACPolicy
} from '../types';

export const INITIAL_DELEGATED_RBAC_POLICY: DelegatedPrincipalRBACPolicy = {
  policyId: 'pol-exec-delegate-01',
  policyCode: 'PR-IAM-DELEGATE-2026-A',
  policyTitle: 'Executive Administrative Assistant Delegated Operational Authority',
  grantedToUserId: 'usr-admin-assistant-adeleke',
  grantedToUserName: 'Mrs. Folashade Adeleke',
  grantedByPrincipalName: 'Dr. (Mrs.) Funke Adeyemi',
  effectiveDate: '2026-01-08',
  expiryDate: '2026-12-31',
  status: 'active_enforced',
  activePermissions: {
    canDispatchPrincipalMemos: true,
    canProcessTranscriptsAndCertificates: true,
    canManageVisitorRegistry: true,
    canAssignTeacherReliefRoster: true,
    canManageFacilityBookings: true,
    canVerifyBursaryClearance: true,
    canAccessStudentRegistry: true,
    canManageStaffDutyRoster: true,
    canElevateToPrincipalDirectLine: true,
    canIssueStudentIdentityPasses: true
  },
  principalDelegationSeal: 'EXEC_SEAL_PRINCIPAL_AUTH_VERIFIED_2026',
  auditTrail: [
    {
      timestamp: '2026-01-08T09:00:00Z',
      action: 'Principal Executive Operational Delegation Activated',
      actor: 'Dr. (Mrs.) Funke Adeyemi (Principal)'
    },
    {
      timestamp: '2026-04-10T14:30:00Z',
      action: 'Elevated Facility Reservation & Courier Document Clearance Granted',
      actor: 'Dr. (Mrs.) Funke Adeyemi (Principal)'
    }
  ]
};

export const INITIAL_PRINCIPAL_MEMOS: PrincipalMemoDispatch[] = [
  {
    id: 'memo-01',
    memoRefNumber: 'PR/EXEC/2026/042',
    title: 'Directive on Final Submission of SS 3 Mock Exam Continuous Assessments',
    sender: 'Office of the Principal',
    preparedByAssistant: 'Mrs. Folashade Adeleke',
    targetAudience: 'all_teachers',
    urgency: 'urgent_immediate_action',
    content: 'All Senior Secondary subject masters are hereby directed to complete and submit CA 1, CA 2, and Mock scores on the portal by 4:00 PM on Friday. Late submissions will trigger an automatic quality audit flag.',
    dispatchedAt: '2026-05-11T08:30:00Z',
    acknowledgmentsCount: 42,
    totalRecipientsCount: 48,
    status: 'signed_and_dispatched',
    principalSigned: true,
    principalSignedAt: '2026-05-11T08:15:00Z'
  },
  {
    id: 'memo-02',
    memoRefNumber: 'PR/EXEC/2026/043',
    title: 'Mandatory Resumption & Roll-Call Verification for Week 7 Mid-Term Break',
    sender: 'Office of the Principal',
    preparedByAssistant: 'Mrs. Folashade Adeleke',
    targetAudience: 'all_school_community',
    urgency: 'priority',
    content: 'Please note the revised academic calendar schedule for the upcoming Mid-Term break. All administrative and academic staff must verify student registers before dismissal.',
    dispatchedAt: '2026-05-10T11:00:00Z',
    acknowledgmentsCount: 118,
    totalRecipientsCount: 135,
    status: 'signed_and_dispatched',
    principalSigned: true,
    principalSignedAt: '2026-05-10T10:45:00Z'
  },
  {
    id: 'memo-03',
    memoRefNumber: 'PR/EXEC/2026/044',
    title: 'Schedule for Departmental Budgetary Proposals & Science Lab Equipment Requisition',
    sender: 'Office of the Principal',
    preparedByAssistant: 'Mrs. Folashade Adeleke',
    targetAudience: 'hods',
    urgency: 'routine',
    content: 'All Heads of Department are invited to submit their Term 3 consumable budgets and laboratory equipment requisition to the Principal Secretariat by Thursday next week.',
    dispatchedAt: '2026-05-09T14:15:00Z',
    acknowledgmentsCount: 6,
    totalRecipientsCount: 8,
    status: 'signed_and_dispatched',
    principalSigned: true,
    principalSignedAt: '2026-05-09T14:00:00Z'
  },
  {
    id: 'memo-04',
    memoRefNumber: 'PR/EXEC/2026/045',
    title: 'PTA Steering Committee & Security Protocol Enforcement (Draft)',
    sender: 'Office of the Principal',
    preparedByAssistant: 'Mrs. Folashade Adeleke',
    targetAudience: 'administrative_staff',
    urgency: 'priority',
    content: 'Draft guidelines regarding visitor access, parking allocation, and identification badge requirements for the upcoming Annual PTA Executive Council meeting.',
    dispatchedAt: '2026-05-12T07:45:00Z',
    acknowledgmentsCount: 0,
    totalRecipientsCount: 15,
    status: 'draft_for_principal_signature',
    principalSigned: false
  }
];

export const INITIAL_VISITOR_LOGS: VisitorLogEntry[] = [
  {
    id: 'vis-01',
    badgeNumber: 'VIS-2026-088',
    visitorName: 'Barrister Kayode Williams',
    visitorPhone: '+234 803 555 1234',
    visitorOrganization: 'Lagos State Ministry of Basic & Secondary Education',
    purposeOfVisit: 'Quality Assurance & WAEC Exam Centre Accreditation Inspection',
    personToSee: 'Principal Dr. Mustapha',
    timeIn: '09:15 AM',
    status: 'escorted_to_principal',
    idCardTypeVerified: 'National NIN Card',
    escortAssigned: 'Mrs. Folashade Adeleke',
    entryClearanceNotes: 'Official accreditation team lead. Vetted and escorted to Principal Suite.',
    principalApproved: true
  },
  {
    id: 'vis-02',
    badgeNumber: 'VIS-2026-089',
    visitorName: 'Chief & Mrs. Oladipo Johnson',
    visitorPhone: '+234 802 888 9911',
    visitorOrganization: 'Greenfield Parents Association',
    purposeOfVisit: 'Admissions Inquiry & Tour for SS 1 Transfer Candidate (Master Tolu Johnson)',
    personToSee: 'Registry Desk',
    timeIn: '10:00 AM',
    status: 'active_on_premises',
    idCardTypeVerified: "Driver's License",
    escortAssigned: 'Front Desk Cadet',
    entryClearanceNotes: 'Transcript submitted for credential vetting.',
    principalApproved: true
  },
  {
    id: 'vis-03',
    badgeNumber: 'VIS-2026-090',
    visitorName: 'Engr. Sola Balogun',
    visitorPhone: '+234 809 333 4477',
    visitorOrganization: 'Apex STEM Robotics Solutions Ltd',
    purposeOfVisit: 'Delivery and calibration of new Microcontroller Kits for Science Labs',
    personToSee: 'VP Academic',
    timeIn: '11:20 AM',
    status: 'active_on_premises',
    idCardTypeVerified: 'Staff / Corporate ID',
    entryClearanceNotes: 'Lab delivery gate pass #8821 verified.',
    principalApproved: true
  },
  {
    id: 'vis-04',
    badgeNumber: 'VIS-2026-085',
    visitorName: 'Mrs. Zainab Abubakar',
    visitorPhone: '+234 805 123 9876',
    visitorOrganization: 'British Council Educational Services',
    purposeOfVisit: 'Cambridge IGCSE & A-Level Partnership Briefing',
    personToSee: 'Principal Dr. Mustapha',
    timeIn: '08:30 AM',
    timeOut: '10:15 AM',
    status: 'cleared_and_departed',
    idCardTypeVerified: 'International Passport',
    escortAssigned: 'Mrs. Folashade Adeleke',
    entryClearanceNotes: 'Meeting concluded with Principal & VP Academics.',
    principalApproved: true
  }
];

export const INITIAL_TEACHER_RELIEFS: TeacherReliefAssignment[] = [
  {
    id: 'relief-01',
    date: '2026-05-12',
    periodSlot: 'Period 2 (8:50 - 9:35 AM)',
    absentTeacherName: 'Mrs. Ngozi Okonjo (Official TRCN Training)',
    subjectName: 'English Studies',
    classGroupName: 'SS 1 Diamond',
    assignedReliefTeacherName: 'Mr. Babatunde Adewale',
    dutyLocation: 'Room 203, Senior Secondary Wing',
    lessonWorkAssigned: 'Comprehension passage: "Renewable Energy in West Africa" - Chapter 7 exercise.',
    reliefStatus: 'in_progress',
    principalEndorsement: true,
    notes: 'Relief master deployed on time; register checked.'
  },
  {
    id: 'relief-02',
    date: '2026-05-12',
    periodSlot: 'Period 4 (10:45 - 11:30 AM)',
    absentTeacherName: 'Mr. Kelechi Nwosu (Medical Leave)',
    subjectName: 'Civic Education',
    classGroupName: 'JSS 3 Gold',
    assignedReliefTeacherName: 'Mr. Daniel Adeyemi',
    dutyLocation: 'Room 105, Junior Secondary Block',
    lessonWorkAssigned: 'Revision past questions on Rule of Law and Fundamental Human Rights.',
    reliefStatus: 'assigned',
    principalEndorsement: true,
    notes: 'Relief docket printed and handed to Master Adeyemi.'
  },
  {
    id: 'relief-03',
    date: '2026-05-12',
    periodSlot: 'Period 6 (1:15 - 2:00 PM)',
    absentTeacherName: 'Mrs. Funmilayo Davies (External WAEC Meeting)',
    subjectName: 'Biology Practical',
    classGroupName: 'SS 2 Platinum',
    assignedReliefTeacherName: 'Mrs. Amina Yusuf (VP Admin / Science Lead)',
    dutyLocation: 'Biology Lab 2',
    lessonWorkAssigned: 'Dissection of floral structures and classification sketches.',
    reliefStatus: 'assigned',
    principalEndorsement: true,
    notes: 'Lab safety assistant notified to prep equipment.'
  }
];

export const INITIAL_OFFICIAL_DOC_REQUESTS: OfficialDocumentRequest[] = [
  {
    id: 'doc-01',
    requestNumber: 'DOC-REQ-2026-119',
    studentName: 'Chinedu Eze',
    admissionNumber: 'GFA/2023/048',
    documentType: 'Official Academic Transcript',
    requestedBy: 'Parent (Engr. Eze) for University Prep Application',
    destinationInstitution: 'University of Toronto International Admissions',
    paymentStatus: 'fee_cleared',
    bursaryReceiptNumber: 'BUR-RCP-9921',
    processingStatus: 'principal_seal_applied',
    issuedDate: '2026-05-11',
    verificationQrCode: 'https://curriculumflow.edu.ng/verify/GFA-TRN-2026-119',
    signedByPrincipal: true,
    principalSignatureRef: 'PR-SIG-2026-EZE-48',
    trackingNumber: 'DHL-NG-88921820'
  },
  {
    id: 'doc-02',
    requestNumber: 'DOC-REQ-2026-120',
    studentName: 'Fatima Aliyu',
    admissionNumber: 'GFA/2022/012',
    documentType: 'Character Testimonial',
    requestedBy: 'Student Alumna (Class of 2025)',
    destinationInstitution: 'National Youth Service Corps (NYSC) Directorate',
    paymentStatus: 'fee_cleared',
    bursaryReceiptNumber: 'BUR-RCP-9934',
    processingStatus: 'assistant_compiled',
    verificationQrCode: 'https://curriculumflow.edu.ng/verify/GFA-TST-2026-120',
    signedByPrincipal: false
  },
  {
    id: 'doc-03',
    requestNumber: 'DOC-REQ-2026-121',
    studentName: 'Oluwaseun Balogun',
    admissionNumber: 'GFA/2024/099',
    documentType: 'Certificate of Clearance',
    requestedBy: 'Transfer to Atlantic Hall, Pobe',
    destinationInstitution: 'Atlantic Hall Registrar Office',
    paymentStatus: 'fee_cleared',
    bursaryReceiptNumber: 'BUR-RCP-9940',
    processingStatus: 'issued_to_client',
    issuedDate: '2026-05-10',
    verificationQrCode: 'https://curriculumflow.edu.ng/verify/GFA-CLR-2026-121',
    signedByPrincipal: true,
    principalSignatureRef: 'PR-SIG-2026-BAL-99'
  },
  {
    id: 'doc-04',
    requestNumber: 'DOC-REQ-2026-122',
    studentName: 'Aisha Bello',
    admissionNumber: 'GFA/2023/077',
    documentType: 'Visa Embassy Verification Letter',
    requestedBy: 'Guardian (Dr. Bello) for UK Student Visa',
    destinationInstitution: 'UK Visas and Immigration (UKVI) Embassy Abuja',
    paymentStatus: 'fee_cleared',
    bursaryReceiptNumber: 'BUR-RCP-9952',
    processingStatus: 'principal_seal_applied',
    issuedDate: '2026-05-12',
    verificationQrCode: 'https://curriculumflow.edu.ng/verify/GFA-VSA-2026-122',
    signedByPrincipal: true,
    principalSignatureRef: 'PR-SIG-2026-BEL-77',
    trackingNumber: 'FEDEX-NG-401928'
  }
];

export const INITIAL_FACILITY_BOOKINGS: FacilityBookingEntry[] = [
  {
    id: 'fac-01',
    facilityName: 'Main Multi-Purpose Auditorium',
    bookedBy: 'Mrs. Amina Yusuf',
    department: 'Inter-House Debate & Arts Committee',
    eventTitle: 'Annual Inter-House Academic Quiz & Debate Championship',
    date: '2026-05-14',
    startTime: '10:00 AM',
    endTime: '01:30 PM',
    expectedAttendance: 450,
    technicalRequirements: ['Wireless Microphones (4x)', 'Digital Projector & Screen', 'Stage Lighting', 'Air Conditioning'],
    approvalStatus: 'approved_by_admin_assistant',
    notes: 'Approved under delegated Principal facility policy.'
  },
  {
    id: 'fac-02',
    facilityName: 'Digital ICT CBT Suite 1',
    bookedBy: 'Mr. David Sanusi (Exam Officer)',
    department: 'Directorate of Examinations',
    eventTitle: 'SS 3 WAEC Computer-Based Pre-Mock Simulation Exam',
    date: '2026-05-15',
    startTime: '08:30 AM',
    endTime: '03:00 PM',
    expectedAttendance: 120,
    technicalRequirements: ['120 Workstations with Safe Exam Browser', 'Dedicated 50 Mbps Fiber Link', 'Generator Power Backup'],
    approvalStatus: 'approved_by_admin_assistant',
    notes: 'Mandatory mock clearance issued.'
  },
  {
    id: 'fac-03',
    facilityName: 'Executive Boardroom',
    bookedBy: 'Office of the Principal',
    department: 'Executive Governance',
    eventTitle: 'Board of Governors & PTA Executive Steering Meeting',
    date: '2026-05-16',
    startTime: '02:00 PM',
    endTime: '05:00 PM',
    expectedAttendance: 22,
    technicalRequirements: ['Hybrid Zoom Telepresence', 'Executive Catering Setup', 'Digital Interactive Whiteboard'],
    approvalStatus: 'approved_by_admin_assistant',
    notes: 'Principal presided meeting; VIP refreshments reserved.'
  }
];
