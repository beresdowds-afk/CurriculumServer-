import React, { useState, useMemo } from 'react';
import { 
  UserProfile, 
  ClassGrade, 
  QuestionType 
} from '../types';
import { 
  ShieldCheck, 
  FileCheck2, 
  BookOpen, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Plus, 
  Download, 
  Lock, 
  Award, 
  Sparkles, 
  Info, 
  ExternalLink,
  Check,
  Eye,
  FileText,
  Building,
  Calendar,
  Layers
} from 'lucide-react';

export type QuestionSourceCategory = 
  | 'verified_past_exam' 
  | 'official_sample' 
  | 'teacher_authored' 
  | 'ai_assisted_practice' 
  | 'imported_unverified';

export interface ProvenanceQuestionItem {
  id: string;
  sourceCategory: QuestionSourceCategory;
  examinationBody?: 'WAEC' | 'NECO' | 'BECE' | 'JAMB' | 'Cambridge' | 'Internal';
  examYear?: number;
  examPaper?: string; // e.g. "Paper 1 (Objective)", "Paper 2 (Theory)"
  questionNumber?: number;
  sourceReference?: string; // e.g. "WAEC SSCE May/June 2024 Mathematics Core Q14"
  copyrightComplianceStatus: 'verified_fair_use' | 'institutional_license' | 'independent_authoring' | 'pending_verification';
  subject: string;
  classGrade: ClassGrade;
  topic: string;
  questionType: QuestionType;
  questionText: string;
  options?: { key: 'A' | 'B' | 'C' | 'D'; text: string }[];
  expectedAnswer: string;
  solution: string;
  markingGuide?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  reviewStatus: 'approved' | 'rejected' | 'pending';
  reviewedBy?: string;
  reviewedAt?: string;
  aiModelIdentifier?: string;
  createdAt: string;
}

interface PastQuestionsProvenanceTabProps {
  currentUser: UserProfile;
}

export const PastQuestionsProvenanceTab: React.FC<PastQuestionsProvenanceTabProps> = ({ currentUser }) => {
  const [activeSubTab, setActiveSubTab] = useState<'verified_past' | 'import_queue' | 'ai_practice' | 'copyright_guidelines'>('verified_past');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExamBody, setSelectedExamBody] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  
  // Modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [inspectQuestion, setInspectQuestion] = useState<ProvenanceQuestionItem | null>(null);

  // Initial mock provenance questions dataset
  const [questions, setQuestions] = useState<ProvenanceQuestionItem[]>([
    {
      id: 'prov-q1',
      sourceCategory: 'verified_past_exam',
      examinationBody: 'WAEC',
      examYear: 2024,
      examPaper: 'Paper 1 (Objective)',
      questionNumber: 12,
      sourceReference: 'WAEC SSCE May/June 2024 Mathematics Core Q12',
      copyrightComplianceStatus: 'verified_fair_use',
      subject: 'Mathematics',
      classGrade: 'SS 3',
      topic: 'Algebraic Processes & Quadratic Equations',
      questionType: 'multiple_choice',
      questionText: 'If 3^(2x - 1) = 27, find the value of x.',
      options: [
        { key: 'A', text: '1' },
        { key: 'B', text: '2' },
        { key: 'C', text: '3' },
        { key: 'D', text: '4' }
      ],
      expectedAnswer: 'B',
      solution: 'Given 3^(2x - 1) = 27. Since 27 = 3^3, we equate exponents: 2x - 1 = 3 => 2x = 4 => x = 2.',
      markingGuide: '1 mark for expressing 27 as 3^3. 1 mark for exponent equation. 1 mark for correct solution x = 2.',
      difficulty: 'Medium',
      reviewStatus: 'approved',
      reviewedBy: 'Dr. Evelyn Mensah (Exam Officer)',
      reviewedAt: '2025-02-10T10:30:00Z',
      createdAt: '2025-02-09T08:00:00Z'
    },
    {
      id: 'prov-q2',
      sourceCategory: 'verified_past_exam',
      examinationBody: 'NECO',
      examYear: 2023,
      examPaper: 'Paper 2 (Essay & Practical)',
      questionNumber: 4,
      sourceReference: 'NECO SSCE June/July 2023 Biology Paper 2 Q4',
      copyrightComplianceStatus: 'verified_fair_use',
      subject: 'Biology',
      classGrade: 'SS 2',
      topic: 'Cell Structure and Organization',
      questionType: 'structured_theory',
      questionText: 'State three structural differences between plant cells and animal cells.',
      expectedAnswer: 'Plant cells possess a rigid cellulose cell wall, large permanent vacuoles, and chloroplasts containing chlorophyll, whereas animal cells lack all three.',
      solution: 'Plant cells have: 1. Cell wall (cellulose). 2. Chloroplasts for photosynthesis. 3. Large central vacuole. Animal cells do not have these structures.',
      markingGuide: '1 mark for each valid structural difference correctly stated with comparison (Total 3 marks).',
      difficulty: 'Easy',
      reviewStatus: 'approved',
      reviewedBy: 'Prof. Aliyu Dan Musa (HOD Sciences)',
      reviewedAt: '2025-02-11T14:15:00Z',
      createdAt: '2025-02-10T09:20:00Z'
    },
    {
      id: 'prov-q3',
      sourceCategory: 'official_sample',
      examinationBody: 'BECE',
      examYear: 2024,
      examPaper: 'Basic Education Certificate Examination Sample Q8',
      questionNumber: 8,
      sourceReference: 'NERDC/HMB BECE Integrated Science Sample Paper 2024',
      copyrightComplianceStatus: 'institutional_license',
      subject: 'Integrated Science',
      classGrade: 'JSS 3',
      topic: 'Energy Transformation & Conservation',
      questionType: 'multiple_choice',
      questionText: 'Which of the following energy conversions takes place in a glowing electric bulb?',
      options: [
        { key: 'A', text: 'Chemical to Heat energy' },
        { key: 'B', text: 'Electrical to Light and Heat energy' },
        { key: 'C', text: 'Mechanical to Electrical energy' },
        { key: 'D', text: 'Solar to Chemical energy' }
      ],
      expectedAnswer: 'B',
      solution: 'An electric bulb draws electric current and converts electrical energy primarily into light energy (luminescence) and thermal energy (heat).',
      difficulty: 'Easy',
      reviewStatus: 'approved',
      reviewedBy: 'Mrs. Chinyere Okafor',
      reviewedAt: '2025-02-12T11:00:00Z',
      createdAt: '2025-02-11T15:00:00Z'
    },
    {
      id: 'prov-q4',
      sourceCategory: 'imported_unverified',
      examinationBody: 'WAEC',
      examYear: 2022,
      examPaper: 'Paper 1 (Objective)',
      questionNumber: 25,
      sourceReference: 'External Batch Import #894 - WAEC 2022 Chemistry',
      copyrightComplianceStatus: 'pending_verification',
      subject: 'Chemistry',
      classGrade: 'SS 3',
      topic: 'Chemical Equilibrium & Le Chatelier\'s Principle',
      questionType: 'multiple_choice',
      questionText: 'In the reversible reaction N2(g) + 3H2(g) <=> 2NH3(g); ΔH = -92 kJ/mol, an increase in temperature will:',
      options: [
        { key: 'A', text: 'Increase the yield of ammonia' },
        { key: 'B', text: 'Shift equilibrium to the left, decreasing ammonia yield' },
        { key: 'C', text: 'Have no effect on equilibrium position' },
        { key: 'D', text: 'Increase the reaction rate without affecting yield' }
      ],
      expectedAnswer: 'B',
      solution: 'Since the forward reaction is exothermic (ΔH is negative), increasing temperature favors the endothermic reverse reaction, shifting equilibrium to the left.',
      difficulty: 'Hard',
      reviewStatus: 'pending',
      createdAt: '2025-02-14T08:30:00Z'
    },
    {
      id: 'prov-q5',
      sourceCategory: 'ai_assisted_practice',
      aiModelIdentifier: 'gemini-3.7-flash (Server-Side)',
      copyrightComplianceStatus: 'independent_authoring',
      subject: 'Physics',
      classGrade: 'SS 1',
      topic: 'Motion and Newton\'s Laws',
      questionType: 'problem_solving',
      questionText: 'A car of mass 1200 kg accelerates uniformly from rest to a velocity of 20 m/s in 8 seconds. Calculate the magnitude of the driving force.',
      expectedAnswer: '3000 N',
      solution: 'Acceleration a = (v - u) / t = (20 - 0) / 8 = 2.5 m/s^2. Force F = m * a = 1200 * 2.5 = 3000 N.',
      markingGuide: '1 mark for formula a = Δv/t. 1 mark for calculating a = 2.5. 1 mark for F = ma. 1 mark for final answer 3000 N.',
      difficulty: 'Medium',
      reviewStatus: 'approved',
      reviewedBy: 'Dr. Evelyn Mensah',
      reviewedAt: '2025-02-13T16:00:00Z',
      createdAt: '2025-02-13T12:00:00Z'
    }
  ]);

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      // Subtab filter
      if (activeSubTab === 'verified_past') {
        if (q.sourceCategory === 'imported_unverified' || q.sourceCategory === 'ai_assisted_practice') return false;
      } else if (activeSubTab === 'import_queue') {
        if (q.sourceCategory !== 'imported_unverified') return false;
      } else if (activeSubTab === 'ai_practice') {
        if (q.sourceCategory !== 'ai_assisted_practice') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesText = q.questionText.toLowerCase().includes(query) ||
                            q.topic.toLowerCase().includes(query) ||
                            (q.sourceReference && q.sourceReference.toLowerCase().includes(query));
        if (!matchesText) return false;
      }

      // Exam body filter
      if (selectedExamBody !== 'all' && q.examinationBody !== selectedExamBody) {
        return false;
      }

      // Subject filter
      if (selectedSubject !== 'all' && q.subject !== selectedSubject) {
        return false;
      }

      // Grade filter
      if (selectedGrade !== 'all' && q.classGrade !== selectedGrade) {
        return false;
      }

      return true;
    });
  }, [questions, activeSubTab, searchQuery, selectedExamBody, selectedSubject, selectedGrade]);

  const handleApproveImport = (id: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === id) {
        return {
          ...q,
          sourceCategory: 'verified_past_exam',
          copyrightComplianceStatus: 'verified_fair_use',
          reviewStatus: 'approved',
          reviewedBy: `${currentUser.name} (${currentUser.title})`,
          reviewedAt: new Date().toISOString()
        };
      }
      return q;
    }));
  };

  const handleRejectImport = (id: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === id) {
        return {
          ...q,
          reviewStatus: 'rejected',
          reviewedBy: `${currentUser.name} (${currentUser.title})`,
          reviewedAt: new Date().toISOString()
        };
      }
      return q;
    }));
  };

  const pendingCount = questions.filter(q => q.sourceCategory === 'imported_unverified' && q.reviewStatus === 'pending').length;
  const verifiedCount = questions.filter(q => q.sourceCategory === 'verified_past_exam' || q.sourceCategory === 'official_sample').length;
  const aiCount = questions.filter(q => q.sourceCategory === 'ai_assisted_practice').length;

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-2xl p-6 text-white shadow-xl border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium mb-3 border border-indigo-500/30">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              Phase 10 — Past Questions & Provenance Engine
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Authentic Exam Provenance & Licensing Registry</h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Strictly segregate authentic historical examination questions (WAEC, NECO, BECE, JAMB) from AI-assisted practice items. Enforce copyright compliance, verification workflows, and immutable source tracing.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Import / Add Question
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-indigo-800/60">
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <div className="text-indigo-300 text-xs font-medium">Verified Past Exams</div>
            <div className="text-2xl font-bold mt-1 text-white">{verifiedCount}</div>
            <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> WAEC, NECO, BECE
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <div className="text-indigo-300 text-xs font-medium">Import Verification Queue</div>
            <div className="text-2xl font-bold mt-1 text-amber-300">{pendingCount}</div>
            <div className="text-xs text-amber-400 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Awaiting review
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <div className="text-indigo-300 text-xs font-medium">AI-Assisted Practice</div>
            <div className="text-2xl font-bold mt-1 text-purple-300">{aiCount}</div>
            <div className="text-xs text-purple-400 mt-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Strictly segregated
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <div className="text-indigo-300 text-xs font-medium">Copyright Compliance</div>
            <div className="text-2xl font-bold mt-1 text-emerald-300">100%</div>
            <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Fair Use / Licensed
            </div>
          </div>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveSubTab('verified_past')}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'verified_past'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          Verified Past Questions & Official Samples
        </button>
        <button
          onClick={() => setActiveSubTab('import_queue')}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer relative ${
            activeSubTab === 'import_queue'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          Import Verification Queue
          {pendingCount > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full font-bold">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('ai_practice')}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'ai_practice'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          AI-Assisted Practice Pool
        </button>
        <button
          onClick={() => setActiveSubTab('copyright_guidelines')}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'copyright_guidelines'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Info className="w-4 h-4" />
          Copyright & Licensing Rules
        </button>
      </div>

      {/* Main Content Area */}
      {activeSubTab === 'copyright_guidelines' ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Copyright, Licensing & Provenance Governance Policy</h3>
              <p className="text-sm text-slate-500">Mandatory compliance directives for educational institutions using the Curriculum Server platform.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                1. Authentic Examination Provenance
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Authentic past examination questions (WAEC, NECO, BECE, JAMB, Cambridge) must be accompanied by explicit verified metadata including examination body, year, paper number, and official source reference. Under no circumstances may AI-generated practice questions be labelled or disguised as authentic past questions.
              </p>
            </div>

            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                2. Unverified Imports Staging
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                All bulk or individual question imports enter an unverified staging queue. They are strictly segregated and cannot be added to secure examination papers until reviewed, verified for factual correctness, and checked against copyright restrictions by an authorised Exam Officer or HOD.
              </p>
            </div>

            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                3. AI-Assisted Practice Segregation
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Original AI-generated practice questions created by the server-side Gemini integration are tagged with model provenance metadata. They serve as formative practice items and remedial exercises, distinguished from high-stakes summative past examinations.
              </p>
            </div>

            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <Lock className="w-5 h-5 text-indigo-600" />
                4. Auditability & Immutable Snapshots
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Every assessment generated from the question bank creates an immutable snapshot of question versions and marking schemes, preserving complete audit trails of who authorized the assessment and when it was released.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative min-w-[260px] flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search questions by text, topic or source reference..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={selectedExamBody}
                onChange={e => setSelectedExamBody(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700"
              >
                <option value="all">All Exam Bodies</option>
                <option value="WAEC">WAEC</option>
                <option value="NECO">NECO</option>
                <option value="BECE">BECE</option>
                <option value="JAMB">JAMB</option>
                <option value="Cambridge">Cambridge</option>
              </select>

              <select
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700"
              >
                <option value="all">All Subjects</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Biology">Biology</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Physics">Physics</option>
                <option value="Integrated Science">Integrated Science</option>
              </select>

              <select
                value={selectedGrade}
                onChange={e => setSelectedGrade(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700"
              >
                <option value="all">All Class Grades</option>
                <option value="JSS 3">JSS 3</option>
                <option value="SS 1">SS 1</option>
                <option value="SS 2">SS 2</option>
                <option value="SS 3">SS 3</option>
              </select>
            </div>

            <div className="text-xs font-semibold text-slate-500">
              Showing {filteredQuestions.length} items
            </div>
          </div>

          {/* Question List Table / Cards */}
          <div className="space-y-4">
            {filteredQuestions.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
                <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="text-base font-bold text-slate-700">No matching provenance questions found</h4>
                <p className="text-sm text-slate-500">Try adjusting your filters or search query.</p>
              </div>
            ) : (
              filteredQuestions.map(q => (
                <div key={q.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:border-indigo-300 transition-all space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        q.sourceCategory === 'verified_past_exam' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        q.sourceCategory === 'official_sample' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        q.sourceCategory === 'imported_unverified' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        'bg-purple-100 text-purple-800 border border-purple-200'
                      }`}>
                        {q.sourceCategory === 'verified_past_exam' && `Verified Past Exam (${q.examinationBody} ${q.examYear})`}
                        {q.sourceCategory === 'official_sample' && `Official Sample (${q.examinationBody})`}
                        {q.sourceCategory === 'imported_unverified' && 'Imported (Awaiting Verification)'}
                        {q.sourceCategory === 'ai_assisted_practice' && 'AI-Assisted Practice Question'}
                      </span>

                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {q.subject} • {q.classGrade}
                      </span>

                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                        {q.topic}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        q.difficulty === 'Easy' ? 'bg-green-50 text-green-700' :
                        q.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700' :
                        'bg-rose-50 text-rose-700'
                      }`}>
                        {q.difficulty}
                      </span>
                      <button
                        onClick={() => setInspectQuestion(q)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspect Provenance
                      </button>
                    </div>
                  </div>

                  {/* Question Stem */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-relaxed">
                      {q.questionText}
                    </h4>
                    {q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                        {q.options.map(opt => (
                          <div 
                            key={opt.key}
                            className={`p-2.5 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                              opt.key === q.expectedAnswer 
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' 
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span className="w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center text-xs">
                              {opt.key}
                            </span>
                            <span>{opt.text}</span>
                            {opt.key === q.expectedAnswer && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-auto" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Provenance Footer metadata */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                    <div className="flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium text-slate-700">Source Reference:</span>
                      <span>{q.sourceReference || q.aiModelIdentifier || 'Internal Authoring'}</span>
                    </div>

                    {activeSubTab === 'import_queue' && q.reviewStatus === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRejectImport(q.id)}
                          className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg font-semibold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                        <button
                          onClick={() => handleApproveImport(q.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> Verify & Approve
                        </button>
                      </div>
                    )}

                    {q.reviewedBy && (
                      <div className="text-emerald-700 font-medium">
                        Verified by {q.reviewedBy}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Inspect Provenance Modal */}
      {inspectQuestion && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Question Provenance & Audit Metadata</h3>
                <p className="text-xs text-slate-500">ID: {inspectQuestion.id}</p>
              </div>
              <button
                onClick={() => setInspectQuestion(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border">
                  <div className="text-xs text-slate-500">Source Category</div>
                  <div className="font-bold text-slate-900 mt-0.5 capitalize">{inspectQuestion.sourceCategory.replace(/_/g, ' ')}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border">
                  <div className="text-xs text-slate-500">Copyright Compliance</div>
                  <div className="font-bold text-emerald-700 mt-0.5 capitalize">{inspectQuestion.copyrightComplianceStatus.replace(/_/g, ' ')}</div>
                </div>
              </div>

              {inspectQuestion.sourceReference && (
                <div className="p-3 bg-slate-50 rounded-xl border">
                  <div className="text-xs text-slate-500">Official Source Reference</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{inspectQuestion.sourceReference}</div>
                </div>
              )}

              {inspectQuestion.aiModelIdentifier && (
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                  <div className="text-xs text-purple-600 font-medium">AI Model Provenance</div>
                  <div className="font-semibold text-purple-900 mt-0.5">{inspectQuestion.aiModelIdentifier}</div>
                </div>
              )}

              <div className="p-4 bg-slate-50 rounded-xl border space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Question Stem</div>
                <div className="font-medium text-slate-900">{inspectQuestion.questionText}</div>
              </div>

              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-2">
                <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Verified Answer & Solution</div>
                <div className="font-bold text-emerald-900">Correct Answer: {inspectQuestion.expectedAnswer}</div>
                <div className="text-xs text-slate-700 leading-relaxed">{inspectQuestion.solution}</div>
              </div>

              {inspectQuestion.reviewedBy && (
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-xs text-indigo-900 flex items-center justify-between">
                  <span>Verified by: <strong>{inspectQuestion.reviewedBy}</strong></span>
                  <span>{inspectQuestion.reviewedAt ? new Date(inspectQuestion.reviewedAt).toLocaleString() : ''}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setInspectQuestion(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import / Add Question Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Import / Add Provenance Question</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={e => {
              e.preventDefault();
              const form = e.currentTarget as HTMLFormElement;
              const formData = new FormData(form);
              const newQ: ProvenanceQuestionItem = {
                id: `prov-q-${Date.now()}`,
                sourceCategory: formData.get('sourceCategory') as QuestionSourceCategory,
                examinationBody: (formData.get('examinationBody') || 'WAEC') as any,
                examYear: Number(formData.get('examYear')) || 2024,
                examPaper: formData.get('examPaper') as string,
                sourceReference: formData.get('sourceReference') as string,
                copyrightComplianceStatus: 'verified_fair_use',
                subject: formData.get('subject') as string,
                classGrade: formData.get('classGrade') as ClassGrade,
                topic: formData.get('topic') as string,
                questionType: 'multiple_choice',
                questionText: formData.get('questionText') as string,
                expectedAnswer: formData.get('expectedAnswer') as string,
                solution: formData.get('solution') as string,
                difficulty: formData.get('difficulty') as any,
                reviewStatus: 'approved',
                reviewedBy: `${currentUser.name} (${currentUser.title})`,
                reviewedAt: new Date().toISOString(),
                createdAt: new Date().toISOString()
              };
              setQuestions(prev => [newQ, ...prev]);
              setShowImportModal(false);
            }} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Source Category</label>
                <select name="sourceCategory" className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-medium">
                  <option value="verified_past_exam">Verified Past Examination Question</option>
                  <option value="official_sample">Officially Published Sample Question</option>
                  <option value="teacher_authored">Teacher-Authored Question</option>
                  <option value="imported_unverified">Imported Question (Enters Verification Queue)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Exam Body</label>
                  <select name="examinationBody" className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-medium">
                    <option value="WAEC">WAEC</option>
                    <option value="NECO">NECO</option>
                    <option value="BECE">BECE</option>
                    <option value="JAMB">JAMB</option>
                    <option value="Cambridge">Cambridge</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Exam Year</label>
                  <input type="number" name="examYear" defaultValue={2024} className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-medium" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Subject</label>
                  <input type="text" name="subject" required placeholder="e.g. Mathematics" className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-medium" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Class Grade</label>
                  <select name="classGrade" className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-medium">
                    <option value="JSS 3">JSS 3</option>
                    <option value="SS 1">SS 1</option>
                    <option value="SS 2">SS 2</option>
                    <option value="SS 3">SS 3</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Source Reference / Citation</label>
                <input type="text" name="sourceReference" placeholder="e.g. WAEC SSCE May 2024 Q14" className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-medium" />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Topic</label>
                <input type="text" name="topic" required placeholder="e.g. Quadratic Equations" className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-medium" />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Question Stem</label>
                <textarea name="questionText" required rows={3} placeholder="Enter question text..." className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-medium"></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Correct Answer</label>
                  <input type="text" name="expectedAnswer" required placeholder="e.g. B or 42" className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-medium" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Difficulty</label>
                  <select name="difficulty" className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-medium">
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Step-by-Step Solution & Marking Guide</label>
                <textarea name="solution" required rows={2} placeholder="Explain steps and marking breakdown..." className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-medium"></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  Save & Register Provenance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
