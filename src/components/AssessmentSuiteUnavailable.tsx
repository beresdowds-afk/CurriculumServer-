import React from 'react';

export const AssessmentSuiteUnavailable: React.FC = () => (
  <section className="rounded-3xl border border-amber-800 bg-slate-900 p-6 text-slate-200" role="status">
    <h1 className="text-xl font-bold text-white">Adaptive learning and secure CBT unavailable</h1>
    <p className="mt-3 text-sm">
      Persistent remedial interventions, authorized question review, secure examination sessions,
      marking and result publication are not yet available in this workspace.
    </p>
    <p className="mt-2 text-sm text-slate-400">
      Do not use prototype examination screens for real assessments. Browser controls alone cannot
      provide operating-system lockdown; stronger lockdown requires a managed kiosk.
    </p>
  </section>
);
