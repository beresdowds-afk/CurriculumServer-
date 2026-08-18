import React, { useState, useMemo } from 'react';
import { 
  UserProfile, 
  Term, 
  AcademicTermConfig, 
  PublicHoliday, 
  SchoolEvent, 
  SchoolEventType, 
  AcademicSessionInfo 
} from '../types';
import { 
  Calendar as CalendarIcon, 
  CalendarDays, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Edit3, 
  Trash2, 
  Download, 
  Share2, 
  Filter, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  Sparkles, 
  Flag, 
  FileText, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Trophy, 
  Award, 
  Eye, 
  Layers, 
  Check, 
  X,
  Printer,
  CalendarCheck,
  Building,
  Info,
  ChevronDown
} from 'lucide-react';

interface AcademicCalendarTabProps {
  currentUser: UserProfile;
  academicSessions: AcademicSessionInfo[];
  termsConfig: AcademicTermConfig[];
  publicHolidays: PublicHoliday[];
  schoolEvents: SchoolEvent[];
  onUpdateTermConfig: (termConfig: AcademicTermConfig) => void;
  onAddSchoolEvent: (event: SchoolEvent) => void;
  onUpdateSchoolEvent: (event: SchoolEvent) => void;
  onDeleteSchoolEvent: (eventId: string) => void;
  onAddPublicHoliday: (holiday: PublicHoliday) => void;
  onUpdatePublicHoliday: (holiday: PublicHoliday) => void;
  onDeletePublicHoliday: (holidayId: string) => void;
  onNavigateTab?: (tab: any) => void;
}

type CalendarViewMode = 'terms_overview' | 'monthly_almanac' | 'holidays_registry' | 'events_list' | 'official_gazette';

export const AcademicCalendarTab: React.FC<AcademicCalendarTabProps> = ({
  currentUser,
  academicSessions,
  termsConfig,
  publicHolidays,
  schoolEvents,
  onUpdateTermConfig,
  onAddSchoolEvent,
  onUpdateSchoolEvent,
  onDeleteSchoolEvent,
  onAddPublicHoliday,
  onUpdatePublicHoliday,
  onDeletePublicHoliday,
  onNavigateTab
}) => {
  // Navigation & Filter State
  const [activeView, setActiveView] = useState<CalendarViewMode>('terms_overview');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('session-2026-2027');
  const [selectedTermFilter, setSelectedTermFilter] = useState<Term | 'all'>('Term 1');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<SchoolEventType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Monthly Calendar Navigation State (Default to Sept 2026)
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date(2026, 8, 1)); // Sept 2026
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>('2026-09-14');

  // Modals state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SchoolEvent | null>(null);

  const [isTermModalOpen, setIsTermModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<AcademicTermConfig | null>(null);

  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<PublicHoliday | null>(null);

  const [isApprovalSuccessToast, setIsApprovalSuccessToast] = useState(false);

  // Active current term
  const activeTermConfig = useMemo(() => {
    return termsConfig.find(t => t.isCurrent) || termsConfig[0];
  }, [termsConfig]);

  const activeSession = useMemo(() => {
    return academicSessions.find(s => s.id === selectedSessionId) || academicSessions[0];
  }, [academicSessions, selectedSessionId]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return schoolEvents.filter(event => {
      const matchTerm = selectedTermFilter === 'all' || event.term === selectedTermFilter;
      const matchCategory = selectedCategoryFilter === 'all' || event.eventType === selectedCategoryFilter;
      const matchSearch = searchQuery.trim() === '' || 
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.organizer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchTerm && matchCategory && matchSearch;
    }).sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [schoolEvents, selectedTermFilter, selectedCategoryFilter, searchQuery]);

  // Filtered Holidays
  const filteredHolidays = useMemo(() => {
    return publicHolidays.filter(h => {
      const matchTerm = selectedTermFilter === 'all' || h.term === selectedTermFilter;
      const matchSearch = searchQuery.trim() === '' ||
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchTerm && matchSearch;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [publicHolidays, selectedTermFilter, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalEvents = schoolEvents.length;
    const totalHolidays = publicHolidays.length;
    const currentTermDays = activeTermConfig ? activeTermConfig.totalTeachingDays : 68;
    const totalWeeks = termsConfig.reduce((acc, t) => acc + t.totalWeeks, 0);
    const approvedTermsCount = termsConfig.filter(t => t.approvedByPrincipal).length;

    return {
      totalEvents,
      totalHolidays,
      currentTermDays,
      totalWeeks,
      approvedTermsCount,
      allApproved: approvedTermsCount === termsConfig.length
    };
  }, [schoolEvents, publicHolidays, activeTermConfig, termsConfig]);

  // Principal Quick Approval Handler
  const handlePrincipalApproveAll = () => {
    termsConfig.forEach(term => {
      if (!term.approvedByPrincipal) {
        onUpdateTermConfig({
          ...term,
          approvedByPrincipal: true,
          approvalDate: new Date().toISOString().split('T')[0],
          principalRemarks: `Formally promulgated and gazetted by Principal ${currentUser.name} on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.`
        });
      }
    });
    setIsApprovalSuccessToast(true);
    setTimeout(() => setIsApprovalSuccessToast(false), 4000);
  };

  // Helper for Event Type Labels and Badges
  const getEventTypeBadge = (type: SchoolEventType) => {
    switch (type) {
      case 'academic_milestone':
        return { label: 'Academic Milestone', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: GraduationCap };
      case 'continuous_assessment':
        return { label: 'Continuous Assessment', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: Clock };
      case 'examination':
        return { label: 'Examination', bg: 'bg-sky-500/10 text-sky-400 border-sky-500/30', icon: FileText };
      case 'pta_meeting':
        return { label: 'PTA & Parents', bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30', icon: Users };
      case 'sports_extracurricular':
        return { label: 'Sports & Clubs', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: Trophy };
      case 'staff_development':
        return { label: 'Staff Workshop', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30', icon: BookOpen };
      case 'ceremonial':
        return { label: 'Ceremonial Gala', bg: 'bg-pink-500/10 text-pink-400 border-pink-500/30', icon: Award };
      case 'inspection_audit':
        return { label: 'Ministry Inspection', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30', icon: ShieldCheck };
      case 'holiday_break':
        return { label: 'Holiday Break', bg: 'bg-amber-500/10 text-amber-300 border-amber-500/30', icon: Flag };
      default:
        return { label: 'Event', bg: 'bg-slate-500/10 text-slate-400 border-slate-500/30', icon: CalendarIcon };
    }
  };

  // Helper for Month Days Generator
  const calendarMonthData = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    // First day of month (0 = Sun, 1 = Mon...)
    const firstDayIndex = new Date(year, month, 1).getDay();
    // Number of days in current month
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    // Number of days in previous month
    const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = totalDaysInPrevMonth - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dayNum,
        dateStr,
        isCurrentMonth: false,
        isWeekend: false
      });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month, i).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Find events & holidays on this date
      const dayEvents = schoolEvents.filter(e => {
        if (e.endDate) {
          return dateStr >= e.startDate && dateStr <= e.endDate;
        }
        return e.startDate === dateStr;
      });

      const dayHolidays = publicHolidays.filter(h => {
        if (h.endDate) {
          return dateStr >= h.date && dateStr <= h.endDate;
        }
        return h.date === dateStr;
      });

      // Check if within any term date range
      const matchingTerm = termsConfig.find(t => dateStr >= t.startDate && dateStr <= t.endDate);
      const isMidTerm = termsConfig.some(t => dateStr >= t.midTermBreakStart && dateStr <= t.midTermBreakEnd);
      const isExam = termsConfig.some(t => dateStr >= t.examinationStart && dateStr <= t.examinationEnd);
      const isRevision = termsConfig.some(t => dateStr >= t.revisionWeekStart && dateStr <= t.revisionWeekEnd);
      const isVacation = termsConfig.some(t => dateStr >= t.vacationStart && dateStr <= t.vacationEnd);

      days.push({
        dayNum: i,
        dateStr,
        isCurrentMonth: true,
        isWeekend,
        events: dayEvents,
        holidays: dayHolidays,
        term: matchingTerm,
        isMidTerm,
        isExam,
        isRevision,
        isVacation
      });
    }

    // Next month padding days to complete 35 or 42 grid
    const remainingSlots = 42 - days.length;
    if (remainingSlots > 0 && remainingSlots < 7) {
      for (let i = 1; i <= remainingSlots; i++) {
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        days.push({
          dayNum: i,
          dateStr,
          isCurrentMonth: false,
          isWeekend: false
        });
      }
    }

    return days;
  }, [currentCalendarDate, schoolEvents, publicHolidays, termsConfig]);

  // Selected Day Details
  const selectedDayDetails = useMemo(() => {
    if (!selectedCalendarDay) return null;
    const events = schoolEvents.filter(e => {
      if (e.endDate) return selectedCalendarDay >= e.startDate && selectedCalendarDay <= e.endDate;
      return e.startDate === selectedCalendarDay;
    });
    const holidays = publicHolidays.filter(h => {
      if (h.endDate) return selectedCalendarDay >= h.date && selectedCalendarDay <= h.endDate;
      return h.date === selectedCalendarDay;
    });
    const term = termsConfig.find(t => selectedCalendarDay >= t.startDate && selectedCalendarDay <= t.endDate);

    return {
      dateStr: selectedCalendarDay,
      events,
      holidays,
      term
    };
  }, [selectedCalendarDay, schoolEvents, publicHolidays, termsConfig]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Toast Alert for Principal Promulgation */}
      {isApprovalSuccessToast && (
        <div className="p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 flex items-center justify-between shadow-2xl animate-in slide-in-from-top-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm block text-white">Academic Calendar Gazetted & Promulgated</span>
              <span className="text-xs text-emerald-400/90">
                All term dates, public holidays, and assessment deadlines have been digitally certified by the Principal.
              </span>
            </div>
          </div>
          <button 
            onClick={() => setIsApprovalSuccessToast(false)}
            className="p-1 rounded-lg text-emerald-400 hover:text-white hover:bg-emerald-800/40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header & Quick Stats Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-700/70 shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>{activeSession.title}</span>
              </span>
              {stats.allApproved ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Principal Gazetted</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Provisional Draft</span>
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <CalendarDays className="w-6 h-6 text-emerald-400" />
              <span>Academic Calendar, Term Dates & School Events</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl">
              Official school year management for the Principal and Academic Committee. Set resumption dates, mid-term breaks, statutory public holidays, CA submission windows, and school-wide events.
            </p>
          </div>

          {/* Action Buttons for Principal / Admins */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setEditingEvent(null);
                setIsEventModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Add School Event</span>
            </button>

            <button
              onClick={() => {
                setEditingHoliday(null);
                setIsHolidayModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-semibold text-xs flex items-center gap-2 border border-slate-700 transition-all cursor-pointer"
            >
              <Flag className="w-4 h-4 text-amber-400" />
              <span>Add Public Holiday</span>
            </button>

            {currentUser.role === 'principal' || currentUser.role === 'super_admin' ? (
              <button
                onClick={handlePrincipalApproveAll}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-950/40 transition-all cursor-pointer"
                title="Principal Promulgation and Digital Certification"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-200" />
                <span>Gazette & Certify</span>
              </button>
            ) : null}

            <button
              onClick={() => setActiveView('official_gazette')}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 border border-slate-700 transition-all"
              title="Printable Almanac"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>Print Almanac</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
              <CalendarIcon className="w-3 h-3 text-emerald-400" />
              <span>Active Term</span>
            </span>
            <div className="text-base sm:text-lg font-black text-emerald-300 truncate">
              {activeTermConfig ? activeTermConfig.term : 'Term 1'}
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {activeTermConfig ? activeTermConfig.title : 'Advent Term'}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-blue-400" />
              <span>Term Teaching Days</span>
            </span>
            <div className="text-base sm:text-lg font-black text-blue-300">
              {stats.currentTermDays} Days
            </div>
            <p className="text-[11px] text-slate-400">
              {activeTermConfig ? `${activeTermConfig.totalWeeks} Academic Weeks` : '14 Weeks'}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
              <Flag className="w-3 h-3 text-amber-400" />
              <span>Public Holidays</span>
            </span>
            <div className="text-base sm:text-lg font-black text-amber-300">
              {stats.totalHolidays} Days
            </div>
            <p className="text-[11px] text-slate-400">
              Statutory Blackout Days
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-purple-400" />
              <span>School Events</span>
            </span>
            <div className="text-base sm:text-lg font-black text-purple-300">
              {stats.totalEvents} Scheduled
            </div>
            <p className="text-[11px] text-slate-400">
              Sports, Exams & PTA
            </p>
          </div>

          <div className="col-span-2 sm:col-span-4 lg:col-span-1 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1 flex flex-col justify-center">
            <span className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-teal-400" />
              <span>Gazette Status</span>
            </span>
            <div className="text-sm font-bold text-teal-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
              <span>{stats.approvedTermsCount} / {termsConfig.length} Terms Certified</span>
            </div>
            <p className="text-[10px] text-slate-400">
              NERDC 2026/27 Standard
            </p>
          </div>
        </div>

        {/* View Mode Switcher Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveView('terms_overview')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                activeView === 'terms_overview'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Term Dates & Milestones</span>
            </button>

            <button
              onClick={() => setActiveView('monthly_almanac')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                activeView === 'monthly_almanac'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Interactive Month Almanac</span>
            </button>

            <button
              onClick={() => setActiveView('events_list')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                activeView === 'events_list'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>School Events ({schoolEvents.length})</span>
            </button>

            <button
              onClick={() => setActiveView('holidays_registry')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                activeView === 'holidays_registry'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Flag className="w-3.5 h-3.5 text-amber-400" />
              <span>Public Holidays ({publicHolidays.length})</span>
            </button>

            <button
              onClick={() => setActiveView('official_gazette')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                activeView === 'official_gazette'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-indigo-300" />
              <span>Official Principal Gazette</span>
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedTermFilter}
                onChange={(e) => setSelectedTermFilter(e.target.value as any)}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs"
              >
                <option value="all" className="bg-slate-900 text-white">All 3 Terms</option>
                <option value="Term 1" className="bg-slate-900 text-white">Term 1 Only</option>
                <option value="Term 2" className="bg-slate-900 text-white">Term 2 Only</option>
                <option value="Term 3" className="bg-slate-900 text-white">Term 3 Only</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: 3-TERM OVERVIEW & MILESTONES                                      */}
      {/* ========================================================================= */}
      {activeView === 'terms_overview' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                <span>3-Term Statutory Framework (2026/2027 Session)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configured resumption dates, assessment deadlines, mid-term breaks, and revision/examination periods.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {termsConfig.map((termItem) => {
              const isTermCurrent = termItem.isCurrent;
              return (
                <div
                  key={termItem.id}
                  className={`p-5 rounded-3xl bg-slate-900/90 border transition-all space-y-4 flex flex-col justify-between ${
                    isTermCurrent
                      ? 'border-emerald-500/50 shadow-xl shadow-emerald-950/30'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Card Header */}
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        isTermCurrent
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {termItem.term} • {termItem.status}
                      </span>
                      {termItem.approvedByPrincipal ? (
                        <span className="flex items-center gap-1 text-[11px] text-teal-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approved</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] text-amber-400 font-semibold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Draft</span>
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white">{termItem.title}</h3>
                      <p className="text-xs text-emerald-400/90 italic mt-0.5">
                        "{termItem.themeOrMotto || 'Academic Mastery'}"
                      </p>
                    </div>

                    {/* Term Dates Breakdown */}
                    <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5 text-xs text-slate-300">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-850">
                        <span className="text-slate-400">Term Duration:</span>
                        <span className="font-semibold text-white">
                          {termItem.startDate} &rarr; {termItem.endDate}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Total Weeks:</span>
                        <span className="font-bold text-emerald-400">{termItem.totalWeeks} Weeks</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Teaching Days:</span>
                        <span className="font-bold text-blue-400">{termItem.totalTeachingDays} Days</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Staff Resumption:</span>
                        <span className="font-medium text-slate-200">{termItem.staffResumptionDate}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Students Resumption:</span>
                        <span className="font-medium text-slate-200">{termItem.resumptionDate}</span>
                      </div>
                    </div>

                    {/* Key Milestones & Deadlines */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                        Milestones & Deadlines
                      </span>

                      <div className="space-y-1.5 text-xs">
                        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Mid-Term Break</span>
                          </span>
                          <span className="font-bold">{termItem.midTermBreakStart} &rarr; {termItem.midTermBreakEnd}</span>
                        </div>

                        <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Revision Week</span>
                          </span>
                          <span className="font-bold">{termItem.revisionWeekStart} &rarr; {termItem.revisionWeekEnd}</span>
                        </div>

                        <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" />
                            <span>Examinations</span>
                          </span>
                          <span className="font-bold">{termItem.examinationStart} &rarr; {termItem.examinationEnd}</span>
                        </div>

                        <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5" />
                            <span>Vacation Period</span>
                          </span>
                          <span className="font-bold">{termItem.vacationStart} &rarr; {termItem.vacationEnd}</span>
                        </div>
                      </div>
                    </div>

                    {/* Objectives */}
                    {termItem.termObjectives && termItem.termObjectives.length > 0 && (
                      <div className="p-3 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Term Objectives
                        </span>
                        <ul className="space-y-1 text-[11px] text-slate-300">
                          {termItem.termObjectives.map((obj, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-emerald-400 mt-0.5">•</span>
                              <span>{obj}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Edit Action */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Next Resumption: <strong className="text-slate-200">{termItem.nextTermResumptionDate}</strong>
                    </span>
                    <button
                      onClick={() => {
                        setEditingTerm(termItem);
                        setIsTermModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1 border border-slate-700 transition-all cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Edit Dates</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: MONTHLY ALMANAC CALENDAR GRID                                     */}
      {/* ========================================================================= */}
      {activeView === 'monthly_almanac' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* Month Header Navigation */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const prev = new Date(currentCalendarDate);
                  prev.setMonth(prev.getMonth() - 1);
                  setCurrentCalendarDate(prev);
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <h2 className="text-lg sm:text-xl font-bold text-white min-w-[200px] text-center">
                {currentCalendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>

              <button
                onClick={() => {
                  const next = new Date(currentCalendarDate);
                  next.setMonth(next.getMonth() + 1);
                  setCurrentCalendarDate(next);
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Month Selectors */}
            <div className="flex items-center gap-1 overflow-x-auto text-xs">
              {['Sep 2026', 'Oct 2026', 'Nov 2026', 'Dec 2026', 'Jan 2027', 'Feb 2027', 'Mar 2027', 'Apr 2027', 'May 2027', 'Jun 2027', 'Jul 2027'].map((mStr, idx) => {
                const parts = mStr.split(' ');
                const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(parts[0]);
                const yr = parseInt(parts[1]);
                const isSelected = currentCalendarDate.getMonth() === monthIndex && currentCalendarDate.getFullYear() === yr;

                return (
                  <button
                    key={mStr}
                    onClick={() => setCurrentCalendarDate(new Date(yr, monthIndex, 1))}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
                      isSelected 
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {parts[0]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calendar Grid + Selected Day Details */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Calendar 7-Column Grid (3 Columns) */}
            <div className="lg:col-span-3 space-y-2">
              {/* Day Headers (Sun - Sat) */}
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 py-2">
                <span className="text-rose-400">Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span className="text-blue-400">Sat</span>
              </div>

              {/* Month Cells Grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarMonthData.map((cell, index) => {
                  const isSelected = selectedCalendarDay === cell.dateStr;
                  const hasHoliday = cell.holidays && cell.holidays.length > 0;
                  const hasEvents = cell.events && cell.events.length > 0;

                  return (
                    <div
                      key={index}
                      onClick={() => cell.isCurrentMonth && setSelectedCalendarDay(cell.dateStr)}
                      className={`min-h-[90px] sm:min-h-[105px] p-2 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer ${
                        !cell.isCurrentMonth
                          ? 'opacity-30 bg-slate-950/30 border-slate-900 pointer-events-none'
                          : isSelected
                          ? 'bg-slate-800 border-emerald-400 ring-2 ring-emerald-500/40 shadow-lg'
                          : hasHoliday
                          ? 'bg-amber-950/30 border-amber-800/60 hover:bg-amber-950/50'
                          : cell.isExam
                          ? 'bg-sky-950/30 border-sky-800/60 hover:bg-sky-950/50'
                          : cell.isMidTerm
                          ? 'bg-purple-950/30 border-purple-800/60 hover:bg-purple-950/50'
                          : cell.isVacation
                          ? 'bg-slate-900/40 border-slate-800 hover:bg-slate-850'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-950 font-black'
                            : hasHoliday
                            ? 'text-amber-400 font-bold'
                            : 'text-slate-300'
                        }`}>
                          {cell.dayNum}
                        </span>

                        {hasHoliday && (
                          <span className="p-0.5 rounded bg-amber-500/20 text-amber-400" title={cell.holidays![0].name}>
                            <Flag className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      {/* Event Badges inside Cell */}
                      <div className="space-y-1 mt-1 overflow-hidden">
                        {hasHoliday && (
                          <div className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold truncate">
                            {cell.holidays![0].name}
                          </div>
                        )}

                        {cell.events?.slice(0, 2).map((ev) => (
                          <div
                            key={ev.id}
                            className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-semibold truncate"
                          >
                            {ev.title}
                          </div>
                        ))}

                        {cell.events && cell.events.length > 2 && (
                          <span className="text-[9px] text-slate-400 pl-1 font-mono">
                            +{cell.events.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Date Inspector Sidebar (1 Column) */}
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 sticky top-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Selected Day Details
                    </span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400">
                    {selectedCalendarDay || 'None'}
                  </span>
                </div>

                {selectedDayDetails ? (
                  <div className="space-y-3">
                    {selectedDayDetails.term && (
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                        <span className="text-slate-400 block text-[10px]">Academic Term:</span>
                        <span className="font-bold text-emerald-300">{selectedDayDetails.term.title}</span>
                      </div>
                    )}

                    {/* Holidays on this day */}
                    {selectedDayDetails.holidays.length > 0 ? (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                          Public Holiday
                        </span>
                        {selectedDayDetails.holidays.map(h => (
                          <div key={h.id} className="p-3 rounded-2xl bg-amber-950/40 border border-amber-800/50 space-y-1 text-xs text-amber-200">
                            <div className="font-bold text-amber-300 flex items-center gap-1.5">
                              <Flag className="w-3.5 h-3.5" />
                              <span>{h.name}</span>
                            </div>
                            <p className="text-[11px] text-slate-300">{h.description}</p>
                            <span className="inline-block text-[10px] font-mono bg-amber-900/60 px-2 py-0.5 rounded text-amber-200">
                              Mandatory Campus Closure
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {/* Events on this day */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Scheduled Events ({selectedDayDetails.events.length})
                      </span>

                      {selectedDayDetails.events.length === 0 ? (
                        <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 text-center text-xs text-slate-500">
                          No special school events scheduled on this date.
                        </div>
                      ) : (
                        selectedDayDetails.events.map(ev => {
                          const badge = getEventTypeBadge(ev.eventType);
                          const Icon = badge.icon;
                          return (
                            <div key={ev.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${badge.bg}`}>
                                  <Icon className="w-3 h-3" />
                                  <span>{badge.label}</span>
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {ev.startTime || 'All Day'}
                                </span>
                              </div>

                              <h4 className="font-bold text-white text-xs">{ev.title}</h4>
                              <p className="text-[11px] text-slate-400">{ev.description}</p>

                              <div className="pt-1 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-850">
                                <span>📍 {ev.location}</span>
                                <span>👤 {ev.organizer}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setEditingEvent({
                          id: `evt-${Date.now()}`,
                          title: '',
                          eventType: 'academic_milestone',
                          term: 'Term 1',
                          academicSession: '2026/2027',
                          startDate: selectedCalendarDay || '2026-09-14',
                          location: 'School Main Auditorium',
                          targetAudience: 'all',
                          organizer: currentUser.name,
                          description: '',
                          isPublished: true,
                          priority: 'medium',
                          status: 'scheduled',
                          requiresAttendance: true
                        });
                        setIsEventModalOpen(true);
                      }}
                      className="w-full py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-slate-950 text-xs font-bold border border-emerald-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Event on this Day</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: SCHOOL EVENTS REGISTRY                                            */}
      {/* ========================================================================= */}
      {activeView === 'events_list' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-purple-400" />
                <span>Master School Events & Assessment Milestones Registry</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Comprehensive directory of sporting galas, examination vaults, PTA meetings, and staff workshops.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search events, organizers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="academic_milestone">Academic Milestones</option>
                <option value="continuous_assessment">Continuous Assessment (CA)</option>
                <option value="examination">Examinations</option>
                <option value="pta_meeting">PTA & Parents</option>
                <option value="sports_extracurricular">Sports & Inter-House</option>
                <option value="staff_development">Staff Development</option>
                <option value="ceremonial">Ceremonial Galas</option>
                <option value="inspection_audit">Ministry Inspections</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEvents.map((event) => {
              const badge = getEventTypeBadge(event.eventType);
              const Icon = badge.icon;
              return (
                <div
                  key={event.id}
                  className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-3 flex flex-col justify-between group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${badge.bg}`}>
                        <Icon className="w-3 h-3" />
                        <span>{badge.label}</span>
                      </span>

                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                        {event.term}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                      {event.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {event.description}
                    </p>

                    <div className="p-2.5 rounded-2xl bg-slate-950/70 border border-slate-850 space-y-1.5 text-xs text-slate-300">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Date:</span>
                        <span className="font-bold text-white">
                          {event.startDate} {event.endDate ? `→ ${event.endDate}` : ''}
                        </span>
                      </div>

                      {event.startTime && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Time:</span>
                          <span className="font-medium text-slate-200">
                            {event.startTime} {event.endTime ? `- ${event.endTime}` : ''}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Location:</span>
                        <span className="font-medium text-slate-200">{event.location}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Audience:</span>
                        <span className="font-semibold text-emerald-400 uppercase text-[10px]">
                          {event.targetAudience}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                      By: {event.organizer}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingEvent(event);
                          setIsEventModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white"
                        title="Edit Event"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${event.title}"?`)) {
                            onDeleteSchoolEvent(event.id);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-400"
                        title="Delete Event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 4: PUBLIC HOLIDAYS REGISTRY                                          */}
      {/* ========================================================================= */}
      {activeView === 'holidays_registry' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Flag className="w-5 h-5 text-amber-400" />
                <span>Statutory Public Holidays & Mandatory Closures</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Federal and State gazetted public holidays automatically blacked out from timetable generation and gate attendance registers.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingHoliday(null);
                setIsHolidayModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Holiday</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHolidays.map((holiday) => (
              <div
                key={holiday.id}
                className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      {holiday.type} Holiday
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                      {holiday.term}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white">{holiday.name}</h3>
                  <p className="text-xs text-slate-400">{holiday.description}</p>

                  <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-850 space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Date:</span>
                      <span className="font-bold text-amber-300">
                        {holiday.date} {holiday.endDate ? `→ ${holiday.endDate}` : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Duration:</span>
                      <span className="font-semibold text-slate-200">{holiday.daysCount} Day(s)</span>
                    </div>

                    {holiday.gazetteReference && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Gazette Ref:</span>
                        <span className="font-mono text-[10px] text-slate-400">{holiday.gazetteReference}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-amber-400/90 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Campus Closed</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEditingHoliday(holiday);
                        setIsHolidayModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Remove holiday "${holiday.name}"?`)) {
                          onDeletePublicHoliday(holiday.id);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 5: OFFICIAL PRINCIPAL GAZETTE ALMANAC (PRINT READY)                   */}
      {/* ========================================================================= */}
      {activeView === 'official_gazette' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl space-y-6 text-slate-200 animate-in fade-in duration-150">
          {/* Gazette Header */}
          <div className="border-b border-slate-700 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building className="w-6 h-6 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                  CurriculumFlow Academic Directorate
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Official School Academic Gazette & Almanack
              </h1>
              <p className="text-xs text-slate-400">
                Statutory Session: 2026/2027 • Approved under NERDC & State Ministry Quality Assurance Guidelines
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition-all self-start sm:self-auto cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official Gazette</span>
            </button>
          </div>

          {/* 3-Term Summary Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <th className="p-3">Academic Term</th>
                  <th className="p-3">Students Resumption</th>
                  <th className="p-3">Mid-Term Break</th>
                  <th className="p-3">Revision & Exams</th>
                  <th className="p-3">Vacation Closes</th>
                  <th className="p-3">Weeks / Days</th>
                  <th className="p-3">Certification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {termsConfig.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-850/50">
                    <td className="p-3 font-bold text-white">{t.title}</td>
                    <td className="p-3 text-emerald-400 font-semibold">{t.resumptionDate}</td>
                    <td className="p-3 text-amber-300">{t.midTermBreakStart} → {t.midTermBreakEnd}</td>
                    <td className="p-3 text-sky-300">{t.examinationStart} → {t.examinationEnd}</td>
                    <td className="p-3 text-slate-300">{t.vacationStart}</td>
                    <td className="p-3 text-slate-200">{t.totalWeeks} Wks ({t.totalTeachingDays} Days)</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-300 border border-teal-500/30">
                        {t.approvedByPrincipal ? 'Gazetted' : 'Provisional'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Principal Certification Seal */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Principal's Digital Endorsement</span>
              </span>
              <p className="text-xs text-slate-400 italic">
                "I hereby confirm that this Academic Calendar for the 2026/2027 Session has been reviewed and harmonized with NERDC curricular schemes and examination council timelines."
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="font-serif italic text-sm text-emerald-400 block font-bold">
                {currentUser.name}
              </span>
              <span className="text-[11px] text-slate-500">
                Principal & Head of School • CurriculumFlow
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT TERM DATES & CONFIGURATION                                  */}
      {/* ========================================================================= */}
      {isTermModalOpen && editingTerm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Configure {editingTerm.title}</h3>
                  <p className="text-xs text-slate-400">Update resumption, break, revision, and vacation dates.</p>
                </div>
              </div>
              <button
                onClick={() => setIsTermModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">Term Title / Theme</label>
                  <input
                    type="text"
                    value={editingTerm.title}
                    onChange={(e) => setEditingTerm({ ...editingTerm, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">Motto / Academic Theme</label>
                  <input
                    type="text"
                    value={editingTerm.themeOrMotto || ''}
                    onChange={(e) => setEditingTerm({ ...editingTerm, themeOrMotto: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">Staff Resumption Date</label>
                  <input
                    type="date"
                    value={editingTerm.staffResumptionDate}
                    onChange={(e) => setEditingTerm({ ...editingTerm, staffResumptionDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">Students Resumption Date</label>
                  <input
                    type="date"
                    value={editingTerm.resumptionDate}
                    onChange={(e) => setEditingTerm({ ...editingTerm, resumptionDate: e.target.value, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">Mid-Term Break Start</label>
                  <input
                    type="date"
                    value={editingTerm.midTermBreakStart}
                    onChange={(e) => setEditingTerm({ ...editingTerm, midTermBreakStart: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">Mid-Term Break End</label>
                  <input
                    type="date"
                    value={editingTerm.midTermBreakEnd}
                    onChange={(e) => setEditingTerm({ ...editingTerm, midTermBreakEnd: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">Examination Start Date</label>
                  <input
                    type="date"
                    value={editingTerm.examinationStart}
                    onChange={(e) => setEditingTerm({ ...editingTerm, examinationStart: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">Examination End Date</label>
                  <input
                    type="date"
                    value={editingTerm.examinationEnd}
                    onChange={(e) => setEditingTerm({ ...editingTerm, examinationEnd: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">Vacation Begins</label>
                  <input
                    type="date"
                    value={editingTerm.vacationStart}
                    onChange={(e) => setEditingTerm({ ...editingTerm, vacationStart: e.target.value, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">Next Term Resumption</label>
                  <input
                    type="date"
                    value={editingTerm.nextTermResumptionDate}
                    onChange={(e) => setEditingTerm({ ...editingTerm, nextTermResumptionDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">Total Academic Weeks</label>
                  <input
                    type="number"
                    value={editingTerm.totalWeeks}
                    onChange={(e) => setEditingTerm({ ...editingTerm, totalWeeks: parseInt(e.target.value) || 14 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">Total Teaching Days</label>
                  <input
                    type="number"
                    value={editingTerm.totalTeachingDays}
                    onChange={(e) => setEditingTerm({ ...editingTerm, totalTeachingDays: parseInt(e.target.value) || 68 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsTermModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onUpdateTermConfig(editingTerm);
                  setIsTermModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs"
              >
                Save Term Dates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD / EDIT SCHOOL EVENT                                          */}
      {/* ========================================================================= */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingEvent && schoolEvents.some(e => e.id === editingEvent.id) ? 'Edit School Event' : 'Schedule New School Event'}
                  </h3>
                  <p className="text-xs text-slate-400">Set event title, date, target audience, and location.</p>
                </div>
              </div>
              <button
                onClick={() => setIsEventModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const newEvt: SchoolEvent = {
                  id: editingEvent?.id || `evt-${Date.now()}`,
                  title: formData.get('title') as string,
                  eventType: formData.get('eventType') as SchoolEventType,
                  term: formData.get('term') as Term,
                  academicSession: '2026/2027',
                  startDate: formData.get('startDate') as string,
                  endDate: (formData.get('endDate') as string) || undefined,
                  startTime: (formData.get('startTime') as string) || undefined,
                  endTime: (formData.get('endTime') as string) || undefined,
                  location: formData.get('location') as string,
                  targetAudience: formData.get('targetAudience') as any,
                  organizer: formData.get('organizer') as string,
                  description: formData.get('description') as string,
                  isPublished: true,
                  priority: 'high',
                  status: 'scheduled',
                  requiresAttendance: formData.get('requiresAttendance') === 'true'
                };

                if (editingEvent && schoolEvents.some(e => e.id === editingEvent.id)) {
                  onUpdateSchoolEvent(newEvt);
                } else {
                  onAddSchoolEvent(newEvt);
                }
                setIsEventModalOpen(false);
              }}
              className="p-6 overflow-y-auto space-y-4 text-xs text-slate-300"
            >
              <div className="space-y-1.5">
                <label className="font-bold text-slate-200">Event Title *</label>
                <input
                  name="title"
                  required
                  defaultValue={editingEvent?.title || ''}
                  placeholder="e.g. 18th Annual Inter-House Athletics Gala"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">Event Category</label>
                  <select
                    name="eventType"
                    defaultValue={editingEvent?.eventType || 'sports_extracurricular'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none"
                  >
                    <option value="sports_extracurricular">Sports & Extra-Curricular</option>
                    <option value="academic_milestone">Academic Milestone</option>
                    <option value="continuous_assessment">Continuous Assessment (CA)</option>
                    <option value="examination">Examination</option>
                    <option value="pta_meeting">PTA & Parents</option>
                    <option value="staff_development">Staff Development</option>
                    <option value="ceremonial">Ceremonial & Gala</option>
                    <option value="inspection_audit">Ministry Audit</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">Term</label>
                  <select
                    name="term"
                    defaultValue={editingEvent?.term || 'Term 1'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none"
                  >
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Term 3">Term 3</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">Start Date *</label>
                  <input
                    name="startDate"
                    type="date"
                    required
                    defaultValue={editingEvent?.startDate || '2026-09-14'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">End Date (Optional)</label>
                  <input
                    name="endDate"
                    type="date"
                    defaultValue={editingEvent?.endDate || ''}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">Start Time</label>
                  <input
                    name="startTime"
                    placeholder="09:00 AM"
                    defaultValue={editingEvent?.startTime || '09:00 AM'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">Target Audience</label>
                  <select
                    name="targetAudience"
                    defaultValue={editingEvent?.targetAudience || 'all'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none"
                  >
                    <option value="all">All School Community</option>
                    <option value="students">Students Only</option>
                    <option value="teachers">Teachers & Staff</option>
                    <option value="parents">Parents & Guardians</option>
                    <option value="management">Management & HODs</option>
                    <option value="jss_only">Junior School (JSS)</option>
                    <option value="sss_only">Senior School (SSS)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">Location / Venue</label>
                  <input
                    name="location"
                    required
                    defaultValue={editingEvent?.location || 'School Main Auditorium'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">Organizer / Department</label>
                  <input
                    name="organizer"
                    required
                    defaultValue={editingEvent?.organizer || 'VP Academics'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-200">Event Description</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editingEvent?.description || ''}
                  placeholder="Outline key objectives and schedule notes..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none"
                />
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-end gap-3 -mx-6 -mb-6 mt-4">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs"
                >
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADD / EDIT PUBLIC HOLIDAY                                        */}
      {/* ========================================================================= */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <Flag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingHoliday ? 'Edit Public Holiday' : 'Add Statutory Public Holiday'}
                  </h3>
                  <p className="text-xs text-slate-400">Declare mandatory closures and timetable blackout days.</p>
                </div>
              </div>
              <button
                onClick={() => setIsHolidayModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const newHol: PublicHoliday = {
                  id: editingHoliday?.id || `hol-${Date.now()}`,
                  name: formData.get('name') as string,
                  date: formData.get('date') as string,
                  endDate: (formData.get('endDate') as string) || undefined,
                  type: formData.get('type') as any,
                  daysCount: parseInt(formData.get('daysCount') as string) || 1,
                  term: formData.get('term') as Term,
                  academicSession: '2026/2027',
                  description: formData.get('description') as string,
                  isMandatoryClosed: true,
                  gazetteReference: formData.get('gazetteReference') as string
                };

                if (editingHoliday) {
                  onUpdatePublicHoliday(newHol);
                } else {
                  onAddPublicHoliday(newHol);
                }
                setIsHolidayModalOpen(false);
              }}
              className="p-6 space-y-4 text-xs text-slate-300"
            >
              <div className="space-y-1.5">
                <label className="font-bold text-slate-200">Holiday Name *</label>
                <input
                  name="name"
                  required
                  defaultValue={editingHoliday?.name || ''}
                  placeholder="e.g. National Independence Day"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">Holiday Date *</label>
                  <input
                    name="date"
                    type="date"
                    required
                    defaultValue={editingHoliday?.date || '2026-10-01'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">End Date (If Multi-day)</label>
                  <input
                    name="endDate"
                    type="date"
                    defaultValue={editingHoliday?.endDate || ''}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">Classification</label>
                  <select
                    name="type"
                    defaultValue={editingHoliday?.type || 'national'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none"
                  >
                    <option value="national">National Statutory Holiday</option>
                    <option value="religious">Religious Public Holiday</option>
                    <option value="state">State Gazetted Holiday</option>
                    <option value="special_gazetted">Special Gazetted Holiday</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">Term</label>
                  <select
                    name="term"
                    defaultValue={editingHoliday?.term || 'Term 1'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none"
                  >
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Term 3">Term 3</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-200">Gazette Reference (Optional)</label>
                <input
                  name="gazetteReference"
                  defaultValue={editingHoliday?.gazetteReference || ''}
                  placeholder="e.g. FED-GAZ-2026-PUB-01"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-200">Description / Statutory Order</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingHoliday?.description || ''}
                  placeholder="Commemorative details..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none"
                />
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-end gap-3 -mx-6 -mb-6 mt-4">
                <button
                  type="button"
                  onClick={() => setIsHolidayModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs"
                >
                  Save Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
