import { 
  GatePickupPass, 
  GateSecurityScanLog, 
  LibraryResourceItem, 
  HostelDormitory, 
  StudentExeatRequest, 
  EveningRollCallEntry, 
  DiningMealRegister, 
  BusRoute, 
  BusDriverProfile, 
  BusMaintenanceRecord, 
  ParentGeofenceAlertNotification 
} from '../types';

// =================================================================
// A. GATE SECURITY KIOSK & GUARDIAN PICKUP DATA
// =================================================================
export const MOCK_GATE_PICKUP_PASSES: GatePickupPass[] = [
  {
    id: 'pass-001',
    passCode: 'GT-PASS-2026-892',
    studentId: 'std-ss2-01',
    studentName: 'Chidera Okafor',
    admissionNumber: 'KC/2023/0481',
    classGrade: 'SS 2',
    studentPhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    primaryParentName: 'Chief Emeka Okafor',
    authorizedGuardianName: 'Engr. Emeka Okafor (Father)',
    relationship: 'Father',
    guardianPhone: '+234 803 445 6789',
    guardianPhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    guardianNinOrId: 'NIN: 8940-1284-9021',
    qrPayload: 'SEC_AUTH::KC-2026-0481::EMK_OKAFOR::VALID_2026-08-22::HASH_9f81a7b',
    pinCode: '7492',
    validDate: '2026-08-22',
    expiryTime: '18:00',
    vehicleRegNumber: 'EKY-492-AA (Toyota Prado White)',
    isBoardingStudent: true,
    activeExeatApproved: true,
    status: 'active'
  },
  {
    id: 'pass-002',
    passCode: 'GT-PASS-2026-904',
    studentId: 'std-ss3-04',
    studentName: 'Amina Zainab Bello',
    admissionNumber: 'KC/2022/0119',
    classGrade: 'SS 3',
    studentPhotoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    primaryParentName: 'Alhaji Usman Bello',
    authorizedGuardianName: 'Mrs. Fatima Bello (Mother)',
    relationship: 'Mother',
    guardianPhone: '+234 802 998 1234',
    guardianPhotoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    guardianNinOrId: 'NIN: 7120-9943-1823',
    qrPayload: 'SEC_AUTH::KC-2022-0119::FAT_BELLO::VALID_2026-08-22::HASH_3c4d5e',
    pinCode: '3180',
    validDate: '2026-08-22',
    expiryTime: '17:30',
    vehicleRegNumber: 'LND-819-BH (Honda Pilot Black)',
    isBoardingStudent: false,
    status: 'active'
  },
  {
    id: 'pass-003',
    passCode: 'GT-PASS-2026-915',
    studentId: 'std-jss2-08',
    studentName: 'Tunde Adeleke Jr.',
    admissionNumber: 'KC/2024/0932',
    classGrade: 'JSS 2',
    studentPhotoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    primaryParentName: 'Barrister Tunde Adeleke',
    authorizedGuardianName: 'Mr. Gabriel Adeleke (Uncle / Designated Driver)',
    relationship: 'Family Driver / Uncle',
    guardianPhone: '+234 805 112 3344',
    guardianPhotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    guardianNinOrId: "Driver's Lic: LAG-89210-AA",
    qrPayload: 'SEC_AUTH::KC-2024-0932::GAB_ADELEKE::VALID_2026-08-22::HASH_8b9c1d',
    pinCode: '5821',
    validDate: '2026-08-22',
    expiryTime: '16:45',
    vehicleRegNumber: 'KJA-320-FD (Lexus RX350 Grey)',
    isBoardingStudent: false,
    status: 'scanned_out'
  },
  {
    id: 'pass-004',
    passCode: 'GT-PASS-2026-928',
    studentId: 'std-ss1-12',
    studentName: 'Ngozi Precious Eze',
    admissionNumber: 'KC/2024/0210',
    classGrade: 'SS 1',
    studentPhotoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
    primaryParentName: 'Dr. Chukwuemeka Eze',
    authorizedGuardianName: 'Mrs. Ifeoma Eze (Mother)',
    relationship: 'Mother',
    guardianPhone: '+234 809 334 5566',
    guardianPhotoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    guardianNinOrId: 'NIN: 4491-0021-3918',
    qrPayload: 'SEC_AUTH::KC-2024-0210::IFE_EZE::VALID_2026-08-22::HASH_7a1b2c',
    pinCode: '9034',
    validDate: '2026-08-22',
    expiryTime: '18:30',
    vehicleRegNumber: 'APP-551-GH (Toyota Highlander Silver)',
    isBoardingStudent: true,
    activeExeatApproved: false,
    status: 'active'
  }
];

export const MOCK_GATE_SECURITY_LOGS: GateSecurityScanLog[] = [
  {
    id: 'scan-log-01',
    timestamp: '2026-08-22 15:42:10',
    passId: 'pass-003',
    studentId: 'std-jss2-08',
    studentName: 'Tunde Adeleke Jr.',
    guardianName: 'Mr. Gabriel Adeleke',
    securityOfficerName: 'Sergeant Bamidele Olawale (Gate Post 1)',
    gateLocation: 'Main Front Gate Kiosk',
    authorizationStatus: 'authorized_exit',
    notes: 'QR code verified against facial photo. PIN 5821 matched. Vehicle KJA-320-FD logged out.',
    smsAlertSentToParent: true
  },
  {
    id: 'scan-log-02',
    timestamp: '2026-08-22 14:15:30',
    passId: 'pass-005',
    studentId: 'std-ss2-09',
    studentName: 'Ibrahim Danjuma',
    guardianName: 'Mallam Sani Danjuma (Brother)',
    securityOfficerName: 'Inspector Danladi Yakubu (Gate Post 2)',
    gateLocation: 'Boarding House South Gate',
    authorizationStatus: 'authorized_exit',
    notes: 'Medical exeat to St. Nicholas Hospital confirmed by House Master Dr. Babatunde.',
    smsAlertSentToParent: true
  },
  {
    id: 'scan-log-03',
    timestamp: '2026-08-22 13:20:05',
    passId: 'pass-invalid-01',
    studentId: 'std-ss1-03',
    studentName: 'Kehinde Balogun',
    guardianName: 'Unverified Visitor',
    securityOfficerName: 'Sergeant Bamidele Olawale (Gate Post 1)',
    gateLocation: 'Main Front Gate Kiosk',
    authorizationStatus: 'flagged_invalid_pin',
    notes: 'PIN entry failed 3 attempts. Guardian identity did not match registered parent profile. Student escorted back to Principal office.',
    smsAlertSentToParent: true
  }
];

// =================================================================
// B. DIGITAL E-LIBRARY & CURRICULUM REPOSITORY DATA
// =================================================================
export const MOCK_LIBRARY_RESOURCES: LibraryResourceItem[] = [
  {
    id: 'lib-res-01',
    title: 'New General Mathematics for Senior Secondary Schools (SS 1 - SS 3)',
    subjectId: 'sub-math-ss',
    subjectName: 'Mathematics',
    classGrade: 'SS 2',
    level: 'sss',
    type: 'nerdc_textbook',
    format: 'PDF',
    fileSizeMb: 42.8,
    authorOrPublisher: 'NERDC / Pearson Learn Africa Curriculum Board',
    editionOrYear: '2025 Revised National Edition',
    downloadCount: 2480,
    viewCount: 6890,
    coverImageUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=300&auto=format&fit=crop&q=80',
    fileDownloadUrl: '#download-nerdc-math-ss2',
    description: 'Official NERDC approved comprehensive mathematics textbook covering Algebra, Calculus, Trigonometry, Statistics, and Circle Theorems with worked WAEC step-by-step examples.',
    curriculumAlignedThemes: ['Theme 1: Number and Numeration', 'Theme 2: Algebraic Processes', 'Theme 3: Geometry & Trigonometry', 'Theme 4: Statistics & Probability'],
    isVerifiedByHOD: true
  },
  {
    id: 'lib-res-02',
    title: 'WAEC / WASSCE 10-Year Past Questions & Step-by-Step Marking Solutions (2014 - 2024)',
    subjectId: 'sub-phys-ss',
    subjectName: 'Physics',
    classGrade: 'SS 3',
    level: 'sss',
    type: 'waec_past_paper',
    format: 'PDF',
    fileSizeMb: 28.5,
    authorOrPublisher: 'West African Examinations Council (WAEC) Research Division',
    editionOrYear: '2024 Golden Jubilee Edition with Chief Examiner Reports',
    downloadCount: 4120,
    viewCount: 11450,
    coverImageUrl: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=300&auto=format&fit=crop&q=80',
    fileDownloadUrl: '#download-waec-physics-10yr',
    description: 'Complete collection of Paper 1 (Objective), Paper 2 (Theory), and Paper 3 (Practical Alternative) physics examinations with model solutions and common candidate error analyses.',
    curriculumAlignedThemes: ['Mechanics & Motion', 'Waves & Optics', 'Fields & Electricity', 'Atomic & Nuclear Physics'],
    isVerifiedByHOD: true
  },
  {
    id: 'lib-res-03',
    title: 'JAMB UTME Master CBT Chemistry Video Lecture Series & Reaction Mechanisms',
    subjectId: 'sub-chem-ss',
    subjectName: 'Chemistry',
    classGrade: 'SS 3',
    level: 'sss',
    type: 'video_lecture',
    format: 'MP4',
    fileSizeMb: 148.0,
    authorOrPublisher: 'Federal Science Equipment Centre / CurriculumFlow Studio',
    editionOrYear: '2026 HD Interactive Laboratory Masterclass',
    downloadCount: 1890,
    viewCount: 5420,
    coverImageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=300&auto=format&fit=crop&q=80',
    fileDownloadUrl: '#download-jamb-chem-video',
    description: 'Visual 3D laboratory demonstrations of volumetric titration, organic nomenclature (IUPAC), periodic table periodicity, and electrolysis calculation methods.',
    curriculumAlignedThemes: ['Periodic Trends & Bonding', 'Quantitative Analysis (Volumetric/Gravimetric)', 'Organic Chemistry IUPAC', 'Electrochemistry'],
    isVerifiedByHOD: true
  },
  {
    id: 'lib-res-04',
    title: 'Audio Courseware: Oral English Phonetics, Stress Patterns & Vowel Intonation',
    subjectId: 'sub-eng-ss',
    subjectName: 'English Language',
    classGrade: 'SS 1',
    level: 'sss',
    type: 'audio_courseware',
    format: 'MP3',
    fileSizeMb: 36.4,
    authorOrPublisher: 'National English Language Centre Lagos / BBC World Accent Unit',
    editionOrYear: '2025/2026 Digital Audio Companion (32 Modules)',
    downloadCount: 3100,
    viewCount: 8200,
    coverImageUrl: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=300&auto=format&fit=crop&q=80',
    fileDownloadUrl: '#download-oral-english-mp3',
    description: 'Studio-recorded pronunciation audio exercises covering monophthongs, diphthongs, consonant clusters, emphatic stress, and syllable rhyming for WAEC Test of Orals.',
    curriculumAlignedThemes: ['Vowels & Consonant Sounds', 'Syllable Structure & Word Stress', 'Intonation & Emphatic Rhythm'],
    isVerifiedByHOD: true
  },
  {
    id: 'lib-res-05',
    title: 'NECO BECE Junior Secondary Basic Science & Technology Comprehensive Digest',
    subjectId: 'sub-bst-jss',
    subjectName: 'Basic Science & Technology',
    classGrade: 'JSS 3',
    level: 'jss',
    type: 'neco_past_paper',
    format: 'PDF',
    fileSizeMb: 19.2,
    authorOrPublisher: 'National Examinations Council (NECO) Minna',
    editionOrYear: '2024 Standard Edition',
    downloadCount: 1750,
    viewCount: 4300,
    coverImageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&auto=format&fit=crop&q=80',
    fileDownloadUrl: '#download-neco-bece-bst',
    description: 'All-inclusive BECE revision paper combining Basic Science, Basic Technology, Computer Studies, and Physical & Health Education modules.',
    curriculumAlignedThemes: ['Living & Non-Living Things', 'Basic Workshop Tools', 'Computer Hardware & Networking', 'Personal Health & Nutrition'],
    isVerifiedByHOD: true
  },
  {
    id: 'lib-res-06',
    title: 'Staff Upload: SS 2 Economics Macro-economic Policy Analysis & Fiscal Budget Worksheet',
    subjectId: 'sub-econ-ss',
    subjectName: 'Economics',
    classGrade: 'SS 2',
    level: 'sss',
    type: 'staff_uploaded_worksheet',
    format: 'PDF',
    fileSizeMb: 4.8,
    authorOrPublisher: 'Uploaded by Mr. Adeyemi O. (HOD Social Sciences)',
    editionOrYear: 'Term 2 Week 5 Practice Drill',
    downloadCount: 840,
    viewCount: 1920,
    coverImageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=300&auto=format&fit=crop&q=80',
    fileDownloadUrl: '#download-staff-econ-worksheet',
    description: 'Curriculum-aligned practice questions on Central Bank Monetary policy, Inflation calculation formulas, and Nigeria’s Federal Budget Allocations.',
    curriculumAlignedThemes: ['Theme 3: Public Finance & Fiscal Policy', 'Theme 4: National Income Accounting'],
    isStaffUploaded: true,
    uploadedByStaffName: 'Mr. Adeyemi O. (Senior Economics Master)',
    uploadedAt: '2026-08-18 11:30:00',
    isVerifiedByHOD: true
  }
];

// =================================================================
// C. BOARDING HOUSE & HOSTEL MANAGEMENT SUITE DATA
// =================================================================
export const MOCK_HOSTEL_DORMS: HostelDormitory[] = [
  {
    id: 'dorm-01',
    name: "King Jaja of Opobo Hall (Senior Boys)",
    gender: 'Boys',
    category: 'Senior Secondary',
    houseMasterName: 'Mr. Samuel Adebayo, M.Ed.',
    houseMasterPhone: '+234 803 555 1201',
    assistantHouseMasterName: 'Mr. Peter Okon',
    totalCapacity: 160,
    occupiedCount: 148,
    availableBeds: 12,
    occupancyRatePercent: 92.5,
    colorHex: '#3b82f6', // Blue
    prefectsCount: 4,
    status: 'optimal',
    rooms: [
      { id: 'rm-101', roomNumber: 'Room A-101', floor: 'Ground Floor', totalBeds: 16, occupiedBeds: 16, bedNumbers: ['Bed 01', 'Bed 02', 'Bed 03', 'Bed 04', 'Bed 05', 'Bed 06', 'Bed 07', 'Bed 08', 'Bed 09', 'Bed 10', 'Bed 11', 'Bed 12', 'Bed 13', 'Bed 14', 'Bed 15', 'Bed 16'], wing: 'North Wing', prefectInCharge: 'Head Boy: Tolu Ojo' },
      { id: 'rm-102', roomNumber: 'Room A-102', floor: 'Ground Floor', totalBeds: 16, occupiedBeds: 15, bedNumbers: ['Bed 01', 'Bed 02', 'Bed 03', 'Bed 04', 'Bed 05', 'Bed 06', 'Bed 07', 'Bed 08', 'Bed 09', 'Bed 10', 'Bed 11', 'Bed 12', 'Bed 13', 'Bed 14', 'Bed 15', 'Bed 16 (Vacant)'], wing: 'North Wing' },
      { id: 'rm-201', roomNumber: 'Room A-201', floor: 'First Floor', totalBeds: 16, occupiedBeds: 14, bedNumbers: ['Bed 01', 'Bed 02', 'Bed 03', 'Bed 04', 'Bed 05', 'Bed 06', 'Bed 07', 'Bed 08', 'Bed 09', 'Bed 10', 'Bed 11', 'Bed 12', 'Bed 13', 'Bed 14', 'Bed 15 (Vacant)', 'Bed 16 (Vacant)'], wing: 'South Wing' },
      { id: 'rm-202', roomNumber: 'Room A-202', floor: 'First Floor', totalBeds: 16, occupiedBeds: 16, bedNumbers: ['Bed 01-16 Occupied'], wing: 'South Wing' },
      { id: 'rm-iso', roomNumber: 'Isolation Sickbay Bay 1', floor: 'Ground Floor', totalBeds: 8, occupiedBeds: 2, bedNumbers: ['Bed I-1', 'Bed I-2', 'Bed I-3', 'Bed I-4', 'Bed I-5', 'Bed I-6', 'Bed I-7', 'Bed I-8'], wing: 'East Wing', isIsolationRoom: true }
    ]
  },
  {
    id: 'dorm-02',
    name: 'Queen Amina Hall (Senior Girls)',
    gender: 'Girls',
    category: 'Senior Secondary',
    houseMasterName: 'Mrs. Folake Ogunleye, B.Ed.',
    houseMasterPhone: '+234 802 888 3402',
    assistantHouseMasterName: 'Ms. Ngozi Nwosu',
    totalCapacity: 160,
    occupiedCount: 156,
    availableBeds: 4,
    occupancyRatePercent: 97.5,
    colorHex: '#ec4899', // Pink
    prefectsCount: 4,
    status: 'near_capacity',
    rooms: [
      { id: 'rm-b101', roomNumber: 'Room B-101', floor: 'Ground Floor', totalBeds: 16, occupiedBeds: 16, bedNumbers: ['Bed 01-16 Occupied'], wing: 'East Wing', prefectInCharge: 'Head Girl: Amina Bello' },
      { id: 'rm-b102', roomNumber: 'Room B-102', floor: 'Ground Floor', totalBeds: 16, occupiedBeds: 16, bedNumbers: ['Bed 01-16 Occupied'], wing: 'East Wing' },
      { id: 'rm-b201', roomNumber: 'Room B-201', floor: 'First Floor', totalBeds: 16, occupiedBeds: 15, bedNumbers: ['Bed 01-15 Occupied', 'Bed 16 (Vacant)'], wing: 'West Wing' },
      { id: 'rm-b202', roomNumber: 'Room B-202', floor: 'First Floor', totalBeds: 16, occupiedBeds: 16, bedNumbers: ['Bed 01-16 Occupied'], wing: 'West Wing' }
    ]
  },
  {
    id: 'dorm-03',
    name: 'Sir Ahmadu Bello House (Junior Boys)',
    gender: 'Boys',
    category: 'Junior Secondary',
    houseMasterName: 'Mallam Shehu Garba',
    houseMasterPhone: '+234 803 777 9903',
    assistantHouseMasterName: 'Mr. David Adeleke',
    totalCapacity: 140,
    occupiedCount: 118,
    availableBeds: 22,
    occupancyRatePercent: 84.2,
    colorHex: '#10b981', // Emerald
    prefectsCount: 3,
    status: 'optimal',
    rooms: [
      { id: 'rm-c101', roomNumber: 'Room C-101', floor: 'Ground Floor', totalBeds: 20, occupiedBeds: 18, bedNumbers: ['Bed 01-18 Occupied', 'Bed 19-20 (Vacant)'], wing: 'North Wing' },
      { id: 'rm-c102', roomNumber: 'Room C-102', floor: 'Ground Floor', totalBeds: 20, occupiedBeds: 16, bedNumbers: ['Bed 01-16 Occupied', 'Bed 17-20 (Vacant)'], wing: 'North Wing' },
      { id: 'rm-c201', roomNumber: 'Room C-201', floor: 'First Floor', totalBeds: 20, occupiedBeds: 17, bedNumbers: ['Bed 01-17 Occupied', 'Bed 18-20 (Vacant)'], wing: 'South Wing' }
    ]
  },
  {
    id: 'dorm-04',
    name: 'Moremi Hall (Junior Girls)',
    gender: 'Girls',
    category: 'Junior Secondary',
    houseMasterName: 'Mrs. Blessing Danjuma',
    houseMasterPhone: '+234 809 222 4404',
    assistantHouseMasterName: 'Mrs. Zainab Aliyu',
    totalCapacity: 140,
    occupiedCount: 132,
    availableBeds: 8,
    occupancyRatePercent: 94.2,
    colorHex: '#8b5cf6', // Purple
    prefectsCount: 3,
    status: 'optimal',
    rooms: [
      { id: 'rm-d101', roomNumber: 'Room D-101', floor: 'Ground Floor', totalBeds: 20, occupiedBeds: 19, bedNumbers: ['Bed 01-19 Occupied', 'Bed 20 (Vacant)'], wing: 'East Wing' },
      { id: 'rm-d102', roomNumber: 'Room D-102', floor: 'Ground Floor', totalBeds: 20, occupiedBeds: 18, bedNumbers: ['Bed 01-18 Occupied', 'Bed 19-20 (Vacant)'], wing: 'East Wing' }
    ]
  }
];

export const MOCK_EXEAT_REQUESTS: StudentExeatRequest[] = [
  {
    id: 'ext-001',
    exeatNumber: 'EXT-2026-084',
    studentId: 'std-ss2-01',
    studentName: 'Chidera Okafor',
    admissionNumber: 'KC/2023/0481',
    classGrade: 'SS 2',
    dormitoryId: 'dorm-01',
    dormitoryName: "King Jaja of Opobo Hall",
    roomNumber: 'Room A-101',
    exeatType: 'weekend_home',
    reason: "Attending elder sister's wedding ceremony in Lekki, Lagos. Parent requested exit.",
    destinationAddress: 'Plot 14 Admiralty Way, Lekki Phase 1, Lagos',
    destinationState: 'Lagos State',
    parentOrGuardianName: 'Chief Emeka Okafor',
    parentPhone: '+234 803 445 6789',
    departureDate: '2026-08-22',
    departureTime: '15:00',
    expectedReturnDate: '2026-08-24',
    expectedReturnTime: '17:00',
    status: 'approved_by_housemaster',
    houseMasterNotes: 'Parent called and confirmed via phone. Form submitted with signed letter. Approved.',
    houseMasterApprovedAt: '2026-08-22 10:15:00',
    houseMasterName: 'Mr. Samuel Adebayo (House Master)',
    parentConsentConfirmed: true,
    qrVerificationHash: 'EXEAT_VERIFY::EXT-2026-084::KC-2023-0481::CHIDERA_OKAFOR::APPROVED'
  },
  {
    id: 'ext-002',
    exeatNumber: 'EXT-2026-085',
    studentId: 'std-ss1-09',
    studentName: 'Farouk Al-Hassan',
    admissionNumber: 'KC/2024/0592',
    classGrade: 'SS 1',
    dormitoryId: 'dorm-01',
    dormitoryName: "King Jaja of Opobo Hall",
    roomNumber: 'Room A-102',
    exeatType: 'medical_hospital',
    reason: 'Dental appointment & orthodontic adjustment at Lagoon Hospital Ikoyi.',
    destinationAddress: 'Lagoon Hospital, 17 Marine Road, Apapa/Ikoyi, Lagos',
    destinationState: 'Lagos State',
    parentOrGuardianName: 'Dr. (Mrs.) Halima Al-Hassan',
    parentPhone: '+234 802 334 9911',
    departureDate: '2026-08-23',
    departureTime: '08:30',
    expectedReturnDate: '2026-08-23',
    expectedReturnTime: '16:00',
    status: 'pending_housemaster',
    parentConsentConfirmed: true,
    qrVerificationHash: 'EXEAT_VERIFY::EXT-2026-085::KC-2024-0592::FAROUK::PENDING'
  },
  {
    id: 'ext-003',
    exeatNumber: 'EXT-2026-079',
    studentId: 'std-ss3-04',
    studentName: 'Amina Zainab Bello',
    admissionNumber: 'KC/2022/0119',
    classGrade: 'SS 3',
    dormitoryId: 'dorm-02',
    dormitoryName: 'Queen Amina Hall',
    roomNumber: 'Room B-101',
    exeatType: 'academic_competition',
    reason: 'Representing school at Lagos State NNPC National Science Quiz Finals.',
    destinationAddress: 'Eko Hotel & Suites, Victoria Island, Lagos',
    destinationState: 'Lagos State',
    parentOrGuardianName: 'Alhaji Usman Bello',
    parentPhone: '+234 802 998 1234',
    departureDate: '2026-08-20',
    departureTime: '07:00',
    expectedReturnDate: '2026-08-21',
    expectedReturnTime: '18:00',
    actualReturnTimestamp: '2026-08-21 17:35:00',
    status: 'returned_and_signed_in',
    houseMasterNotes: 'Returned safely with Trophy (1st Position in State). Signed in with Matron.',
    houseMasterApprovedAt: '2026-08-19 14:20:00',
    houseMasterName: 'Mrs. Folake Ogunleye',
    gateExitScannedAt: '2026-08-20 07:12:00',
    gateReturnScannedAt: '2026-08-21 17:35:00',
    parentConsentConfirmed: true,
    qrVerificationHash: 'EXEAT_VERIFY::EXT-2026-079::KC-2022-0119::AMINA_BELLO::COMPLETED'
  }
];

export const MOCK_ROLL_CALLS: EveningRollCallEntry[] = [
  {
    id: 'rc-01',
    date: '2026-08-21',
    dormitoryId: 'dorm-01',
    dormitoryName: "King Jaja of Opobo Hall",
    totalBoarders: 148,
    presentCount: 144,
    absentOnApprovedExeat: 3,
    absentInSickBay: 1,
    unaccountedAbsenceCount: 0,
    conductedBy: 'Mr. Samuel Adebayo (House Master)',
    timestamp: '2026-08-21 21:30:00',
    remarks: 'All 148 boys accounted for. 3 on verified exeat (Okafor, Adeleke, Bello). 1 in Sick Bay (Musa - Mild fever).'
  },
  {
    id: 'rc-02',
    date: '2026-08-21',
    dormitoryId: 'dorm-02',
    dormitoryName: 'Queen Amina Hall',
    totalBoarders: 156,
    presentCount: 154,
    absentOnApprovedExeat: 2,
    absentInSickBay: 0,
    unaccountedAbsenceCount: 0,
    conductedBy: 'Mrs. Folake Ogunleye (House Mistress)',
    timestamp: '2026-08-21 21:30:00',
    remarks: 'Roll call orderly. Senior prefects led evening devotionals.'
  }
];

export const MOCK_DINING_REGISTERS: DiningMealRegister[] = [
  {
    id: 'meal-01',
    date: '2026-08-22',
    mealType: 'Breakfast',
    menuItems: ['Golden Pap (Ogi) & Crispy Bean Cakes (Akara)', 'Fried Plantain (Dodo) & Boiled Eggs', 'Warm Cocoa Beverage & Fresh Bread'],
    specialDietMealsCount: 8,
    totalBoardersServed: 546,
    inspectionPassedByNurse: true,
    foodCommitteeRepresentative: 'Prefect: David Adeleke',
    notes: 'Food quality scored 9.4/10 by Boarders Committee. Hall hygienically sanitized.'
  },
  {
    id: 'meal-02',
    date: '2026-08-22',
    mealType: 'Lunch',
    menuItems: ['Smoky Nigerian Jollof Rice & Fried Chicken', 'Steamed Moin-Moin with Boiled Egg', 'Fresh Chilled Fruit Salad'],
    specialDietMealsCount: 10,
    totalBoardersServed: 550,
    inspectionPassedByNurse: true,
    foodCommitteeRepresentative: 'Prefect: Amina Bello',
    notes: 'Timely service commenced 13:00 promptly.'
  }
];

// =================================================================
// D. SCHOOL BUS TRANSPORTATION & ROUTE MANAGEMENT DATA
// =================================================================
export const MOCK_BUS_ROUTES: BusRoute[] = [
  {
    id: 'route-01',
    routeCode: 'BUS-RT-01 (Island Express)',
    routeName: 'Lekki - Victoria Island - Ikoyi - Campus',
    assignedBusVehicleId: 'bus-veh-01',
    busPlateNumber: 'LAG-892-KT (Coaster Bus 01 - 32 Seater)',
    driverName: 'Mr. Kehinde Ogundipe',
    driverPhone: '+234 803 221 4455',
    busAttendantName: 'Mrs. Abigail Martins',
    busAttendantPhone: '+234 802 119 8877',
    capacity: 32,
    totalAssignedStudents: 28,
    currentTripStatus: 'afternoon_dropoff_in_progress',
    currentActiveStopIndex: 1,
    gpsCoordinates: {
      lat: 6.4281,
      lng: 3.4219,
      speedKmh: 42,
      headingDeg: 185,
      lastUpdated: '10 seconds ago'
    },
    routeStops: [
      {
        id: 'stop-01',
        stopName: 'Lekki Phase 1 (Admiralty Way Junction)',
        latitude: 6.4474,
        longitude: 3.4723,
        geofenceRadiusMeters: 500,
        estimatedArrivalMorning: '06:45 AM',
        estimatedArrivalAfternoon: '04:15 PM',
        assignedStudentIds: ['std-01', 'std-02', 'std-03', 'std-04', 'std-05', 'std-06'],
        assignedStudentCount: 6
      },
      {
        id: 'stop-02',
        stopName: 'Victoria Island (1004 Estate Front Gate)',
        latitude: 6.4312,
        longitude: 3.4284,
        geofenceRadiusMeters: 500,
        estimatedArrivalMorning: '07:05 AM',
        estimatedArrivalAfternoon: '04:35 PM',
        assignedStudentIds: ['std-07', 'std-08', 'std-09', 'std-10', 'std-11', 'std-12', 'std-13', 'std-14'],
        assignedStudentCount: 8
      },
      {
        id: 'stop-03',
        stopName: 'Ikoyi (Parkview Estate Main Gate)',
        latitude: 6.4520,
        longitude: 3.4410,
        geofenceRadiusMeters: 500,
        estimatedArrivalMorning: '07:25 AM',
        estimatedArrivalAfternoon: '04:55 PM',
        assignedStudentIds: ['std-15', 'std-16', 'std-17', 'std-18', 'std-19', 'std-20'],
        assignedStudentCount: 6
      },
      {
        id: 'stop-04',
        stopName: 'Onikan / TBS Terminal',
        latitude: 6.4440,
        longitude: 3.4020,
        geofenceRadiusMeters: 500,
        estimatedArrivalMorning: '07:45 AM',
        estimatedArrivalAfternoon: '05:15 PM',
        assignedStudentIds: ['std-21', 'std-22', 'std-23', 'std-24', 'std-25', 'std-26', 'std-27', 'std-28'],
        assignedStudentCount: 8
      }
    ]
  },
  {
    id: 'route-02',
    routeCode: 'BUS-RT-02 (Mainland Shuttle)',
    routeName: 'Ikeja GRA - Maryland - Gbagada - Yaba - Campus',
    assignedBusVehicleId: 'bus-veh-02',
    busPlateNumber: 'KJA-412-FD (Toyota HiAce Bus 02 - 18 Seater)',
    driverName: 'Mr. Timothy Adeleke',
    driverPhone: '+234 805 778 9900',
    busAttendantName: 'Mr. Jude Chukwu',
    busAttendantPhone: '+234 809 332 1100',
    capacity: 18,
    totalAssignedStudents: 16,
    currentTripStatus: 'morning_trip_completed',
    currentActiveStopIndex: 3,
    gpsCoordinates: {
      lat: 6.5244,
      lng: 3.3792,
      speedKmh: 0,
      headingDeg: 0,
      lastUpdated: '5 mins ago (Parked at School Bay)'
    },
    routeStops: [
      {
        id: 'stop-m01',
        stopName: 'Ikeja GRA (Isaac John Street Post Office)',
        latitude: 6.5862,
        longitude: 3.3564,
        geofenceRadiusMeters: 500,
        estimatedArrivalMorning: '06:30 AM',
        estimatedArrivalAfternoon: '04:30 PM',
        assignedStudentIds: ['std-m1', 'std-m2', 'std-m3', 'std-m4'],
        assignedStudentCount: 4
      },
      {
        id: 'stop-m02',
        stopName: 'Maryland Mall Bus Stop',
        latitude: 6.5684,
        longitude: 3.3680,
        geofenceRadiusMeters: 500,
        estimatedArrivalMorning: '06:50 AM',
        estimatedArrivalAfternoon: '04:50 PM',
        assignedStudentIds: ['std-m5', 'std-m6', 'std-m7', 'std-m8'],
        assignedStudentCount: 4
      },
      {
        id: 'stop-m03',
        stopName: 'Gbagada Phase 2 Gate',
        latitude: 6.5510,
        longitude: 3.3850,
        geofenceRadiusMeters: 500,
        estimatedArrivalMorning: '07:10 AM',
        estimatedArrivalAfternoon: '05:10 PM',
        assignedStudentIds: ['std-m9', 'std-m10', 'std-m11', 'std-m12'],
        assignedStudentCount: 4
      },
      {
        id: 'stop-m04',
        stopName: 'Yaba Tech Junction / Commercial Avenue',
        latitude: 6.5180,
        longitude: 3.3720,
        geofenceRadiusMeters: 500,
        estimatedArrivalMorning: '07:30 AM',
        estimatedArrivalAfternoon: '05:30 PM',
        assignedStudentIds: ['std-m13', 'std-m14', 'std-m15', 'std-m16'],
        assignedStudentCount: 4
      }
    ]
  }
];

export const MOCK_BUS_DRIVERS: BusDriverProfile[] = [
  {
    id: 'drv-01',
    fullName: 'Mr. Kehinde Ogundipe',
    phone: '+234 803 221 4455',
    licenseNumber: 'FRSC-DRV-LAG-982104-E',
    licenseExpiryDate: '2028-11-30',
    yearsOfExperience: 14,
    assignedBusNumber: 'Bus 01 (Island Express Coaster)',
    medicalClearanceStatus: 'passed',
    safetyRating: 4.95,
    lastDrugTestDate: '2026-07-15'
  },
  {
    id: 'drv-02',
    fullName: 'Mr. Timothy Adeleke',
    phone: '+234 805 778 9900',
    licenseNumber: 'FRSC-DRV-LAG-771209-B',
    licenseExpiryDate: '2027-04-18',
    yearsOfExperience: 9,
    assignedBusNumber: 'Bus 02 (Mainland Shuttle HiAce)',
    medicalClearanceStatus: 'passed',
    safetyRating: 4.88,
    lastDrugTestDate: '2026-07-15'
  }
];

export const MOCK_BUS_MAINTENANCE_LOGS: BusMaintenanceRecord[] = [
  {
    id: 'maint-01',
    busVehicleId: 'bus-veh-01',
    plateNumber: 'LAG-892-KT (Bus 01)',
    serviceType: 'Routine 5000km Engine Oil & Filter',
    serviceDate: '2026-08-10',
    mileageKm: 45200,
    costNgn: 85000,
    servicedByWorkshop: 'Toyota Certified Care Centre Lagos',
    nextServiceDueDate: '2026-11-10',
    approvedByTransportOfficer: 'Engr. Dapo Alabi (Transport Head)',
    status: 'completed'
  },
  {
    id: 'maint-02',
    busVehicleId: 'bus-veh-02',
    plateNumber: 'KJA-412-FD (Bus 02)',
    serviceType: 'Brake Pad & Hydraulic Overhaul',
    serviceDate: '2026-08-04',
    mileageKm: 62100,
    costNgn: 120000,
    servicedByWorkshop: 'AutoMedics Master Workshop Ikeja',
    nextServiceDueDate: '2026-12-04',
    approvedByTransportOfficer: 'Engr. Dapo Alabi (Transport Head)',
    status: 'completed'
  }
];

export const MOCK_GEOFENCE_NOTIFICATIONS: ParentGeofenceAlertNotification[] = [
  {
    id: 'geo-notif-01',
    timestamp: '2026-08-22 16:32:00',
    busRouteCode: 'BUS-RT-01 (Island Express)',
    busPlateNumber: 'LAG-892-KT',
    stopName: 'Victoria Island (1004 Estate Front Gate)',
    studentName: 'Amina Zainab Bello',
    parentPhone: '+234 802 998 1234',
    parentName: 'Mrs. Fatima Bello',
    alertType: 'approaching_geofence',
    messageText: "🚍 Proximity Alert: School Bus #01 has entered the 500m geofence near '1004 Estate Front Gate'. Estimated arrival in 4 minutes. Please be ready for student drop-off.",
    isRead: false
  },
  {
    id: 'geo-notif-02',
    timestamp: '2026-08-22 16:14:22',
    busRouteCode: 'BUS-RT-01 (Island Express)',
    busPlateNumber: 'LAG-892-KT',
    stopName: 'Lekki Phase 1 (Admiralty Way Junction)',
    studentName: 'Chidera Okafor',
    parentPhone: '+234 803 445 6789',
    parentName: 'Chief Emeka Okafor',
    alertType: 'student_dropped_off',
    messageText: "✅ Safe Drop-off: Chidera Okafor was successfully scanned and received by authorized guardian at Lekki Phase 1 stop.",
    isRead: true
  }
];
