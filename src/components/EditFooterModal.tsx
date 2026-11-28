import React, { useEffect, useRef, useState } from 'react';
import { X, Save, RotateCcw, MapPin, Mail, Phone, Copyright, AlertCircle, CheckCircle2, Pencil } from 'lucide-react';
import type { FooterEditableFields } from '../types/homepageEngine';

export interface EditFooterModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  accentTone?: 'purple' | 'emerald' | 'amber' | 'indigo';
  initialValues: FooterEditableFields;
  defaultValues?: FooterEditableFields;
  onLiveChange?: (values: FooterEditableFields) => void;
  onSave: (values: FooterEditableFields) => Promise<void> | void;
  onCancel: () => void;
}

const ACCENT_STYLES: Record<'purple' | 'emerald' | 'amber' | 'indigo', { button: string; ring: string; badge: string; icon: string }> = {
  purple: {
    button: 'bg-purple-600 hover:bg-purple-500 text-white',
    ring: 'focus:border-purple-500 focus:ring-purple-500/20',
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    icon: 'text-purple-400'
  },
  emerald: {
    button: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    ring: 'focus:border-emerald-500 focus:ring-emerald-500/20',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    icon: 'text-emerald-400'
  },
  amber: {
    button: 'bg-amber-600 hover:bg-amber-500 text-white',
    ring: 'focus:border-amber-500 focus:ring-amber-500/20',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    icon: 'text-amber-400'
  },
  indigo: {
    button: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    ring: 'focus:border-indigo-500 focus:ring-indigo-500/20',
    badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    icon: 'text-indigo-400'
  }
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EditFooterModal: React.FC<EditFooterModalProps> = ({
  isOpen,
  title = 'Edit Footer',
  subtitle = 'Modify copyright text, institutional address, email, and phone number. Changes preview live in the footer.',
  accentTone = 'indigo',
  initialValues,
  defaultValues,
  onLiveChange,
  onSave,
  onCancel
}) => {
  const [formValues, setFormValues] = useState<FooterEditableFields>(initialValues);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const snapshotRef = useRef<FooterEditableFields>(initialValues);

  useEffect(() => {
    if (isOpen) {
      snapshotRef.current = { ...initialValues };
      setFormValues({ ...initialValues });
      setErrorMsg(null);
      setSavedBanner(null);
    }
  }, [isOpen, initialValues.copyrightText, initialValues.institutionalAddress, initialValues.email, initialValues.phoneNumber]);

  if (!isOpen) return null;

  const styles = ACCENT_STYLES[accentTone];

  const handleFieldChange = (field: keyof FooterEditableFields, value: string) => {
    const next = { ...formValues, [field]: value };
    setFormValues(next);
    setErrorMsg(null);
    setSavedBanner(null);
    onLiveChange?.(next);
  };

  const handleReset = () => {
    const target = defaultValues ? { ...defaultValues } : { ...snapshotRef.current };
    setFormValues(target);
    setErrorMsg(null);
    onLiveChange?.(target);
  };

  const handleCloseCancel = () => {
    onLiveChange?.(snapshotRef.current);
    onCancel();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned: FooterEditableFields = {
      copyrightText: formValues.copyrightText.trim(),
      institutionalAddress: formValues.institutionalAddress.trim(),
      email: formValues.email.trim(),
      phoneNumber: formValues.phoneNumber.trim()
    };

    if (!cleaned.copyrightText) {
      setErrorMsg('Copyright text cannot be empty.');
      return;
    }
    if (!cleaned.institutionalAddress) {
      setErrorMsg('Institutional address cannot be empty.');
      return;
    }
    if (!cleaned.email || !EMAIL_REGEX.test(cleaned.email)) {
      setErrorMsg('Enter a valid email address.');
      return;
    }
    if (!cleaned.phoneNumber || cleaned.phoneNumber.length < 5) {
      setErrorMsg('Enter a valid phone number.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      await onSave(cleaned);
      snapshotRef.current = cleaned;
      setSavedBanner('Footer changes applied.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save footer changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-footer-modal-title"
    >
      <div className="w-full max-w-xl bg-[#0B0F17] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        <div className="px-6 py-4 border-b border-slate-800 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Pencil className={`w-4 h-4 ${styles.icon}`} />
              <h3 id="edit-footer-modal-title" className="text-base font-bold text-white">
                {title}
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={handleCloseCancel}
            aria-label="Close Edit Footer dialog"
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="footer-copyright-input" className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1.5">
              <Copyright className="w-3.5 h-3.5 text-slate-400" />
              <span>Copyright Text</span>
            </label>
            <input
              id="footer-copyright-input"
              name="copyrightText"
              type="text"
              value={formValues.copyrightText}
              onChange={(e) => handleFieldChange('copyrightText', e.target.value)}
              placeholder="© 2026 Institution Name. All rights reserved."
              className={`w-full bg-[#070A0F] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${styles.ring}`}
            />
          </div>

          <div>
            <label htmlFor="footer-address-input" className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Institutional Address</span>
            </label>
            <input
              id="footer-address-input"
              name="institutionalAddress"
              type="text"
              value={formValues.institutionalAddress}
              onChange={(e) => handleFieldChange('institutionalAddress', e.target.value)}
              placeholder="Plot 14, Academic Avenue, Lagos, Nigeria"
              className={`w-full bg-[#070A0F] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${styles.ring}`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="footer-email-input" className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Email</span>
              </label>
              <input
                id="footer-email-input"
                name="email"
                type="email"
                value={formValues.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                placeholder="info@institution.edu.ng"
                className={`w-full bg-[#070A0F] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${styles.ring}`}
              />
            </div>

            <div>
              <label htmlFor="footer-phone-input" className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Phone Number</span>
              </label>
              <input
                id="footer-phone-input"
                name="phoneNumber"
                type="text"
                value={formValues.phoneNumber}
                onChange={(e) => handleFieldChange('phoneNumber', e.target.value)}
                placeholder="+234 800 000 0000"
                className={`w-full bg-[#070A0F] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${styles.ring}`}
              />
            </div>
          </div>

          {/* Live Preview Strip */}
          <div className="p-3.5 rounded-xl bg-[#05070B] border border-slate-800 space-y-1.5 text-xs">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Live Footer Preview
            </div>
            <p className="text-slate-200 font-medium break-words">
              {formValues.institutionalAddress || 'Institutional address'}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400">
              <span>{formValues.email || 'email@institution.edu.ng'}</span>
              <span>{formValues.phoneNumber || '+234 000 000 0000'}</span>
            </div>
            <p className="text-slate-400 pt-1 border-t border-slate-800/80 break-words">
              {formValues.copyrightText || 'Copyright text'}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {savedBanner && (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{savedBanner}</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            {defaultValues ? (
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Default</span>
              </button>
            ) : <span />}

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={handleCloseCancel}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 ${styles.button}`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Footer'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
