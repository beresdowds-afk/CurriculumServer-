import { Textbook, QuestionItem, AssessmentBlueprint, CurriculumCoverageManifest, GenerationJob } from '../types/textbookAndQuestionBank';
import { NERDC_SUBJECTS_DATABASE } from '../data/nerdcDatabase';
import { ClassGrade } from '../types';

// In-Memory Persistence Store for Phase 2 Data Foundation
class TextbookQuestionBankService {
  private static instance: TextbookQuestionBankService;

  private textbooks: Map<string, Textbook> = new Map();
  private questions: Map<string, QuestionItem> = new Map();
  private blueprints: Map<string, AssessmentBlueprint> = new Map();
  private jobs: Map<string, GenerationJob> = new Map();
  private coverageManifests: Map<string, CurriculumCoverageManifest> = new Map();

  private constructor() {
    this.seedInitialData();
  }

  public static getInstance(): TextbookQuestionBankService {
    if (!TextbookQuestionBankService.instance) {
      TextbookQuestionBankService.instance = new TextbookQuestionBankService();
    }
    return TextbookQuestionBankService.instance;
  }

  private seedInitialData() {
    // Seed sample textbook for Mathematics JSS 1
    const mathSub = NERDC_SUBJECTS_DATABASE.find(s => s.code === 'MTH' && s.level === 'jss');
    if (mathSub) {
      const tbId = 'tb-jss1-math-v1';
      const sampleTextbook: Textbook = {
        id: tbId,
        subjectId: mathSub.id,
        subjectName: mathSub.name,
        classGrade: 'JSS 1',
        curriculumVersionId: 'NERDC-9YEAR-BASIC-2024',
        title: 'NERDC Authoritative Mathematics for Junior Secondary School 1',
        author: 'Curriculum Server Editorial Board',
        description: 'Complete curriculum-aligned textbook for JSS 1 Mathematics covering Numbers, Numeration, Basic Operations, and Geometry.',
        status: 'published',
        version: '1.0.0',
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        chapters: [
          {
            id: 'ch-1',
            textbookId: tbId,
            chapterNumber: 1,
            title: 'Whole Numbers and Place Value',
            summary: 'Understanding large numbers, place value up to billions, and Roman numerals.',
            learningObjectives: [
              'Identify place value of digits up to 1,000,000,000',
              'Read and write Nigerian currency and large numerals in words and digits',
              'Convert between Arabic and Roman numerals up to C'
            ],
            status: 'published',
            sections: [
              {
                id: 'sec-1-1',
                chapterId: 'ch-1',
                sectionNumber: 1,
                title: 'Place Value and Expansion of Large Numbers',
                contentMarkdown: 'In the Nigerian numbering system, place value determines the exact magnitude of digits...',
                examples: [
                  { title: 'Example 1', problem: 'Expand 48,256,314 in place value form', solution: '4,000,000 + 800,000 + 20,000 + 5,000 + 300 + 10 + 4' }
                ],
                workedSolutions: ['Step 1: Identify units, tens, hundreds, thousands...', 'Step 2: Multiply each digit by its positional value.'],
                keyVocabulary: [{ term: 'Place Value', definition: 'The value of a digit based on its position in a number.' }],
                commonMisconceptions: ['Confusing thousands with ten-thousands.'],
                reviewStatus: 'approved',
                reviewerNotes: 'Verified against NERDC JSS1 Mathematics curriculum objectives.',
                lastUpdated: new Date().toISOString()
              }
            ]
          }
        ],
        approvalHistory: [
          {
            id: 'app-1',
            timestamp: new Date(Date.now() - 25 * 86400000).toISOString(),
            userId: 'usr-admin-01',
            userName: 'Dr. Mustapha',
            role: 'principal',
            action: 'approved',
            notes: 'Approved for institutional deployment across JSS1 classes.'
          }
        ]
      };
      this.textbooks.set(tbId, sampleTextbook);
      this.updateCoverageManifest(sampleTextbook);
    }

    // Seed sample question items
    const sampleQuestion: QuestionItem = {
      id: 'QB-MTH-JSS1-001',
      subjectId: mathSub?.id || 'sub-math',
      classGrade: 'JSS 1',
      curriculumVersionId: 'NERDC-9YEAR-BASIC-2024',
      topicId: 'top-whole-numbers',
      learningObjectiveIds: ['obj-01'],
      questionType: 'objective',
      stem: 'What is the place value of 7 in the number 4,723,518?',
      options: [
        { key: 'A', text: 'Ten thousands' },
        { key: 'B', text: 'Hundred thousands' },
        { key: 'C', text: 'Millions' },
        { key: 'D', text: 'Thousands' }
      ],
      correctAnswer: 'B',
      explanation: 'In 4,723,518, the digit 7 occupies the hundred-thousands position (700,000).',
      marks: 2,
      difficulty: 'Easy',
      cognitiveDemand: 'Knowledge',
      sourceType: 'teacher_authored',
      sourceReference: 'Curriculum Server Question Bank Item #1',
      version: 1,
      creationMethod: 'manual',
      reviewStatus: 'approved',
      reviewerId: 'usr-admin-01',
      approvalTimestamp: new Date().toISOString(),
      exposureCount: 14,
      createdAt: new Date().toISOString()
    };
    this.questions.set(sampleQuestion.id, sampleQuestion);
  }

  // --- Textbook Operations ---
  public getTextbooks(classGrade?: ClassGrade, subjectId?: string): Textbook[] {
    let result = Array.from(this.textbooks.values());
    if (classGrade && classGrade !== ('all' as any)) {
      result = result.filter(t => t.classGrade === classGrade);
    }
    if (subjectId) {
      result = result.filter(t => t.subjectId === subjectId);
    }
    return result;
  }

  public getTextbookById(id: string): Textbook | undefined {
    return this.textbooks.get(id);
  }

  public saveTextbook(textbook: Textbook): Textbook {
    this.textbooks.set(textbook.id, textbook);
    this.updateCoverageManifest(textbook);
    return textbook;
  }

  // --- Curriculum Coverage Manifest ---
  private updateCoverageManifest(textbook: Textbook) {
    const subject = NERDC_SUBJECTS_DATABASE.find(s => s.id === textbook.subjectId);
    const totalTopics = subject ? subject.themes.reduce((sum, th) => sum + th.topics.length, 0) : 12;
    const totalObjs = totalTopics * 3; // Approx 3 objectives per topic

    const manifest: CurriculumCoverageManifest = {
      textbookId: textbook.id,
      subjectId: textbook.subjectId,
      classGrade: textbook.classGrade,
      curriculumVersionId: textbook.curriculumVersionId,
      totalRequiredTopics: totalTopics,
      topicsIncludedInOutline: textbook.chapters.length * 3,
      topicsCoveredBySections: textbook.chapters.reduce((sum, ch) => sum + ch.sections.length, 0),
      totalLearningObjectives: totalObjs,
      objectivesMappedToContent: textbook.chapters.reduce((sum, ch) => sum + ch.learningObjectives.length, 0),
      objectivesSupportedByQuestionBank: Array.from(this.questions.values()).filter(q => q.subjectId === textbook.subjectId).length,
      coveragePercentage: Math.min(100, Math.round((textbook.chapters.length / Math.max(1, totalTopics)) * 100)),
      missingRequirements: textbook.chapters.length < 5 ? ['Advanced application themes pending generation'] : [],
      sectionsAwaitingReview: textbook.chapters.flatMap(ch => ch.sections).filter(s => s.reviewStatus === 'pending').length,
      questionsAwaitingValidation: Array.from(this.questions.values()).filter(q => q.reviewStatus === 'pending_review').length,
      approvedContentCount: textbook.chapters.flatMap(ch => ch.sections).filter(s => s.reviewStatus === 'approved').length,
      rejectedContentCount: textbook.chapters.flatMap(ch => ch.sections).filter(s => s.reviewStatus === 'rejected').length,
      lastEvaluatedAt: new Date().toISOString()
    };

    this.coverageManifests.set(textbook.id, manifest);
  }

  public getCoverageManifest(textbookId: string): CurriculumCoverageManifest | undefined {
    return this.coverageManifests.get(textbookId);
  }

  // --- Question Bank Operations ---
  public getQuestions(filter?: { subjectId?: string; classGrade?: ClassGrade; questionType?: string; reviewStatus?: string }): QuestionItem[] {
    let list = Array.from(this.questions.values());
    if (filter?.subjectId) list = list.filter(q => q.subjectId === filter.subjectId);
    if (filter?.classGrade && filter.classGrade !== ('all' as any)) list = list.filter(q => q.classGrade === filter.classGrade);
    if (filter?.questionType && filter.questionType !== 'all') list = list.filter(q => q.questionType === filter.questionType);
    if (filter?.reviewStatus && filter.reviewStatus !== 'all') list = list.filter(q => q.reviewStatus === filter.reviewStatus);
    return list;
  }

  public saveQuestion(question: QuestionItem): QuestionItem {
    this.questions.set(question.id, question);
    return question;
  }

  public deleteQuestion(id: string): boolean {
    return this.questions.delete(id);
  }

  // --- Assessment Blueprints ---
  public getBlueprints(): AssessmentBlueprint[] {
    return Array.from(this.blueprints.values());
  }

  public saveBlueprint(bp: AssessmentBlueprint): AssessmentBlueprint {
    this.blueprints.set(bp.id, bp);
    return bp;
  }

  // --- Generation Jobs ---
  public getJobs(): GenerationJob[] {
    return Array.from(this.jobs.values());
  }

  public createJob(job: GenerationJob): GenerationJob {
    this.jobs.set(job.id, job);
    return job;
  }

  public updateJobStatus(id: string, status: GenerationJob['status'], progress: number, currentStep: string, error?: string): GenerationJob | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    job.status = status;
    job.progressPercent = progress;
    job.currentStep = currentStep;
    if (error) job.errorDetails = error;
    job.updatedAt = new Date().toISOString();
    this.jobs.set(id, job);
    return job;
  }

  // --- Phase 5: Past Question Seeding & Review Workflows ---
  public seedPastQuestions(): QuestionItem[] {
    const seeded: QuestionItem[] = [
      {
        id: 'QB-WAEC-MTH-2023-01',
        subjectId: 'sub-math',
        classGrade: 'SS 3',
        curriculumVersionId: 'NERDC-SSS-2024',
        topicId: 'top-indices-logarithms',
        learningObjectiveIds: ['obj-log-1'],
        questionType: 'objective',
        stem: 'Simplify (log10 8 / log10 2) without using mathematical tables.',
        options: [
          { key: 'A', text: '1' },
          { key: 'B', text: '2' },
          { key: 'C', text: '3' },
          { key: 'D', text: '4' }
        ],
        correctAnswer: 'C',
        explanation: 'log10 8 = log10 (2^3) = 3 log10 2. Thus (3 log10 2) / log10 2 = 3.',
        marks: 2,
        difficulty: 'Medium',
        cognitiveDemand: 'Application',
        sourceType: 'verified_past_question',
        sourceReference: 'WAEC May/June 2023 General Mathematics Paper 1, Question 14',
        version: 1,
        creationMethod: 'imported',
        reviewStatus: 'approved',
        reviewerId: 'usr-admin-01',
        approvalTimestamp: new Date().toISOString(),
        exposureCount: 240,
        createdAt: new Date().toISOString()
      },
      {
        id: 'QB-WAEC-CHE-2022-04',
        subjectId: 'sub-chem',
        classGrade: 'SS 2',
        curriculumVersionId: 'NERDC-SSS-2024',
        topicId: 'top-electrolysis',
        learningObjectiveIds: ['obj-elect-1'],
        questionType: 'objective',
        stem: 'During the electrolysis of acidified water using platinum electrodes, the gas produced at the anode is:',
        options: [
          { key: 'A', text: 'Hydrogen' },
          { key: 'B', text: 'Oxygen' },
          { key: 'C', text: 'Chlorine' },
          { key: 'D', text: 'Sulphur (IV) oxide' }
        ],
        correctAnswer: 'B',
        explanation: 'At the anode (positive electrode), OH- ions are discharged in preference to SO4 2-, yielding oxygen gas and water.',
        marks: 2,
        difficulty: 'Medium',
        cognitiveDemand: 'Comprehension',
        sourceType: 'verified_past_question',
        sourceReference: 'WAEC 2022 Chemistry Paper 1, Question 8',
        version: 1,
        creationMethod: 'imported',
        reviewStatus: 'approved',
        reviewerId: 'usr-admin-01',
        approvalTimestamp: new Date().toISOString(),
        exposureCount: 185,
        createdAt: new Date().toISOString()
      }
    ];

    for (const q of seeded) {
      if (!this.questions.has(q.id)) {
        this.questions.set(q.id, q);
      }
    }
    return Array.from(this.questions.values());
  }

  public updateQuestionReviewStatus(id: string, reviewStatus: QuestionItem['reviewStatus'], reviewerId?: string): QuestionItem | undefined {
    const q = this.questions.get(id);
    if (!q) return undefined;
    q.reviewStatus = reviewStatus;
    if (reviewerId) q.reviewerId = reviewerId;
    if (reviewStatus === 'approved') q.approvalTimestamp = new Date().toISOString();
    this.questions.set(id, q);
    return q;
  }
}

export const textbookDb = TextbookQuestionBankService.getInstance();
