import React, { useState, useMemo } from 'react';
import { 
  UserProfile, 
  SchoolAcademicCommandKPIs, 
  StudentMasteryProfile 
} from '../types';
import { 
  ShieldCheck, 
  TrendingUp, 
  Award, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  BarChart3, 
  FileText, 
  BookOpen, 
  HelpCircle,
  Clock,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Printer,
  Compass,
  Check
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  Cell, 
  ReferenceLine,
  AreaChart,
  Area
} from 'recharts';
import { 
  SUBJECT_PERFORMANCE_TRENDS, 
  SubjectPerformanceTrend 
} from '../data/academicRecordsData';

interface AcademicAnalyticsTabProps {
  currentUser: UserProfile;
  kpis: SchoolAcademicCommandKPIs;
  studentProfiles: StudentMasteryProfile[];
  onGeneratePersonalizedWorksheet: (studentId: string) => void;
}

export const AcademicAnalyticsTab: React.FC<AcademicAnalyticsTabProps> = ({
  currentUser,
  kpis,
  studentProfiles,
  onGeneratePersonalizedWorksheet
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(studentProfiles[0]?.studentId || '');
  const [activeAnalyticsSubTab, setActiveAnalyticsSubTab] = useState<'coverage' | 'teachers' | 'subject_trends' | 'students'>('coverage');

  // Subject Performance Trends State
  const [selectedDepartment, setSelectedDepartment] = useState<'all' | 'Sciences' | 'Arts & Humanities' | 'Commercial' | 'Junior Secondary'>('all');
  const [trendMetric, setTrendMetric] = useState<'average' | 'passRate' | 'distinctionRate'>('average');
  const [chartViewType, setChartViewType] = useState<'line' | 'grouped_bar'>('line');
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
  const [selectedTrendSubjectId, setSelectedTrendSubjectId] = useState<string>('subj-math');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const activeStudent = studentProfiles.find(s => s.studentId === selectedStudentId) || studentProfiles[0];

  // Filtered Subject Trends
  const filteredSubjectTrends = useMemo(() => {
    return SUBJECT_PERFORMANCE_TRENDS.filter(s => {
      const matchDept = selectedDepartment === 'all' || s.department === selectedDepartment;
      const matchSearch = s.name.toLowerCase().includes(subjectSearchQuery.toLowerCase()) ||
                          s.code.toLowerCase().includes(subjectSearchQuery.toLowerCase()) ||
                          s.leadTeacherName.toLowerCase().includes(subjectSearchQuery.toLowerCase());
      return matchDept && matchSearch;
    });
  }, [selectedDepartment, subjectSearchQuery]);

  // Transform data for Multi-Term Longitudinal Line Chart
  const termTimelineData = useMemo(() => {
    const termKeys = [
      { key: 'baseline', label: '24/25 Baseline', prop: 'priorYearBaselineAvg', passProp: 'creditPassRateTerm1' },
      { key: 't1', label: 'Term 1 (Mich)', prop: 'term1Avg', passProp: 'creditPassRateTerm1' },
      { key: 't2', label: 'Term 2 (Lent)', prop: 'term2Avg', passProp: 'creditPassRateTerm2' },
      { key: 't3', label: 'Term 3 (Trin)', prop: 'term3Avg', passProp: 'creditPassRateTerm3' }
    ];

    return termKeys.map(t => {
      const point: Record<string, any> = { term: t.label };
      filteredSubjectTrends.forEach(s => {
        if (trendMetric === 'average') {
          point[s.name] = t.key === 'baseline' ? s.priorYearBaselineAvg :
                          t.key === 't1' ? s.term1Avg :
                          t.key === 't2' ? s.term2Avg : s.term3Avg;
        } else if (trendMetric === 'passRate') {
          point[s.name] = t.key === 'baseline' ? (s.creditPassRateTerm1 - 4) :
                          t.key === 't1' ? s.creditPassRateTerm1 :
                          t.key === 't2' ? s.creditPassRateTerm2 : s.creditPassRateTerm3;
        } else {
          // Distinction Rate
          point[s.name] = t.key === 'baseline' ? Math.max(10, s.distinctionRateTerm3 - 15) :
                          t.key === 't1' ? Math.max(15, s.distinctionRateTerm3 - 10) :
                          t.key === 't2' ? Math.max(20, s.distinctionRateTerm3 - 5) : s.distinctionRateTerm3;
        }
      });
      return point;
    });
  }, [filteredSubjectTrends, trendMetric]);

  // Departmental Group Performance Progression for Grouped Bar Chart
  const departmentalComparisonData = useMemo(() => {
    const departments = ['Sciences', 'Arts & Humanities', 'Commercial', 'Junior Secondary'] as const;

    return departments.map(dept => {
      const subs = SUBJECT_PERFORMANCE_TRENDS.filter(s => s.department === dept);
      const count = subs.length || 1;

      const t1Avg = Number((subs.reduce((acc, s) => acc + s.term1Avg, 0) / count).toFixed(1));
      const t2Avg = Number((subs.reduce((acc, s) => acc + s.term2Avg, 0) / count).toFixed(1));
      const t3Avg = Number((subs.reduce((acc, s) => acc + s.term3Avg, 0) / count).toFixed(1));
      const passRate = Math.round(subs.reduce((acc, s) => acc + s.creditPassRateTerm3, 0) / count);

      return {
        department: dept === 'Arts & Humanities' ? 'Arts' : dept === 'Junior Secondary' ? 'Junior' : dept,
        fullName: dept,
        'Term 1': t1Avg,
        'Term 2': t2Avg,
        'Term 3': t3Avg,
        'Credit Pass %': passRate,
        gain: Number((t3Avg - t1Avg).toFixed(1))
      };
    });
  }, []);

  // Summary Metrics
  const summaryTrendMetrics = useMemo(() => {
    const totalSubs = SUBJECT_PERFORMANCE_TRENDS.length;
    const schoolMeanT3 = Number((SUBJECT_PERFORMANCE_TRENDS.reduce((a, b) => a + b.term3Avg, 0) / totalSubs).toFixed(1));
    const schoolMeanT1 = Number((SUBJECT_PERFORMANCE_TRENDS.reduce((a, b) => a + b.term1Avg, 0) / totalSubs).toFixed(1));
    const overallGain = Number((schoolMeanT3 - schoolMeanT1).toFixed(1));
    const avgPassRate = Math.round(SUBJECT_PERFORMANCE_TRENDS.reduce((a, b) => a + b.creditPassRateTerm3, 0) / totalSubs);

    // Highest improving subject
    const sortedByGain = [...SUBJECT_PERFORMANCE_TRENDS].sort((a, b) => (b.term3Avg - b.term1Avg) - (a.term3Avg - a.term1Avg));
    const topSubject = sortedByGain[0];

    return {
      schoolMeanT3,
      schoolMeanT1,
      overallGain,
      avgPassRate,
      topSubject
    };
  }, []);

  const activeTrendSubject = useMemo(() => {
    return SUBJECT_PERFORMANCE_TRENDS.find(s => s.id === selectedTrendSubjectId) || SUBJECT_PERFORMANCE_TRENDS[0];
  }, [selectedTrendSubjectId]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
          <Check className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Academic Intelligence & Quality Analytics</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Curriculum Coverage, Teacher Delivery & Subject Performance Intelligence
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Holistic insights across the entire academic pipeline: tracking syllabus pacing, teaching fidelity, student concept mastery, and longitudinal subject score trajectories.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-mono font-medium">
              School Coverage: {kpis.overallCurriculumCoverage}%
            </span>
          </div>
        </div>

        {/* Sub-Tab Navigation */}
        <div className="flex items-center overflow-x-auto gap-2 pt-6 mt-6 border-t border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveAnalyticsSubTab('coverage')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeAnalyticsSubTab === 'coverage'
                ? 'bg-emerald-600 text-white font-bold shadow'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Curriculum Coverage Matrix</span>
          </button>

          <button
            onClick={() => setActiveAnalyticsSubTab('teachers')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeAnalyticsSubTab === 'teachers'
                ? 'bg-emerald-600 text-white font-bold shadow'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Teacher Performance & Delivery Fidelity</span>
          </button>

          <button
            onClick={() => setActiveAnalyticsSubTab('subject_trends')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeAnalyticsSubTab === 'subject_trends'
                ? 'bg-emerald-600 text-white font-bold shadow'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span>Subject Performance Trends (Recharts)</span>
          </button>

          <button
            onClick={() => setActiveAnalyticsSubTab('students')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeAnalyticsSubTab === 'students'
                ? 'bg-emerald-600 text-white font-bold shadow'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Student Topic Mastery Profiles</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUBJECT-LEVEL PERFORMANCE TRENDS VISUALIZATION (RECHARTS) */}
      {/* ========================================================================= */}
      {activeAnalyticsSubTab === 'subject_trends' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Executive KPI Header Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">School Subject Average (Term 3)</span>
              <div className="text-2xl font-black text-emerald-400 flex items-center gap-2">
                <span>{summaryTrendMetrics.schoolMeanT3}%</span>
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800 flex items-center">
                  <ArrowUpRight className="w-3 h-3" /> +{summaryTrendMetrics.overallGain}%
                </span>
              </div>
              <span className="text-[10px] text-slate-500">Up from {summaryTrendMetrics.schoolMeanT1}% in Term 1</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">School Credit Pass Rate</span>
              <div className="text-2xl font-black text-blue-400">{summaryTrendMetrics.avgPassRate}%</div>
              <span className="text-[10px] text-slate-400">WAEC standard (A1 - C6 credits)</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Fastest Improving Subject</span>
              <div className="text-lg font-black text-indigo-400 truncate">{summaryTrendMetrics.topSubject?.name}</div>
              <span className="text-[10px] text-indigo-300 font-semibold">
                +{(summaryTrendMetrics.topSubject.term3Avg - summaryTrendMetrics.topSubject.term1Avg).toFixed(1)}% across 3 terms
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Tracked Subject Streams</span>
              <div className="text-2xl font-black text-white">{SUBJECT_PERFORMANCE_TRENDS.length} Subjects</div>
              <span className="text-[10px] text-slate-400">Across 4 academic departments</span>
            </div>
          </div>

          {/* Interactive Filters & Chart Options Toolbar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Department Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Department:</span>
              {[
                { id: 'all', label: 'All Departments' },
                { id: 'Sciences', label: 'Sciences (STEM)' },
                { id: 'Arts & Humanities', label: 'Arts & Humanities' },
                { id: 'Commercial', label: 'Commercial' },
                { id: 'Junior Secondary', label: 'Junior Secondary' }
              ].map(dept => (
                <button
                  key={dept.id}
                  onClick={() => setSelectedDepartment(dept.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedDepartment === dept.id
                      ? 'bg-emerald-600 text-white font-bold shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {dept.label}
                </button>
              ))}
            </div>

            {/* View Mode & Metric Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setChartViewType('line')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                    chartViewType === 'line' ? 'bg-slate-800 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Longitudinal Lines
                </button>
                <button
                  onClick={() => setChartViewType('grouped_bar')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                    chartViewType === 'grouped_bar' ? 'bg-slate-800 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Departmental Group Bars
                </button>
              </div>

              <select
                value={trendMetric}
                onChange={(e) => setTrendMetric(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500"
              >
                <option value="average">Metric: Term Average Score (%)</option>
                <option value="passRate">Metric: Credit Pass Rate (%)</option>
                <option value="distinctionRate">Metric: Distinction Rate (%)</option>
              </select>
            </div>
          </div>

          {/* Main Visual Canvas (Recharts) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>
                    {chartViewType === 'line'
                      ? `Subject Longitudinal Performance Trajectory (${selectedDepartment === 'all' ? 'All Groups' : selectedDepartment})`
                      : 'Departmental Average Progression Comparison Across Terms'
                    }
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {chartViewType === 'line'
                    ? 'Tracking term-over-term score progression from 2024/25 baseline through Terms 1, 2, and 3.'
                    : 'Benchmarking consolidated group averages for Sciences, Arts, Commercial, and Junior Secondary streams.'
                  }
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-emerald-500"></span> 65% Benchmark Standard
                </span>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-400" />
                  <span>Print Trend Report</span>
                </button>
              </div>
            </div>

            {/* Recharts Chart View */}
            <div className="h-80 sm:h-96 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                {chartViewType === 'line' ? (
                  <LineChart data={termTimelineData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis 
                      dataKey="term" 
                      stroke="#64748b" 
                      tick={{ fill: '#cbd5e1', fontSize: 12, fontWeight: 600 }}
                      axisLine={{ stroke: '#334155' }}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      domain={[40, 100]}
                      tick={{ fill: '#cbd5e1', fontSize: 12 }}
                      axisLine={{ stroke: '#334155' }}
                      label={{ value: trendMetric === 'average' ? 'Average Score (%)' : 'Percentage (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
                    />
                    <RechartsTooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-950 border border-slate-700 rounded-2xl p-4 shadow-2xl space-y-2 max-w-sm">
                              <div className="text-xs font-bold text-white border-b border-slate-800 pb-1.5">
                                {label} Performance Overview
                              </div>
                              <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                                {payload.map((entry: any, index: number) => (
                                  <div key={index} className="flex items-center justify-between text-xs gap-3">
                                    <span className="flex items-center gap-1.5 truncate max-w-[180px]" style={{ color: entry.color }}>
                                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }}></span>
                                      <span className="truncate">{entry.name}:</span>
                                    </span>
                                    <span className="font-mono font-bold text-white">{entry.value}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine y={65} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Credit Pass Benchmark (65%)', fill: '#34d399', fontSize: 10, position: 'insideBottomRight' }} />
                    <Legend 
                      wrapperStyle={{ paddingTop: '16px' }}
                      formatter={(value) => <span className="text-xs text-slate-300 font-medium">{value}</span>}
                    />
                    {filteredSubjectTrends.map((subj) => (
                      <Line
                        key={subj.id}
                        type="monotone"
                        dataKey={subj.name}
                        stroke={subj.departmentColor}
                        strokeWidth={selectedTrendSubjectId === subj.id ? 3.5 : 2}
                        dot={{ r: 4, strokeWidth: 2, fill: '#0f172a' }}
                        activeDot={{ r: 7 }}
                        strokeOpacity={selectedTrendSubjectId === subj.id ? 1 : 0.85}
                      />
                    ))}
                  </LineChart>
                ) : (
                  <BarChart data={departmentalComparisonData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis 
                      dataKey="fullName" 
                      stroke="#64748b" 
                      tick={{ fill: '#cbd5e1', fontSize: 12, fontWeight: 600 }}
                      axisLine={{ stroke: '#334155' }}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      domain={[40, 100]}
                      tick={{ fill: '#cbd5e1', fontSize: 12 }}
                      axisLine={{ stroke: '#334155' }}
                      label={{ value: 'Group Average Score (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
                    />
                    <RechartsTooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-950 border border-slate-700 rounded-2xl p-4 shadow-2xl space-y-2">
                              <div className="text-xs font-bold text-white border-b border-slate-800 pb-1">
                                {data.fullName} Progression
                              </div>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between text-slate-300">
                                  <span>Term 1 (Michaelmas):</span>
                                  <span className="font-mono font-bold text-amber-400">{data['Term 1']}%</span>
                                </div>
                                <div className="flex justify-between text-slate-300">
                                  <span>Term 2 (Lent):</span>
                                  <span className="font-mono font-bold text-cyan-400">{data['Term 2']}%</span>
                                </div>
                                <div className="flex justify-between text-slate-300">
                                  <span>Term 3 (Trinity):</span>
                                  <span className="font-mono font-bold text-emerald-400">{data['Term 3']}%</span>
                                </div>
                                <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                                  <span>Net Academic Growth:</span>
                                  <span className="font-mono font-bold text-emerald-400">+{data.gain}%</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '16px' }}
                      formatter={(value) => <span className="text-xs text-slate-300 font-medium">{value}</span>}
                    />
                    <Bar dataKey="Term 1" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Term 2" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Term 3" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Subject-by-Subject Comprehensive Performance Roster & Deep Dive */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Detailed Subject Performance & Remediation Matrix ({filteredSubjectTrends.length} Subjects)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Detailed breakdown of term-over-term growth, distinction percentages, curriculum milestone gains, and corrective actions.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search subject or teacher..."
                  value={subjectSearchQuery}
                  onChange={(e) => setSubjectSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {filteredSubjectTrends.map((subj) => {
                const gain = Number((subj.term3Avg - subj.term1Avg).toFixed(1));
                const isSelected = selectedTrendSubjectId === subj.id;

                return (
                  <div
                    key={subj.id}
                    onClick={() => setSelectedTrendSubjectId(subj.id)}
                    className={`bg-slate-850 p-5 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                      isSelected
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-slate-800/90'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: subj.departmentColor }}
                          ></span>
                          <h4 className="font-bold text-white text-sm">{subj.name}</h4>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {subj.code} • Lead: {subj.leadTeacherName}
                        </p>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3" /> +{gain}%
                      </span>
                    </div>

                    {/* Term progression mini bars */}
                    <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
                      <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-500 block font-sans">Term 1</span>
                        <span className="text-xs font-bold text-amber-400">{subj.term1Avg}%</span>
                      </div>
                      <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-500 block font-sans">Term 2</span>
                        <span className="text-xs font-bold text-cyan-400">{subj.term2Avg}%</span>
                      </div>
                      <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-500 block font-sans">Term 3</span>
                        <span className="text-xs font-bold text-emerald-400">{subj.term3Avg}%</span>
                      </div>
                    </div>

                    {/* Secondary Metrics */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                      <span>Pass Rate: <strong className="text-slate-200">{subj.creditPassRateTerm3}%</strong></span>
                      <span>Distinction: <strong className="text-slate-200">{subj.distinctionRateTerm3}%</strong></span>
                      <span>Cohort: <strong className="text-slate-200">{subj.enrolledStudentsCount}</strong></span>
                    </div>

                    {/* Key Topic Gain and Remedial Note */}
                    <div className="space-y-1 pt-1 text-[11px]">
                      <div className="text-emerald-400/90 leading-tight">
                        ✨ <strong>Gain:</strong> {subj.keyTopicGain}
                      </div>
                      <div className="text-slate-400 leading-tight">
                        📋 <strong>Intervention:</strong> {subj.remedialInterventionNote}
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="pt-2 flex items-center justify-between">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          showToast(`Dispatched adaptive worksheet pack for ${subj.name} to ${subj.leadTeacherName}`);
                        }}
                        className="w-full py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Dispatch Subject Practice Worksheets</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 1: Curriculum Coverage Matrix */}
      {activeAnalyticsSubTab === 'coverage' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs text-slate-400 font-medium">Term Planned Lessons</span>
              <div className="text-2xl font-black text-white mt-1">240 Periods</div>
              <span className="text-[11px] text-slate-500">12-Week Scheme Allocation</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs text-slate-400 font-medium">Delivered & Verified</span>
              <div className="text-2xl font-black text-emerald-400 mt-1">202 Periods (84.1%)</div>
              <span className="text-[11px] text-emerald-400 font-semibold">+2.4% vs projected pace</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs text-slate-400 font-medium">Outstanding / Delayed</span>
              <div className="text-2xl font-black text-amber-400 mt-1">17 Periods</div>
              <span className="text-[11px] text-amber-400/80">3 subjects requiring attention</span>
            </div>
          </div>

          {/* Subject Breakdown Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 overflow-hidden">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Subject-by-Subject Syllabus Coverage Status
            </h3>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-850 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Subject & Level</th>
                    <th className="p-3.5">Planned Units</th>
                    <th className="p-3.5">Delivered</th>
                    <th className="p-3.5">Coverage Pace</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {[
                    { subject: 'General Mathematics (SS 2)', planned: 36, delivered: 32, rate: 89, status: 'On Track' },
                    { subject: 'English Language (SS 2)', planned: 36, delivered: 33, rate: 92, status: 'Ahead of Pace' },
                    { subject: 'Physics (SS 2)', planned: 36, delivered: 28, rate: 78, status: 'Slight Delay' },
                    { subject: 'Chemistry (SS 2)', planned: 36, delivered: 31, rate: 86, status: 'On Track' },
                    { subject: 'Biology (SS 2)', planned: 36, delivered: 30, rate: 83, status: 'On Track' },
                    { subject: 'Basic Science & Tech (JSS 2)', planned: 36, delivered: 34, rate: 94, status: 'On Track' },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-850/50">
                      <td className="p-3.5 font-bold text-white">{row.subject}</td>
                      <td className="p-3.5">{row.planned} Weeks</td>
                      <td className="p-3.5">{row.delivered} Units</td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${row.rate}%` }}></div>
                          </div>
                          <span className="font-mono text-[11px] font-bold">{row.rate}%</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          row.status === 'Ahead of Pace' || row.status === 'On Track'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Teacher Performance & Compliance Matrix */}
      {activeAnalyticsSubTab === 'teachers' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Holistic Faculty Teaching & Compliance Matrix
            </h3>
            <p className="text-xs text-slate-400">
              Measuring teacher delivery fidelity across the 6 stages, timeliness in submitting lesson notes for principal review, and student mastery outcomes.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {[
                {
                  name: 'Mr. Babatunde Adeleke',
                  role: 'Senior Mathematics Teacher',
                  subjects: 'General Mathematics (SS 2A, SS 2B)',
                  completionRate: 94,
                  onTimeSubmission: 98,
                  avgMastery: 72,
                  remedialCompliance: 100,
                  badge: 'Exemplary Fidelity'
                },
                {
                  name: 'Mrs. Chioma Okafor',
                  role: 'Science Academic Coordinator',
                  subjects: 'Basic Science (JSS 2A, JSS 2B)',
                  completionRate: 96,
                  onTimeSubmission: 100,
                  avgMastery: 78,
                  remedialCompliance: 100,
                  badge: 'Exemplary Fidelity'
                },
                {
                  name: 'Mr. Farouk Usman',
                  role: 'Physics & Chemistry Teacher',
                  subjects: 'Physics (SS 2), Chemistry (SS 1)',
                  completionRate: 82,
                  onTimeSubmission: 85,
                  avgMastery: 65,
                  remedialCompliance: 80,
                  badge: 'Needs Timeliness Support'
                },
                {
                  name: 'Mrs. Aisha Bello',
                  role: 'Languages & Humanities HOD',
                  subjects: 'English Language (SS 2, SS 3)',
                  completionRate: 92,
                  onTimeSubmission: 95,
                  avgMastery: 74,
                  remedialCompliance: 90,
                  badge: 'High Compliance'
                },
              ].map((tch, idx) => (
                <div key={idx} className="bg-slate-850 p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">{tch.name}</h4>
                      <p className="text-[11px] text-slate-400">{tch.role} • {tch.subjects}</p>
                    </div>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                      {tch.badge}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-center">
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Lesson Delivery</span>
                      <span className="font-bold text-white">{tch.completionRate}%</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Note Timeliness</span>
                      <span className="font-bold text-blue-400">{tch.onTimeSubmission}%</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Class Mastery</span>
                      <span className="font-bold text-emerald-400">{tch.avgMastery}%</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Remedial Logs</span>
                      <span className="font-bold text-purple-400">{tch.remedialCompliance}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Student Topic Mastery Profiles */}
      {activeAnalyticsSubTab === 'students' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Student Selector Sidebar */}
          <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-3xl p-4 space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 block mb-2">
              Enrolled Students ({studentProfiles.length})
            </span>

            {studentProfiles.map((st) => {
              const isSelected = activeStudent && activeStudent.studentId === st.studentId;
              return (
                <button
                  key={st.studentId}
                  onClick={() => setSelectedStudentId(st.studentId)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all space-y-1 ${
                    isSelected
                      ? 'bg-slate-800 border-emerald-500/50 shadow'
                      : 'bg-slate-850/50 border-slate-800 hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">{st.studentName}</span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      {st.overallMasteryPercentage}% Mastery
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>{st.classGrade} ({st.classSection})</span>
                    <span>Rank: #{st.rankInClass}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Student Detailed Breakdown */}
          {activeStudent && (
            <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono text-xs font-bold">
                      {activeStudent.classGrade} • {activeStudent.classSection}
                    </span>
                    <span className="text-xs text-slate-400">Student ID: {activeStudent.studentId}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white">{activeStudent.studentName}</h2>
                </div>

                <button
                  onClick={() => onGeneratePersonalizedWorksheet(activeStudent.studentId)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-950/40 flex items-center gap-1.5 self-start"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Targeted Practice Sheet</span>
                </button>
              </div>

              {/* Topic-by-Topic Mastery Breakdown */}
              <div className="space-y-4 text-xs">
                <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                  Topic-Level Mastery Breakdown
                </h4>

                <div className="space-y-3">
                  {activeStudent.topicMasteryBreakdown.map((topic, idx) => (
                    <div key={idx} className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">{topic.topicTitle}</span>
                        <span className={`text-xs font-mono font-bold ${
                          topic.masteryPercentage >= 75 ? 'text-emerald-400' :
                          topic.masteryPercentage >= 60 ? 'text-blue-400' : 'text-rose-400'
                        }`}>
                          {topic.masteryPercentage}%
                        </span>
                      </div>

                      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            topic.masteryPercentage >= 75 ? 'bg-emerald-500' :
                            topic.masteryPercentage >= 60 ? 'bg-blue-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${topic.masteryPercentage}%` }}
                        ></div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>Tested in {topic.assessmentsTaken} Assessments</span>
                        <span>{topic.masteryPercentage < 60 ? '⚠️ Remedial Recommended' : '✓ Objective Mastered'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Identified Weaknesses & AI Recommendation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <span className="font-bold text-rose-400 block">Diagnosed Learning Difficulties:</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                    {activeStudent.identifiedWeaknesses.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <span className="font-bold text-emerald-400 block">Recommended Action:</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                    {activeStudent.recommendedInterventions.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
