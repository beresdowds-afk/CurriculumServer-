import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  X
} from 'lucide-react';
import type {
  AcademicSessionRecord,
  AcademicTermRecord,
  CreateAcademicSessionRequest,
  CreateAcademicTermRequest
} from '../../packages/shared-types/src/apiContracts';
import type { UserProfile } from '../types';
import { unifiedApiClient } from '../services/unifiedApiClient';

interface AcademicCalendarTabProps {
  currentUser?: UserProfile;
  onNavigateTab?: (tab: any) => void;
}

export const AcademicCalendarTab: React.FC<AcademicCalendarTabProps> = () => {
  const isAuthenticated = unifiedApiClient.isAuthenticated('school_flow');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [sessions, setSessions] = useState<AcademicSessionRecord[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');

  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState<CreateAcademicSessionRequest>({
    sessionCode: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    displayName: `${new Date().getFullYear()}/${new Date().getFullYear() + 1} Academic Session`,
    startsOn: `${new Date().getFullYear()}-09-01`,
    endsOn: `${new Date().getFullYear() + 1}-07-31`
  });

  const [isTermModalOpen, setIsTermModalOpen] = useState(false);
  const [termTargetSessionId, setTermTargetSessionId] = useState('');
  const [termForm, setTermForm] = useState<CreateAcademicTermRequest>({
    termOrder: 1,
    name: 'First Term',
    startsOn: `${new Date().getFullYear()}-09-07`,
    endsOn: `${new Date().getFullYear()}-12-18`
  });

  const loadSessions = useCallback(async () => {
    if (!unifiedApiClient.isAuthenticated('school_flow')) return;
    setLoading(true);
    setError('');
    try {
      const data = await unifiedApiClient.listAcademicSessions();
      setSessions(data);
      setSelectedSessionId(prev => {
        if (prev && data.some(s => s.id === prev)) return prev;
        return (data.find(s => s.is_current) || data[0])?.id || '';
      });
    } catch (err: any) {
      setError(err?.error || err?.message || 'Unable to load school academic sessions and terms.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const currentSession = useMemo(
    () => sessions.find(s => s.is_current) || null,
    [sessions]
  );

  const currentTerm = useMemo<AcademicTermRecord | null>(() => {
    for (const s of sessions) {
      const active = s.terms.find(t => t.is_current);
      if (active) return active;
    }
    return null;
  }, [sessions]);

  const selectedSession = useMemo(
    () => sessions.find(s => s.id === selectedSessionId) || currentSession || sessions[0] || null,
    [sessions, selectedSessionId, currentSession]
  );

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      const created = await unifiedApiClient.createAcademicSession({
        sessionCode: sessionForm.sessionCode.trim(),
        displayName: sessionForm.displayName.trim(),
        startsOn: sessionForm.startsOn,
        endsOn: sessionForm.endsOn
      });
      setIsSessionModalOpen(false);
      setSelectedSessionId(created.id);
      setNotice(`Academic session "${created.display_name}" created in PostgreSQL.`);
      await loadSessions();
    } catch (err: any) {
      setError(err?.error || err?.message || 'Unable to create academic session.');
    }
  };

  const handleActivateSession = async (sessionId: string) => {
    setError('');
    setNotice('');
    try {
      const updated = await unifiedApiClient.activateAcademicSession(sessionId);
      setNotice(`Academic session "${updated.display_name}" is now active.`);
      await loadSessions();
    } catch (err: any) {
      setError(err?.error || err?.message || 'Unable to activate academic session.');
    }
  };

  const openAddTermModal = (session: AcademicSessionRecord) => {
    const nextOrder = (session.terms?.length || 0) + 1;
    setTermTargetSessionId(session.id);
    setTermForm({
      termOrder: nextOrder,
      name: nextOrder === 1 ? 'First Term' : nextOrder === 2 ? 'Second Term' : nextOrder === 3 ? 'Third Term' : `Term ${nextOrder}`,
      startsOn: session.starts_on.slice(0, 10),
      endsOn: session.ends_on.slice(0, 10)
    });
    setIsTermModalOpen(true);
  };

  const handleCreateTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termTargetSessionId) return;
    setError('');
    setNotice('');
    try {
      const created = await unifiedApiClient.createAcademicTerm(termTargetSessionId, {
        termOrder: Number(termForm.termOrder),
        name: termForm.name.trim(),
        startsOn: termForm.startsOn,
        endsOn: termForm.endsOn
      });
      setIsTermModalOpen(false);
      setNotice(`Academic term "${created.name}" added.`);
      await loadSessions();
    } catch (err: any) {
      setError(err?.error || err?.message || 'Unable to create academic term.');
    }
  };

  const handleActivateTerm = async (termId: string) => {
    setError('');
    setNotice('');
    try {
      const updated = await unifiedApiClient.activateAcademicTerm(termId);
      setNotice(`Academic term "${updated.name}" activated.`);
      await loadSessions();
    } catch (err: any) {
      setError(err?.error || err?.message || 'Unable to activate academic term.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-extrabold text-white">School Authentication Required</h2>
        <p className="text-xs text-slate-400 max-w-lg mx-auto">
          Academic sessions and terms are scoped per school tenant in PostgreSQL. Sign in via School Admin Access to configure and activate school sessions and terms.
        </p>
      </div>
    );
  }

  const totalTermsCount = sessions.reduce((acc, s) => acc + (s.terms?.length || 0), 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & KPI Overview */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <CalendarDays className="w-4 h-4" />
              <span>Academic Sessions & Statutory Terms</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Academic Calendar & Session Governance
            </h1>
            <p className="text-xs text-slate-400 max-w-3xl">
              Manage persisted school academic years, terms, resumption boundaries, and single-active-session / single-active-term state transitions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={loadSessions}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setIsSessionModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Academic Session</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
              <CalendarCheck className="w-3.5 h-3.5 text-emerald-400" /> Active Session
            </span>
            <div className="text-base font-extrabold text-emerald-300">
              {currentSession ? currentSession.display_name : 'None activated'}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {currentSession ? `${currentSession.starts_on.slice(0, 10)} → ${currentSession.ends_on.slice(0, 10)}` : 'Create or activate a session below'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-400" /> Active Term
            </span>
            <div className="text-base font-extrabold text-blue-300">
              {currentTerm ? currentTerm.name : 'None activated'}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {currentTerm ? `${currentTerm.starts_on.slice(0, 10)} → ${currentTerm.ends_on.slice(0, 10)}` : 'Activate a term inside an active session'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-400" /> Recorded Structure
            </span>
            <div className="text-base font-extrabold text-white">
              {sessions.length} Sessions • {totalTermsCount} Terms
            </div>
            <div className="text-[11px] text-slate-400">PostgreSQL tenant isolation enforced</div>
          </div>
        </div>

        {error && (
          <div role="alert" className="p-3 rounded-xl bg-rose-950/60 border border-rose-700/60 text-rose-200 text-xs flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><ShieldAlert className="w-4 h-4 shrink-0" />{error}</span>
            <button onClick={() => setError('')} className="text-rose-300 hover:text-white"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
        {notice && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-700/60 text-emerald-200 text-xs flex items-center justify-between gap-2">
            <span>{notice}</span>
            <button onClick={() => setNotice('')} className="text-emerald-300 hover:text-white"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>

      {/* Sessions & Terms Grid */}
      {sessions.length === 0 ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 text-center text-xs text-slate-400 space-y-3">
          <p>No academic sessions have been created for this school tenant yet.</p>
          <button
            onClick={() => setIsSessionModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create First Academic Session
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Sessions Selector */}
          <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-3xl p-4 space-y-2">
            <div className="px-2 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              Academic Sessions ({sessions.length})
            </div>
            {sessions.map(sess => {
              const isSelected = selectedSession?.id === sess.id;
              return (
                <button
                  key={sess.id}
                  onClick={() => setSelectedSessionId(sess.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all space-y-1.5 ${
                    isSelected
                      ? 'bg-slate-800 border-emerald-500/60 ring-1 ring-emerald-500/30'
                      : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white">{sess.display_name}</span>
                    {sess.is_current ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold uppercase">
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-700 uppercase">
                        {sess.status}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    {sess.session_code} • {sess.starts_on.slice(0, 10)} → {sess.ends_on.slice(0, 10)}
                  </div>
                  <div className="text-[10px] text-emerald-400">{sess.terms?.length || 0} configured terms</div>
                </button>
              );
            })}
          </div>

          {/* Right: Session Terms Detail */}
          {selectedSession && (
            <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                      {selectedSession.session_code}
                    </span>
                    <span className="text-xs uppercase font-bold text-slate-400">{selectedSession.status}</span>
                  </div>
                  <h2 className="text-lg font-extrabold text-white mt-1">{selectedSession.display_name}</h2>
                  <p className="text-xs text-slate-400 font-mono">
                    {selectedSession.starts_on.slice(0, 10)} to {selectedSession.ends_on.slice(0, 10)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!selectedSession.is_current && (
                    <button
                      onClick={() => handleActivateSession(selectedSession.id)}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" /> Activate Session
                    </button>
                  )}
                  <button
                    onClick={() => openAddTermModal(selectedSession)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add Term
                  </button>
                </div>
              </div>

              {(!selectedSession.terms || selectedSession.terms.length === 0) ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-950/60 rounded-2xl border border-slate-800">
                  No terms defined for this academic session yet. Click "Add Term" to configure First, Second, or Third Term boundaries.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[...selectedSession.terms]
                    .sort((a, b) => a.term_order - b.term_order)
                    .map(term => (
                      <div
                        key={term.id}
                        className={`p-4 rounded-2xl border space-y-3 flex flex-col justify-between ${
                          term.is_current
                            ? 'bg-emerald-950/20 border-emerald-500/60'
                            : 'bg-slate-950/60 border-slate-800'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-slate-400 uppercase">Term #{term.term_order}</span>
                            {term.is_current ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Active
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-700 uppercase">
                                {term.status}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold text-white">{term.name}</h3>
                          <p className="text-xs font-mono text-slate-300">
                            {term.starts_on.slice(0, 10)} → {term.ends_on.slice(0, 10)}
                          </p>
                        </div>

                        {!term.is_current && (
                          <button
                            onClick={() => handleActivateTerm(term.id)}
                            className="w-full py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600 hover:text-slate-950 text-slate-200 text-xs font-semibold transition-colors"
                          >
                            Set as Active Term
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal: Create Academic Session */}
      {isSessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">Create Academic Session</h2>
              <button onClick={() => setIsSessionModalOpen(false)} className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateSession} className="space-y-3 text-xs">
              <label className="block">
                <span className="text-slate-300 font-semibold block mb-1">Session Code *</span>
                <input
                  required
                  value={sessionForm.sessionCode}
                  onChange={e => setSessionForm({ ...sessionForm, sessionCode: e.target.value })}
                  placeholder="2026-2027"
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 font-mono"
                />
              </label>
              <label className="block">
                <span className="text-slate-300 font-semibold block mb-1">Display Name *</span>
                <input
                  required
                  value={sessionForm.displayName}
                  onChange={e => setSessionForm({ ...sessionForm, displayName: e.target.value })}
                  placeholder="2026/2027 Academic Session"
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Start Date *</span>
                  <input
                    required
                    type="date"
                    value={sessionForm.startsOn}
                    onChange={e => setSessionForm({ ...sessionForm, startsOn: e.target.value })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">End Date *</span>
                  <input
                    required
                    type="date"
                    value={sessionForm.endsOn}
                    onChange={e => setSessionForm({ ...sessionForm, endsOn: e.target.value })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsSessionModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold">Create Session</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Academic Term */}
      {isTermModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">Add Academic Term</h2>
              <button onClick={() => setIsTermModalOpen(false)} className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateTerm} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Order *</span>
                  <input
                    required
                    type="number"
                    min={1}
                    max={6}
                    value={termForm.termOrder}
                    onChange={e => setTermForm({ ...termForm, termOrder: Number(e.target.value) })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  />
                </label>
                <label className="col-span-2 block">
                  <span className="text-slate-300 font-semibold block mb-1">Term Name *</span>
                  <input
                    required
                    value={termForm.name}
                    onChange={e => setTermForm({ ...termForm, name: e.target.value })}
                    placeholder="First Term"
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Start Date *</span>
                  <input
                    required
                    type="date"
                    value={termForm.startsOn}
                    onChange={e => setTermForm({ ...termForm, startsOn: e.target.value })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">End Date *</span>
                  <input
                    required
                    type="date"
                    value={termForm.endsOn}
                    onChange={e => setTermForm({ ...termForm, endsOn: e.target.value })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsTermModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold">Save Term</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
