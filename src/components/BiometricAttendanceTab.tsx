import React from 'react';

export const BiometricAttendanceTab: React.FC = () => (
  <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-slate-900">
    <h2 className="text-lg font-bold">Biometric and RFID attendance unavailable</h2>
    <p className="mt-2 text-sm">
      Automated student and staff attendance, device enrollment, electronic registers and
      guardian notifications are not yet operational. No attendance events or notifications
      are being recorded from this screen.
    </p>
    <p className="mt-2 text-sm">
      Use your school&apos;s approved attendance contingency process until the service is available.
    </p>
  </section>
);
