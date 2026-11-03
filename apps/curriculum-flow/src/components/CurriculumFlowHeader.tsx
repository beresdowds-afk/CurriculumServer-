import React from 'react';
import { 
  Bell, 
  ArrowLeft, 
  User, 
  ChevronDown, 
  ShieldCheck, 
  Server,
  BookOpen,
  Calendar
} from 'lucide-react';
import { UserProfile, UserRole } from '@/src/types';
import { MOCK_USERS } from '@/src/data/curriculumFlowData';

interface CurriculumFlowHeaderProps {
  currentUser: UserProfile;
  onChangeUserRole: (user: UserProfile) => void;
  onSwitchToServerApp: () => void;
  onViewPublicHomepage?: () => void;
  schoolName: string;
}

export const CurriculumFlowHeader: React.FC<CurriculumFlowHeaderProps> = ({
  currentUser,
  onChangeUserRole,
  onSwitchToServerApp,
  onViewPublicHomepage,
  schoolName
}) => {
  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between shrink-0 text-slate-800 dark:text-slate-200">
      {/* School Breadcrumb */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800/60">
          CURRICULUM FLOW
        </span>
        <span className="text-xs font-bold text-slate-800 dark:text-white hidden sm:inline">
          {schoolName}
        </span>
      </div>

      {/* Right Controls: Role Switcher, Notifications, App Switcher */}
      <div className="flex items-center gap-3">
        {onViewPublicHomepage && (
          <button
            onClick={onViewPublicHomepage}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 transition-all shadow-sm"
            title="View Public Education Homepage"
          >
            <span>Public Education Home</span>
          </button>
        )}

        {/* Switch to Curriculum Server (Control Plane) */}
        <button
          onClick={onSwitchToServerApp}
          className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800/60 text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5 transition-all shadow-sm"
          title="Switch to Curriculum Server SaaS Control Plane"
        >
          <Server className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <span>Launch Control Plane</span>
        </button>

        {/* Role Switcher Demo Picker */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          <span className="text-[10px] font-semibold text-slate-500 pl-2 hidden md:inline">Simulate Role:</span>
          <select
            value={currentUser.id}
            onChange={(e) => {
              const selected = MOCK_USERS.find(u => u.id === e.target.value);
              if (selected) onChangeUserRole(selected);
            }}
            className="bg-transparent text-slate-800 dark:text-slate-200 font-bold text-xs py-1 px-2 rounded-lg focus:outline-none cursor-pointer"
          >
            {MOCK_USERS.map(u => (
              <option key={u.id} value={u.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                {u.name} ({u.role.replace(/_/g, ' ')})
              </option>
            ))}
          </select>
        </div>

        {/* Current User Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
          <img 
            src={currentUser.avatar} 
            alt={currentUser.name} 
            className="w-8 h-8 rounded-full border border-indigo-500/40 object-cover" 
          />
          <div className="hidden lg:block text-left text-xs">
            <div className="font-bold text-slate-900 dark:text-white leading-tight">{currentUser.name}</div>
            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">{currentUser.title}</div>
          </div>
        </div>
      </div>
    </header>
  );
};
