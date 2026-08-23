import React, { useState, useMemo } from 'react';
import { 
  UserProfile, 
  SchoolBrandProfile,
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
import { 
  MOCK_GATE_PICKUP_PASSES,
  MOCK_GATE_SECURITY_LOGS,
  MOCK_LIBRARY_RESOURCES,
  MOCK_HOSTEL_DORMS,
  MOCK_EXEAT_REQUESTS,
  MOCK_ROLL_CALLS,
  MOCK_DINING_REGISTERS,
  MOCK_BUS_ROUTES,
  MOCK_BUS_DRIVERS,
  MOCK_BUS_MAINTENANCE_LOGS,
  MOCK_GEOFENCE_NOTIFICATIONS
} from '../data/logisticsManagementData';
import { BoardingHouseD3Dashboard } from './logistics/BoardingHouseD3Dashboard';
import { 
  ShieldCheck, 
  ScanLine, 
  QrCode, 
  Camera, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Play, 
  Pause, 
  Volume2, 
  FileText, 
  BookOpen, 
  Building, 
  Bed, 
  Users, 
  Bus, 
  MapPin, 
  Navigation, 
  Bell, 
  Phone, 
  Car, 
  Plus, 
  Check, 
  X, 
  Send, 
  Sparkles, 
  Clock, 
  Calendar, 
  Maximize2,
  Lock,
  UserCheck,
  ChevronRight,
  ExternalLink,
  Tag,
  Radio,
  FileCheck,
  Eye
} from 'lucide-react';

interface LogisticsSupportSuiteTabProps {
  currentUser: UserProfile;
  brandProfile?: SchoolBrandProfile;
  onOpenSubjectDetails?: (subjectId: string) => void;
}

export type LogisticsSubTab = 
  | 'gate_security' 
  | 'digital_elibrary' 
  | 'boarding_house' 
  | 'bus_transportation';

export const LogisticsSupportSuiteTab: React.FC<LogisticsSupportSuiteTabProps> = ({
  currentUser,
  brandProfile,
  onOpenSubjectDetails
}) => {
  const [activeSubTab, setActiveSubTab] = useState<LogisticsSubTab>('gate_security');

  // =========================================================================
  // 1. GATE SECURITY KIOSK STATE
  // =========================================================================
  const [gatePasses, setGatePasses] = useState<GatePickupPass[]>(MOCK_GATE_PICKUP_PASSES);
  const [gateLogs, setGateLogs] = useState<GateSecurityScanLog[]>(MOCK_GATE_SECURITY_LOGS);
  const [scannerInput, setScannerInput] = useState<string>('');
  const [scannedPass, setScannedPass] = useState<GatePickupPass | null>(MOCK_GATE_PICKUP_PASSES[0]);
  const [pinEntry, setPinEntry] = useState<string>('');
  const [gateActionStatus, setGateActionStatus] = useState<'idle' | 'success' | 'flagged'>('idle');
  const [gateActionMessage, setGateActionMessage] = useState<string>('');
  const [smsDispatchEnabled, setSmsDispatchEnabled] = useState<boolean>(true);
  const [isCameraScannerActive, setIsCameraScannerActive] = useState<boolean>(false);

  const handleScanPass = (passCodeOrPayload: string) => {
    const trimmed = passCodeOrPayload.trim();
    const found = gatePasses.find(p => 
      p.passCode.toLowerCase() === trimmed.toLowerCase() ||
      p.qrPayload.includes(trimmed) ||
      p.admissionNumber.toLowerCase() === trimmed.toLowerCase() ||
      p.studentName.toLowerCase().includes(trimmed.toLowerCase())
    );

    if (found) {
      setScannedPass(found);
      setGateActionStatus('idle');
      setGateActionMessage('');
      setPinEntry('');
    } else {
      setGateActionStatus('flagged');
      setGateActionMessage(`No registered gate pass found for identifier: "${trimmed}"`);
    }
  };

  const handleAuthorizeExit = () => {
    if (!scannedPass) return;

    // Check PIN if entered
    if (pinEntry && pinEntry !== scannedPass.pinCode) {
      setGateActionStatus('flagged');
      setGateActionMessage('PIN mismatch! Verification failed. Student exit not authorized.');
      
      const newLog: GateSecurityScanLog = {
        id: `scan-log-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        passId: scannedPass.id,
        studentId: scannedPass.studentId,
        studentName: scannedPass.studentName,
        guardianName: scannedPass.authorizedGuardianName,
        securityOfficerName: `${currentUser.name} (Gate Post)`,
        gateLocation: 'Main Front Gate Kiosk',
        authorizationStatus: 'flagged_invalid_pin',
        notes: `PIN mismatch entered (${pinEntry}). Exit blocked.`,
        smsAlertSentToParent: smsDispatchEnabled
      };
      setGateLogs(prev => [newLog, ...prev]);
      return;
    }

    // Check boarder exeat requirement
    if (scannedPass.isBoardingStudent && !scannedPass.activeExeatApproved) {
      setGateActionStatus('flagged');
      setGateActionMessage('Boarding student has NO approved active Exeat on record! Contact House Master immediately.');
      
      const newLog: GateSecurityScanLog = {
        id: `scan-log-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        passId: scannedPass.id,
        studentId: scannedPass.studentId,
        studentName: scannedPass.studentName,
        guardianName: scannedPass.authorizedGuardianName,
        securityOfficerName: `${currentUser.name} (Gate Post)`,
        gateLocation: 'Main Front Gate Kiosk',
        authorizationStatus: 'unauthorized_guardian',
        notes: 'Boarding student lacked active approved exeat. Gate exit denied.',
        smsAlertSentToParent: smsDispatchEnabled
      };
      setGateLogs(prev => [newLog, ...prev]);
      return;
    }

    // Success exit
    setGateActionStatus('success');
    setGateActionMessage(`✅ Student exit AUTHORIZED for ${scannedPass.studentName}. Parent SMS notification dispatched.`);
    
    // Update pass status
    setGatePasses(prev => prev.map(p => p.id === scannedPass.id ? { ...p, status: 'scanned_out' } : p));
    
    // Append to security logs
    const newLog: GateSecurityScanLog = {
      id: `scan-log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      passId: scannedPass.id,
      studentId: scannedPass.studentId,
      studentName: scannedPass.studentName,
      guardianName: scannedPass.authorizedGuardianName,
      securityOfficerName: `${currentUser.name} (Gate Security)`,
      gateLocation: 'Main Front Gate Kiosk',
      authorizationStatus: 'authorized_exit',
      notes: `Verified QR pass ${scannedPass.passCode}. Vehicle: ${scannedPass.vehicleRegNumber || 'Pedestrian'}. Guardian: ${scannedPass.authorizedGuardianName}`,
      smsAlertSentToParent: smsDispatchEnabled
    };
    setGateLogs(prev => [newLog, ...prev]);
  };

  // =========================================================================
  // 2. DIGITAL E-LIBRARY STATE
  // =========================================================================
  const [libraryResources, setLibraryResources] = useState<LibraryResourceItem[]>(MOCK_LIBRARY_RESOURCES);
  const [libSearchQuery, setLibSearchQuery] = useState<string>('');
  const [libLevelFilter, setLibLevelFilter] = useState<string>('all');
  const [libTypeFilter, setLibTypeFilter] = useState<string>('all');
  const [activeMediaResource, setActiveMediaResource] = useState<LibraryResourceItem | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  // New staff upload form state
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceSubject, setNewResourceSubject] = useState('Mathematics');
  const [newResourceGrade, setNewResourceGrade] = useState('SS 2');
  const [newResourceType, setNewResourceType] = useState<any>('staff_uploaded_worksheet');
  const [newResourceFormat, setNewResourceFormat] = useState<any>('PDF');
  const [newResourceDescription, setNewResourceDescription] = useState('');
  const [newResourceThemes, setNewResourceThemes] = useState('');

  const filteredLibrary = useMemo(() => {
    return libraryResources.filter(res => {
      if (libLevelFilter !== 'all' && res.level !== libLevelFilter) return false;
      if (libTypeFilter !== 'all' && res.type !== libTypeFilter) return false;
      if (libSearchQuery.trim()) {
        const q = libSearchQuery.toLowerCase();
        const matchTitle = res.title.toLowerCase().includes(q);
        const matchSubj = res.subjectName.toLowerCase().includes(q);
        const matchAuthor = res.authorOrPublisher.toLowerCase().includes(q);
        const matchDesc = res.description.toLowerCase().includes(q);
        if (!matchTitle && !matchSubj && !matchAuthor && !matchDesc) return false;
      }
      return true;
    });
  }, [libraryResources, libLevelFilter, libTypeFilter, libSearchQuery]);

  const handleAddStaffResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResourceTitle.trim()) return;

    const newRes: LibraryResourceItem = {
      id: `lib-staff-${Date.now()}`,
      title: newResourceTitle,
      subjectId: `sub-${newResourceSubject.toLowerCase().replace(/\s+/g, '-')}`,
      subjectName: newResourceSubject,
      classGrade: newResourceGrade,
      level: newResourceGrade.startsWith('SS') ? 'sss' : 'jss',
      type: newResourceType,
      format: newResourceFormat,
      fileSizeMb: 5.4,
      authorOrPublisher: `Uploaded by ${currentUser.name}`,
      editionOrYear: '2026 Curriculum Aligned',
      downloadCount: 1,
      viewCount: 1,
      coverImageUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=300&auto=format&fit=crop&q=80',
      fileDownloadUrl: `#download-${Date.now()}`,
      description: newResourceDescription || 'Curriculum aligned teaching resource uploaded for student self-study.',
      curriculumAlignedThemes: newResourceThemes ? newResourceThemes.split(',').map(s => s.trim()) : ['General Curriculum Themes'],
      isStaffUploaded: true,
      uploadedByStaffName: currentUser.name,
      uploadedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      isVerifiedByHOD: true
    };

    setLibraryResources(prev => [newRes, ...prev]);
    setIsUploadModalOpen(false);
    // Reset form
    setNewResourceTitle('');
    setNewResourceDescription('');
    setNewResourceThemes('');
  };

  // =========================================================================
  // 3. BOARDING HOUSE & HOSTEL MANAGEMENT STATE
  // =========================================================================
  const [hostelDorms, setHostelDorms] = useState<HostelDormitory[]>(MOCK_HOSTEL_DORMS);
  const [exeatRequests, setExeatRequests] = useState<StudentExeatRequest[]>(MOCK_EXEAT_REQUESTS);
  const [rollCalls, setRollCalls] = useState<EveningRollCallEntry[]>(MOCK_ROLL_CALLS);
  const [mealRegisters, setMealRegisters] = useState<DiningMealRegister[]>(MOCK_DINING_REGISTERS);
  const [isStudentExeatModalOpen, setIsStudentExeatModalOpen] = useState<boolean>(false);
  const [selectedExeatForReview, setSelectedExeatForReview] = useState<StudentExeatRequest | null>(null);

  // New Exeat Request Form State
  const [exeatStudentName, setExeatStudentName] = useState('Chidera Okafor');
  const [exeatClassGrade, setExeatClassGrade] = useState('SS 2');
  const [exeatDormId, setExeatDormId] = useState('dorm-01');
  const [exeatType, setExeatType] = useState<any>('weekend_home');
  const [exeatReason, setExeatReason] = useState('');
  const [exeatDestination, setExeatDestination] = useState('');
  const [exeatParentName, setExeatParentName] = useState('Chief Emeka Okafor');
  const [exeatParentPhone, setExeatParentPhone] = useState('+234 803 445 6789');
  const [exeatDepDate, setExeatDepDate] = useState('2026-08-23');
  const [exeatDepTime, setExeatDepTime] = useState('14:00');
  const [exeatRetDate, setExeatRetDate] = useState('2026-08-25');
  const [exeatRetTime, setExeatRetTime] = useState('17:00');

  const handleCreateExeatRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exeatReason.trim()) return;

    const dorm = hostelDorms.find(d => d.id === exeatDormId);
    const newExeat: StudentExeatRequest = {
      id: `ext-${Date.now()}`,
      exeatNumber: `EXT-2026-${Math.floor(100 + Math.random() * 900)}`,
      studentId: `std-${Date.now()}`,
      studentName: exeatStudentName,
      admissionNumber: `KC/2024/${Math.floor(1000 + Math.random() * 9000)}`,
      classGrade: exeatClassGrade,
      dormitoryId: exeatDormId,
      dormitoryName: dorm?.name || 'Senior Boys Hall',
      roomNumber: 'Room A-101',
      exeatType: exeatType,
      reason: exeatReason,
      destinationAddress: exeatDestination || 'Parent Residence, Lagos',
      destinationState: 'Lagos State',
      parentOrGuardianName: exeatParentName,
      parentPhone: exeatParentPhone,
      departureDate: exeatDepDate,
      departureTime: exeatDepTime,
      expectedReturnDate: exeatRetDate,
      expectedReturnTime: exeatRetTime,
      status: 'pending_housemaster',
      parentConsentConfirmed: true,
      qrVerificationHash: `EXEAT_VERIFY::EXT-${Date.now()}::${exeatStudentName.toUpperCase()}::PENDING`
    };

    setExeatRequests(prev => [newExeat, ...prev]);
    setIsStudentExeatModalOpen(false);
    setExeatReason('');
    setExeatDestination('');
  };

  const handleHouseMasterDecision = (exeatId: string, decision: 'approve' | 'reject', notes: string) => {
    setExeatRequests(prev => prev.map(req => {
      if (req.id === exeatId) {
        return {
          ...req,
          status: decision === 'approve' ? 'approved_by_housemaster' : 'rejected',
          houseMasterNotes: notes,
          houseMasterApprovedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          houseMasterName: currentUser.name,
          qrVerificationHash: decision === 'approve' 
            ? `EXEAT_VERIFY::${req.exeatNumber}::${req.studentName.toUpperCase()}::APPROVED_HM`
            : undefined
        };
      }
      return req;
    }));
    setSelectedExeatForReview(null);
  };

  // =========================================================================
  // 4. SCHOOL BUS TRANSPORTATION STATE
  // =========================================================================
  const [busRoutes, setBusRoutes] = useState<BusRoute[]>(MOCK_BUS_ROUTES);
  const [busDrivers, setBusDrivers] = useState<BusDriverProfile[]>(MOCK_BUS_DRIVERS);
  const [busMaintenance, setBusMaintenance] = useState<BusMaintenanceRecord[]>(MOCK_BUS_MAINTENANCE_LOGS);
  const [geofenceAlerts, setGeofenceAlerts] = useState<ParentGeofenceAlertNotification[]>(MOCK_GEOFENCE_NOTIFICATIONS);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('route-01');
  const [isSimulatingBusMovement, setIsSimulatingBusMovement] = useState<boolean>(false);

  const activeRoute = busRoutes.find(r => r.id === selectedRouteId) || busRoutes[0];

  const handleSimulateGeofenceTrigger = (stopName: string, studentName: string, parentPhone: string) => {
    const newAlert: ParentGeofenceAlertNotification = {
      id: `geo-notif-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      busRouteCode: activeRoute.routeCode,
      busPlateNumber: activeRoute.busPlateNumber.split('(')[0].trim(),
      stopName: stopName,
      studentName: studentName,
      parentPhone: parentPhone,
      parentName: 'Registered Parent/Guardian',
      alertType: 'approaching_geofence',
      messageText: `🚍 Proximity Alert: School Bus has entered the 500m geofenced zone near '${stopName}'. Estimated arrival in 3-5 minutes. Please proceed to the designated pickup spot.`,
      isRead: false
    };

    setGeofenceAlerts(prev => [newAlert, ...prev]);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Suite Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Bundle 5 • Logistics Support Management Suite</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">
              Logistics & Student Care Operations Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Integrated operational command covering Gate Security QR Pickup Kiosk, Digital E-Library repository, 
              Boarding House & Hostel suite with digital exeat workflows, and School Bus Fleet route management with real-time parent geofence alerts.
            </p>
          </div>

          {/* Quick Bundle Status Badge */}
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Active License Bundle 5</div>
              <div className="text-[11px] text-indigo-300">All 4 Logistics Subsystems Online</div>
            </div>
          </div>
        </div>

        {/* Sub-tab Switcher Ribbon */}
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-slate-800/80 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveSubTab('gate_security')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'gate_security'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ScanLine className="w-4 h-4" />
            <span>Gate Security Kiosk & Pickup</span>
          </button>

          <button
            onClick={() => setActiveSubTab('digital_elibrary')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'digital_elibrary'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Digital E-Library & Repository</span>
          </button>

          <button
            onClick={() => setActiveSubTab('boarding_house')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'boarding_house'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Boarding House & Hostels</span>
          </button>

          <button
            onClick={() => setActiveSubTab('bus_transportation')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'bus_transportation'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Bus className="w-4 h-4" />
            <span>School Bus & Route Tracking</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 1. GATE SECURITY KIOSK TAB */}
      {/* ===================================================================== */}
      {activeSubTab === 'gate_security' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Scanner & Verification Console */}
            <div className="lg:col-span-7 space-y-6">
              {/* Tablet Scanner Terminal Card */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                      <ScanLine className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Security Gate Scanner Kiosk</h2>
                      <p className="text-xs text-slate-400">Tablet-Optimized Guardian Verification & Exit Auth</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsCameraScannerActive(!isCameraScannerActive)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      isCameraScannerActive 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isCameraScannerActive ? 'Camera Live' : 'Start Camera'}</span>
                  </button>
                </div>

                {/* Simulated Camera Viewfinder if active */}
                {isCameraScannerActive && (
                  <div className="relative rounded-2xl bg-slate-950 border-2 border-dashed border-indigo-500/60 p-6 flex flex-col items-center justify-center text-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 via-transparent to-indigo-500/10 animate-pulse pointer-events-none" />
                    <div className="w-48 h-48 border-2 border-indigo-400 rounded-xl relative flex items-center justify-center">
                      <div className="w-full h-0.5 bg-red-500 absolute top-1/2 animate-bounce" />
                      <QrCode className="w-16 h-16 text-indigo-300/40" />
                    </div>
                    <div className="mt-3 text-xs font-medium text-slate-300">
                      Hold Guardian QR Pass inside viewport
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleScanPass('GT-PASS-2026-892')}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-[11px] text-white"
                      >
                        Simulate Chidera Scan
                      </button>
                      <button
                        onClick={() => handleScanPass('GT-PASS-2026-904')}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-[11px] text-white"
                      >
                        Simulate Amina Scan
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick Search / Scan Input Bar */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={scannerInput}
                      onChange={(e) => setScannerInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleScanPass(scannerInput)}
                      placeholder="Scan QR payload, Pass Code (e.g. GT-PASS-2026-892), or Student Name..."
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    onClick={() => handleScanPass(scannerInput)}
                    className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md"
                  >
                    Verify Pass
                  </button>
                </div>

                {/* Scanned Verification Card Details */}
                {scannedPass ? (
                  <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-mono font-bold">
                          {scannedPass.passCode}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          scannedPass.status === 'active' 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'bg-slate-700 text-slate-300'
                        }`}>
                          {scannedPass.status === 'active' ? 'Active Pass' : 'Scanned Out'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        Valid: <strong className="text-white">{scannedPass.validDate}</strong> till {scannedPass.expiryTime}
                      </div>
                    </div>

                    {/* Side-by-Side Photo Verification */}
                    <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                      {/* Student Card */}
                      <div className="flex flex-col items-center text-center p-3 rounded-xl bg-slate-950 border border-slate-800/60">
                        <img 
                          src={scannedPass.studentPhotoUrl} 
                          alt={scannedPass.studentName}
                          className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-500 shadow-md"
                          referrerPolicy="no-referrer"
                        />
                        <div className="mt-2 font-bold text-white text-xs">{scannedPass.studentName}</div>
                        <div className="text-[11px] text-slate-400">{scannedPass.classGrade} • {scannedPass.admissionNumber}</div>
                        <div className="mt-1">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            scannedPass.isBoardingStudent 
                              ? 'bg-purple-500/20 text-purple-300' 
                              : 'bg-blue-500/20 text-blue-300'
                          }`}>
                            {scannedPass.isBoardingStudent ? '🏠 Boarding Student' : '🚗 Day Student'}
                          </span>
                        </div>
                      </div>

                      {/* Guardian Card */}
                      <div className="flex flex-col items-center text-center p-3 rounded-xl bg-slate-950 border border-slate-800/60">
                        <img 
                          src={scannedPass.guardianPhotoUrl} 
                          alt={scannedPass.authorizedGuardianName}
                          className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                          referrerPolicy="no-referrer"
                        />
                        <div className="mt-2 font-bold text-white text-xs">{scannedPass.authorizedGuardianName}</div>
                        <div className="text-[11px] text-emerald-400 font-semibold">{scannedPass.relationship}</div>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono">{scannedPass.guardianNinOrId}</div>
                      </div>
                    </div>

                    {/* Metadata Specs */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Guardian Contact</span>
                        <span className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3.5 h-3.5 text-indigo-400" />
                          {scannedPass.guardianPhone}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Registered Vehicle Plate</span>
                        <span className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                          <Car className="w-3.5 h-3.5 text-amber-400" />
                          {scannedPass.vehicleRegNumber || 'Pedestrian Pickup'}
                        </span>
                      </div>
                    </div>

                    {/* Boarder Exeat Verification Check */}
                    {scannedPass.isBoardingStudent && (
                      <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                        scannedPass.activeExeatApproved 
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' 
                          : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                      }`}>
                        <div className="flex items-center gap-2.5">
                          {scannedPass.activeExeatApproved ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                          )}
                          <div>
                            <div className="text-xs font-bold">
                              {scannedPass.activeExeatApproved 
                                ? 'Active Approved Exeat Confirmed' 
                                : 'WARNING: No Active Exeat Found'}
                            </div>
                            <div className="text-[10px] text-slate-300 mt-0.5">
                              {scannedPass.activeExeatApproved 
                                ? 'House Master approval signed for weekend departure' 
                                : 'Student cannot leave premises without signed housemaster exeat'}
                            </div>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 text-[10px] font-bold">
                          {scannedPass.activeExeatApproved ? 'Exeat #EXT-2026-084' : 'BLOCKED'}
                        </span>
                      </div>
                    )}

                    {/* Security Officer PIN verification & Actions */}
                    <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          maxLength={4}
                          value={pinEntry}
                          onChange={(e) => setPinEntry(e.target.value)}
                          placeholder="Security PIN (e.g. 7492)"
                          className="w-32 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono text-center tracking-widest focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={smsDispatchEnabled} 
                            onChange={(e) => setSmsDispatchEnabled(e.target.checked)}
                            className="rounded bg-slate-900 border-slate-700 text-indigo-600"
                          />
                          <span>Send Parent SMS</span>
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleAuthorizeExit}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Authorize Student Exit</span>
                        </button>
                      </div>
                    </div>

                    {/* Status Alert Banner */}
                    {gateActionMessage && (
                      <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 animate-fadeIn ${
                        gateActionStatus === 'success' 
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' 
                          : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                      }`}>
                        {gateActionStatus === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        )}
                        <span>{gateActionMessage}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl bg-slate-950/50 border border-slate-800 text-center text-slate-400 text-xs">
                    Scan or select a guardian pass to preview verification details
                  </div>
                )}
              </div>
            </div>

            {/* Right: Active Passes Roster & Real-time Scan Logs */}
            <div className="lg:col-span-5 space-y-6">
              {/* Recent Scan Logs */}
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    Live Gate Security Event Stream
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">{gateLogs.length} Events</span>
                </div>

                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {gateLogs.map(log => (
                    <div key={log.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{log.studentName}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.authorizationStatus === 'authorized_exit' 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {log.authorizationStatus === 'authorized_exit' ? 'EXIT AUTHORIZED' : 'FLAGGED BLOCKED'}
                        </span>
                      </div>

                      <div className="text-slate-400 text-[11px]">
                        Guardian: <strong className="text-slate-300">{log.guardianName}</strong>
                      </div>

                      <div className="text-[11px] text-slate-500 leading-snug">
                        {log.notes}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px] text-slate-500">
                        <span>{log.timestamp}</span>
                        <span>Officer: {log.securityOfficerName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Registered Passes Roster */}
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  Today's Active Guardian Passes
                </h3>
                <div className="space-y-2">
                  {gatePasses.map(pass => (
                    <div
                      key={pass.id}
                      onClick={() => {
                        setScannedPass(pass);
                        setGateActionStatus('idle');
                        setGateActionMessage('');
                      }}
                      className={`p-3 rounded-2xl bg-slate-950 border transition-all cursor-pointer flex items-center justify-between ${
                        scannedPass?.id === pass.id ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img 
                          src={pass.studentPhotoUrl} 
                          alt={pass.studentName}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="font-bold text-white text-xs">{pass.studentName}</div>
                          <div className="text-[11px] text-slate-400">{pass.classGrade} • {pass.authorizedGuardianName}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-[10px] text-indigo-400 block">{pass.passCode}</span>
                        <span className={`text-[10px] font-bold ${pass.status === 'active' ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {pass.status === 'active' ? 'Ready' : 'Exited'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. DIGITAL E-LIBRARY & REPOSITORY TAB */}
      {/* ===================================================================== */}
      {activeSubTab === 'digital_elibrary' && (
        <div className="space-y-6">
          {/* Top Filter & Search Controls */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                  Digital E-Library & Curriculum Resource Repository
                </h2>
                <p className="text-xs text-slate-400">
                  NERDC-approved textbooks, WAEC/NECO/JAMB past papers, audio courseware, video lectures & staff worksheets
                </p>
              </div>

              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-indigo-950 self-start sm:self-center"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Curriculum Resource</span>
              </button>
            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={libSearchQuery}
                  onChange={(e) => setLibSearchQuery(e.target.value)}
                  placeholder="Search resources, topics, authors..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <select
                value={libLevelFilter}
                onChange={(e) => setLibLevelFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Education Levels</option>
                <option value="jss">Junior Secondary (JSS 1-3)</option>
                <option value="sss">Senior Secondary (SS 1-3)</option>
              </select>

              <select
                value={libTypeFilter}
                onChange={(e) => setLibTypeFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Resource Types</option>
                <option value="nerdc_textbook">NERDC Approved Textbooks</option>
                <option value="waec_past_paper">WAEC Past Exam Papers</option>
                <option value="neco_past_paper">NECO Past Papers</option>
                <option value="video_lecture">Video Lectures (MP4)</option>
                <option value="audio_courseware">Audio Courseware (MP3)</option>
                <option value="staff_uploaded_worksheet">Staff Uploaded Worksheets</option>
              </select>
            </div>
          </div>

          {/* Resources Catalog Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredLibrary.map(res => (
              <div 
                key={res.id}
                className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Thumbnail / Header */}
                  <div className="relative h-40 w-full overflow-hidden bg-slate-950">
                    <img 
                      src={res.coverImageUrl} 
                      alt={res.title}
                      className="w-full h-full object-cover opacity-80 hover:scale-105 transition-all duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-bold border border-slate-700">
                        {res.format} • {res.fileSizeMb} MB
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-indigo-600/90 text-white text-[10px] font-bold">
                        {res.classGrade}
                      </span>
                    </div>

                    {res.isStaffUploaded && (
                      <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-amber-500/90 text-slate-950 text-[10px] font-black">
                        Staff Upload
                      </span>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3">
                    <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                      {res.subjectName}
                    </div>

                    <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug">
                      {res.title}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {res.description}
                    </p>

                    {/* Aligned Themes Tags */}
                    {res.curriculumAlignedThemes && res.curriculumAlignedThemes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {res.curriculumAlignedThemes.slice(0, 2).map((theme, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-950 text-[10px] text-slate-300 border border-slate-800">
                            {theme}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="p-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400">
                    Publisher: <strong className="text-slate-300">{res.authorOrPublisher.split('/')[0]}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    {res.format === 'MP3' || res.format === 'MP4' ? (
                      <button
                        onClick={() => setActiveMediaResource(res)}
                        className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow"
                        title="Play in media player"
                      >
                        <Play className="w-4 h-4 fill-white" />
                      </button>
                    ) : null}

                    <button
                      onClick={() => alert(`Downloading '${res.title}' (${res.format} - ${res.fileSizeMb}MB)...`)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Media Player Modal if audio/video selected */}
          {activeMediaResource && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                    Interactive Courseware Player
                  </span>
                  <button 
                    onClick={() => setActiveMediaResource(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center space-y-3">
                  <img 
                    src={activeMediaResource.coverImageUrl} 
                    alt="" 
                    className="w-28 h-28 rounded-2xl object-cover shadow-lg border border-slate-700"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-white">{activeMediaResource.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{activeMediaResource.subjectName} • {activeMediaResource.classGrade}</p>
                  </div>

                  {/* Simulated Waveform / Progress bar */}
                  <div className="w-full space-y-1.5 pt-2">
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full w-2/5 animate-pulse" />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>04:15</span>
                      <span>12:40</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 pt-2">
                  <button className="p-3 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-950">
                    <Play className="w-5 h-5 fill-white" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Staff Upload Modal */}
          {isUploadModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-scaleUp">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">Upload Curriculum-Aligned Teaching Resource</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Allow students & staff to access your worksheets, PDFs, and notes</p>
                  </div>
                  <button 
                    onClick={() => setIsUploadModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddStaffResource} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Resource Title *</label>
                    <input 
                      type="text"
                      required
                      value={newResourceTitle}
                      onChange={(e) => setNewResourceTitle(e.target.value)}
                      placeholder="e.g. SS 2 Chemistry Titration & Volumetric Drill Worksheet"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Subject *</label>
                      <select
                        value={newResourceSubject}
                        onChange={(e) => setNewResourceSubject(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                      >
                        <option value="Mathematics">Mathematics</option>
                        <option value="English Language">English Language</option>
                        <option value="Physics">Physics</option>
                        <option value="Chemistry">Chemistry</option>
                        <option value="Biology">Biology</option>
                        <option value="Economics">Economics</option>
                        <option value="Government">Government</option>
                        <option value="Computer Studies">Computer Studies</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Target Class Grade *</label>
                      <select
                        value={newResourceGrade}
                        onChange={(e) => setNewResourceGrade(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                      >
                        <option value="JSS 1">JSS 1</option>
                        <option value="JSS 2">JSS 2</option>
                        <option value="JSS 3">JSS 3</option>
                        <option value="SS 1">SS 1</option>
                        <option value="SS 2">SS 2</option>
                        <option value="SS 3">SS 3</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Format *</label>
                      <select
                        value={newResourceFormat}
                        onChange={(e) => setNewResourceFormat(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                      >
                        <option value="PDF">PDF Document</option>
                        <option value="MP3">MP3 Audio</option>
                        <option value="MP4">MP4 Video</option>
                        <option value="JPEG">JPEG / PNG Image</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Resource Category</label>
                      <select
                        value={newResourceType}
                        onChange={(e) => setNewResourceType(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                      >
                        <option value="staff_uploaded_worksheet">Staff Worksheet / Drill</option>
                        <option value="waec_past_paper">Past Question Compilation</option>
                        <option value="audio_courseware">Audio Lecture</option>
                        <option value="video_lecture">Video Masterclass</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Description & Learning Outcomes</label>
                    <textarea
                      rows={2}
                      value={newResourceDescription}
                      onChange={(e) => setNewResourceDescription(e.target.value)}
                      placeholder="Summary of topics covered, instructions for students..."
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">NERDC Curriculum Theme Tags (comma separated)</label>
                    <input 
                      type="text"
                      value={newResourceThemes}
                      onChange={(e) => setNewResourceThemes(e.target.value)}
                      placeholder="e.g. Theme 1: Stoichiometry, Theme 2: Chemical Equilibrium"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                    />
                  </div>

                  {/* Drag and Drop Zone Simulator */}
                  <div className="p-4 border-2 border-dashed border-slate-700 rounded-2xl text-center bg-slate-950/40">
                    <Upload className="w-6 h-6 text-indigo-400 mx-auto mb-1" />
                    <div className="text-xs text-slate-300 font-medium">Drag and drop document or click to browse</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Supports PDF, MP3, MP4 up to 200MB</div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsUploadModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                    >
                      Publish Resource
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. BOARDING HOUSE & HOSTEL MANAGEMENT TAB */}
      {/* ===================================================================== */}
      {activeSubTab === 'boarding_house' && (
        <div className="space-y-8">
          {/* Top D3 Visual Dashboard */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Building className="w-5 h-5 text-indigo-400" />
                  Boarding House & Dormitory Occupancy Dashboard (D3.js)
                </h2>
                <p className="text-xs text-slate-400">
                  Real-time bed space tracking, exeat authorization workflow, roll-call audit & dining hall registers
                </p>
              </div>

              <button
                onClick={() => setIsStudentExeatModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-emerald-950 self-start sm:self-center"
              >
                <Plus className="w-4 h-4" />
                <span>New Digital Exeat Request</span>
              </button>
            </div>

            {/* D3.js Visual Component */}
            <BoardingHouseD3Dashboard dormitories={hostelDorms} />
          </div>

          {/* Exeat Management & Mobile House Master Approval Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Exeat Requests Queue */}
            <div className="lg:col-span-8 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-amber-400" />
                  Digital Exeat Authorization Workflow & Requests
                </h3>
                <span className="text-xs text-slate-400">{exeatRequests.length} Total Requests</span>
              </div>

              <div className="space-y-3">
                {exeatRequests.map(req => (
                  <div key={req.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-400">{req.exeatNumber}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            req.status === 'approved_by_housemaster' ? 'bg-emerald-500/20 text-emerald-400' :
                            req.status === 'pending_housemaster' ? 'bg-amber-500/20 text-amber-400' :
                            req.status === 'returned_and_signed_in' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-rose-500/20 text-rose-400'
                          }`}>
                            {req.status === 'approved_by_housemaster' ? 'Approved by House Master' :
                             req.status === 'pending_housemaster' ? 'Pending Approval' :
                             req.status === 'returned_and_signed_in' ? 'Returned & Signed In' : 'Rejected'}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-1">{req.studentName} ({req.classGrade})</h4>
                        <div className="text-[11px] text-slate-400">{req.dormitoryName} • {req.roomNumber}</div>
                      </div>

                      <div className="text-right text-xs">
                        <span className="text-slate-400 block text-[10px]">Exeat Type</span>
                        <span className="font-bold text-slate-200 capitalize">{req.exeatType.replace('_', ' ')}</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-300 bg-slate-900/70 p-3 rounded-xl border border-slate-800">
                      <strong>Reason:</strong> {req.reason}
                      <div className="text-[11px] text-slate-400 mt-1">
                        Destination: {req.destinationAddress} • Parent Contact: {req.parentOrGuardianName} ({req.parentPhone})
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-900 text-xs">
                      <div className="text-slate-400 text-[11px]">
                        Depart: <strong className="text-slate-200">{req.departureDate} ({req.departureTime})</strong> → Return: <strong className="text-slate-200">{req.expectedReturnDate} ({req.expectedReturnTime})</strong>
                      </div>

                      {req.status === 'pending_housemaster' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleHouseMasterDecision(req.id, 'approve', 'Approved by House Master via Mobile Interface')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve Exeat
                          </button>
                          <button
                            onClick={() => handleHouseMasterDecision(req.id, 'reject', 'Exeat declined - student has remedial class scheduled')}
                            className="px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-[11px] font-bold flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      )}

                      {req.status === 'approved_by_housemaster' && req.qrVerificationHash && (
                        <div className="flex items-center gap-2 text-emerald-400 text-[11px] font-mono">
                          <QrCode className="w-3.5 h-3.5" />
                          <span>QR Gate Exit Pass Active</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Roll Call & Dining Registers */}
            <div className="lg:col-span-4 space-y-6">
              {/* Evening Roll Call Log */}
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  Evening Roll-Call Register
                </h3>

                <div className="space-y-2.5">
                  {rollCalls.map(rc => (
                    <div key={rc.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-white">
                        <span>{rc.dormitoryName.split('(')[0]}</span>
                        <span className="text-emerald-400">{rc.presentCount} / {rc.totalBoarders} Present</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {rc.absentOnApprovedExeat} on Exeat • {rc.absentInSickBay} in Sick Bay
                      </div>
                      <div className="text-[10px] text-slate-500 pt-1">
                        Conducted by: {rc.conductedBy}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dining Hall Meal Registers */}
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Dining Hall Meal Quality Log
                </h3>

                <div className="space-y-2.5">
                  {mealRegisters.map(meal => (
                    <div key={meal.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-white">
                        <span>{meal.mealType} ({meal.date})</span>
                        <span className="text-indigo-400">{meal.totalBoardersServed} Served</span>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        {meal.menuItems[0]}
                      </div>
                      <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Nurse & Food Committee Inspection Passed
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Student Exeat Modal */}
          {isStudentExeatModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white">New Digital Exeat Application</h3>
                  <button 
                    onClick={() => setIsStudentExeatModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateExeatRequest} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Student Name</label>
                      <input 
                        type="text" 
                        value={exeatStudentName} 
                        onChange={(e) => setExeatStudentName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs" 
                        required 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Class Grade</label>
                      <input 
                        type="text" 
                        value={exeatClassGrade} 
                        onChange={(e) => setExeatClassGrade(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs" 
                        required 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Dormitory Hall</label>
                      <select
                        value={exeatDormId}
                        onChange={(e) => setExeatDormId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                      >
                        {hostelDorms.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Exeat Category</label>
                      <select
                        value={exeatType}
                        onChange={(e) => setExeatType(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                      >
                        <option value="weekend_home">Weekend Home Visit</option>
                        <option value="medical_hospital">Medical / Hospital Appointment</option>
                        <option value="academic_competition">Academic Competition</option>
                        <option value="family_emergency">Family Emergency</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Reason for Exeat *</label>
                    <textarea
                      required
                      rows={2}
                      value={exeatReason}
                      onChange={(e) => setExeatReason(e.target.value)}
                      placeholder="Detailed reason for exit and parent consent details..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Destination Address</label>
                    <input 
                      type="text" 
                      value={exeatDestination}
                      onChange={(e) => setExeatDestination(e.target.value)}
                      placeholder="e.g. 14 Admiralty Way, Lekki Phase 1, Lagos"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Departure Date & Time</label>
                      <div className="flex gap-1">
                        <input type="date" value={exeatDepDate} onChange={e => setExeatDepDate(e.target.value)} className="w-2/3 px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs" />
                        <input type="time" value={exeatDepTime} onChange={e => setExeatDepTime(e.target.value)} className="w-1/3 px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs" />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Expected Return Date & Time</label>
                      <div className="flex gap-1">
                        <input type="date" value={exeatRetDate} onChange={e => setExeatRetDate(e.target.value)} className="w-2/3 px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs" />
                        <input type="time" value={exeatRetTime} onChange={e => setExeatRetTime(e.target.value)} className="w-1/3 px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsStudentExeatModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow"
                    >
                      Submit Exeat Request
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. SCHOOL BUS TRANSPORTATION TAB */}
      {/* ===================================================================== */}
      {activeSubTab === 'bus_transportation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Route & Live Tracker */}
            <div className="lg:col-span-8 space-y-6">
              {/* Route Live Map & Stops Tracker */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Bus className="w-4 h-4" />
                      Live Route Tracking & Geofence Monitor
                    </span>
                    <h2 className="text-base font-bold text-white mt-1">{activeRoute.routeName}</h2>
                    <p className="text-xs text-slate-400">{activeRoute.busPlateNumber} • Driver: {activeRoute.driverName}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedRouteId}
                      onChange={(e) => setSelectedRouteId(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      {busRoutes.map(r => (
                        <option key={r.id} value={r.id}>{r.routeCode}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Simulated Visual Route Line & Stops */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-6">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Route Origin (Terminal)</span>
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      <Radio className="w-3.5 h-3.5 animate-pulse" /> Live GPS: {activeRoute.gpsCoordinates.lat}°N, {activeRoute.gpsCoordinates.lng}°E ({activeRoute.gpsCoordinates.speedKmh} km/h)
                    </span>
                    <span>School Campus Gate</span>
                  </div>

                  {/* Stops Progress Sequence */}
                  <div className="relative flex items-center justify-between px-4">
                    {/* Connecting line */}
                    <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-1 bg-slate-800" />
                    <div 
                      className="absolute left-8 top-1/2 -translate-y-1/2 h-1 bg-amber-500 transition-all duration-500"
                      style={{ width: `${(activeRoute.currentActiveStopIndex / (activeRoute.routeStops.length - 1)) * 85}%` }}
                    />

                    {activeRoute.routeStops.map((stop, idx) => {
                      const isCurrent = idx === activeRoute.currentActiveStopIndex;
                      const isPassed = idx < activeRoute.currentActiveStopIndex;

                      return (
                        <div key={stop.id} className="relative z-10 flex flex-col items-center group">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                            isCurrent 
                              ? 'bg-amber-500 border-white text-slate-950 ring-4 ring-amber-500/30 scale-110' 
                              : isPassed 
                              ? 'bg-emerald-600 border-emerald-400 text-white' 
                              : 'bg-slate-900 border-slate-700 text-slate-400'
                          }`}>
                            {isPassed ? <Check className="w-4 h-4" /> : idx + 1}
                          </div>

                          <div className="mt-2 text-center max-w-[100px]">
                            <div className="text-[11px] font-bold text-white truncate">{stop.stopName.split('(')[0]}</div>
                            <div className="text-[10px] text-slate-500">{stop.estimatedArrivalAfternoon}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Geofence Alert Trigger Testing Button */}
                  <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="text-slate-400 text-[11px]">
                      500m Geofence triggers automatic SMS & Portal push notifications to registered parents.
                    </div>

                    <button
                      onClick={() => handleSimulateGeofenceTrigger(
                        activeRoute.routeStops[activeRoute.currentActiveStopIndex]?.stopName || 'Designated Stop',
                        'Amina Zainab Bello',
                        '+234 802 998 1234'
                      )}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all flex items-center justify-center gap-1.5 shadow"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>Simulate Geofence Proximity Alert</span>
                    </button>
                  </div>
                </div>

                {/* Stops Details Roster */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Assigned Route Stops & Student Headcount</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeRoute.routeStops.map(stop => (
                      <div key={stop.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-white">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-amber-400" />
                            {stop.stopName}
                          </span>
                          <span className="text-indigo-400">{stop.assignedStudentCount} Students</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Morning: {stop.estimatedArrivalMorning}</span>
                          <span>Afternoon: {stop.estimatedArrivalAfternoon}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Driver Profiles, Maintenance & Geofence Alert Notifications */}
            <div className="lg:col-span-4 space-y-6">
              {/* Geofence Push Notifications Feed */}
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    Parent Geofence Alerts
                  </h3>
                  <span className="text-[11px] text-slate-400">{geofenceAlerts.length} Alerts</span>
                </div>

                <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                  {geofenceAlerts.map(alert => (
                    <div key={alert.id} className="p-3 rounded-2xl bg-slate-950 border border-amber-500/20 text-xs space-y-1 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-300">{alert.studentName}</span>
                        <span className="text-[10px] text-slate-400">{alert.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-snug">
                        {alert.messageText}
                      </p>
                      <div className="text-[10px] text-slate-500 pt-1">
                        Recipient: {alert.parentName} ({alert.parentPhone})
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Driver Licenses & FRSC Tracking */}
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-indigo-400" />
                  Driver License & Compliance
                </h3>

                <div className="space-y-2.5">
                  {busDrivers.map(drv => (
                    <div key={drv.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-white">
                        <span>{drv.fullName}</span>
                        <span className="text-emerald-400">★ {drv.safetyRating}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        License: {drv.licenseNumber} (Exp: {drv.licenseExpiryDate})
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                        <span>{drv.assignedBusNumber}</span>
                        <span className="text-emerald-400">Medical: {drv.medicalClearanceStatus.toUpperCase()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Maintenance Records */}
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Fleet Maintenance Schedules
                </h3>

                <div className="space-y-2.5">
                  {busMaintenance.map(maint => (
                    <div key={maint.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-white">
                        <span>{maint.plateNumber}</span>
                        <span className="text-indigo-400">₦{maint.costNgn.toLocaleString()}</span>
                      </div>
                      <div className="text-[11px] text-slate-300">{maint.serviceType}</div>
                      <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                        <span>Serviced: {maint.serviceDate}</span>
                        <span>Next Due: {maint.nextServiceDueDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
