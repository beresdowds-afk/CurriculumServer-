import React, { useState } from 'react';
import { 
  SchoolBrandProfile, 
  TenantSchoolApp, 
  AcademicSessionInfo, 
  AcademicTermConfig, 
  SchoolEvent, 
  PublicHoliday,
  Teacher 
} from '../types';
import { 
  School, 
  ShieldCheck, 
  Sparkles, 
  BookOpen, 
  GraduationCap, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin, 
  CheckCircle2, 
  ArrowRight, 
  Award, 
  Users, 
  Clock, 
  ScanFace, 
  FileText, 
  ExternalLink, 
  KeyRound, 
  Lock, 
  ChevronRight, 
  Building2, 
  HelpCircle,
  Laptop,
  Flame,
  Globe,
  Compass
} from 'lucide-react';

interface SchoolPublicPortalProps {
  tenant: TenantSchoolApp;
  brandProfile?: SchoolBrandProfile;
  academicSessions?: AcademicSessionInfo[];
  termsConfig?: AcademicTermConfig[];
  schoolEvents?: SchoolEvent[];
  publicHolidays?: PublicHoliday[];
  teachers?: Teacher[];
  onOpenAuthModal: () => void;
  onNavigateToTab: (tab: any) => void;
  onSelectTenant?: (tenant: TenantSchoolApp) => void;
  allTenants?: TenantSchoolApp[];
  onNavigateToPlatformLanding?: () => void;
}

export const SchoolPublicPortal: React.FC<SchoolPublicPortalProps> = ({
  tenant,
  brandProfile,
  academicSessions = [],
  termsConfig = [],
  schoolEvents = [],
  publicHolidays = [],
  teachers = [],
  onOpenAuthModal,
  onNavigateToTab,
  onSelectTenant,
  allTenants = [],
  onNavigateToPlatformLanding
}) => {
  const [activeNavSection, setActiveNavSection] = useState<'home' | 'about' | 'academics' | 'admissions' | 'calendar' | 'contact'>('home');
  const [selectedAdmissionGrade, setSelectedAdmissionGrade] = useState<'JSS 1' | 'JSS 2' | 'JSS 3' | 'SS 1' | 'SS 2' | 'SS 3'>('JSS 1');
  const [admissionApplicantName, setAdmissionApplicantName] = useState('');
  const [admissionParentPhone, setAdmissionParentPhone] = useState('');
  const [admissionParentEmail, setAdmissionParentEmail] = useState('');
  const [admissionSuccess, setAdmissionSuccess] = useState(false);
  const [quickInquirySubject, setQuickInquirySubject] = useState('');
  const [quickInquiryMsg, setQuickInquiryMsg] = useState('');
  const [inquirySuccess, setInquirySuccess] = useState(false);

  // Dynamic School Brand Identity
  const effectiveBrand: SchoolBrandProfile | undefined = tenant.brandProfile || brandProfile;
  const primaryColor = effectiveBrand?.brandTheme?.primaryColor || '#059669';
  const secondaryColor = effectiveBrand?.brandTheme?.secondaryColor || '#0f766e';
  const accentColor = effectiveBrand?.brandTheme?.accentColor || '#10b981';
  const schoolName = effectiveBrand?.schoolName || tenant.schoolName || 'Greenfield Academy';
  const schoolShortName = effectiveBrand?.shortName || tenant.schoolSlug || 'School OS';
  const crestLogoUrl = effectiveBrand?.crestLogoUrl;
  const motto = effectiveBrand?.motto || 'Excellence in Academics, Character & Leadership';
  const tenantDomain = tenant.customDomain || tenant.subdomain || `${tenant.schoolSlug}.curriculumflow.com`;

  const scrollToSection = (id: string, sectionKey: 'home' | 'about' | 'academics' | 'admissions' | 'calendar' | 'contact') => {
    setActiveNavSection(sectionKey);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAdmissionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!admissionApplicantName || !admissionParentPhone) return;
    setAdmissionSuccess(true);
  };

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInquiryMsg) return;
    setInquirySuccess(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white antialiased">
      {/* ============================================================ */}
      {/* 1. PUBLIC SCHOOL HEADER (Clean, Professional & Isolated)     */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/80 shadow-2xl">
        {/* Top Info Strip */}
        <div 
          className="px-4 sm:px-6 lg:px-8 py-1.5 text-xs flex items-center justify-between border-b"
          style={{
            borderColor: `${primaryColor}30`,
            backgroundColor: `${primaryColor}15`
          }}
        >
          <div className="flex items-center gap-3 sm:gap-6 flex-wrap text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <MapPin className="w-3.5 h-3.5" style={{ color: accentColor }} />
              <span>Plot 44, Academic Way, Victoria Island / Ikeja GRA, Lagos</span>
            </span>
            <span className="hidden md:flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" style={{ color: accentColor }} />
              <span>+234 803 111 2233</span>
            </span>
            <span className="hidden lg:flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" style={{ color: accentColor }} />
              <span>admissions@{tenant.schoolSlug}.edu.ng</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono font-medium hidden sm:inline" style={{ color: accentColor }}>
              {tenantDomain}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-300">
              WAEC • NECO • NERDC Accredited
            </span>
          </div>
        </div>

        {/* Main Navbar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* School Brand & Crest */}
          <div 
            onClick={() => scrollToSection('hero', 'home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg overflow-hidden p-1 border transition-transform group-hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                borderColor: `${accentColor}80`,
                boxShadow: `0 8px 20px -4px ${primaryColor}50`
              }}
            >
              {crestLogoUrl ? (
                <img 
                  src={crestLogoUrl} 
                  alt={`${schoolName} Crest`} 
                  className="w-full h-full object-contain" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <School className="w-6 h-6 text-white" />
              )}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-black text-base sm:text-lg text-white tracking-tight leading-tight">
                  {schoolName}
                </span>
                <span 
                  className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded border hidden sm:inline"
                  style={{
                    backgroundColor: `${primaryColor}20`,
                    borderColor: `${primaryColor}50`,
                    color: accentColor
                  }}
                >
                  Official School Portal
                </span>
              </div>
              <span className="text-xs text-slate-400 font-medium italic truncate max-w-[280px] sm:max-w-md">
                "{motto}"
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => scrollToSection('hero', 'home')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeNavSection === 'home' 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('about', 'about')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeNavSection === 'about' 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              About School
            </button>
            <button
              onClick={() => scrollToSection('academics', 'academics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeNavSection === 'academics' 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Academics & STEM
            </button>
            <button
              onClick={() => scrollToSection('admissions', 'admissions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeNavSection === 'admissions' 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Admissions
            </button>
            <button
              onClick={() => scrollToSection('calendar', 'calendar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeNavSection === 'calendar' 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Term Calendar
            </button>
            <button
              onClick={() => scrollToSection('contact', 'contact')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeNavSection === 'contact' 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Contact Us
            </button>
          </nav>

          {/* Action Buttons: Sign In / Portal Access */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onOpenAuthModal}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                boxShadow: `0 6px 20px -2px ${primaryColor}60`
              }}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Sign In to School Portal</span>
            </button>

            {onNavigateToPlatformLanding && (
              <button
                onClick={onNavigateToPlatformLanding}
                className="hidden xl:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium transition-colors"
                title="CurriculumFlow Cloud Platform"
              >
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <span>CurriculumFlow</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 2. HERO SECTION                                              */}
      {/* ============================================================ */}
      <section id="hero" className="relative pt-12 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background glow matching school theme */}
        <div 
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full blur-[140px] opacity-25 pointer-events-none"
          style={{ backgroundColor: primaryColor }}
        />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Col: Hero Title & Badges */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
                <span className="text-slate-300">2026/2027 Academic Year Admissions Ongoing</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
                Nurturing Future Leaders with{' '}
                <span 
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: `linear-gradient(135deg, #ffffff 0%, ${accentColor} 70%, ${secondaryColor} 100%)`
                  }}
                >
                  Uncompromising Excellence
                </span>
              </h1>

              <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl font-normal">
                Welcome to <strong className="text-white">{schoolName}</strong>. We provide holistic, 21st-century basic and secondary education integrated with national NERDC standards, Cambridge international curricula, cutting-edge STEM labs, and values-driven leadership.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => scrollToSection('admissions', 'admissions')}
                  className="px-6 py-3.5 rounded-xl font-bold text-sm text-white flex items-center gap-2 shadow-xl transition-all transform hover:-translate-y-0.5 cursor-pointer"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                    boxShadow: `0 10px 25px -4px ${primaryColor}60`
                  }}
                >
                  <span>Apply for Admission</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={onOpenAuthModal}
                  className="px-5 py-3.5 rounded-xl font-semibold text-sm bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>Student & Staff Login</span>
                </button>
              </div>

              {/* Badges / Metrics */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-800/80">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-xl sm:text-2xl font-extrabold text-white" style={{ color: accentColor }}>
                    99.4%
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">WAEC Credit Pass Rate</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-xl sm:text-2xl font-extrabold text-white" style={{ color: accentColor }}>
                    100%
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">Biometric Gate Safety</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-xl sm:text-2xl font-extrabold text-white" style={{ color: accentColor }}>
                    1:15
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">Teacher-Student Ratio</div>
                </div>
              </div>
            </div>

            {/* Right Col: School Feature Showcase Card */}
            <div className="lg:col-span-5">
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl relative overflow-hidden text-left">
                <div 
                  className="h-1.5 w-full absolute top-0 left-0" 
                  style={{
                    background: `linear-gradient(90deg, ${primaryColor}, ${accentColor})`
                  }}
                />

                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <School className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{schoolName}</h3>
                      <p className="text-[11px] text-slate-400 font-mono">{tenantDomain}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Active Session 2026/27
                  </span>
                </div>

                <div className="space-y-3.5">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Full NERDC & Cambridge Syllabus</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Weekly schemes of work, approved lesson plans, and unified Continuous Assessment (CA) tracking.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 shrink-0">
                      <ScanFace className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Biometric RFID Student Safety</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Instant SMS/WhatsApp notification to parents upon morning arrival and afternoon dismissal.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Secure Terminal Report Cards</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Tamper-proof digital broadsheets and report card studio with affective & psychomotor grading.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-slate-300 font-medium">Official School OS Portal</span>
                  </div>
                  <button
                    onClick={onOpenAuthModal}
                    className="text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    style={{ color: accentColor }}
                  >
                    <span>Staff Sign In</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. ABOUT SCHOOL & PILLARS                                    */}
      {/* ============================================================ */}
      <section id="about" className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-900/50 border-t border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-slate-900 border border-slate-800" style={{ color: accentColor }}>
              About Our Institution
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              A Legacy of Academic Rigor and Character Development
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              At {schoolName}, we blend world-class academic pedagogical frameworks with moral discipline, STEM practicals, and creative innovation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-4 hover:border-slate-700 transition-all">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                style={{ backgroundColor: `${primaryColor}30`, color: accentColor, border: `1px solid ${primaryColor}60` }}
              >
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Academic Excellence</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Comprehensive JSS 1 through SS 3 curriculum spanning Sciences, Arts, Business, and Vocational Trades with proven WAEC and BECE triumph.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-4 hover:border-slate-700 transition-all">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                style={{ backgroundColor: `${primaryColor}30`, color: accentColor, border: `1px solid ${primaryColor}60` }}
              >
                <Laptop className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Modern STEM & ICT Laboratories</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Hands-on Physics, Chemistry, Biology, and Robotics computer kiosks for real-world experimentation and digital literacy.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-4 hover:border-slate-700 transition-all">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                style={{ backgroundColor: `${primaryColor}30`, color: accentColor, border: `1px solid ${primaryColor}60` }}
              >
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Holistic Leadership & Ethics</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Dedicated character formation, debate societies, sports teams, and leadership councils molding well-rounded citizens.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. ACADEMICS & CURRICULUM OVERVIEW                           */}
      {/* ============================================================ */}
      <section id="academics" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-slate-900 border border-slate-800" style={{ color: accentColor }}>
                Academic Programs
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
                Secondary Education Curriculum Spectrum
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-md">
              Synchronized with the Nigerian Educational Research and Development Council (NERDC) and WAEC syllabus specifications.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 font-mono">CORE DISCIPLINES</span>
                <BookOpen className="w-4 h-4 text-emerald-400" />
              </div>
              <h4 className="font-bold text-white text-sm">Mathematics & English</h4>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                <li>General Mathematics</li>
                <li>English Language & Literature</li>
                <li>Civic Education</li>
                <li>Data Processing / ICT</li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400 font-mono">SCIENCE & MATH</span>
                <Flame className="w-4 h-4 text-sky-400" />
              </div>
              <h4 className="font-bold text-white text-sm">Natural Sciences</h4>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                <li>Physics & Electronics</li>
                <li>Chemistry & Lab Practicals</li>
                <li>Biology & Ecology</li>
                <li>Further Mathematics</li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-400 font-mono">COMMERCIAL</span>
                <Building2 className="w-4 h-4 text-purple-400" />
              </div>
              <h4 className="font-bold text-white text-sm">Business & Finance</h4>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                <li>Financial Accounting</li>
                <li>Commerce & Trade</li>
                <li>Economics</li>
                <li>Office Practice</li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 font-mono">HUMANITIES & ARTS</span>
                <Users className="w-4 h-4 text-amber-400" />
              </div>
              <h4 className="font-bold text-white text-sm">Arts & Social Sciences</h4>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                <li>Government & Politics</li>
                <li>Literature-in-English</li>
                <li>Christian / Islamic Studies</li>
                <li>Visual & Creative Arts</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. ADMISSIONS & APPLICATION FORM                             */}
      {/* ============================================================ */}
      <section id="admissions" className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-900/40 border-t border-b border-slate-800/80">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-slate-900 border border-slate-800" style={{ color: accentColor }}>
              Enrollment & Registration
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Student Admission Application
            </h2>
            <p className="text-xs text-slate-400">
              Submit your preliminary application online for placement in JSS 1 - SS 3. Our admissions office will reach out within 24 hours.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl">
            {admissionSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Admission Application Received!</h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Thank you for applying to <strong className="text-white">{schoolName}</strong> for <strong>{admissionApplicantName}</strong> ({selectedAdmissionGrade}). An admissions officer will contact you at <strong>{admissionParentPhone}</strong>.
                </p>
                <button
                  onClick={() => setAdmissionSuccess(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors"
                >
                  Submit Another Application
                </button>
              </div>
            ) : (
              <form onSubmit={handleAdmissionSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Prospective Student Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={admissionApplicantName}
                      onChange={(e) => setAdmissionApplicantName(e.target.value)}
                      placeholder="e.g., Tunde Adeyemi"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Entry Grade Level *
                    </label>
                    <select
                      value={selectedAdmissionGrade}
                      onChange={(e) => setSelectedAdmissionGrade(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="JSS 1">JSS 1 (Junior Secondary Year 1)</option>
                      <option value="JSS 2">JSS 2 (Junior Secondary Year 2)</option>
                      <option value="JSS 3">JSS 3 (Junior Secondary Year 3)</option>
                      <option value="SS 1">SS 1 (Senior Secondary Year 1)</option>
                      <option value="SS 2">SS 2 (Senior Secondary Year 2)</option>
                      <option value="SS 3">SS 3 (Senior Secondary Year 3 - Transfer)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Parent / Guardian Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={admissionParentPhone}
                      onChange={(e) => setAdmissionParentPhone(e.target.value)}
                      placeholder="+234 800 000 0000"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Parent / Guardian Email Address
                    </label>
                    <input
                      type="email"
                      value={admissionParentEmail}
                      onChange={(e) => setAdmissionParentEmail(e.target.value)}
                      placeholder="parent@example.com"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Application fee is waived for online preliminary registration.
                  </span>
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl font-bold text-xs text-white flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                    style={{
                      background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                    }}
                  >
                    <span>Submit Admission Form</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. ACADEMIC CALENDAR & EVENTS                                */}
      {/* ============================================================ */}
      <section id="calendar" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-slate-900 border border-slate-800" style={{ color: accentColor }}>
                School Dates & Schedules
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
                Term Calendar & Key Events
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-md">
              Statutory term dates, midterm assessments, WAEC mock milestones, and holidays.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">First Term 2026/27</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 font-bold">
                  Resumption: Sept 14
                </span>
              </div>
              <p className="text-xs text-slate-400">
                13 Weeks of Intensive Curriculum, Midterm CA Assessments, and Inter-House Sports Trials.
              </p>
              <div className="text-[11px] text-slate-500 font-mono">
                Vacation: Dec 18, 2026
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Second Term 2026/27</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-500/20 text-sky-300 font-bold">
                  Resumption: Jan 11
                </span>
              </div>
              <p className="text-xs text-slate-400">
                WAEC & NECO Mock Examinations for SS 3 candidates, Science Olympiad & Drama Expo.
              </p>
              <div className="text-[11px] text-slate-500 font-mono">
                Vacation: April 02, 2027
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Third Term 2026/27</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 font-bold">
                  Resumption: April 26
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Annual Promotional Examinations, Broadsheet Ratification, Graduation & Prize-Giving Gala.
              </p>
              <div className="text-[11px] text-slate-500 font-mono">
                Vacation: July 23, 2027
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 7. CONTACT US & LOCATION                                     */}
      {/* ============================================================ */}
      <section id="contact" className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-900/60 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 text-left">
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-slate-950 border border-slate-800" style={{ color: accentColor }}>
                  Get in Touch
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
                  Visit Our Campus or Send an Inquiry
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Our administrative and admissions offices are open Monday through Friday, 7:30 AM – 4:30 PM.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-emerald-400">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Campus Address</h4>
                    <p className="text-xs text-slate-400">Plot 44, Academic Way, Victoria Island / Ikeja GRA, Lagos, Nigeria</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-emerald-400">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Admissions & Front Desk</h4>
                    <p className="text-xs text-slate-400">+234 803 111 2233 / +234 802 999 8877</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-emerald-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Official School Email</h4>
                    <p className="text-xs text-slate-400">info@{tenant.schoolSlug}.edu.ng</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Inquiry Box */}
            <div className="p-6 sm:p-7 rounded-3xl bg-slate-950 border border-slate-800 shadow-xl">
              <h3 className="text-base font-bold text-white mb-4">Send a Message to the Principal's Desk</h3>
              {inquirySuccess ? (
                <div className="p-6 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <h4 className="text-sm font-bold text-white">Inquiry Sent Successfully</h4>
                  <p className="text-xs text-slate-400">Our front office will respond within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleInquirySubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Subject</label>
                    <input
                      type="text"
                      required
                      value={quickInquirySubject}
                      onChange={(e) => setQuickInquirySubject(e.target.value)}
                      placeholder="e.g. Tour Booking / Transfer Questions"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Message</label>
                    <textarea
                      rows={3}
                      required
                      value={quickInquiryMsg}
                      onChange={(e) => setQuickInquiryMsg(e.target.value)}
                      placeholder="How can we help your child excel?"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl font-bold text-xs text-white shadow-md transition-all cursor-pointer"
                    style={{
                      background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                    }}
                  >
                    Send Message
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 8. PUBLIC FOOTER                                             */}
      {/* ============================================================ */}
      <footer className="py-10 px-4 sm:px-6 lg:px-8 bg-slate-950 border-t border-slate-900 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">{schoolName}</span>
            <span>•</span>
            <span>{tenantDomain}</span>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={onOpenAuthModal}
              className="text-slate-400 hover:text-emerald-400 transition-colors font-medium cursor-pointer"
            >
              Staff Portal Sign In
            </button>
            <span>•</span>
            <span>© {new Date().getFullYear()} All Rights Reserved</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
