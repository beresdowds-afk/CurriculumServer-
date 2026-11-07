import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  UserCheck, 
  Users, 
  Crown, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  Briefcase, 
  ArrowDown, 
  Lock, 
  X,
  Play
} from 'lucide-react';
import { InstanceGovernanceHierarchy } from '../types/customerOnboarding';

interface SchoolGovernanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  instanceId: string;
  schoolName: string;
}

export const SchoolGovernanceModal: React.FC<SchoolGovernanceModalProps> = ({
  isOpen,
  onClose,
  instanceId,
  schoolName
}) => {
  const [hierarchy, setHierarchy] = useState<InstanceGovernanceHierarchy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'appoint_principal' | 'appoint_ict' | 'tests'>('hierarchy');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form: Appoint Principal
  const [principalForm, setPrincipalForm] = useState({
    name: '',
    email: '',
    phone: '',
    isAlsoIctTechnician: false,
    notes: ''
  });

  // Form: Appoint ICT Technician
  const [ictForm, setIctForm] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });

  const loadHierarchy = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/instances/${instanceId}/governance/hierarchy`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setHierarchy(json.data);
          if (json.data.principal) {
            setPrincipalForm({
              name: json.data.principal.name,
              email: json.data.principal.email,
              phone: json.data.principal.phone || '',
              isAlsoIctTechnician: Boolean(json.data.principal.isAlsoIctTechnician),
              notes: ''
            });
          }
          if (json.data.ictTechnician) {
            setIctForm({
              name: json.data.ictTechnician.name,
              email: json.data.ictTechnician.email,
              phone: json.data.ictTechnician.phone || '',
              notes: ''
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to load governance hierarchy:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHierarchy();
    }
  }, [isOpen, instanceId]);

  const handleAppointPrincipal = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      const res = await fetch(`/api/v1/instances/${instanceId}/governance/appoint-principal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'proprietor',
          'x-user-name': hierarchy?.proprietor?.name || 'School Proprietor'
        },
        body: JSON.stringify({
          callerRole: 'proprietor',
          callerName: hierarchy?.proprietor?.name || 'School Proprietor',
          name: principalForm.name,
          email: principalForm.email,
          phone: principalForm.phone,
          isAlsoIctTechnician: principalForm.isAlsoIctTechnician,
          notes: principalForm.notes || 'Appointed via Institutional Governance Console'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setHierarchy(data.hierarchy);
        setActionMessage({ text: 'School Principal successfully appointed/reassigned by School Proprietor.', type: 'success' });
        setActiveTab('hierarchy');
      } else {
        setActionMessage({ text: data.error || 'Failed to appoint principal.', type: 'error' });
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Network error.', type: 'error' });
    }
  };

  const handleAppointIct = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      const res = await fetch(`/api/v1/instances/${instanceId}/governance/appoint-ict-technician`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'principal',
          'x-user-name': hierarchy?.principal?.name || 'School Principal'
        },
        body: JSON.stringify({
          callerRole: 'principal',
          callerName: hierarchy?.principal?.name || 'School Principal',
          name: ictForm.name,
          email: ictForm.email,
          phone: ictForm.phone,
          isDualRoleWithPrincipal: false,
          notes: ictForm.notes || 'Appointed via Institutional Governance Console'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setHierarchy(data.hierarchy);
        setActionMessage({ text: 'ICT Technician successfully appointed/assigned by School Principal.', type: 'success' });
        setActiveTab('hierarchy');
      } else {
        setActionMessage({ text: data.error || 'Failed to appoint ICT technician.', type: 'error' });
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Network error.', type: 'error' });
    }
  };

  const handleToggleDualRole = async (enable: boolean) => {
    setActionMessage(null);
    try {
      const res = await fetch(`/api/v1/instances/${instanceId}/governance/toggle-dual-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'principal',
          'x-user-name': hierarchy?.principal?.name || 'School Principal'
        },
        body: JSON.stringify({
          callerRole: 'principal',
          callerName: hierarchy?.principal?.name || 'School Principal',
          enableDualRole: enable,
          fallbackTechnician: !enable ? {
            name: 'Engr. Dapo Alabi',
            email: 'ict@school.sch.ng'
          } : undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setHierarchy(data.hierarchy);
        setActionMessage({
          text: enable 
            ? 'School Principal has assumed dual roles (School Principal & ICT Technician simultaneously).'
            : 'Dual role ended. Dedicated ICT Technician assigned.',
          type: 'success'
        });
      } else {
        setActionMessage({ text: data.error || 'Failed to toggle dual role.', type: 'error' });
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Network error.', type: 'error' });
    }
  };

  const runGovernanceSuite = async () => {
    setIsRunningTests(true);
    try {
      const res = await fetch('/api/v1/server/governance/test-suite');
      if (res.ok) {
        const json = await res.json();
        setTestResults(json.results || []);
      }
    } catch (err) {
      console.error('Failed to run test suite:', err);
    } finally {
      setIsRunningTests(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Institutional Governance Hierarchy</h3>
              <p className="text-xs text-slate-400">
                {schoolName} • Authority Boundaries & Role Assignment Controls
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-800 flex gap-2 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('hierarchy')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'hierarchy'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Active Hierarchy Tree
          </button>
          <button
            onClick={() => setActiveTab('appoint_principal')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'appoint_principal'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Appoint Principal (Proprietor Only)
          </button>
          <button
            onClick={() => setActiveTab('appoint_ict')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'appoint_ict'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Appoint ICT Tech (Principal / Proprietor)
          </button>
          <button
            onClick={() => {
              setActiveTab('tests');
              if (testResults.length === 0) runGovernanceSuite();
            }}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'tests'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Governance Test Suite
          </button>
        </div>

        {/* Action Message Banner */}
        {actionMessage && (
          <div className={`px-6 py-3 text-xs flex items-center justify-between ${
            actionMessage.type === 'success' ? 'bg-emerald-950/60 text-emerald-300 border-b border-emerald-500/20' : 'bg-red-950/60 text-red-300 border-b border-red-500/20'
          }`}>
            <span>{actionMessage.text}</span>
            <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white ml-2">✕</button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto no-scrollbar space-y-6 flex-1 text-slate-200">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-xs text-slate-400">
              Loading institutional hierarchy records...
            </div>
          ) : (
            <>
              {/* TAB 1: ACTIVE HIERARCHY TREE */}
              {activeTab === 'hierarchy' && (
                <div className="space-y-6">
                  {/* Governance Rules Badge Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-left">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                        <Crown className="w-3 h-3" /> Rule 1: Apex Authority
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1">
                        Proprietor is strictly above Principal & ICT Tech.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-left">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                        <Briefcase className="w-3 h-3" /> Rule 2: Academic Head
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1">
                        Principal is strictly above ICT Tech; appoints ICT staff.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-left">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Rule 3: Provision Gate
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1">
                        ICT Tech cannot single-handedly provision an instance.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-left">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                        <UserCheck className="w-3 h-3" /> Rule 4: Dual Role
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1">
                        Principal can hold both positions (Principal & ICT Tech).
                      </p>
                    </div>
                  </div>

                  {/* Visual Hierarchy Tree */}
                  <div className="p-6 rounded-2xl bg-slate-950/90 border border-slate-800/80 space-y-6">
                    <div className="text-center font-bold text-xs uppercase tracking-wider text-slate-400">
                      Organogram & Delegation Chain
                    </div>

                    {/* Level 1: School Proprietor */}
                    <div className="flex flex-col items-center">
                      <div className="w-full max-w-md p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-center relative shadow-lg">
                        <span className="absolute -top-2.5 right-4 text-[9px] uppercase tracking-wider font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                          Founding Authority
                        </span>
                        <div className="flex items-center justify-center gap-2 text-amber-400 font-bold text-sm">
                          <Crown className="w-4 h-4" />
                          <span>School Proprietor / Board Founder</span>
                        </div>
                        <div className="text-xs text-white font-semibold mt-1">
                          {hierarchy?.proprietor?.name || hierarchy?.provisionerName || 'Proprietor Name'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {hierarchy?.proprietor?.email || hierarchy?.provisionerEmail}
                        </div>
                        <div className="text-[10px] text-amber-300/80 mt-2">
                          Has sovereign authority to appoint the School Principal.
                        </div>
                      </div>

                      {/* Arrow Down */}
                      <div className="my-2 flex flex-col items-center text-slate-500">
                        <div className="h-4 w-px bg-slate-700"></div>
                        <ArrowDown className="w-4 h-4 text-slate-600" />
                        <span className="text-[9px] text-slate-500 italic mt-0.5">Appoints & Oversees</span>
                      </div>

                      {/* Level 2: School Principal */}
                      <div className="w-full max-w-md p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-center relative shadow-lg">
                        <span className="absolute -top-2.5 right-4 text-[9px] uppercase tracking-wider font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          Academic Head
                        </span>
                        <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm">
                          <Briefcase className="w-4 h-4" />
                          <span>School Principal</span>
                        </div>
                        <div className="text-xs text-white font-semibold mt-1">
                          {hierarchy?.principal?.name || 'Dr. (Mrs.) Folashade Adeleke'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {hierarchy?.principal?.email || 'principal@school.sch.ng'}
                        </div>
                        <div className="text-[10px] text-emerald-300/80 mt-2">
                          Appointed by: {hierarchy?.principal?.appointedBy === 'proprietor' ? 'School Proprietor' : 'Self-provisioned'}
                        </div>

                        {/* Dual Role Toggle Button */}
                        <div className="mt-3 pt-3 border-t border-emerald-500/20 flex items-center justify-between">
                          <span className="text-[11px] text-slate-300 font-medium">
                            Dual Position Status:
                          </span>
                          {hierarchy?.principal?.isAlsoIctTechnician ? (
                            <button
                              onClick={() => handleToggleDualRole(false)}
                              className="px-2.5 py-1 text-[10px] font-bold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded-lg transition-colors"
                            >
                              Dual (Principal + ICT Tech) [Click to Split]
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleDualRole(true)}
                              className="px-2.5 py-1 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-colors"
                            >
                              Separate Roles [Click to Assume Dual]
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Arrow Down */}
                      <div className="my-2 flex flex-col items-center text-slate-500">
                        <div className="h-4 w-px bg-slate-700"></div>
                        <ArrowDown className="w-4 h-4 text-slate-600" />
                        <span className="text-[9px] text-slate-500 italic mt-0.5">Appoints & Manages</span>
                      </div>

                      {/* Level 3: ICT Technician */}
                      <div className="w-full max-w-md p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/40 text-center relative shadow-lg">
                        <span className="absolute -top-2.5 right-4 text-[9px] uppercase tracking-wider font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                          Technical Support
                        </span>
                        <div className="flex items-center justify-center gap-2 text-indigo-400 font-bold text-sm">
                          <Users className="w-4 h-4" />
                          <span>ICT Technician / Lab Administrator</span>
                        </div>
                        <div className="text-xs text-white font-semibold mt-1">
                          {hierarchy?.ictTechnician?.name || 'Engr. Kayode Bello'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {hierarchy?.ictTechnician?.email || 'ict@school.sch.ng'}
                        </div>
                        <div className="text-[10px] text-indigo-300/80 mt-2">
                          {hierarchy?.ictTechnician?.isDualRoleWithPrincipal 
                            ? 'Held simultaneously by School Principal (Dual Role)'
                            : `Appointed by ${hierarchy?.ictTechnician?.appointedBy === 'principal' ? 'School Principal' : 'School Proprietor'}`}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Appointment Audit Trail */}
                  {hierarchy?.appointmentHistory && hierarchy.appointmentHistory.length > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Institutional Governance & Appointment Ledger
                      </h4>
                      <div className="space-y-2">
                        {hierarchy.appointmentHistory.map((rec, i) => (
                          <div key={i} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs flex items-center justify-between">
                            <div>
                              <span className="font-semibold text-white capitalize">{rec.role.replace('_', ' ')}:</span> {rec.name}
                              <span className="text-slate-400 block text-[10px]">{rec.notes}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block font-mono">
                                {new Date(rec.appointedAt).toLocaleDateString()}
                              </span>
                              <span className="text-[9px] uppercase font-bold text-emerald-400">
                                {rec.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: APPOINT PRINCIPAL (PROPRIETOR ONLY) */}
              {activeTab === 'appoint_principal' && (
                <form onSubmit={handleAppointPrincipal} className="space-y-4 max-w-lg mx-auto p-6 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-center space-y-1">
                    <h4 className="font-bold text-white text-sm">Appoint or Reassign School Principal</h4>
                    <p className="text-xs text-slate-400">
                      Enforcing Rule: "School proprietor is above principal and ICT technician. Proprietor is able to appoint or assign the school principal."
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Principal Full Name *</label>
                    <input
                      type="text"
                      required
                      value={principalForm.name}
                      onChange={e => setPrincipalForm({ ...principalForm, name: e.target.value })}
                      placeholder="e.g. Dr. (Mrs.) Folashade Adeleke"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Principal Official Email *</label>
                    <input
                      type="email"
                      required
                      value={principalForm.email}
                      onChange={e => setPrincipalForm({ ...principalForm, email: e.target.value })}
                      placeholder="principal@school.sch.ng"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Telephone Number</label>
                    <input
                      type="text"
                      value={principalForm.phone}
                      onChange={e => setPrincipalForm({ ...principalForm, phone: e.target.value })}
                      placeholder="+234 803 000 0000"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                  </div>

                  <label className="flex items-center gap-2 pt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={principalForm.isAlsoIctTechnician}
                      onChange={e => setPrincipalForm({ ...principalForm, isAlsoIctTechnician: e.target.checked })}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                    />
                    <span className="text-xs text-slate-300">
                      Principal shall also hold the position of ICT Technician (Dual Role)
                    </span>
                  </label>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Appointment Notes / Resolution</label>
                    <textarea
                      rows={2}
                      value={principalForm.notes}
                      onChange={e => setPrincipalForm({ ...principalForm, notes: e.target.value })}
                      placeholder="Official board resolution reference or appointment memo..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition-colors"
                  >
                    Confirm Principal Appointment
                  </button>
                </form>
              )}

              {/* TAB 3: APPOINT ICT TECHNICIAN (PRINCIPAL / PROPRIETOR) */}
              {activeTab === 'appoint_ict' && (
                <form onSubmit={handleAppointIct} className="space-y-4 max-w-lg mx-auto p-6 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-center space-y-1">
                    <h4 className="font-bold text-white text-sm">Appoint or Assign ICT Technician</h4>
                    <p className="text-xs text-slate-400">
                      Enforcing Rule: "The school principal is able to assign or appoint the ICT technician to help in managing the provisioned school instance."
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">ICT Technician Full Name *</label>
                    <input
                      type="text"
                      required
                      value={ictForm.name}
                      onChange={e => setIctForm({ ...ictForm, name: e.target.value })}
                      placeholder="e.g. Engr. Kayode Bello"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">ICT Technician Email *</label>
                    <input
                      type="email"
                      required
                      value={ictForm.email}
                      onChange={e => setIctForm({ ...ictForm, email: e.target.value })}
                      placeholder="ict@school.sch.ng"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Telephone Number</label>
                    <input
                      type="text"
                      value={ictForm.phone}
                      onChange={e => setIctForm({ ...ictForm, phone: e.target.value })}
                      placeholder="+234 802 000 0000"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Assignment Scope / Notes</label>
                    <textarea
                      rows={2}
                      value={ictForm.notes}
                      onChange={e => setIctForm({ ...ictForm, notes: e.target.value })}
                      placeholder="Assigned technical responsibilities (CBT labs, network, student biometric devices)..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-colors"
                  >
                    Confirm ICT Technician Appointment
                  </button>
                </form>
              )}

              {/* TAB 4: AUTOMATED GOVERNANCE TEST SUITE */}
              {activeTab === 'tests' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Automated 5-Point Governance Rule Verification
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Live assertions validating institutional hierarchy, appointment authority, dual-role mechanics, and ICT restriction gatekeepers.
                      </p>
                    </div>
                    <button
                      onClick={runGovernanceSuite}
                      disabled={isRunningTests}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${isRunningTests ? 'animate-spin' : ''}`} />
                      <span>{isRunningTests ? 'Running...' : 'Re-run Tests'}</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {testResults.map((r, i) => (
                      <div
                        key={i}
                        className={`p-3.5 rounded-xl border flex items-start justify-between ${
                          r.passed
                            ? 'bg-emerald-950/20 border-emerald-500/30'
                            : 'bg-red-950/20 border-red-500/30'
                        }`}
                      >
                        <div className="space-y-1 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 text-slate-300">
                              Rule {r.ruleNumber}
                            </span>
                            <span className="text-xs font-bold text-white">{r.ruleTitle}</span>
                          </div>
                          <p className="text-xs text-slate-300">{r.message}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                          {r.passed ? (
                            <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>PASSED</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-400 text-xs font-bold">
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                              <span>FAILED</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
