import React, { useState, useMemo } from 'react';
import { UserProfile, ClassGrade } from '../types';
import { 
  Download, 
  FileText, 
  ShieldCheck, 
  Lock, 
  Globe, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Filter, 
  Key, 
  Database, 
  Code, 
  Copy, 
  Check, 
  Eye, 
  Calendar, 
  Building2, 
  Layers, 
  FileCheck2, 
  Share2, 
  Award,
  Clock,
  UserCheck
} from 'lucide-react';

export type ExportFormatType = 'pdf' | 'encrypted_json' | 'csv_dump' | 'html_embed' | 'signed_transcript';

export type PublishingStatus = 'draft' | 'pending_approval' | 'approved' | 'published' | 'revoked';

export interface ExportableDocumentItem {
  id: string;
  title: string;
  category: 'Curriculum Scheme' | 'Lesson Plan' | 'Assessment Paper' | 'Student Report' | 'Financial Record' | 'Database Backup';
  classGrade?: ClassGrade;
  subject?: string;
  format: ExportFormatType;
  fileSize: string;
  publishStatus: PublishingStatus;
  accessRestriction: 'public' | 'staff_only' | 'principal_only' | 'super_admin_only';
  watermarkEnabled: boolean;
  cryptographicHash: string;
  lastUpdated: string;
  author: string;
  downloadCount: number;
}

export interface ExportAuditLogEntry {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  documentTitle: string;
  format: string;
  ipHash: string;
  status: 'SUCCESS' | 'BLOCKED_PERMISSION' | 'WATERMARKED';
}

interface ExportGovernanceTabProps {
  currentUser: UserProfile;
}

export const ExportGovernanceTab: React.FC<ExportGovernanceTabProps> = ({ currentUser }) => {
  const [activeSubTab, setActiveSubTab] = useState<'documents' | 'web_publishing' | 'backups' | 'permissions' | 'audit_logs'>('documents');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRestriction, setSelectedRestriction] = useState<string>('all');
  
  // Interactive state for documents
  const [documents, setDocuments] = useState<ExportableDocumentItem[]>([
    {
      id: 'doc-1',
      title: 'NERDC Senior Secondary Mathematics Curriculum (SS 1-3)',
      category: 'Curriculum Scheme',
      subject: 'Mathematics',
      format: 'pdf',
      fileSize: '4.8 MB',
      publishStatus: 'published',
      accessRestriction: 'public',
      watermarkEnabled: true,
      cryptographicHash: 'sha256:8f9a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a',
      lastUpdated: '2025-02-15',
      author: 'NERDC Curriculum Department',
      downloadCount: 1420
    },
    {
      id: 'doc-2',
      title: 'WAEC SSCE May/June 2024 Past Questions & Solutions Vault',
      category: 'Assessment Paper',
      subject: 'All Subjects',
      format: 'pdf',
      fileSize: '12.4 MB',
      publishStatus: 'approved',
      accessRestriction: 'staff_only',
      watermarkEnabled: true,
      cryptographicHash: 'sha256:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a2b',
      lastUpdated: '2025-02-18',
      author: 'Dr. Evelyn Mensah (Exam Officer)',
      downloadCount: 385
    },
    {
      id: 'doc-3',
      title: 'Encrypted PostgreSQL Core Database Dump (Tenant Shard 01)',
      category: 'Database Backup',
      format: 'encrypted_json',
      fileSize: '48.2 MB',
      publishStatus: 'published',
      accessRestriction: 'super_admin_only',
      watermarkEnabled: false,
      cryptographicHash: 'sha256:9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e',
      lastUpdated: '2025-02-20',
      author: 'Infrastructure Daemon',
      downloadCount: 42
    },
    {
      id: 'doc-4',
      title: 'Term 2 Terminal Academic Broadsheet & Transcripts (SS 3)',
      category: 'Student Report',
      classGrade: 'SS 3',
      format: 'signed_transcript',
      fileSize: '6.1 MB',
      publishStatus: 'pending_approval',
      accessRestriction: 'principal_only',
      watermarkEnabled: true,
      cryptographicHash: 'sha256:5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a2b3c4d5e6f',
      lastUpdated: '2025-02-19',
      author: 'Vice Principal Academic',
      downloadCount: 18
    },
    {
      id: 'doc-5',
      title: 'School Fee Payment & Levy Ledger CSV Dump',
      category: 'Financial Record',
      format: 'csv_dump',
      fileSize: '1.9 MB',
      publishStatus: 'approved',
      accessRestriction: 'principal_only',
      watermarkEnabled: true,
      cryptographicHash: 'sha256:3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a2b3c4d',
      lastUpdated: '2025-02-20',
      author: 'Bursar Finance Office',
      downloadCount: 95
    }
  ]);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<ExportAuditLogEntry[]>([
    {
      id: 'log-1',
      timestamp: '2025-02-20 14:22:10',
      userName: currentUser.name,
      userRole: currentUser.role,
      documentTitle: 'NERDC Senior Secondary Mathematics Curriculum (SS 1-3)',
      format: 'PDF',
      ipHash: '197.210.54.12 (Verified NG)',
      status: 'WATERMARKED'
    },
    {
      id: 'log-2',
      timestamp: '2025-02-20 11:05:40',
      userName: 'Dr. Evelyn Mensah',
      userRole: 'exam_officer',
      documentTitle: 'WAEC SSCE May/June 2024 Past Questions & Solutions Vault',
      format: 'PDF',
      ipHash: '197.210.54.89 (Verified NG)',
      status: 'WATERMARKED'
    },
    {
      id: 'log-3',
      timestamp: '2025-02-19 16:40:15',
      userName: 'Alhaji Ibrahim Sani',
      userRole: 'super_admin',
      documentTitle: 'Encrypted PostgreSQL Core Database Dump (Tenant Shard 01)',
      format: 'AES-256-GCM Encrypted JSON',
      ipHash: '102.89.44.12 (Secure VPN)',
      status: 'SUCCESS'
    }
  ]);

  // Modal / notification states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [selectedDocForModal, setSelectedDocForModal] = useState<ExportableDocumentItem | null>(null);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [selectedDocForEmbed, setSelectedDocForEmbed] = useState<ExportableDocumentItem | null>(null);

  // Check role access
  const isSuperAdmin = currentUser.role === 'super_admin' || currentUser.isSystemRoot;
  const isPrincipalOrAdmin = isSuperAdmin || currentUser.role === 'principal' || currentUser.role === 'principal_admin';

  const handleDownload = (doc: ExportableDocumentItem) => {
    // Check permission
    if (doc.accessRestriction === 'super_admin_only' && !isSuperAdmin) {
      alert('Access Denied: This secure document requires Super Admin clearance.');
      return;
    }
    if (doc.accessRestriction === 'principal_only' && !isPrincipalOrAdmin) {
      alert('Access Denied: This document is restricted to Principal or Executive review.');
      return;
    }

    // Trigger simulated download & log
    setSuccessBanner(`Successfully generated and downloaded ${doc.title} (${doc.format.toUpperCase()}) with institutional watermark.`);
    setTimeout(() => setSuccessBanner(null), 5000);

    const newLog: ExportAuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userName: currentUser.name,
      userRole: currentUser.role,
      documentTitle: doc.title,
      format: doc.format.toUpperCase(),
      ipHash: '197.210.54.XX (Local Network)',
      status: doc.watermarkEnabled ? 'WATERMARKED' : 'SUCCESS'
    };
    setAuditLogs(prev => [newLog, ...prev]);

    // Update download count
    setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, downloadCount: d.downloadCount + 1 } : d));
  };

  const handleCopyEmbedCode = (doc: ExportableDocumentItem) => {
    const embedCode = `<iframe src="https://curriculumserver.com.ng/embed/document/${doc.id}?watermark=true" width="100%" height="600px" style="border:1px solid #e2e8f0; border-radius:8px;" title="${doc.title}"></iframe>`;
    navigator.clipboard.writeText(embedCode);
    setCopiedId(doc.id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const handlePublishStatusChange = (docId: string, newStatus: PublishingStatus) => {
    setDocuments(prev => prev.map(d => d.id === docId ? { ...d, publishStatus: newStatus } : d));
    setSuccessBanner(`Updated publishing status for document to: ${newStatus.replace('_', ' ').toUpperCase()}`);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      if (selectedCategory !== 'all' && doc.category !== selectedCategory) return false;
      if (selectedRestriction !== 'all' && doc.accessRestriction !== selectedRestriction) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return doc.title.toLowerCase().includes(q) || (doc.subject && doc.subject.toLowerCase().includes(q));
      }
      return true;
    });
  }, [documents, selectedCategory, selectedRestriction, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-8 shadow-xl border border-indigo-900/40">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-medium">
                Phase 11 Compliance & Distribution
              </span>
              <span className="text-xs text-slate-400">· Secure Publishing & Export Suite</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Export Governance & Web Publishing</h1>
            <p className="text-slate-300 max-w-2xl text-sm leading-relaxed">
              Manage approved web publishing endpoints, cryptographic institutional watermarks, secure document generation (PDF/JSON/CSV), and access-restricted database backups.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-3 rounded-xl border border-white/10">
            <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs text-slate-400 font-medium">Export Security Policy</div>
              <div className="text-sm font-bold text-white">AES-256 / SHA-256 Stamped</div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-6 py-4 rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium">{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-700 hover:text-emerald-900 text-sm font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Sub-Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveSubTab('documents')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === 'documents'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          Secure Document Center
        </button>
        <button
          onClick={() => setActiveSubTab('web_publishing')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === 'web_publishing'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Globe className="w-4 h-4" />
          Approved Web Publishing & Widgets
        </button>
        <button
          onClick={() => setActiveSubTab('backups')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === 'backups'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="w-4 h-4" />
          Encrypted Backups & Dumps
        </button>
        <button
          onClick={() => setActiveSubTab('permissions')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === 'permissions'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Lock className="w-4 h-4" />
          Access Restrictions & Roles
        </button>
        <button
          onClick={() => setActiveSubTab('audit_logs')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === 'audit_logs'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Export Audit Trail
        </button>
      </div>

      {/* SUB-TAB 1: SECURE DOCUMENT CENTER */}
      {activeSubTab === 'documents' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search documents by title or subject..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">All Categories</option>
                <option value="Curriculum Scheme">Curriculum Scheme</option>
                <option value="Assessment Paper">Assessment Paper</option>
                <option value="Student Report">Student Report</option>
                <option value="Financial Record">Financial Record</option>
                <option value="Database Backup">Database Backup</option>
              </select>
              <select
                value={selectedRestriction}
                onChange={e => setSelectedRestriction(e.target.value)}
                className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">All Access Levels</option>
                <option value="public">Publicly Available</option>
                <option value="staff_only">Staff Only</option>
                <option value="principal_only">Principal / Exec Only</option>
                <option value="super_admin_only">Super Admin Only</option>
              </select>
            </div>
          </div>

          {/* Documents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredDocuments.map(doc => {
              const isLocked = (doc.accessRestriction === 'super_admin_only' && !isSuperAdmin) ||
                               (doc.accessRestriction === 'principal_only' && !isPrincipalOrAdmin);

              return (
                <div key={doc.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                            {doc.category}
                          </span>
                          <span className="text-xs font-mono text-slate-500 uppercase tracking-wide">
                            {doc.format} · {doc.fileSize}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900">{doc.title}</h3>
                      </div>
                      {isLocked ? (
                        <span className="p-2 bg-rose-50 text-rose-600 rounded-lg shrink-0" title="Restricted Access">
                          <Lock className="w-5 h-5" />
                        </span>
                      ) : (
                        <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0" title="Accessible">
                          <CheckCircle2 className="w-5 h-5" />
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Publish Status:</span>
                        <span className={`font-medium px-2 py-0.5 rounded ${
                          doc.publishStatus === 'published' ? 'bg-emerald-100 text-emerald-800' :
                          doc.publishStatus === 'approved' ? 'bg-sky-100 text-sky-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {doc.publishStatus.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Access Policy:</span>
                        <span className="font-semibold text-slate-800 uppercase">{doc.accessRestriction.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Institutional Watermark:</span>
                        <span className="text-emerald-700 font-medium">{doc.watermarkEnabled ? 'Active (SHA-256 Stamped)' : 'None'}</span>
                      </div>
                      <div className="pt-1">
                        <span className="text-slate-400 font-mono text-[11px] truncate block" title={doc.cryptographicHash}>
                          Hash: {doc.cryptographicHash}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <Download className="w-3.5 h-3.5" />
                      <span className="tabular-nums font-medium">{doc.downloadCount}</span> downloads
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedDocForEmbed(doc);
                          setShowEmbedModal(true);
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Code className="w-3.5 h-3.5" /> Embed
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                          isLocked
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                        }`}
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: APPROVED WEB PUBLISHING */}
      {activeSubTab === 'web_publishing' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Approved Web Publishing & Iframe Widgets</h2>
              <p className="text-xs text-slate-500">
                Publish curriculum schemes, public timetables, and academic calendars to the school portal or external embeds.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100">
              <Globe className="w-4 h-4" /> Endpoint: https://curriculumserver.com.ng/embed/
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600 bg-slate-50">
                  <th className="p-3">Document Title</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Publish Status</th>
                  <th className="p-3">Author</th>
                  <th className="p-3">Actions & Workflow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {documents.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 font-medium text-slate-900 max-w-xs truncate" title={doc.title}>
                      {doc.title}
                    </td>
                    <td className="p-3 text-slate-600 text-xs">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700">{doc.category}</span>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        doc.publishStatus === 'published' ? 'bg-emerald-100 text-emerald-800' :
                        doc.publishStatus === 'approved' ? 'bg-sky-100 text-sky-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {doc.publishStatus.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-600">{doc.author}</td>
                    <td className="p-3 flex items-center gap-2">
                      <select
                        value={doc.publishStatus}
                        onChange={e => handlePublishStatusChange(doc.id, e.target.value as PublishingStatus)}
                        className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="draft">Draft</option>
                        <option value="pending_approval">Pending Approval</option>
                        <option value="approved">Approved</option>
                        <option value="published">Published</option>
                        <option value="revoked">Revoked</option>
                      </select>
                      <button
                        onClick={() => handleCopyEmbedCode(doc)}
                        className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 rounded flex items-center gap-1 transition-colors"
                        title="Copy Iframe Embed Snippet"
                      >
                        {copiedId === doc.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedId === doc.id ? 'Copied' : 'Embed'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: ENCRYPTED BACKUPS & DUMPS */}
      {activeSubTab === 'backups' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Encrypted Database & Records Backups</h2>
              <p className="text-xs text-slate-500">
                AES-256-GCM encrypted database dumps, curriculum vault snapshots, and attendance logs.
              </p>
            </div>
            {isSuperAdmin ? (
              <button
                onClick={() => {
                  setSuccessBanner('Initiated full AES-256 encrypted database snapshot and verified SHA-256 integrity checksum.');
                  setTimeout(() => setSuccessBanner(null), 5000);
                }}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
              >
                <Database className="w-4 h-4" /> Trigger New Encrypted Backup
              </button>
            ) : (
              <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <Lock className="w-4 h-4" /> Super Admin authorization required for backup triggers.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-indigo-600">Shard 01 Core DB</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">Encrypted</span>
              </div>
              <div className="text-sm font-bold text-slate-900">PostgreSQL 16.2 Full Snapshot</div>
              <p className="text-xs text-slate-500">Includes tenants, users, student records, and grading ledgers.</p>
              <div className="pt-2 text-xs font-mono text-slate-600">Size: 48.2 MB · SHA-256 Verified</div>
              <button
                onClick={() => handleDownload(documents[2])}
                className="w-full mt-2 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download Encrypted Dump
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-indigo-600">Curriculum Vault</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">Verified</span>
              </div>
              <div className="text-sm font-bold text-slate-900">NERDC & WAEC JSON Export</div>
              <p className="text-xs text-slate-500">Complete subject syllabi, topics, and verified past questions.</p>
              <div className="pt-2 text-xs font-mono text-slate-600">Size: 18.6 MB · SHA-256 Verified</div>
              <button
                onClick={() => handleDownload(documents[0])}
                className="w-full mt-2 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download Curriculum JSON
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-indigo-600">Financial Ledger</span>
                <span className="text-xs bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-medium">Audited</span>
              </div>
              <div className="text-sm font-bold text-slate-900">Term 2 Fee Payment CSV</div>
              <p className="text-xs text-slate-500">Student fee collection ledgers, PSP receipts, and installment logs.</p>
              <div className="pt-2 text-xs font-mono text-slate-600">Size: 1.9 MB · CSV Format</div>
              <button
                onClick={() => handleDownload(documents[4])}
                className="w-full mt-2 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download CSV Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: ACCESS RESTRICTIONS & ROLES */}
      {activeSubTab === 'permissions' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Role-Based Export Permissioning Matrix</h2>
            <p className="text-xs text-slate-500">
              Configure which administrative and faculty roles can export secure documents, financial dumps, or database snapshots.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600 bg-slate-50">
                  <th className="p-3">User Role</th>
                  <th className="p-3">Curriculum Schemes</th>
                  <th className="p-3">Assessment & Question Vault</th>
                  <th className="p-3">Student Transcripts & Reports</th>
                  <th className="p-3">Financial & Fee Dumps</th>
                  <th className="p-3">Database Backups</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 font-bold text-slate-900">Super Admin / System Root</td>
                  <td className="p-3 text-emerald-600 font-medium">Full Export</td>
                  <td className="p-3 text-emerald-600 font-medium">Full Export</td>
                  <td className="p-3 text-emerald-600 font-medium">Full Export</td>
                  <td className="p-3 text-emerald-600 font-medium">Full Export</td>
                  <td className="p-3 text-emerald-600 font-medium">Full Export</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 font-bold text-slate-900">Principal / Executive Admin</td>
                  <td className="p-3 text-emerald-600 font-medium">Full Export</td>
                  <td className="p-3 text-emerald-600 font-medium">Full Export</td>
                  <td className="p-3 text-emerald-600 font-medium">Full Export</td>
                  <td className="p-3 text-emerald-600 font-medium">Full Export</td>
                  <td className="p-3 text-rose-600 font-medium">Restricted</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 font-bold text-slate-900">Exam Officer / HOD</td>
                  <td className="p-3 text-emerald-600 font-medium">Full Export</td>
                  <td className="p-3 text-emerald-600 font-medium">Full Export</td>
                  <td className="p-3 text-amber-600 font-medium">View & Sign</td>
                  <td className="p-3 text-rose-600 font-medium">Restricted</td>
                  <td className="p-3 text-rose-600 font-medium">Restricted</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 font-bold text-slate-900">Subject Teacher</td>
                  <td className="p-3 text-emerald-600 font-medium">Export Lesson Plans</td>
                  <td className="p-3 text-sky-600 font-medium">Export Taught Items</td>
                  <td className="p-3 text-rose-600 font-medium">Restricted</td>
                  <td className="p-3 text-rose-600 font-medium">Restricted</td>
                  <td className="p-3 text-rose-600 font-medium">Restricted</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 font-bold text-slate-900">Student / Parent</td>
                  <td className="p-3 text-sky-600 font-medium">View Public Only</td>
                  <td className="p-3 text-rose-600 font-medium">Restricted</td>
                  <td className="p-3 text-sky-600 font-medium">Own Report Card Only</td>
                  <td className="p-3 text-rose-600 font-medium">Restricted</td>
                  <td className="p-3 text-rose-600 font-medium">Restricted</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: EXPORT AUDIT TRAIL */}
      {activeSubTab === 'audit_logs' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Export & Publishing Audit Trail</h2>
            <p className="text-xs text-slate-500">
              Cryptographically timestamped audit trail of all document downloads, backups, and web publishes.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600 bg-slate-50">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Document Title</th>
                  <th className="p-3">Format</th>
                  <th className="p-3">IP / Network Hash</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono text-xs text-slate-600">{log.timestamp}</td>
                    <td className="p-3 font-medium text-slate-900">{log.userName}</td>
                    <td className="p-3 text-xs text-slate-600 uppercase">{log.userRole.replace('_', ' ')}</td>
                    <td className="p-3 text-slate-800 max-w-xs truncate" title={log.documentTitle}>{log.documentTitle}</td>
                    <td className="p-3 font-mono text-xs text-indigo-600 font-semibold">{log.format}</td>
                    <td className="p-3 font-mono text-xs text-slate-500">{log.ipHash}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        log.status === 'WATERMARKED' ? 'bg-emerald-100 text-emerald-800' :
                        log.status === 'SUCCESS' ? 'bg-sky-100 text-sky-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Embed Code Modal / Preview */}
      {showEmbedModal && selectedDocForEmbed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Embed Widget Code</h3>
              <button
                onClick={() => setShowEmbedModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Copy and paste this HTML snippet into your school website or portal to embed <strong className="text-slate-900">{selectedDocForEmbed.title}</strong> with live synchronization.
            </p>
            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto select-all">
              {`<iframe src="https://curriculumserver.com.ng/embed/document/${selectedDocForEmbed.id}?watermark=true" width="100%" height="600px" style="border:1px solid #e2e8f0; border-radius:8px;" title="${selectedDocForEmbed.title}"></iframe>`}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowEmbedModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleCopyEmbedCode(selectedDocForEmbed);
                  setShowEmbedModal(false);
                }}
                className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Iframe Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
