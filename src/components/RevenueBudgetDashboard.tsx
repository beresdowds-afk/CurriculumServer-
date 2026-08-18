import React, { useState, useMemo } from 'react';
import { 
  UserProfile, 
  Term, 
  MonthlyRevenueBudgetData, 
  AcademicTermBudgetSummary 
} from '../types';
import { 
  calculateTermFinancials, 
  numberToWordsNaira 
} from '../data/bursaryAccountsData';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  Cell, 
  ReferenceLine 
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart as PieChartIcon, 
  BarChart3, 
  Calendar, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Layers, 
  Sliders, 
  Printer, 
  Download, 
  RefreshCw, 
  FileText, 
  CreditCard, 
  Sparkles, 
  Building2, 
  Zap, 
  Coins 
} from 'lucide-react';

interface RevenueBudgetDashboardProps {
  currentUser: UserProfile;
  monthlyRecords: MonthlyRevenueBudgetData[];
  termSummaries: AcademicTermBudgetSummary[];
  onUpdateRecord?: (updatedRecord: MonthlyRevenueBudgetData) => void;
}

type DashboardViewMode = 'comprehensive_charts' | 'monthly_matrix' | 'revenue_allocation' | 'budget_simulator';

export const RevenueBudgetDashboard: React.FC<RevenueBudgetDashboardProps> = ({
  currentUser,
  monthlyRecords,
  termSummaries
}) => {
  const [selectedTerm, setSelectedTerm] = useState<Term | 'All'>('Term 3');
  const [viewMode, setViewMode] = useState<DashboardViewMode>('comprehensive_charts');
  const [activeChartMetric, setActiveChartMetric] = useState<'revenue_vs_target' | 'revenue_vs_budget' | 'surplus_margin'>('revenue_vs_target');
  
  // Simulator State
  const [simulatedRecoveryBoostPercent, setSimulatedRecoveryBoostPercent] = useState<number>(5);
  const [simulatedCostSavingsPercent, setSimulatedCostSavingsPercent] = useState<number>(3);
  const [showPrintReportModal, setShowPrintReportModal] = useState<boolean>(false);

  // Compute calculated metrics for the selected term
  const analytics = useMemo(() => {
    return calculateTermFinancials(monthlyRecords, selectedTerm);
  }, [monthlyRecords, selectedTerm]);

  // Current active term summary
  const activeTermSummary = useMemo(() => {
    if (selectedTerm === 'All') return null;
    return termSummaries.find(t => t.term === selectedTerm) || null;
  }, [termSummaries, selectedTerm]);

  // Simulated calculations for the budget simulator
  const simulatedData = useMemo(() => {
    return analytics.chartData.map(item => {
      const boostedCollected = Math.round(item.collected * (1 + simulatedRecoveryBoostPercent / 100));
      const optimizedBudget = Math.round(item.spent * (1 - simulatedCostSavingsPercent / 100));
      const simulatedSurplus = boostedCollected - optimizedBudget;
      return {
        ...item,
        simulatedCollected: boostedCollected,
        simulatedSpent: optimizedBudget,
        simulatedSurplus,
        simulatedAttainment: item.target > 0 ? Math.round((boostedCollected / item.target) * 1000) / 10 : 0
      };
    });
  }, [analytics.chartData, simulatedRecoveryBoostPercent, simulatedCostSavingsPercent]);

  const simulatedTotals = useMemo(() => {
    const totalSimCollected = simulatedData.reduce((s, i) => s + i.simulatedCollected, 0);
    const totalSimSpent = simulatedData.reduce((s, i) => s + i.simulatedSpent, 0);
    const totalSimSurplus = totalSimCollected - totalSimSpent;
    const surplusDelta = totalSimSurplus - analytics.netSurplus;
    return {
      totalSimCollected,
      totalSimSpent,
      totalSimSurplus,
      surplusDelta
    };
  }, [simulatedData, analytics.netSurplus]);

  // Format currency for Recharts Axis
  const formatNairaAxis = (val: number) => {
    if (val >= 1000000) return `₦${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `₦${(val / 1000).toFixed(0)}k`;
    return `₦${val}`;
  };

  // Custom Recharts Tooltip for Main Charts
  const CustomRechartsTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-2xl text-xs space-y-2 min-w-[240px] z-50">
          <div className="border-b border-slate-800 pb-1.5 flex items-center justify-between">
            <span className="font-bold text-white text-sm flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              {label} ({data.term || selectedTerm})
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              data.attainment >= 100 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
            }`}>
              {data.attainment}% Target
            </span>
          </div>

          {data.phase && (
            <div className="text-[11px] text-slate-400 italic">
              {data.phase}
            </div>
          )}

          <div className="space-y-1 pt-1 font-mono">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block"></span>
                Projected Target:
              </span>
              <span className="font-bold text-blue-300">₦{data.target?.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span>
                Actual Collections:
              </span>
              <span className="font-black text-emerald-400">₦{data.collected?.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block"></span>
                Operational Budget Spent:
              </span>
              <span className="font-bold text-rose-300">₦{data.spent?.toLocaleString()}</span>
            </div>

            <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between font-bold">
              <span className="text-slate-400">Net Operating Surplus:</span>
              <span className={data.surplus >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {data.surplus >= 0 ? '+' : ''}₦{data.surplus?.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6" id="revenue-budget-visual-dashboard">
      {/* Top Banner & Control Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/40 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
                <BarChart3 className="w-3 h-3" />
                Executive Financial Intelligence
              </span>
              <span className="text-xs text-slate-400 font-mono">Session 2025/2026</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Monthly Revenue vs. Projected Academic Term Budget
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl mt-1">
              Live tracking of student fee collections, digital PSP inflows (Paystack / OPay), and Zenith bank deposits matched against projected academic term targets and operational expenditures.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowPrintReportModal(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Generate Printable Executive Report"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>Print Board Report</span>
            </button>

            <button
              onClick={() => setViewMode(viewMode === 'budget_simulator' ? 'comprehensive_charts' : 'budget_simulator')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                viewMode === 'budget_simulator'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-amber-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{viewMode === 'budget_simulator' ? 'Exit Simulator' : 'Recovery Simulator'}</span>
            </button>
          </div>
        </div>

        {/* Term Selector & View Mode Switcher */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Term Filter Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-2xl border border-slate-800 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSelectedTerm('Term 3')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                selectedTerm === 'Term 3'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Term 3 (Active Trinity)
            </button>

            <button
              onClick={() => setSelectedTerm('Term 2')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedTerm === 'Term 2'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Term 2 (Lent)
            </button>

            <button
              onClick={() => setSelectedTerm('Term 1')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedTerm === 'Term 1'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Term 1 (Autumn)
            </button>

            <button
              onClick={() => setSelectedTerm('All')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedTerm === 'All'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Full Session (2025/2026)
            </button>
          </div>

          {/* View Mode Pills */}
          <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => setViewMode('comprehensive_charts')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'comprehensive_charts'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Charts View</span>
            </button>

            <button
              onClick={() => setViewMode('monthly_matrix')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'monthly_matrix'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>Monthly Matrix</span>
            </button>

            <button
              onClick={() => setViewMode('revenue_allocation')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'revenue_allocation'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <PieChartIcon className="w-3.5 h-3.5 text-purple-400" />
              <span>Cost & Stream Yield</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Projected Revenue Target */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Projected Collection Target</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-white font-mono">
            ₦{analytics.totalTarget.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
            <span>Target Term Invoicing Baseline</span>
          </div>
        </div>

        {/* Card 2: Actual Revenue Collected */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Actual Revenue Collected</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-400 font-mono">
            ₦{analytics.totalCollected.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] flex items-center justify-between">
            <span className="text-slate-400">Attainment Rate:</span>
            <span className={`font-mono font-bold flex items-center gap-0.5 ${
              analytics.overallAttainmentRate >= 100 ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {analytics.overallAttainmentRate >= 100 ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              {analytics.overallAttainmentRate}%
            </span>
          </div>
        </div>

        {/* Card 3: Operational Budget Spend */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Operational Budget Spent</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-200 font-mono">
            ₦{analytics.totalSpent.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] flex items-center justify-between">
            <span className="text-slate-400">Budget Allocated:</span>
            <span className="text-slate-400 font-mono font-semibold">₦{analytics.totalBudget.toLocaleString()}</span>
          </div>
        </div>

        {/* Card 4: Net Operating Surplus */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Net Operating Surplus</span>
            <div className={`p-2 rounded-xl border ${
              analytics.netSurplus >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}>
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className={`mt-2 text-2xl font-black font-mono ${
            analytics.netSurplus >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {analytics.netSurplus >= 0 ? '+' : ''}₦{analytics.netSurplus.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Operating Margin:</span>
            <span className="text-emerald-400 font-bold font-mono">
              {analytics.totalCollected > 0 ? Math.round((analytics.netSurplus / analytics.totalCollected) * 100) : 0}% Margin
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: COMPREHENSIVE RECHARTS CHARTS */}
      {/* ========================================================================= */}
      {viewMode === 'comprehensive_charts' && (
        <div className="space-y-6">
          {/* Main Composed Chart: Monthly Collections vs Target & Spend */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  Monthly Fee Collections vs. Projected Target & Operational Budget (₦)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visual comparison of monthly billing targets against actual revenue collected and operational cost outlays.
                </p>
              </div>

              {/* Metric Selector Toggle */}
              <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
                <button
                  onClick={() => setActiveChartMetric('revenue_vs_target')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeChartMetric === 'revenue_vs_target'
                      ? 'bg-slate-800 text-emerald-300 font-bold'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Collections vs Target
                </button>
                <button
                  onClick={() => setActiveChartMetric('revenue_vs_budget')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeChartMetric === 'revenue_vs_budget'
                      ? 'bg-slate-800 text-blue-300 font-bold'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Spend vs Budget
                </button>
              </div>
            </div>

            {/* Recharts Main Graph Container */}
            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={analytics.chartData}
                  margin={{ top: 10, right: 15, left: 10, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="collectedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="targetGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.3} />
                    </linearGradient>
                    <linearGradient id="budgetGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="#be123c" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    stroke="#94a3b8" 
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11}
                    tickFormatter={formatNairaAxis}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                  />
                  <RechartsTooltip content={<CustomRechartsTooltip />} />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span className="text-xs font-semibold text-slate-300">{value}</span>}
                  />

                  {/* Projected Target Bar */}
                  <Bar 
                    name="Projected Revenue Target" 
                    dataKey="target" 
                    fill="url(#targetGradient)" 
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />

                  {/* Actual Collections Bar */}
                  <Bar 
                    name="Actual Collections" 
                    dataKey="collected" 
                    fill="url(#collectedGradient)" 
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />

                  {/* Operational Budget Spent (Line) */}
                  <Line 
                    type="monotone" 
                    name="Operational Expenditure" 
                    dataKey="spent" 
                    stroke="#f43f5e" 
                    strokeWidth={3} 
                    dot={{ fill: '#f43f5e', r: 4, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Performance Summary Banner below graph */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Total Attainment:</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  {analytics.overallAttainmentRate}% of Target
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Total Net Surplus:</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  +₦{analytics.netSurplus.toLocaleString()}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Budget Runway Health:</span>
                <span className="text-xs font-bold text-blue-400 font-mono">
                  {analytics.budgetRunwayPercent}% Spent (Safe)
                </span>
              </div>
            </div>
          </div>

          {/* Secondary Grid: Cumulative Trajectory & Channel Settlement Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 2: Cumulative Cashflow & Financial Runway Trajectory */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Cumulative Revenue Runway & Cashflow Trajectory (₦)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cumulative collected cash against cumulative operational expenditure runway over time.
                </p>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={analytics.cumulativeData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                  >
                    <defs>
                      <linearGradient id="cumCollectGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                      </linearGradient>
                      <linearGradient id="cumSpentGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={formatNairaAxis} />
                    <RechartsTooltip 
                      formatter={(val: any, name: any) => [`₦${Number(val).toLocaleString()}`, name]}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={32}
                      formatter={(value) => <span className="text-xs text-slate-300 font-medium">{value}</span>}
                    />

                    <Area 
                      type="monotone" 
                      name="Cumulative Collections" 
                      dataKey="cumCollected" 
                      stroke="#10b981" 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#cumCollectGrad)" 
                    />

                    <Area 
                      type="monotone" 
                      name="Cumulative Expenditure" 
                      dataKey="cumSpent" 
                      stroke="#f43f5e" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#cumSpentGrad)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Positive Cash Runway Maintained
                </span>
                <span className="font-bold text-emerald-400 font-mono">
                  +₦{(analytics.totalCollected - analytics.totalSpent).toLocaleString()} Net Cushion
                </span>
              </div>
            </div>

            {/* Chart 3: Payment Channel Inflow Distribution (Paystack vs OPay vs Zenith) */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-400" />
                  Collection Channel Share & Digital Settlement Volumes
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Settlement velocity across Paystack gateway, OPay instant virtual accounts, and Zenith Bank NIP.
                </p>
              </div>

              {/* Progress Bars for Channels */}
              <div className="space-y-3.5 pt-2">
                {analytics.channelShare.map((channel) => (
                  <div key={channel.name} className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: channel.color }}></span>
                        {channel.name}
                      </span>
                      <span className="font-mono font-bold text-emerald-400">
                        ₦{channel.value.toLocaleString()} ({channel.percent}%)
                      </span>
                    </div>

                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${channel.percent}%`,
                          backgroundColor: channel.color 
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-800/40 text-[11px] text-blue-300 flex items-center justify-between">
                <span>Total Digital PSP Automated Settlement:</span>
                <span className="font-bold font-mono text-white">
                  {Math.round(((analytics.channelShare[0].value + analytics.channelShare[1].value) / Math.max(1, analytics.totalCollected)) * 100)}% Automated
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: MONTHLY FINANCIAL MATRIX & DRILLDOWN TABLE */}
      {/* ========================================================================= */}
      {viewMode === 'monthly_matrix' && (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                Monthly Revenue & Operational Expenditure Ledger ({selectedTerm})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Detailed monthly performance statement including target attainment and variance tracking.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase bg-slate-950/60">
                  <th className="py-3 px-4">Month & Phase</th>
                  <th className="py-3 px-4 text-right">Projected Target</th>
                  <th className="py-3 px-4 text-right">Actual Collected</th>
                  <th className="py-3 px-4 text-center">Attainment</th>
                  <th className="py-3 px-4 text-right">Operational Spend</th>
                  <th className="py-3 px-4 text-right">Net Surplus / Deficit</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Active Txs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {analytics.chartData.map((row) => (
                  <tr key={row.monthKey} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-emerald-400" />
                        {row.month}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">{row.phase}</div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                      ₦{row.target.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                      ₦{row.collected.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        row.attainment >= 100
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {row.attainment}%
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-rose-300">
                      ₦{row.spent.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold">
                      <span className={row.surplus >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {row.surplus >= 0 ? '+' : ''}₦{row.surplus.toLocaleString()}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {row.attainment >= 100 ? (
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Surpassed
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400 font-bold flex items-center justify-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Lagging
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                      {row.collected > 0 ? Math.round(row.collected / 150000) : 0}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-700 bg-slate-950 font-bold text-white">
                  <td className="py-3.5 px-4">TOTALS ({selectedTerm})</td>
                  <td className="py-3.5 px-4 text-right font-mono text-blue-400">
                    ₦{analytics.totalTarget.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-400">
                    ₦{analytics.totalCollected.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-emerald-400">
                    {analytics.overallAttainmentRate}%
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-rose-400">
                    ₦{analytics.totalSpent.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-400">
                    +₦{analytics.netSurplus.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-center text-[10px] text-emerald-400 font-bold">
                    SURPLUS
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    {analytics.chartData.length * 110}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: REVENUE ALLOCATION & COST CENTER BREAKDOWN */}
      {/* ========================================================================= */}
      {viewMode === 'revenue_allocation' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stream 1: Revenue Fee Category Yield */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-emerald-400" />
                Revenue Fee Inflow Streams ({selectedTerm})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Breakdown of student fee income by instructional and extracurricular cost-centers.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {analytics.categoryBreakdown.map((cat) => {
                const percent = analytics.totalCollected > 0 ? Math.round((cat.value / analytics.totalCollected) * 100) : 0;
                return (
                  <div key={cat.name} className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }}></span>
                        {cat.name}
                      </span>
                      <span className="font-mono font-bold text-emerald-400">
                        ₦{cat.value.toLocaleString()} ({percent}%)
                      </span>
                    </div>

                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ width: `${percent}%`, backgroundColor: cat.color }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stream 2: Operational Cost Outlay & Allocations */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-rose-400" />
                Operational Expenditure Cost Centers ({selectedTerm})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Distribution of school expenditures across faculty payroll, STEM labs, solar energy, and exams.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {analytics.expenditureBreakdown.map((cost) => {
                const percent = analytics.totalSpent > 0 ? Math.round((cost.value / analytics.totalSpent) * 100) : 0;
                return (
                  <div key={cost.name} className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cost.color }}></span>
                        {cost.name}
                      </span>
                      <span className="font-mono font-bold text-rose-400">
                        ₦{cost.value.toLocaleString()} ({percent}%)
                      </span>
                    </div>

                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ width: `${percent}%`, backgroundColor: cost.color }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 4: LIVE RECOVERY & BUDGET SIMULATOR */}
      {/* ========================================================================= */}
      {viewMode === 'budget_simulator' && (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border border-amber-500/30 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30 flex items-center gap-1 w-fit">
                <Sliders className="w-3 h-3" />
                Interactive Financial Simulator
              </span>
              <h3 className="text-lg font-black text-white mt-1">
                Late Fee Arrears Recovery & Cost Optimization Simulator
              </h3>
              <p className="text-xs text-slate-400">
                Simulate the financial impact of automated SMS installment reminders and operational cost adjustments on your academic term surplus.
              </p>
            </div>
          </div>

          {/* Sliders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/70 p-5 rounded-2xl border border-slate-800">
            {/* Slider 1: Recovery Boost */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-emerald-300">
                  Late Installment Collection Boost:
                </label>
                <span className="font-mono font-black text-emerald-400 text-sm">
                  +{simulatedRecoveryBoostPercent}%
                </span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="20" 
                step="1"
                value={simulatedRecoveryBoostPercent} 
                onChange={(e) => setSimulatedRecoveryBoostPercent(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0% (Baseline)</span>
                <span>+10% (Automated SMS)</span>
                <span>+20% (Aggressive Follow-up)</span>
              </div>
            </div>

            {/* Slider 2: Cost Optimization */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-rose-300">
                  Operational Cost Optimization / Energy Savings:
                </label>
                <span className="font-mono font-black text-rose-400 text-sm">
                  -{simulatedCostSavingsPercent}%
                </span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="15" 
                step="1"
                value={simulatedCostSavingsPercent} 
                onChange={(e) => setSimulatedCostSavingsPercent(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0% (Standard Spend)</span>
                <span>-5% (Solar Inverter Switch)</span>
                <span>-15% (Bulk Procurement)</span>
              </div>
            </div>
          </div>

          {/* Simulator Outcomes Impact Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-xs text-slate-400">Simulated Revenue Collected</span>
              <div className="text-xl font-black text-emerald-400 font-mono mt-1">
                ₦{simulatedTotals.totalSimCollected.toLocaleString()}
              </div>
              <span className="text-[10px] text-emerald-400 font-bold block mt-1">
                +₦{(simulatedTotals.totalSimCollected - analytics.totalCollected).toLocaleString()} Extra Collections
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-xs text-slate-400">Optimized Operational Spend</span>
              <div className="text-xl font-black text-rose-400 font-mono mt-1">
                ₦{simulatedTotals.totalSimSpent.toLocaleString()}
              </div>
              <span className="text-[10px] text-rose-400 font-bold block mt-1">
                -₦{(analytics.totalSpent - simulatedTotals.totalSimSpent).toLocaleString()} Cost Savings
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40">
              <span className="text-xs text-emerald-300 font-semibold">Net Simulated Surplus Boost</span>
              <div className="text-xl font-black text-emerald-300 font-mono mt-1">
                ₦{simulatedTotals.totalSimSurplus.toLocaleString()}
              </div>
              <span className="text-[10px] text-emerald-400 font-bold block mt-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                +₦{simulatedTotals.surplusDelta.toLocaleString()} Net Gain to Reserve
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PRINT EXECUTIVE BOARD FINANCIAL STATEMENT */}
      {/* ========================================================================= */}
      {showPrintReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-white text-base">Executive Board Financial Report & Budget Verification</h3>
              </div>
              <button
                onClick={() => setShowPrintReportModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Printable Content Body */}
            <div className="p-8 overflow-y-auto space-y-6 text-slate-200">
              {/* Institutional Header */}
              <div className="text-center border-b border-slate-800 pb-4">
                <div className="text-xl font-black text-white tracking-wide uppercase">CurriculumFlow Academy</div>
                <div className="text-xs text-slate-400">Office of the Bursar & Financial Controller • Academic Session 2025/2026</div>
                <div className="text-sm font-bold text-emerald-400 mt-2">
                  Official Term Revenue & Operational Budget Statement ({selectedTerm})
                </div>
              </div>

              {/* Summary KPIs Table */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Total Projected Target</div>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">₦{analytics.totalTarget.toLocaleString()}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Total Actual Collected</div>
                  <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">₦{analytics.totalCollected.toLocaleString()}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Total Operational Spend</div>
                  <div className="text-sm font-bold text-rose-300 font-mono mt-0.5">₦{analytics.totalSpent.toLocaleString()}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Net Operating Surplus</div>
                  <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">+₦{analytics.netSurplus.toLocaleString()}</div>
                </div>
              </div>

              {/* Amount in words */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400 font-bold">Total Revenue Realized in Words: </span>
                <span className="font-semibold text-emerald-300">{numberToWordsNaira(analytics.totalCollected)}</span>
              </div>

              {/* Monthly Breakdown Table */}
              <table className="w-full text-left text-xs border-collapse border border-slate-800">
                <thead>
                  <tr className="bg-slate-950 text-slate-400">
                    <th className="p-2 border border-slate-800">Month</th>
                    <th className="p-2 border border-slate-800 text-right">Target (₦)</th>
                    <th className="p-2 border border-slate-800 text-right">Collected (₦)</th>
                    <th className="p-2 border border-slate-800 text-center">Attainment</th>
                    <th className="p-2 border border-slate-800 text-right">Spend (₦)</th>
                    <th className="p-2 border border-slate-800 text-right">Surplus (₦)</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.chartData.map((m) => (
                    <tr key={m.monthKey} className="border border-slate-800">
                      <td className="p-2 border border-slate-800 font-medium">{m.month}</td>
                      <td className="p-2 border border-slate-800 text-right font-mono">₦{m.target.toLocaleString()}</td>
                      <td className="p-2 border border-slate-800 text-right font-mono font-bold text-emerald-400">₦{m.collected.toLocaleString()}</td>
                      <td className="p-2 border border-slate-800 text-center font-mono">{m.attainment}%</td>
                      <td className="p-2 border border-slate-800 text-right font-mono">₦{m.spent.toLocaleString()}</td>
                      <td className="p-2 border border-slate-800 text-right font-mono text-emerald-400 font-bold">+₦{m.surplus.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-800 text-xs">
                <div className="space-y-4">
                  <div className="h-8 border-b border-dashed border-slate-600"></div>
                  <div>
                    <div className="font-bold text-white">Chief O. Eze</div>
                    <div className="text-slate-400">Bursar & Financial Controller</div>
                  </div>
                </div>

                <div className="space-y-4 text-right">
                  <div className="h-8 border-b border-dashed border-slate-600"></div>
                  <div>
                    <div className="font-bold text-white">{currentUser.name}</div>
                    <div className="text-slate-400">Executive Principal & Governing Council</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
