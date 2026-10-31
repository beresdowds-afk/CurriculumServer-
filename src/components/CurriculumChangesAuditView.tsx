import React, { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { 
  NerdcCurriculumDiff, 
  CurriculumGranularChange, 
  CurriculumChangeCategory,
  EducationLevel,
  SubjectField 
} from '../types';
import { 
  FileText, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Download, 
  Printer, 
  Calendar, 
  ShieldCheck, 
  BookOpen, 
  ChevronDown, 
  ChevronRight, 
  Sparkles, 
  ExternalLink,
  Award,
  Layers,
  ArrowRight,
  Sliders,
  Clock,
  Eye,
  FileCheck2,
  Tag,
  FileSpreadsheet,
  X,
  Lock,
  Check
} from 'lucide-react';
import { NerdcAnnualWorkerModal } from './NerdcAnnualWorkerModal';
import { GovernedCurriculumVersion, DownstreamImpactReport } from '../types/curriculumVersioning';
import { getSuperAdminAuthHeader } from '../services/controlPlaneToken';

interface CurriculumChangesAuditViewProps {
  initialSubjectFilter?: string;
  onOpenSubjectDetails?: (subjectId: string) => void;
}

export const CurriculumChangesAuditView: React.FC<CurriculumChangesAuditViewProps> = ({
  initialSubjectFilter,
  onOpenSubjectDetails
}) => {
  const [diffs, setDiffs] = useState<NerdcCurriculumDiff[]>([]);
  const [revisionTag, setRevisionTag] = useState<string>('NERDC-GAZETTE-2025/2026-AUG-V1');
  const [lastRunTimestamp, setLastRunTimestamp] = useState<string>(new Date().toISOString());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<EducationLevel>('all');
  const [selectedField, setSelectedField] = useState<SubjectField | 'all'>('all');
  const [selectedChangeType, setSelectedChangeType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedSubjectIds, setExpandedSubjectIds] = useState<Set<string>>(new Set(['sss-general-mathematics', 'sss-data-processing', 'jss-english-studies']));
  const [expandedGranularId, setExpandedGranularId] = useState<string | null>('diff-mth-01');

  // Impact Analysis & Governed Versions State
  const [impactModalSubject, setImpactModalSubject] = useState<{ subjectId: string; name: string; grade: string } | null>(null);
  const [impactReport, setImpactReport] = useState<DownstreamImpactReport | null>(null);
  const [isLoadingImpact, setIsLoadingImpact] = useState<boolean>(false);
  const [isVersionsModalOpen, setIsVersionsModalOpen] = useState<boolean>(false);
  const [governedVersions, setGovernedVersions] = useState<GovernedCurriculumVersion[]>([]);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);

  const fetchDiffs = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/nerdc/curriculum-changes');
      if (res.ok) {
        const data = await res.json();
        setDiffs(data.diffs || []);
        if (data.revisionTag) setRevisionTag(data.revisionTag);
        if (data.lastRunTimestamp) setLastRunTimestamp(data.lastRunTimestamp);
      }
    } catch (err) {
      console.error('Failed to load curriculum changes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiffs();
  }, []);

  const handleOpenImpactAnalysis = async (subjectId: string, name: string, grade: string = 'SS 2') => {
    setImpactModalSubject({ subjectId, name, grade });
    setIsLoadingImpact(true);
    try {
      const res = await fetch(`/api/v1/curriculum/impact-analysis?subjectId=${subjectId}&classGrade=${encodeURIComponent(grade)}&previousVersionId=NERDC-2024-V1&newVersionId=NERDC-2026-V1`);
      if (res.ok) {
        const data = await res.json();
        setImpactReport(data);
      }
    } catch (err) {
      console.error('Failed to run impact analysis:', err);
    } finally {
      setIsLoadingImpact(false);
    }
  };

  const handleOpenVersionsModal = async () => {
    setIsVersionsModalOpen(true);
    try {
      const res = await fetch('/api/v1/curriculum/versions');
      if (res.ok) {
        const data = await res.json();
        setGovernedVersions(data.versions || []);
      }
    } catch (err) {
      console.error('Failed to load governed versions:', err);
    }
  };

  const handleApproveChange = async (changeId: string, decision: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/v1/curriculum/changes/${changeId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getSuperAdminAuthHeader()
        },
        body: JSON.stringify({
          decision,
          reviewerName: 'Dr. Folashade Adeyemi',
          reviewerRole: 'editorial_director',
          notes: 'Editorial review confirmed alignment with national standards'
        })
      });
      if (res.ok) {
        setReviewSuccessMsg(`Change ${changeId} marked ${decision} by Editorial Director`);
        setTimeout(() => setReviewSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      alert('Review failed: ' + err.message);
    }
  };

  const handleTriggerSync = async () => {
    try {
      setIsSyncing(true);
      setSyncMessage(null);
      const res = await fetch('/api/v1/curriculum/jobs/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getSuperAdminAuthHeader()
        },
        body: JSON.stringify({
          sourceId: 'src-nerdc-math-sss',
          jobType: 'MANUAL_SYNC'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSyncMessage(`Curriculum synchronization completed: ${data.job?.resultSummary || 'Checked — no verified changes'}`);
        await fetchDiffs();
        setTimeout(() => setSyncMessage(null), 5000);
      } else {
        alert(data.error || 'Failed to trigger worker sync');
      }
    } catch (err: any) {
      alert('Error triggering sync: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleSubjectExpand = (subjectId: string) => {
    setExpandedSubjectIds(prev => {
      const next = new Set(prev);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }
      return next;
    });
  };

  // Filtered diff items
  const filteredDiffs = useMemo(() => {
    return diffs.filter(d => {
      if (selectedLevel !== 'all' && d.level !== selectedLevel) return false;
      if (selectedField !== 'all' && d.field !== selectedField) return false;
      if (selectedChangeType !== 'all') {
        if (selectedChangeType === 'modified_only' && d.changeType === 'verified') return false;
        if (selectedChangeType !== 'modified_only' && d.changeType !== selectedChangeType) return false;
      }
      if (selectedCategory !== 'all') {
        const hasCat = d.granularChanges?.some(g => g.category === selectedCategory);
        if (!hasCat) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = d.subjectName.toLowerCase().includes(q);
        const matchCode = d.subjectCode?.toLowerCase().includes(q);
        const matchDetails = d.details.toLowerCase().includes(q);
        const matchGranular = d.granularChanges?.some(g => 
          g.topicTitle.toLowerCase().includes(q) || 
          g.summary.toLowerCase().includes(q) ||
          g.waecExamImpact?.toLowerCase().includes(q) ||
          g.previousContent?.toLowerCase().includes(q) ||
          g.updatedContent?.toLowerCase().includes(q)
        );
        if (!matchName && !matchCode && !matchDetails && !matchGranular) return false;
      }
      return true;
    });
  }, [diffs, selectedLevel, selectedField, selectedChangeType, selectedCategory, searchQuery]);

  const stats = useMemo(() => {
    const total = diffs.length;
    const modified = diffs.filter(d => d.changeType !== 'verified').length;
    const verified = diffs.filter(d => d.changeType === 'verified').length;
    const totalGranular = diffs.reduce((acc, d) => acc + (d.granularChanges?.length || 0), 0);
    return { total, modified, verified, totalGranular };
  }, [diffs]);

  const handlePrintAuditReport = () => {
    window.print();
  };

  const handleExportCSV = () => {
    try {
      const headers = [
        'Subject Code',
        'Subject Name',
        'Education Level',
        'Field Category',
        'Change Status',
        'Topic Title',
        'Change Category',
        'Summary',
        'WAEC/NECO Exam Realignment Impact',
        'Previous Content',
        'Updated Content',
        'NERDC Gazette Reference',
        'Last Synchronized'
      ];

      const rows: string[][] = [];

      filteredDiffs.forEach(diff => {
        if (diff.granularChanges && diff.granularChanges.length > 0) {
          diff.granularChanges.forEach(gc => {
            rows.push([
              `"${diff.subjectCode}"`,
              `"${diff.subjectName}"`,
              `"${diff.level.toUpperCase()}"`,
              `"${diff.field.replace('_', ' ')}"`,
              `"${diff.changeType}"`,
              `"${gc.topicTitle.replace(/"/g, '""')}"`,
              `"${gc.category}"`,
              `"${gc.summary.replace(/"/g, '""')}"`,
              `"${(gc.waecExamRealignmentImpact || 'Standard').replace(/"/g, '""')}"`,
              `"${(gc.previousContent || 'N/A').replace(/"/g, '""')}"`,
              `"${(gc.updatedContent || 'N/A').replace(/"/g, '""')}"`,
              `"${diff.nerdcGazetteReference}"`,
              `"${diff.lastAuditedTimestamp}"`
            ]);
          });
        } else {
          rows.push([
            `"${diff.subjectCode}"`,
            `"${diff.subjectName}"`,
            `"${diff.level.toUpperCase()}"`,
            `"${diff.field.replace('_', ' ')}"`,
            `"${diff.changeType}"`,
            `"Verified Subject Baseline"`,
            `"VERIFIED_BASELINE"`,
            `"${diff.summaryDescription.replace(/"/g, '""')}"`,
            `"Full Alignment Confirmed"`,
            `"N/A"`,
            `"N/A"`,
            `"${diff.nerdcGazetteReference}"`,
            `"${diff.lastAuditedTimestamp}"`
          ]);
        }
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [
        headers.join(','),
        ...rows.map(e => e.join(','))
      ].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `NERDC_Curriculum_Changes_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageMargin = 15;
      let y = 20;

      // Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(pageMargin, y, 180, 22, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('FEDERAL REPUBLIC OF NIGERIA - NERDC CURRICULUM AUDIT', pageMargin + 5, y + 8);
      
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      doc.text(`Official Gazette Reference: ${revisionTag} | Date Generated: ${new Date().toLocaleDateString()}`, pageMargin + 5, y + 15);

      y += 28;

      // Overview Box
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(pageMargin, y, 180, 22, 2, 2, 'FD');

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('EXECUTIVE AUDIT SUMMARY', pageMargin + 4, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Total Subjects Audited: ${stats.total}  |  Modified / Realighed: ${stats.modified}  |  Verified Baselines: ${stats.verified}  |  Granular Changes: ${stats.totalGranular}`, pageMargin + 4, y + 12);
      doc.text(`Status: Authoritative Synchronized via NERDC Gazette Update Daemon. Archived for School Board Records.`, pageMargin + 4, y + 17);

      y += 28;

      // Iterate through diffs
      filteredDiffs.forEach((diff, idx) => {
        // Page break if near bottom
        if (y > 255) {
          doc.addPage();
          y = 20;
        }

        doc.setFillColor(241, 245, 249);
        doc.rect(pageMargin, y, 180, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`${idx + 1}. [${diff.subjectCode}] ${diff.subjectName} (${diff.level.toUpperCase()}) - ${diff.changeType.toUpperCase()}`, pageMargin + 3, y + 5);

        y += 9;

        if (diff.granularChanges && diff.granularChanges.length > 0) {
          diff.granularChanges.forEach(gc => {
            if (y > 265) {
              doc.addPage();
              y = 20;
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(51, 65, 85);
            doc.text(`• Topic: ${gc.topicTitle} [${gc.category}]`, pageMargin + 4, y + 3);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(71, 85, 105);
            const summaryLines = doc.splitTextToSize(`Change Summary: ${gc.summary}`, 170);
            doc.text(summaryLines, pageMargin + 6, y + 7);
            y += 6 + (summaryLines.length * 3);

            if (gc.waecExamRealignmentImpact) {
              doc.setFont('helvetica', 'italic');
              doc.setTextColor(126, 34, 206); // purple
              doc.text(`WAEC/NECO Impact: ${gc.waecExamRealignmentImpact}`, pageMargin + 6, y + 2);
              y += 5;
            }
          });
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(100, 116, 139);
          doc.text(`Baseline verified against national standards. No structural deviation.`, pageMargin + 6, y + 3);
          y += 6;
        }

        y += 4;
      });

      // Signature section at footer
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      y += 10;
      doc.setDrawColor(148, 163, 184);
      doc.line(pageMargin, y, pageMargin + 70, y);
      doc.line(pageMargin + 100, y, pageMargin + 175, y);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Director, Curriculum & Quality Assurance', pageMargin, y + 4);
      doc.text('Principal / School Administrator Signature & Date', pageMargin + 100, y + 4);

      doc.save(`NERDC_Curriculum_Audit_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    }
  };

  const getCategoryBadgeColor = (cat: CurriculumChangeCategory) => {
    switch (cat) {
      case 'ADDED_TOPIC':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'MODIFIED_OBJECTIVES':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'EXAM_REALIGNMENT':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'PRACTICAL_GUIDELINES':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'EVALUATION_CRITERIA_UPDATE':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'SYLLABUS_EXPANSION':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600';
    }
  };

  const getCategoryLabel = (cat: CurriculumChangeCategory) => {
    switch (cat) {
      case 'ADDED_TOPIC': return 'New Topic Added';
      case 'MODIFIED_OBJECTIVES': return 'Modified Learning Objectives';
      case 'EXAM_REALIGNMENT': return 'WAEC/NECO Exam Realignment';
      case 'PRACTICAL_GUIDELINES': return 'Practical Lab Guidelines';
      case 'EVALUATION_CRITERIA_UPDATE': return 'Evaluation & Grading Update';
      case 'SYLLABUS_EXPANSION': return 'Syllabus Expansion';
      case 'VERIFIED_BASELINE': return 'Verified Baseline';
      default: return cat;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Federal Ministry of Education / NERDC Annual Gazette Audit</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Curriculum Changes & Version Diff Audit Log
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Granular audit trail comparing previous and updated NERDC national syllabus standards. 
              Reflects updates applied automatically by the annual update daemon across Basic (JSS 1-3) and Senior Secondary (SSS 1-3) curricula.
            </p>

            {/* Quick Metadata Pill row */}
            <div className="flex flex-wrap items-center gap-3 mt-4 text-xs font-medium">
              <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-emerald-400" />
                <span>Active Revision: <strong className="text-white font-mono">{revisionTag}</strong></span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>Last Synchronized: <strong className="text-white">{new Date(lastRunTimestamp).toLocaleDateString()}</strong></span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Database Sync Status: <strong>Authoritative Real-Time</strong></span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <button
              onClick={handleOpenVersionsModal}
              className="px-3.5 py-2.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-700/50 text-purple-200 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
              title="View Governed Curriculum Version Releases & Checksums"
            >
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>Governed Releases</span>
            </button>

            <button
              onClick={() => setIsWorkerModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
              title="Configure Annual Update Worker Daemon"
            >
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Worker Daemon</span>
            </button>

            <button
              disabled={isSyncing}
              onClick={handleTriggerSync}
              className={`px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 ${
                isSyncing ? 'opacity-70 cursor-not-allowed' : ''
              }`}
              title="Trigger live synchronization against NERDC Gazette"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Gazette'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
              title="Download CSV Spreadsheet with complete diff records"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
              title="Download Official Archived PDF Report"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>Export PDF</span>
            </button>

            <button
              onClick={handlePrintAuditReport}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
              title="Print official Curriculum Changes Audit Report"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {syncMessage && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2 text-xs text-emerald-300 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{syncMessage}</span>
          </div>
        )}

        {reviewSuccessMsg && (
          <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-2xl flex items-center gap-2 text-xs text-purple-300 animate-fadeIn">
            <ShieldCheck className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span>{reviewSuccessMsg}</span>
          </div>
        )}

        {/* Stats Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400">Total Subjects Scanned</div>
            <div className="text-2xl font-black text-white mt-0.5">{stats.total}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">JSS 1-3 & SSS 1-3</div>
          </div>

          <div className="p-3.5 bg-amber-950/20 rounded-2xl border border-amber-500/20">
            <div className="text-[11px] font-semibold text-amber-400">Subjects With Updates</div>
            <div className="text-2xl font-black text-amber-300 mt-0.5">{stats.modified}</div>
            <div className="text-[10px] text-amber-400/70 mt-0.5">Syllabus alterations noted</div>
          </div>

          <div className="p-3.5 bg-blue-950/20 rounded-2xl border border-blue-500/20">
            <div className="text-[11px] font-semibold text-blue-400">Granular Objective Diffs</div>
            <div className="text-2xl font-black text-blue-300 mt-0.5">{stats.totalGranular}</div>
            <div className="text-[10px] text-blue-400/70 mt-0.5">Topic & exam modifications</div>
          </div>

          <div className="p-3.5 bg-emerald-950/20 rounded-2xl border border-emerald-500/20">
            <div className="text-[11px] font-semibold text-emerald-400">Verified Unaltered</div>
            <div className="text-2xl font-black text-emerald-300 mt-0.5">{stats.verified}</div>
            <div className="text-[10px] text-emerald-400/70 mt-0.5">100% compliant baseline</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by subject, topic, WAEC impact, or change..."
              className="w-full bg-slate-800 text-slate-200 pl-9 pr-3 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
            />
          </div>

          {/* Level Filter */}
          <div>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value as EducationLevel)}
              className="w-full bg-slate-800 text-slate-200 py-2.5 px-3 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
            >
              <option value="all">All Levels (JSS & SSS)</option>
              <option value="jss">Universal Basic (JSS 1 - 3)</option>
              <option value="sss">Senior Secondary (SSS 1 - 3)</option>
            </select>
          </div>

          {/* Change Type Filter */}
          <div>
            <select
              value={selectedChangeType}
              onChange={(e) => setSelectedChangeType(e.target.value)}
              className="w-full bg-slate-800 text-slate-200 py-2.5 px-3 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
            >
              <option value="all">All Statuses</option>
              <option value="modified_only">Updated & Realigned Only ({stats.modified})</option>
              <option value="realigned">Exam Realigned</option>
              <option value="updated">Syllabus Updated</option>
              <option value="verified">Verified Baseline</option>
            </select>
          </div>

          {/* Granular Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-800 text-slate-200 py-2.5 px-3 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
            >
              <option value="all">All Change Categories</option>
              <option value="EXAM_REALIGNMENT">WAEC/NECO Exam Realignment</option>
              <option value="ADDED_TOPIC">New Topic Added</option>
              <option value="MODIFIED_OBJECTIVES">Modified Learning Objectives</option>
              <option value="PRACTICAL_GUIDELINES">Practical Lab Guidelines</option>
              <option value="EVALUATION_CRITERIA_UPDATE">Evaluation & Grading Update</option>
              <option value="SYLLABUS_EXPANSION">Syllabus Expansion</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/60 text-xs text-slate-400">
          <span>Showing <strong>{filteredDiffs.length}</strong> of {diffs.length} audited subjects</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (expandedSubjectIds.size === filteredDiffs.length) {
                  setExpandedSubjectIds(new Set());
                } else {
                  setExpandedSubjectIds(new Set(filteredDiffs.map(d => d.subjectId)));
                }
              }}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              {expandedSubjectIds.size === filteredDiffs.length ? 'Collapse All' : 'Expand All Details'}
            </button>
          </div>
        </div>
      </div>

      {/* Changes List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 flex flex-col items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
            <p className="font-semibold text-sm text-slate-300">Loading Curriculum Changes Audit Ledger...</p>
            <p className="text-xs text-slate-500 mt-1">Comparing official gazette hashes and objective matrices</p>
          </div>
        ) : filteredDiffs.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
            <FileText className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-slate-300">No matching curriculum changes found</h3>
            <p className="text-xs text-slate-500 mt-1">Try broadening your search query or reset filters.</p>
          </div>
        ) : (
          filteredDiffs.map((diff) => {
            const isExpanded = expandedSubjectIds.has(diff.subjectId);
            const hasGranular = (diff.granularChanges && diff.granularChanges.length > 0);

            return (
              <div 
                key={diff.subjectId}
                className={`bg-slate-900 border transition-all rounded-3xl overflow-hidden shadow-lg ${
                  diff.changeType === 'realigned'
                    ? 'border-purple-500/30 hover:border-purple-500/50'
                    : diff.changeType === 'updated'
                    ? 'border-amber-500/30 hover:border-amber-500/50'
                    : diff.changeType === 'added'
                    ? 'border-blue-500/30 hover:border-blue-500/50'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header Row */}
                <div 
                  onClick={() => toggleSubjectExpand(diff.subjectId)}
                  className="p-5 sm:p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/40 hover:bg-slate-950/70 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                      diff.changeType === 'realigned'
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                        : diff.changeType === 'updated'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : diff.changeType === 'added'
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {diff.changeType === 'realigned' ? (
                        <Sparkles className="w-5 h-5" />
                      ) : diff.changeType === 'updated' ? (
                        <RefreshCw className="w-5 h-5" />
                      ) : diff.changeType === 'added' ? (
                        <Layers className="w-5 h-5" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-white tracking-tight">
                          {diff.subjectName}
                        </h3>
                        {diff.subjectCode && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            {diff.subjectCode}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                          diff.level === 'jss' 
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {diff.level === 'jss' ? 'Universal Basic (JSS)' : 'Senior Secondary (SSS)'}
                        </span>

                        {/* Status Badge */}
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                          diff.changeType === 'realigned'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : diff.changeType === 'updated'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : diff.changeType === 'added'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {diff.changeType === 'realigned' ? 'Exam Realigned' : diff.changeType === 'updated' ? 'Syllabus Updated' : diff.changeType === 'added' ? 'New Subject Added' : 'Verified Baseline'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                        {diff.details}
                      </p>
                    </div>
                  </div>

                  {/* Right: Metrics & Chevron */}
                  <div className="flex items-center gap-4 self-end md:self-center">
                    {hasGranular && (
                      <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {diff.granularChanges!.length} Specific Diff{diff.granularChanges!.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {diff.gazetteNoticeReference && (
                      <span className="hidden xl:inline-block text-[10px] font-mono text-slate-500">
                        {diff.gazetteNoticeReference}
                      </span>
                    )}
                    <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-white">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Detailed Comparison */}
                {isExpanded && (
                  <div className="p-6 border-t border-slate-800 bg-slate-900/90 space-y-4">
                    {/* Metadata summary bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-xs items-center">
                      <div>
                        <span className="text-slate-500 block">Affected Classes:</span>
                        <span className="font-semibold text-slate-200">
                          {diff.affectedGrades?.join(', ') || 'All Target Grades'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Fields Altered:</span>
                        <span className="font-semibold text-slate-200">
                          {diff.changedFields.length > 0 ? diff.changedFields.join(', ') : 'Standardized Validation Check'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Gazette Ref:</span>
                        <span className="font-mono text-slate-300 font-semibold">
                          {diff.gazetteNoticeReference || 'NERDC-STD-VERIFIED'}
                        </span>
                      </div>
                      <div className="flex sm:justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenImpactAnalysis(diff.subjectId, diff.subjectName, diff.affectedGrades?.[0] || 'SS 2');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-700/50 text-indigo-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                          title="Run Downstream Impact Analysis across textbooks, questions, and blueprints"
                        >
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Downstream Impact</span>
                        </button>
                      </div>
                    </div>

                    {/* Granular Changes Cards */}
                    {hasGranular ? (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                          <span>Specific Syllabic & Examination Objective Modifications:</span>
                          <span className="text-slate-500">Side-by-Side Version Comparison</span>
                        </div>

                        {diff.granularChanges!.map((item) => {
                          const isGranularOpen = expandedGranularId === item.id;

                          return (
                            <div 
                              key={item.id}
                              className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3"
                            >
                              <div 
                                onClick={() => setExpandedGranularId(isGranularOpen ? null : item.id)}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer"
                              >
                                <div className="flex items-center gap-2.5">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadgeColor(item.category)}`}>
                                    {getCategoryLabel(item.category)}
                                  </span>
                                  <h4 className="text-xs sm:text-sm font-bold text-white">
                                    {item.topicTitle}
                                  </h4>
                                </div>

                                <div className="flex items-center gap-2 text-xs">
                                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium">
                                    {item.grade} • {item.term}
                                  </span>
                                  <span className="text-slate-400">
                                    {isGranularOpen ? '▲ Hide Diff' : '▼ View Comparison'}
                                  </span>
                                </div>
                              </div>

                              <p className="text-xs text-slate-300 leading-relaxed">
                                {item.summary}
                              </p>

                              {isGranularOpen && (
                                <div className="pt-3 border-t border-slate-800/80 space-y-3 text-xs animate-fadeIn">
                                  {/* Side by side Previous vs New */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {item.previousContent && (
                                      <div className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-xl">
                                        <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[11px] mb-1">
                                          <span className="w-2 h-2 rounded-full bg-rose-400" />
                                          <span>Previous NERDC Baseline ({diff.previousVersionTag || '2024/2025'})</span>
                                        </div>
                                        <p className="text-slate-300 leading-relaxed">
                                          {item.previousContent}
                                        </p>
                                      </div>
                                    )}

                                    {item.updatedContent && (
                                      <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl">
                                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px] mb-1">
                                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                          <span>Updated NERDC Gazette ({diff.updatedVersionTag || '2025/2026'})</span>
                                        </div>
                                        <p className="text-slate-200 leading-relaxed">
                                          {item.updatedContent}
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Rationale and Exam Impact */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    {item.pedagogicalRationale && (
                                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                                        <span className="text-slate-400 font-semibold block text-[11px] mb-0.5">
                                          Pedagogical Rationale:
                                        </span>
                                        <span className="text-slate-300">
                                          {item.pedagogicalRationale}
                                        </span>
                                      </div>
                                    )}

                                    {item.waecExamImpact && (
                                      <div className="p-3 bg-purple-950/20 border border-purple-500/20 rounded-xl">
                                        <span className="text-purple-400 font-semibold block text-[11px] mb-0.5 flex items-center gap-1">
                                          <Award className="w-3.5 h-3.5" />
                                          <span>WAEC / NECO / BECE Impact:</span>
                                        </span>
                                        <span className="text-slate-300">
                                          {item.waecExamImpact}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Human Editorial Approval Action */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs">
                                    <span className="text-[11px] text-slate-500 font-medium">Human Editorial Governance:</span>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleApproveChange(item.id, 'APPROVED')}
                                        className="px-2.5 py-1 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-700/50 text-emerald-300 text-[11px] font-bold flex items-center gap-1 transition-all"
                                      >
                                        <Check className="w-3 h-3 text-emerald-400" />
                                        <span>Approve for Release</span>
                                      </button>
                                      <button
                                        onClick={() => handleApproveChange(item.id, 'REJECTED')}
                                        className="px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 border border-rose-700/50 text-rose-300 text-[11px] font-bold flex items-center gap-1 transition-all"
                                      >
                                        <X className="w-3 h-3 text-rose-400" />
                                        <span>Flag / Reject</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-950/40 rounded-2xl border border-slate-800 text-xs text-slate-400 flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        <div>
                          <span className="font-semibold text-slate-200 block">Baseline Verified Intact</span>
                          All core topics, performance objectives, and teaching guidelines conform to national curriculum standards without breaking revisions.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Annual Worker Config & Trigger Modal */}
      <NerdcAnnualWorkerModal
        isOpen={isWorkerModalOpen}
        onClose={() => {
          setIsWorkerModalOpen(false);
          fetchDiffs();
        }}
      />

      {/* Downstream Impact Analysis Modal */}
      {impactModalSubject && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scaleUp">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Downstream Curriculum Impact Analysis</span>
                    {impactReport && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        impactReport.severity === 'POTENTIALLY_OBSOLETE_CONTENT'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : impactReport.severity === 'MANDATORY_REVIEW'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : impactReport.severity === 'RECOMMENDED_REVIEW'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}>
                        {impactReport.severity.replace(/_/g, ' ')}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Target: <strong className="text-slate-200">{impactModalSubject.name}</strong> ({impactModalSubject.grade})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setImpactModalSubject(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {isLoadingImpact ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-400 mb-3" />
                  <p className="font-semibold text-slate-300">Auditing downstream textbooks, questions, and blueprints...</p>
                  <p className="text-[11px] text-slate-500 mt-1">Cross-referencing syllabus objectives with generated courseware</p>
                </div>
              ) : impactReport ? (
                <>
                  {/* Summary Banner */}
                  <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
                    <div className="font-bold text-slate-200">Analysis Summary:</div>
                    <p className="text-slate-300 leading-relaxed">
                      {impactReport.summary}
                    </p>
                  </div>

                  {/* Impact Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                      <div className="text-slate-400 font-semibold">Affected Textbooks</div>
                      <div className="text-xl font-black text-white mt-0.5">{impactReport.impactedTextbooks.length}</div>
                      <div className="text-[10px] text-slate-500">Retain bound version</div>
                    </div>
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                      <div className="text-slate-400 font-semibold">Affected Questions</div>
                      <div className="text-xl font-black text-white mt-0.5">{impactReport.impactedQuestions.totalCount}</div>
                      <div className="text-[10px] text-slate-500">In school question banks</div>
                    </div>
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                      <div className="text-slate-400 font-semibold">Exam Blueprints</div>
                      <div className="text-xl font-black text-white mt-0.5">{impactReport.impactedBlueprints.length}</div>
                      <div className="text-[10px] text-slate-500">WAEC / NECO templates</div>
                    </div>
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                      <div className="text-slate-400 font-semibold">Impacted Tenants</div>
                      <div className="text-xl font-black text-white mt-0.5">{impactReport.impactedTenants.length}</div>
                      <div className="text-[10px] text-slate-500">Active schools</div>
                    </div>
                  </div>

                  {/* Impacted Textbooks Section */}
                  <div>
                    <h4 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-400" />
                      <span>Impacted Generated Textbooks</span>
                    </h4>
                    <div className="space-y-2.5">
                      {impactReport.impactedTextbooks.map((tb) => (
                        <div key={tb.textbookId} className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="font-bold text-white">{tb.title}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Bound Source Version: <span className="font-mono text-emerald-400 font-semibold">{tb.boundCurriculumVersion}</span> (Never silently overwritten)
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 self-start sm:self-center">
                              {tb.affectedChapterCount} chapter(s) affected
                            </span>
                          </div>
                          <div className="mt-2 text-slate-300 text-[11px] leading-relaxed">
                            <strong className="text-slate-400">Remediation Guidance:</strong> {tb.remediationGuidance}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Remediation Checklist */}
                  <div>
                    <h4 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-400" />
                      <span>Required Remediation Actions</span>
                    </h4>
                    <ul className="space-y-1.5 p-3.5 bg-purple-950/10 border border-purple-500/20 rounded-2xl">
                      {impactReport.remediationChecklist.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-300 text-[11px]">
                          <span className="text-purple-400 font-bold mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-slate-500">No impact data available for this subject.</div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
              <button
                onClick={() => setImpactModalSubject(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Governed Versions Catalog Modal */}
      {isVersionsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scaleUp">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Governed Curriculum Version Releases</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Immutable version identifiers, cryptographic SHA-256 integrity digests, and authorized signatures
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsVersionsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {governedVersions.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <ShieldCheck className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                  <p className="text-slate-300 font-bold">No governed versions published yet</p>
                  <p className="text-slate-500 text-[11px] mt-1">Publish an editorial-approved version release to seed the catalog.</p>
                </div>
              ) : (
                governedVersions.map((v) => (
                  <div key={v.versionId} className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-black text-emerald-400">{v.versionId}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          v.status === 'PUBLISHED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {v.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Academic Year: <strong className="text-white">{v.academicYear}</strong> • Effective: {v.effectiveDate}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500">Subject / Level:</span>{' '}
                        <span className="font-semibold text-slate-200">{v.subjectName} ({v.classLevel.toUpperCase()})</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Approver:</span>{' '}
                        <span className="font-semibold text-slate-200">{v.approverName} ({v.approverRole})</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80">
                      <div className="text-[10px] text-slate-500 uppercase font-mono font-bold tracking-wider mb-0.5">
                        Canonical Integrity Digest (SHA-256)
                      </div>
                      <div className="font-mono text-[11px] text-emerald-300 break-all">
                        {v.canonicalSha256}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 italic">
                      "{v.changeSummary}"
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
              <button
                onClick={() => setIsVersionsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
              >
                Close Catalog
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
