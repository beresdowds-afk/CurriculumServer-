import { jsPDF } from 'jspdf';
import { SecureExaminationPaper, SecureMarkingScheme } from '../types';

export interface ExamPdfOptions {
  schoolName?: string;
  schoolAddress?: string;
  schoolMotto?: string;
  schoolLogoBase64?: string;
  schoolLogoType?: 'crest' | 'shield' | 'custom' | 'academic';
  centerNumber?: string;
  academicSession?: string;
  includeOmrSheet?: boolean;
  includeMarkingScheme?: boolean;
  paperVariant?: 'A' | 'B' | 'C' | 'D';
  principalName?: string;
  subjectTeacherName?: string;
  examinerName?: string;
}

/**
 * Draws high-resolution vector school crest or embeds custom logo
 */
function drawSchoolCrest(
  doc: jsPDF,
  x: number,
  y: number,
  size: number = 18,
  _type: string = 'crest',
  customBase64?: string
) {
  if (customBase64 && customBase64.startsWith('data:image')) {
    try {
      const format = customBase64.includes('jpeg') || customBase64.includes('jpg') ? 'JPEG' : 'PNG';
      doc.addImage(customBase64, format, x, y, size, size);
      return;
    } catch (e) {
      console.warn('Could not render custom logo image, falling back to vector crest', e);
    }
  }

  // Draw vector educational crest
  doc.setFillColor(30, 58, 138); // Royal Navy #1e3a8a
  doc.setDrawColor(217, 119, 6);  // Amber Gold #d97706
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, size, size * 1.18, 2, 2, 'FD');

  // Inner border
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.3);
  doc.roundedRect(x + 1, y + 1, size - 2, (size * 1.18) - 2, 1.5, 1.5, 'S');

  // Top banner
  doc.setFillColor(217, 119, 6);
  doc.rect(x + 2, y + 2, size - 4, 3.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.5);
  doc.setTextColor(255, 255, 255);
  doc.text('OFFICIAL', x + size / 2, y + 4.3, { align: 'center' });

  // Open Book symbol
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x + 2.8, y + 6.5, (size - 6.6) / 2, 4.2, 0.4, 0.4, 'F');
  doc.roundedRect(x + size / 2 + 0.5, y + 6.5, (size - 6.6) / 2, 4.2, 0.4, 0.4, 'F');
  
  // Gold Torch / Star of Learning
  doc.setFillColor(245, 158, 11);
  doc.circle(x + size / 2, y + 13.5, 1.6, 'F');
  doc.setFillColor(255, 255, 255);
  doc.circle(x + size / 2, y + 13.5, 0.7, 'F');

  // Lower ribbon motto
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4);
  doc.setTextColor(245, 158, 11);
  doc.text('EXCELLENCE', x + size / 2, y + size * 1.18 - 1.2, { align: 'center' });
}

export function generateExamPdf(
  exam: SecureExaminationPaper,
  scheme?: SecureMarkingScheme,
  options: ExamPdfOptions = {}
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const schoolName = options.schoolName || exam.schoolName || 'FEDERAL GOVERNMENT COLLEGE / CURRICULUMFLOW MODEL COLLEGE';
  const schoolAddress = options.schoolAddress || exam.schoolAddress || 'P.M.B. 1001, Victoria Island / King\'s Way, Lagos State, Nigeria';
  const schoolMotto = options.schoolMotto || exam.schoolMotto || 'Pro Deo et Patria • Knowledge, Discipline & Character';
  const principalName = options.principalName || exam.principalName || 'Dr. Mustapha Adeleke, PhD, FSTAN (Principal)';
  const subjectTeacherName = options.subjectTeacherName || exam.subjectTeacherName || 'Mr. O. S. Oladipo, M.Sc. (Subject Teacher)';
  const centerNumber = options.centerNumber || exam.centerNumber || 'WAEC/NECO/LAG-4089';
  const academicSession = options.academicSession || exam.academicSession || '2026/2027 Academic Session';
  const variant = options.paperVariant || 'A';
  const logoType = options.schoolLogoType || exam.schoolLogoType || 'crest';
  const logoBase64 = options.schoolLogoBase64 || exam.schoolLogoBase64;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  let currentY = margin;

  // Helper function to check and add new page
  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - margin - 15) {
      addFooter();
      doc.addPage();
      currentY = margin + 10;
      addPageHeader();
    }
  };

  const addPageHeader = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`${exam.subjectName} (${exam.classGrade}) • ${exam.term || 'Term 1'} • Variant [${variant}]`, margin, margin);
    doc.text(`ID: ${exam.examId}`, pageWidth - margin, margin, { align: 'right' });
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin, margin + 2, pageWidth - margin, margin + 2);
    currentY = margin + 8;
  };

  const addFooter = () => {
    const pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - margin - 4, pageWidth - margin, pageHeight - margin - 4);
    
    doc.text(`CurriculumFlow Sovereign Examination Engine • SHA-256: ${(exam.generationHash || 'AUTHENTIC').substring(0, 18)}...`, margin, pageHeight - margin);
    doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - margin, { align: 'right' });
  };

  // ---------------- PAGE 1 HEADER ----------------
  // Outer Border Box
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.6);
  doc.rect(margin - 2, margin - 2, contentWidth + 4, pageHeight - (margin * 2) + 4);

  // Draw School Crest / Logo on left and right for balanced crest framing
  drawSchoolCrest(doc, margin + 2, currentY + 1, 16, logoType, logoBase64);
  drawSchoolCrest(doc, pageWidth - margin - 18, currentY + 1, 16, logoType, logoBase64);

  // Institution Banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(schoolName.toUpperCase(), pageWidth / 2, currentY + 4, { align: 'center' });

  currentY += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(schoolAddress, pageWidth / 2, currentY, { align: 'center' });

  currentY += 4.5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`"${schoolMotto}"`, pageWidth / 2, currentY, { align: 'center' });

  currentY += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(180, 83, 9); // Amber / Gold accent
  doc.text(`${exam.title.toUpperCase()} — ${academicSession.toUpperCase()}`, pageWidth / 2, currentY, { align: 'center' });

  // Center & Metadata Line
  currentY += 5;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(margin + 4, currentY, pageWidth - margin - 4, currentY);

  currentY += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`SUBJECT: ${exam.subjectName.toUpperCase()}`, margin + 4, currentY);
  doc.text(`CLASS: ${exam.classGrade}`, margin + 65, currentY);
  doc.text(`TIME: ${exam.durationMinutes} MINS`, margin + 110, currentY);
  doc.text(`VARIANT: [ ${variant} ]`, pageWidth - margin - 4, currentY, { align: 'right' });

  // Institutional Governance Line: Principal & Subject Teacher Attribution
  currentY += 5;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, currentY, contentWidth, 7, 1, 1, 'FD');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 138); // Navy
  doc.text(`PRINCIPAL / HEAD:`, margin + 3, currentY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(principalName, margin + 32, currentY + 4.5);

  if (subjectTeacherName) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9);
    doc.text(`SUBJECT TEACHER:`, margin + 105, currentY + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(subjectTeacherName, margin + 135, currentY + 4.5);
  }

  // Candidate Bio-Data Box
  currentY += 10;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, currentY, contentWidth, 19, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('CANDIDATE NAME:', margin + 4, currentY + 5.5);
  doc.text('EXAMINATION NO:', margin + 4, currentY + 13.5);
  doc.text('CLASS / ARM:', margin + 70, currentY + 13.5);
  doc.text('DESK NO:', margin + 115, currentY + 13.5);
  doc.text('INVIGILATOR SIGN:', margin + 140, currentY + 13.5);

  // Candidate input dotted lines
  doc.setLineDashPattern([1, 1], 0);
  doc.setDrawColor(100, 116, 139);
  doc.line(margin + 33, currentY + 5.5, pageWidth - margin - 4, currentY + 5.5);
  doc.line(margin + 33, currentY + 13.5, margin + 66, currentY + 13.5);
  doc.line(margin + 93, currentY + 13.5, margin + 112, currentY + 13.5);
  doc.line(margin + 130, currentY + 13.5, margin + 138, currentY + 13.5);
  doc.line(margin + 170, currentY + 13.5, pageWidth - margin - 4, currentY + 13.5);
  doc.setLineDashPattern([], 0); // reset dash

  currentY += 22;

  // General Instructions
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, currentY, contentWidth, 15, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(180, 83, 9);
  doc.text('INSTRUCTIONS TO CANDIDATES:', margin + 3, currentY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  
  const instructions = exam.generalInstructions || exam.instructions || [
    'Write your examination number and candidate name clearly in the provided spaces above.',
    'Answer ALL questions in Section A (Multiple Choice) on the optical bubble sheet or question booklet.',
    'Answer required questions in Section B (Theory) showing all intermediate steps and units.',
    'Programmable electronic gadgets and unauthorized study aids are strictly prohibited.'
  ];

  instructions.slice(0, 3).forEach((inst, idx) => {
    doc.text(`• ${inst}`, margin + 3, currentY + 7.5 + (idx * 3.3));
  });

  currentY += 19;

  // ---------------- SECTION A (OBJECTIVES) ----------------
  const secAQuestions = exam.sectionA?.questions || exam.sections?.[0]?.questions || [];
  const secATitle = exam.sectionA?.title || exam.sections?.[0]?.sectionName || 'SECTION A: OBJECTIVE MULTIPLE CHOICE';
  const secAMarks = exam.sectionA?.marks || exam.sections?.[0]?.marks || 40;

  doc.setFillColor(30, 41, 59);
  doc.rect(margin, currentY, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(secATitle.toUpperCase(), margin + 3, currentY + 4.2);
  doc.text(`[${secAMarks} MARKS]`, pageWidth - margin - 3, currentY + 4.2, { align: 'right' });

  currentY += 9;

  secAQuestions.forEach((q: any, index: number) => {
    checkPageBreak(24);

    const qNum = index + 1;
    const promptText = q.prompt || q.questionText || `Question ${qNum}`;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${qNum}.`, margin, currentY);

    // Question Prompt wrapping
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    const splitPrompt = doc.splitTextToSize(promptText, contentWidth - 8);
    doc.text(splitPrompt, margin + 6, currentY);
    currentY += splitPrompt.length * 4.2 + 1.5;

    // Options rendering
    const rawOptions = q.options || [];
    const formattedOptions = rawOptions.map((opt: any, optIdx: number) => {
      if (typeof opt === 'string') {
        const letters = ['A', 'B', 'C', 'D', 'E'];
        return { key: letters[optIdx] || 'A', text: opt };
      }
      return { key: opt.key || 'A', text: opt.text || opt.label || '' };
    });

    if (formattedOptions.length > 0) {
      const colWidth = (contentWidth - 8) / 2;
      formattedOptions.forEach((opt: any, optIdx: number) => {
        const isRightCol = optIdx % 2 === 1;
        const optX = margin + 6 + (isRightCol ? colWidth : 0);
        const optY = isRightCol ? currentY - 4.5 : currentY;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(`[${opt.key}]`, optX, optY);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        const optTextSplit = doc.splitTextToSize(opt.text, colWidth - 10);
        doc.text(optTextSplit, optX + 7, optY);

        if (isRightCol || optIdx === formattedOptions.length - 1) {
          currentY += Math.max(optTextSplit.length * 4, 4.5) + 1.5;
        }
      });
    }

    currentY += 2;
  });

  // ---------------- SECTION B (THEORY / ESSAY) ----------------
  const secBQuestions = exam.sectionB?.questions || exam.sections?.[1]?.questions || [];
  const secBTitle = exam.sectionB?.title || exam.sections?.[1]?.sectionName || 'SECTION B: STRUCTURED THEORY & PROBLEM SOLVING';
  const secBMarks = exam.sectionB?.marks || exam.sections?.[1]?.marks || 60;

  if (secBQuestions.length > 0) {
    checkPageBreak(30);

    currentY += 4;
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, currentY, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(secBTitle.toUpperCase(), margin + 3, currentY + 4.2);
    doc.text(`[${secBMarks} MARKS]`, pageWidth - margin - 3, currentY + 4.2, { align: 'right' });

    currentY += 9;

    secBQuestions.forEach((q: any, index: number) => {
      checkPageBreak(32);

      const qNum = index + 1;
      const promptText = q.prompt || q.questionText || `Theory Question ${qNum}`;
      const marks = q.marks ? `[${q.marks} Marks]` : '[15 Marks]';

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(180, 83, 9);
      doc.text(`QUESTION ${qNum}`, margin, currentY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(marks, pageWidth - margin, currentY, { align: 'right' });

      currentY += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      const splitPrompt = doc.splitTextToSize(promptText, contentWidth);
      doc.text(splitPrompt, margin, currentY);
      currentY += splitPrompt.length * 4.5 + 4;

      // Draw blank response grid space lines
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      for (let lineIdx = 0; lineIdx < 3; lineIdx++) {
        doc.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 4.5;
      }
      currentY += 3;
    });
  }

  addFooter();

  // ---------------- OPTIONAL: OMR BUBBLE ANSWER SHEET PAGE ----------------
  if (options.includeOmrSheet) {
    doc.addPage();
    currentY = margin;
    
    // OMR Outer Border
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.6);
    doc.rect(margin - 2, margin - 2, contentWidth + 4, pageHeight - (margin * 2) + 4);

    // School Crest & Header
    drawSchoolCrest(doc, margin + 2, currentY + 1, 14, logoType, logoBase64);
    drawSchoolCrest(doc, pageWidth - margin - 16, currentY + 1, 14, logoType, logoBase64);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(schoolName.toUpperCase(), pageWidth / 2, currentY + 3.5, { align: 'center' });

    currentY += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(schoolAddress, pageWidth / 2, currentY, { align: 'center' });

    currentY += 4.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(180, 83, 9);
    doc.text('OPTICAL MARK RECOGNITION (OMR) ANSWER SHEET', pageWidth / 2, currentY, { align: 'center' });

    currentY += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`EXAM: ${exam.title} • SUBJECT: ${exam.subjectName.toUpperCase()} • CLASS: ${exam.classGrade} • VARIANT: [ ${variant} ]`, pageWidth / 2, currentY, { align: 'center' });

    currentY += 4;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Principal: ${principalName} ${subjectTeacherName ? `• Subject Teacher: ${subjectTeacherName}` : ''}`, pageWidth / 2, currentY, { align: 'center' });

    currentY += 4;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(margin + 4, currentY, pageWidth - margin - 4, currentY);

    // Candidate identification mini box
    currentY += 3;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(148, 163, 184);
    doc.roundedRect(margin, currentY, contentWidth, 12, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('CANDIDATE NAME: _____________________________________', margin + 3, currentY + 4);
    doc.text('EXAM NO: _____________________', margin + 115, currentY + 4);
    doc.text('CLASS / ARM: _______________', margin + 3, currentY + 9);
    doc.text('DESK NO: ___________', margin + 65, currentY + 9);
    doc.text('SIGNATURE: _______________________', margin + 115, currentY + 9);

    currentY += 15;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Instructions: Shade completely inside the circle using an HB pencil. Example: [ ● ] A  [ ○ ] B  [ ○ ] C  [ ○ ] D', pageWidth / 2, currentY, { align: 'center' });

    currentY += 7;
    // OMR 50-Item Grid (4 Columns)
    const columns = 4;
    const itemsPerCol = 12;
    const colSpacing = (contentWidth - 10) / columns;

    for (let c = 0; c < columns; c++) {
      const startNum = c * itemsPerCol + 1;
      const colX = margin + 4 + (c * colSpacing);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Q.No  A   B   C   D   E`, colX, currentY);
      doc.setDrawColor(200, 200, 200);
      doc.line(colX, currentY + 1.5, colX + 38, currentY + 1.5);

      for (let r = 0; r < itemsPerCol; r++) {
        const itemNum = startNum + r;
        const rowY = currentY + 6 + (r * 6.2);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(30, 41, 59);
        doc.text(`${itemNum < 10 ? ' ' : ''}${itemNum}.`, colX, rowY);

        ['A', 'B', 'C', 'D', 'E'].forEach((letter, lIdx) => {
          const bubbleX = colX + 9 + (lIdx * 6);
          doc.setDrawColor(100, 116, 139);
          doc.setLineWidth(0.3);
          doc.circle(bubbleX, rowY - 1, 1.8, 'S');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.5);
          doc.setTextColor(120, 120, 120);
          doc.text(letter, bubbleX - 0.7, rowY + 0.3);
        });
      }
    }

    addFooter();
  }

  // ---------------- OPTIONAL: CONFIDENTIAL MARKING SCHEME ----------------
  if (options.includeMarkingScheme && scheme) {
    doc.addPage();
    currentY = margin;
    
    // Marking Scheme Outer Border
    doc.setDrawColor(185, 28, 28);
    doc.setLineWidth(0.6);
    doc.rect(margin - 2, margin - 2, contentWidth + 4, pageHeight - (margin * 2) + 4);

    // School Crest & Header
    drawSchoolCrest(doc, margin + 2, currentY + 1, 15, logoType, logoBase64);
    drawSchoolCrest(doc, pageWidth - margin - 17, currentY + 1, 15, logoType, logoBase64);

    // School Name & Address
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(schoolName.toUpperCase(), pageWidth / 2, currentY + 3.5, { align: 'center' });

    currentY += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(schoolAddress, pageWidth / 2, currentY, { align: 'center' });

    currentY += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(185, 28, 28); // Deep Red / Confidential
    doc.text('STRICTLY CONFIDENTIAL — OFFICIAL MARKING SCHEME', pageWidth / 2, currentY, { align: 'center' });

    currentY += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`EXAM: ${exam.title} (${exam.classGrade})`, pageWidth / 2, currentY, { align: 'center' });

    currentY += 5;
    // Institutional Authorization Box
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(252, 165, 165);
    doc.roundedRect(margin, currentY, contentWidth, 9, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(185, 28, 28);
    doc.text(`APPROVED BY PRINCIPAL:`, margin + 3, currentY + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(principalName, margin + 42, currentY + 5.5);

    if (subjectTeacherName) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text(`CHIEF EXAMINER:`, margin + 115, currentY + 5.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(subjectTeacherName, margin + 143, currentY + 5.5);
    }

    currentY += 12;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Security Release Key: ${exam.markingSchemeId} • Hash: ${(exam.generationHash || 'AUTHENTIC').substring(0, 24)}...`, pageWidth / 2, currentY, { align: 'center' });

    currentY += 5;
    doc.setDrawColor(239, 68, 68);
    doc.setLineWidth(0.4);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 5;

    // Section A Key Table
    if (scheme.sectionARubric && scheme.sectionARubric.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('SECTION A: OBJECTIVE ANSWER KEY & DISTRACTOR RATIONALE', margin, currentY);
      currentY += 5;

      const keysPerCol = 8;
      const keyCols = Math.ceil(scheme.sectionARubric.length / keysPerCol);
      const colW = (contentWidth - 6) / Math.max(keyCols, 1);

      scheme.sectionARubric.forEach((item, i) => {
        const cIdx = Math.floor(i / keysPerCol);
        const rIdx = i % keysPerCol;
        const x = margin + (cIdx * colW);
        const y = currentY + (rIdx * 5.2);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(30, 41, 59);
        doc.text(`Q${item.questionNumber}:`, x, y);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129);
        doc.text(`[ ${item.correctOption} ]`, x + 8, y);

        if (item.explanation) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.5);
          doc.setTextColor(100, 116, 139);
          const expl = item.explanation.length > 26 ? `${item.explanation.substring(0, 24)}...` : item.explanation;
          doc.text(`(${expl})`, x + 17, y);
        }
      });

      currentY += (keysPerCol * 5.2) + 7;
    }

    // Section B Detailed Step Scoring Rubrics
    if (scheme.sectionBRubric && scheme.sectionBRubric.length > 0) {
      checkPageBreak(25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('SECTION B: STEP-BY-STEP MARKING BREAKDOWN (M1 / A1 / B1)', margin, currentY);
      currentY += 5;

      scheme.sectionBRubric.forEach((rubric) => {
        checkPageBreak(26);

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(margin, currentY, contentWidth, 5.5, 1, 1, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(180, 83, 9);
        doc.text(`QUESTION ${rubric.questionNumber} SCORING RUBRIC`, margin + 3, currentY + 3.8);
        doc.text(`Total: ${rubric.totalMarks} Marks`, pageWidth - margin - 3, currentY + 3.8, { align: 'right' });

        currentY += 8;

        rubric.steps?.forEach((st) => {
          checkPageBreak(9);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(30, 41, 59);
          doc.text(`• ${st.step}`, margin + 3, currentY);

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(16, 185, 129);
          doc.text(st.allocatedMarks, pageWidth - margin - 3, currentY, { align: 'right' });
          currentY += 4.2;
        });

        if (rubric.partialCreditRules) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text(`Partial Credit Rule: ${rubric.partialCreditRules}`, margin + 3, currentY);
          currentY += 4.5;
        }

        currentY += 2.5;
      });
    }

    addFooter();
  }

  return doc;
}

