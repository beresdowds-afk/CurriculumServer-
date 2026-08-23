import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  DollarSign, 
  Layers, 
  Sliders, 
  ArrowUpRight, 
  CreditCard,
  Zap,
  Activity
} from 'lucide-react';

export type BillingModelCategoryFilter = 'all' | 'monthly' | 'yearly' | 'lease_to_own';

interface SuccessRateDataPoint {
  month: string;
  opayMonthly: number;
  opayYearly: number;
  opayLease: number;
  paystackMonthly: number;
  paystackYearly: number;
  paystackLease: number;
  totalTransactions: number;
  volumeNgn: number;
}

const HISTORICAL_PSP_METRICS: SuccessRateDataPoint[] = [
  {
    month: 'Jan 2026',
    opayMonthly: 97.8,
    opayYearly: 99.1,
    opayLease: 98.4,
    paystackMonthly: 96.5,
    paystackYearly: 98.6,
    paystackLease: 97.9,
    totalTransactions: 340,
    volumeNgn: 4200000
  },
  {
    month: 'Feb 2026',
    opayMonthly: 98.1,
    opayYearly: 99.2,
    opayLease: 98.6,
    paystackMonthly: 96.9,
    paystackYearly: 98.8,
    paystackLease: 98.1,
    totalTransactions: 390,
    volumeNgn: 4600000
  },
  {
    month: 'Mar 2026',
    opayMonthly: 98.5,
    opayYearly: 99.4,
    opayLease: 98.9,
    paystackMonthly: 97.2,
    paystackYearly: 99.0,
    paystackLease: 98.3,
    totalTransactions: 420,
    volumeNgn: 5100000
  },
  {
    month: 'Apr 2026',
    opayMonthly: 98.8,
    opayYearly: 99.6,
    opayLease: 99.1,
    paystackMonthly: 97.6,
    paystackYearly: 99.2,
    paystackLease: 98.5,
    totalTransactions: 480,
    volumeNgn: 6300000
  },
  {
    month: 'May 2026',
    opayMonthly: 98.7,
    opayYearly: 99.5,
    opayLease: 99.0,
    paystackMonthly: 97.8,
    paystackYearly: 99.1,
    paystackLease: 98.4,
    totalTransactions: 510,
    volumeNgn: 5900000
  },
  {
    month: 'Jun 2026',
    opayMonthly: 99.1,
    opayYearly: 99.7,
    opayLease: 99.3,
    paystackMonthly: 98.0,
    paystackYearly: 99.3,
    paystackLease: 98.7,
    totalTransactions: 560,
    volumeNgn: 7100000
  },
  {
    month: 'Jul 2026',
    opayMonthly: 99.0,
    opayYearly: 99.6,
    opayLease: 99.2,
    paystackMonthly: 98.2,
    paystackYearly: 99.1,
    paystackLease: 98.8,
    totalTransactions: 600,
    volumeNgn: 7800000
  },
  {
    month: 'Aug 2026',
    opayMonthly: 99.4,
    opayYearly: 99.8,
    opayLease: 99.5,
    paystackMonthly: 98.4,
    paystackYearly: 99.4,
    paystackLease: 99.0,
    totalTransactions: 650,
    volumeNgn: 8900000
  }
];

export const PspTransactionSuccessRateChart: React.FC = () => {
  const [categoryFilter, setCategoryFilter] = useState<BillingModelCategoryFilter>('all');
  const [hoveredData, setHoveredData] = useState<SuccessRateDataPoint | null>(null);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950/95 border border-slate-800 p-4 rounded-xl shadow-2xl text-xs space-y-2 backdrop-blur-md">
          <p className="font-bold text-slate-100 border-b border-slate-800 pb-1.5">{label}</p>
          <div className="space-y-1 font-mono">
            {payload.map((entry: any, index: number) => (
              <div key={`item-${index}`} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span>{entry.name}:</span>
                </span>
                <span className="font-bold text-slate-100">{entry.value.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">OPay Global Success Rate</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
              HMAC-SHA512
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-400">99.4%</p>
          <p className="text-[11px] text-slate-400">
            Monthly: <strong className="text-slate-200">99.4%</strong> • Yearly: <strong className="text-slate-200">99.8%</strong>
          </p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Paystack Global Success Rate</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400">
              Bearer / 3DS
            </span>
          </div>
          <p className="text-2xl font-black text-cyan-400">98.9%</p>
          <p className="text-[11px] text-slate-400">
            Monthly: <strong className="text-slate-200">98.4%</strong> • Yearly: <strong className="text-slate-200">99.4%</strong>
          </p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <span className="text-xs text-slate-400 font-medium">Settlement Latency (Mean)</span>
          <p className="text-2xl font-black text-amber-400">28 ms</p>
          <p className="text-[11px] text-slate-400">
            OPay Cashier: <strong className="text-emerald-400">24ms</strong> • Paystack: <strong className="text-cyan-400">42ms</strong>
          </p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <span className="text-xs text-slate-400 font-medium">Total Processed Billing Volume</span>
          <p className="text-2xl font-black text-slate-100">₦46.3M</p>
          <p className="text-[11px] text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>3,950 total successful transactions</span>
          </p>
        </div>
      </div>

      {/* Main Chart Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>PSP Transaction Success Rates by Billing Model</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Historical line chart telemetry tracking OPay vs Paystack settlement reliability across monthly subscriptions, annual plans, and lease-to-own installments.
            </p>
          </div>

          {/* Model Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs flex-wrap">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                categoryFilter === 'all' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Billing Models
            </button>
            <button
              onClick={() => setCategoryFilter('monthly')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                categoryFilter === 'monthly' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Monthly Subscriptions
            </button>
            <button
              onClick={() => setCategoryFilter('yearly')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                categoryFilter === 'yearly' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Yearly Institutional
            </button>
            <button
              onClick={() => setCategoryFilter('lease_to_own')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                categoryFilter === 'lease_to_own' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Lease Amortization
            </button>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={HISTORICAL_PSP_METRICS} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
              <XAxis 
                dataKey="month" 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false} 
                axisLine={{ stroke: '#334155' }} 
              />
              <YAxis 
                domain={[95, 100]} 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false} 
                axisLine={{ stroke: '#334155' }} 
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} 
                iconType="circle"
              />

              {/* Monthly Lines */}
              {(categoryFilter === 'all' || categoryFilter === 'monthly') && (
                <>
                  <Line
                    type="monotone"
                    dataKey="opayMonthly"
                    name="OPay (Monthly Subscriptions)"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10b981', stroke: '#0f172a', strokeWidth: 1.5 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="paystackMonthly"
                    name="Paystack (Monthly Subscriptions)"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#06b6d4', stroke: '#0f172a', strokeWidth: 1.5 }}
                    activeDot={{ r: 6 }}
                  />
                </>
              )}

              {/* Yearly Lines */}
              {(categoryFilter === 'all' || categoryFilter === 'yearly') && (
                <>
                  <Line
                    type="monotone"
                    dataKey="opayYearly"
                    name="OPay (Yearly Institutional)"
                    stroke="#34d399"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    dot={{ r: 4, fill: '#34d399', stroke: '#0f172a', strokeWidth: 1.5 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="paystackYearly"
                    name="Paystack (Yearly Institutional)"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    dot={{ r: 4, fill: '#3b82f6', stroke: '#0f172a', strokeWidth: 1.5 }}
                    activeDot={{ r: 6 }}
                  />
                </>
              )}

              {/* Lease-to-own Lines */}
              {(categoryFilter === 'all' || categoryFilter === 'lease_to_own') && (
                <>
                  <Line
                    type="monotone"
                    dataKey="opayLease"
                    name="OPay (Lease-to-Own Equity)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#f59e0b', stroke: '#0f172a' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="paystackLease"
                    name="Paystack (Lease-to-Own Equity)"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#a855f7', stroke: '#0f172a' }}
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Failure Diagnostics & Insights */}
        <div className="pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
            <span className="text-slate-400 font-semibold">Monthly Model Resilience</span>
            <p className="text-slate-200">
              OPay Push notifications boast a <strong className="text-emerald-400">99.4%</strong> authorization rate on Nigerian mobile wallets compared to traditional debit card declines.
            </p>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
            <span className="text-slate-400 font-semibold">Yearly Enterprise Invoices</span>
            <p className="text-slate-200">
              Paystack and OPay dynamic dedicated NUBAN transfers achieve <strong className="text-teal-400">99.8%</strong> settlement rate with zero card limit barriers.
            </p>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
            <span className="text-slate-400 font-semibold">Automated Routing Fallback</span>
            <p className="text-slate-200">
              Failed charges on Paystack (e.g. Code 51) are automatically retried via OPay Cashier link, preventing institutional subscription interruptions.
            </p>
          </div>
        </div>
      </div>

      {/* Gateway Failure Distribution Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center justify-between">
          <span>Root Cause Analysis of Unsettled Transactions</span>
          <span className="text-xs font-normal text-slate-400">Total Unsettled: 0.6% (24 occurrences)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Insufficient Account Funds</span>
              <span className="text-rose-400 font-bold font-mono">58%</span>
            </div>
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
              <div className="bg-rose-500 h-full w-[58%]" />
            </div>
            <span className="text-[10px] text-slate-500">Response Code: 51_INSUFFICIENT_FUNDS</span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Issuing Bank Timeout</span>
              <span className="text-amber-400 font-bold font-mono">22%</span>
            </div>
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full w-[22%]" />
            </div>
            <span className="text-[10px] text-slate-500">Response Code: 504_GATEWAY_TIMEOUT</span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">User Session Abandoned</span>
              <span className="text-indigo-400 font-bold font-mono">14%</span>
            </div>
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-full w-[14%]" />
            </div>
            <span className="text-[10px] text-slate-500">Response Code: USER_DISMISSED</span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">3DS / Biometric OTP Failure</span>
              <span className="text-cyan-400 font-bold font-mono">6%</span>
            </div>
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
              <div className="bg-cyan-500 h-full w-[6%]" />
            </div>
            <span className="text-[10px] text-slate-500">Response Code: 3DS_VERIFICATION_FAIL</span>
          </div>
        </div>
      </div>

    </div>
  );
};
