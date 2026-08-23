import { SubjectCurriculum } from '../../types';

export const SSS_HUMANITIES_BUSINESS_CURRICULUM_DATABASE: SubjectCurriculum[] = [
  // ========================================================
  // 1. ENGLISH LANGUAGE (SS 1 - 3)
  // ========================================================
  {
    id: 'sss-english-language',
    name: 'English Language',
    code: 'ENG-SSS',
    level: 'sss',
    field: 'core',
    isCompulsory: true,
    recommendedPeriodsPerWeek: 5,
    targetGrades: ['SS 1', 'SS 2', 'SS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html',
    description: 'Senior Secondary English Language curriculum comprising Reading Comprehension, Summary Writing, Continuous Writing (Essays, Formal Letters, Articles, Speeches), Lexis & Structure, and Oral English (Phonology, Stress, Intonation).',
    generalObjectives: [
      'Master advanced communicative competence and stylistic dexterity in English.',
      'Analyze and summarize complex expository, argumentative, and literary texts.',
      'Produce coherent, grammatically pristine essays conforming to international examination standards.',
      'Achieve phonological accuracy in spoken English stress, rhythm, and intonation patterns.'
    ],
    recommendedTextbooks: [
      'New Oxford Secondary English Course (NOSEC) for Senior Secondary Schools (Books 1 - 3)',
      'Intensive English for Senior Secondary Schools by Benson Oluikpe et al. (Africana First Publishers)',
      'Round-Up English for Senior Secondary Certificate Examination by Ogunsanwo et al.'
    ],
    themes: [
      {
        id: 'eng-sss-theme-1',
        themeNumber: 1,
        title: 'Continuous Writing (Advanced Composition)',
        description: 'Argumentative essays, narrative essays, descriptive essays, expository articles, formal business correspondence, speeches, and report writing.',
        topics: [
          {
            id: 'eng-sss-top-1',
            title: 'Argumentative Essay Writing & Logical Persuasion',
            week: 2,
            term: 'Term 1',
            classGrade: 'SS 2',
            subTopics: ['Features of Argumentative Essays: Proposition, Stance, Evidence, Refutation', 'Paragraph development: Point, Explanation, Evidence, Link (PEEL method)', 'Rhetorical devices and persuasive connectives (Furthermore, Consequently, Conversely)', 'WAEC Essay Marking Scheme: Content (10), Organization (10), Expression (20), Mechanical Accuracy (10)'],
            performanceObjectives: [
              'Articulate a clear, unambiguous thesis stance on a controversial national or global proposition.',
              'Construct well-structured paragraphs using the PEEL argumentative model.',
              'Refute counter-arguments logically without logical fallacies.',
              'Write an argumentative essay of at least 450 words within 50 minutes complying with standard WAEC scoring rubrics.'
            ],
            contentDetails: [
              'Propositions on national issues (e.g. "Civilian Rule vs Military Governance", "State Police in Nigeria", "AI in African Education").',
              'Deductive and inductive reasoning structures.',
              'Avoiding informal slang, contractions, and emotive hyperbole in formal argument.'
            ],
            teacherActivities: [
              'Model analytical deconstruction of typical WAEC/NECO argumentative past questions.',
              'Explain WAEC penalty deductions for mechanical errors (spelling, punctuation, concord) at -0.5 mark per error.'
            ],
            studentActivities: [
              'Participate in structured parliamentary-style classroom debates.',
              'Draft full 450-word timed argumentative essays under examination conditions.'
            ],
            teachingMaterials: ['WAEC essay marking guide rubrics', 'Sample graded candidate essays', 'Writing strategy wall posters'],
            evaluationGuide: ['Grade timed essays using official WAEC 50-mark analytic rubric (Content/Organization/Expression/Mechanical Accuracy).'],
            examRelevance: { waec: true, neco: true, jamb: true, commonExamAreas: ['WASSCE English Paper 1 Essay Section A (50 marks)'] }
          }
        ]
      },
      {
        id: 'eng-sss-theme-2',
        themeNumber: 2,
        title: 'Oral English and Advanced Phonology',
        description: 'Vowel contrasts, diphthongs, triphthongs, consonant clusters, silent letters, syllable stress (polysyllabic words), emphatic stress, and pitch intonation (falling and rising tunes).',
        topics: [
          {
            id: 'eng-sss-top-2',
            title: 'Word Stress in Polysyllabic Words & Emphatic Stress',
            week: 4,
            term: 'Term 2',
            classGrade: 'SS 3',
            subTopics: ['Primary stress placement rules in 2-syllable nouns vs verbs (e.g., RE-cord noun vs re-CORD verb)', 'Stress patterns with suffixes (-tion, -ic, -ity, -ate, -ee, -eer)', 'Emphatic stress: identifying sentence focus and answering presupposition questions', 'Intonation tunes: Falling tune in declarative statements vs Rising tune in polar questions'],
            performanceObjectives: [
              'Identify primary stressed syllables in words with two to five syllables.',
              'Explain how stress shifts change grammatical class from noun to verb in English homographs.',
              'Determine the correct contextual presupposition in emphatic stress examination questions.'
            ],
            contentDetails: [
              'Penultimate stress rule for words ending in -ic, -sion, -tion (e.g. geo-GRA-phic, in-for-MA-tion).',
              'Antepenultimate stress rule for words ending in -ity, -phy, -gy (e.g. e-QUA-li-ty, pho-TO-gra-phy).',
              'Emphatic stress rule: The capitalized word carries the new contrastive information.'
            ],
            teacherActivities: [
              'Pronounce words with distinct stress beats, using hand claps or taps to demonstrate primary stress.',
              'Present diagnostic WAEC Oral English past questions on emphatic stress on the board.'
            ],
            studentActivities: [
              'Mark stress patterns on word lists using capital letters and primary stress marks (\').',
              'Solve 20 objective questions on emphatic stress interpretation.'
            ],
            teachingMaterials: ['Pronunciation audio dictionaries', 'Oral English IPA wall chart', 'Emphatic stress worksheets'],
            evaluationGuide: ['Administer 40-item objective Oral English test (WAEC Test of Orals format).'],
            examRelevance: { waec: true, neco: true, jamb: true, commonExamAreas: ['WASSCE English Paper 3 Oral English (Test of Orals) Sections 1-5'] }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 2. CIVIC EDUCATION (SENIOR) (SS 1 - 3)
  // ========================================================
  {
    id: 'sss-civic-education',
    name: 'Civic Education',
    code: 'CIV-SSS',
    level: 'sss',
    field: 'core',
    isCompulsory: true,
    recommendedPeriodsPerWeek: 3,
    targetGrades: ['SS 1', 'SS 2', 'SS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html',
    description: 'Senior Secondary Civic Education curriculum covering Democratic Governance, Rule of Law, Human Rights, Citizen Responsibilities, Anti-Corruption Agencies (EFCC, ICPC), Drug Law Enforcement (NDLEA), Political Apathy, and National Security.',
    generalObjectives: [
      'Empower students with deep knowledge of Nigerian constitutional rights and civic responsibilities.',
      'Understand the dangers of political apathy, cultism, drug trafficking, and human trafficking.',
      'Examine the operations of anti-corruption and law enforcement regulatory agencies.',
      'Promote active citizenship, electoral participation, and social justice.'
    ],
    recommendedTextbooks: [
      'NERDC Civic Education for Senior Secondary Schools (Books 1 - 3)',
      'Basic Civic Education for Senior Secondary Schools by Ukegbu et al.',
      'Civic Education for Senior Secondary Schools by Rasmed'
    ],
    themes: [
      {
        id: 'civ-sss-theme-1',
        themeNumber: 1,
        title: 'Democratic Governance and Political Participation',
        description: 'Democratic values, rule of law, separation of powers, political apathy (causes, consequences, remedies), electoral systems (INEC, voting processes), and public service integrity.',
        topics: [
          {
            id: 'civ-sss-top-1',
            title: 'Political Apathy: Causes, Consequences, and Remedies',
            week: 3,
            term: 'Term 1',
            classGrade: 'SS 2',
            subTopics: ['Definition and manifestations of political apathy (voter voter boycott, refusal to register)', 'Causes of political apathy in Nigeria (election violence, broken campaign promises, lack of civic education)', 'Consequences of political apathy on national democratic development', 'Ways of discouraging political apathy and promoting active civic engagement'],
            performanceObjectives: [
              'Define political apathy and provide four observable manifestations in Nigerian elections.',
              'Analyze four root causes of citizen disengagement from electoral and political processes.',
              'Propose five actionable strategies for government and civil society organizations (CSOs) to restore public trust in elections.'
            ],
            contentDetails: [
              'Role of the Independent National Electoral Commission (INEC) in voter education and registration (CVR).',
              'Impact of political apathy on good governance: election of unqualified leaders, dictatorship, lack of accountability.',
              'Youth mobilization initiatives (e.g. "Not Too Young to Run" legislation).'
            ],
            teacherActivities: [
              'Facilitate a classroom town-hall debate on reasons for low voter turnout in recent general elections.',
              'Present voter turnout statistics from past Nigerian presidential and gubernatorial elections.'
            ],
            studentActivities: [
              'Draft an action blueprint for a youth voter registration awareness campaign in their school community.',
              'Write an essay analyzing the impact of civic education on democratic stability.'
            ],
            teachingMaterials: ['1999 Constitution of the Federal Republic of Nigeria (amended)', 'INEC voter education posters and election turnout infographics'],
            evaluationGuide: ['Grade structured essay on political apathy and democratic governance.'],
            examRelevance: { waec: true, neco: true, jamb: true }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 3. ECONOMICS (SS 1 - 3)
  // ========================================================
  {
    id: 'sss-economics',
    name: 'Economics',
    code: 'ECO-SSS',
    level: 'sss',
    field: 'business',
    isCompulsory: false,
    recommendedPeriodsPerWeek: 4,
    targetGrades: ['SS 1', 'SS 2', 'SS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html',
    description: 'Senior Secondary Economics curriculum covering Microeconomics (Demand, Supply, Price Determination, Elasticity, Production Theory, Market Structures), Macroeconomics (National Income Accounting, Money & Banking, Inflation, Fiscal & Monetary Policies), and International Trade.',
    generalObjectives: [
      'Master economic methodology, scarcity, opportunity cost, and production possibility curves.',
      'Understand price mechanisms, market equilibrium, elasticity coefficients, and consumer utility.',
      'Analyze macroeconomic indicators: Gross Domestic Product (GDP), inflation rates, balance of payments.',
      'Evaluate monetary and fiscal policy interventions by the Central Bank of Nigeria (CBN) and Federal Ministry of Finance.'
    ],
    recommendedTextbooks: [
      'Comprehensive Economics for Senior Secondary Schools by J. U. Anyaele (Johnson Publishers)',
      'Essential Economics for Senior Secondary Schools by C. E. Ande (Tonad Publishers)',
      'Senior Secondary Economics (Books 1 - 3) by STAN'
    ],
    themes: [
      {
        id: 'eco-sss-theme-1',
        themeNumber: 1,
        title: 'Price Mechanism, Demand and Supply Elasticities',
        description: 'Law of demand and supply, market equilibrium, price elasticity of demand (PED) and supply (PES), cross elasticity, income elasticity, price controls (maximum and minimum price legislation).',
        topics: [
          {
            id: 'eco-sss-top-1',
            title: 'Price Elasticity of Demand (PED): Types, Measurement, and Practical Applications',
            week: 4,
            term: 'Term 1',
            classGrade: 'SS 2',
            subTopics: ['Definition and mathematical formula for PED: % change in Quantity Demanded / % change in Price', 'Degrees of elasticity: Perfectly elastic (Ed = ∞), Elastic (Ed > 1), Unitary elastic (Ed = 1), Inelastic (Ed < 1), Perfectly inelastic (Ed = 0)', 'Factors determining PED (availability of substitutes, degree of necessity, proportion of income spent, time period)', 'Relationship between PED and Total Revenue for a producer/seller'],
            performanceObjectives: [
              'State the formula for Price Elasticity of Demand and calculate PED from price-quantity schedule tables.',
              'Draw and interpret graphical curves for all five degrees of demand elasticity.',
              'Advise a business on pricing strategy (whether to raise or lower price) based on product elasticity to maximize total revenue.'
            ],
            contentDetails: [
              'Point elasticity vs Arc elasticity formulas.',
              'Distinction between price elasticity of necessities (e.g. staple foods, petroleum) vs luxuries.',
              'Implications for government tax policy on goods with inelastic demand (e.g. tobacco, fuel).'
            ],
            teacherActivities: [
              'Work through numerical calculation examples on the whiteboard with price-demand schedules.',
              'Demonstrate how Total Revenue (P * Q) changes across elastic and inelastic segments of a demand curve.'
            ],
            studentActivities: [
              'Calculate PED coefficients for assigned market datasets.',
              'Plot demand curves on graph sheets indicating elasticity zones.'
            ],
            teachingMaterials: ['Economics formula reference charts', 'Graph sheets, real commodity price datasets from Nigerian NBS (National Bureau of Statistics)'],
            evaluationGuide: ['WASSCE-style structured calculation question and theoretical essay on elasticity determinants.'],
            examRelevance: { waec: true, neco: true, jamb: true, commonExamAreas: ['WASSCE Economics Paper 2 Section A Data Response Question 1 (12 marks)'] }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 4. FINANCIAL ACCOUNTING (SS 1 - 3)
  // ========================================================
  {
    id: 'sss-financial-accounting',
    name: 'Financial Accounting',
    code: 'ACC-SSS',
    level: 'sss',
    field: 'business',
    isCompulsory: false,
    recommendedPeriodsPerWeek: 4,
    targetGrades: ['SS 1', 'SS 2', 'SS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html',
    description: 'Senior Financial Accounting curriculum covering Double Entry Systems, Books of Prime Entry, Ledger Accounts, Trial Balance, Final Accounts of Sole Proprietors (Trading, Profit & Loss, Balance Sheet), Adjustments (Prepayments, Accruals, Depreciation), Bank Reconciliation Statements, Partnership Accounts, and Company Financial Statements.',
    generalObjectives: [
      'Master accounting principles, conceptual frameworks, and International Financial Reporting Standards (IFRS).',
      'Record commercial transactions in books of original entry and post to general and subsidiary ledgers.',
      'Prepare comprehensive final accounts with year-end adjustments for sole proprietorships, partnerships, and limited liability companies.',
      'Interpret financial ratios (liquidity, profitability, leverage) to assess business solvency.'
    ],
    recommendedTextbooks: [
      'Financial Accounting for Senior Secondary Schools by F. O. Wood and Sangster (Business Accounting)',
      'Essential Financial Accounting for Senior Secondary Schools by R. A. Ibrahim et al. (Tonad)',
      'Comprehensive Financial Accounting for SSS by A. O. Longe'
    ],
    themes: [
      {
        id: 'acc-sss-theme-1',
        themeNumber: 1,
        title: 'Final Accounts and Year-End Adjustments',
        description: 'Trading Account, Profit and Loss Account, Statement of Financial Position (Balance Sheet), Prepayments, Accruals, Provision for Bad and Doubtful Debts, Provision for Depreciation (Straight Line and Reducing Balance methods).',
        topics: [
          {
            id: 'acc-sss-top-1',
            title: 'Preparation of Final Accounts with Year-End Adjustments',
            week: 5,
            term: 'Term 2',
            classGrade: 'SS 2',
            subTopics: ['Trading Account: Cost of Goods Sold (Opening Stock + Purchases + Carriage Inwards - Closing Stock), Gross Profit', 'Profit and Loss Account: Operating expenses, provisions, Net Profit', 'Balance Sheet (Statement of Financial Position): Non-Current Assets, Current Assets, Current Liabilities, Long-Term Liabilities, Capital & Reserves', 'Accounting for year-end adjustments: Accrued expenses, Prepaid expenses, Provision for Depreciation, Provision for Doubtful Debts'],
            performanceObjectives: [
              'Extract a Trial Balance from general ledger balances.',
              'Prepare a full Trading, Profit and Loss Account incorporating at least four year-end adjustments.',
              'Draft a classified Balance Sheet in both horizontal (\'T\') and vertical reporting formats.'
            ],
            contentDetails: [
              'Distinction between Capital Expenditure and Revenue Expenditure.',
              'Methods of calculating depreciation: Straight Line (Cost - Scrap / Useful life) vs Reducing Balance (% on carrying amount).',
              'Bad debts written off vs Provision for doubtful debts adjustment.'
            ],
            teacherActivities: [
              'Present a comprehensive Trial Balance on the whiteboard and guide step-by-step adjustment workings in auxiliary columns.',
              'Explain dual entry effects of year-end adjustments on final accounts.'
            ],
            studentActivities: [
              'Solve complete 20-mark final account practice problems in accounting ledger books.',
              'Calculate depreciation schedules across 5-year asset lifespans.'
            ],
            teachingMaterials: ['Multi-column accounting ledger paper', 'Model financial statement templates (IFRS compliant)'],
            evaluationGuide: ['Full WASSCE Financial Accounting Paper 2 Section B 20-mark practical question grading.'],
            examRelevance: { waec: true, neco: true, commonExamAreas: ['WASSCE Financial Accounting Paper 2 Section B Compulsory Question on Final Accounts'] }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 5. COMMERCE (SS 1 - 3)
  // ========================================================
  {
    id: 'sss-commerce',
    name: 'Commerce',
    code: 'COM-SSS',
    level: 'sss',
    field: 'business',
    isCompulsory: false,
    recommendedPeriodsPerWeek: 4,
    targetGrades: ['SS 1', 'SS 2', 'SS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html',
    description: 'Senior Secondary Commerce curriculum covering Trade (Home and International), Business Organizations (Sole Trader, Partnership, Limited Companies, Public Corporations), Aids to Trade (Banking, Insurance, Transportation, Warehousing, Advertising, Communication), Stock Exchange, Commodity Exchange, and Consumer Protection.',
    generalObjectives: [
      'Understand commercial systems, trade channels, and international commercial terms (Incoterms).',
      'Analyze legal structures, capitalization, and dissolution of business organizations.',
      'Master the principles and operations of banking institutions, insurance underwriting, and capital markets.',
      'Understand consumer rights, statutory regulatory bodies (FCCPC, NAFDAC, SON), and business ethics.'
    ],
    recommendedTextbooks: [
      'Comprehensive Commerce for Senior Secondary Schools by J. U. Anyaele',
      'Essential Commerce for Senior Secondary Schools by O. A. Longe (Tonad Publishers)',
      'Senior Secondary Commerce (Books 1 - 3) by Ahukannah et al.'
    ],
    themes: [
      {
        id: 'com-sss-theme-1',
        themeNumber: 1,
        title: 'Capital Markets, Stock Exchange, and Financial Institutions',
        description: 'Money market vs Capital market, Nigerian Exchange Group (NGX), types of securities (shares, stocks, debentures, bonds), stockbrokers, bulls and bears, Central Bank of Nigeria monetary functions, and commercial bank services.',
        topics: [
          {
            id: 'com-sss-top-1',
            title: 'The Stock Exchange (Capital Market): Operations, Securities, and Speculators',
            week: 4,
            term: 'Term 1',
            classGrade: 'SS 3',
            subTopics: ['Functions and significance of the Stock Exchange (NGX) in capital mobilization', 'Types of securities traded: Ordinary shares (equity), Preference shares (cumulative, participating), Debentures, Government Bonds', 'Market operators: Stockbrokers, Jobbers, Issuing houses, Registrars, Central Securities Clearing System (CSCS)', 'Stock market speculators: Bull (optimist), Bear (pessimist), Stag (new issue applicant)'],
            performanceObjectives: [
              'Explain five core economic functions of the Stock Exchange in national economic development.',
              'Contrast Ordinary Shares and Debentures on five distinct criteria (ownership, return, voting rights, liquidation priority).',
              'Differentiate among the three types of stock exchange speculators (Bulls, Bears, Stags).'
            ],
            contentDetails: [
              'Primary Market (IPOs / Rights Issues) vs Secondary Market (trading existing shares).',
              'Role of the Securities and Exchange Commission (SEC) as apex capital market regulator in Nigeria.',
              'Market capitalization and the All-Share Index (ASI).'
            ],
            teacherActivities: [
              'Display daily trading floor price lists from the Nigerian Exchange Group (NGX).',
              'Organize a simulated stock portfolio investment challenge in class.'
            ],
            studentActivities: [
              'Track 5 listed Nigerian equities (e.g. Dangote Cement, MTN Nigeria, GTCO) over 4 weeks and record price movements.',
              'Write an analytical essay comparing equity financing vs debt financing.'
            ],
            teachingMaterials: ['NGX daily official price list bulletin', 'SEC investor education handbook', 'Sample share certificates'],
            evaluationGuide: ['Written essay and multiple-choice examination on stock exchange operations and securities.'],
            examRelevance: { waec: true, neco: true, jamb: true }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 6. LITERATURE-IN-ENGLISH (SS 1 - 3)
  // ========================================================
  {
    id: 'sss-literature-in-english',
    name: 'Literature-in-English',
    code: 'LIT-SSS',
    level: 'sss',
    field: 'humanities',
    isCompulsory: false,
    recommendedPeriodsPerWeek: 4,
    targetGrades: ['SS 1', 'SS 2', 'SS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html',
    description: 'Senior Secondary Literature-in-English curriculum covering African Prose, Non-African Prose, African Drama, Non-African Drama (Shakespearean text), African Poetry, Non-African Poetry, Literary Terms, and Critical Appreciation based on the current 2026-2030 WAEC/NECO prescribed harmonization syllabus.',
    generalObjectives: [
      'Develop critical literary analysis, thematic interpretation, and character appraisal skills.',
      'Explore socio-political, cultural, and philosophical themes in African and world literature.',
      'Master dramatic conventions, poetic devices (meter, imagery, figurative language), and prose narratives.',
      'Write persuasive, evidence-based literary essays responding to examination essay prompts.'
    ],
    recommendedTextbooks: [
      'A Handbook of Literary Terms by M. H. Abrams',
      'WAEC/NECO Harmonized Literature-in-English Syllabus (2026-2030 Edition)',
      'Selected African and Non-African Set Texts (Prose, Drama, Poetry)'
    ],
    themes: [
      {
        id: 'lit-sss-theme-1',
        themeNumber: 1,
        title: 'African and Non-African Drama Analysis',
        description: 'Dramatic elements (plot, characterization, dialogue, soliloquy, dramatic irony, tragedy vs comedy), thematic analysis of prescribed African and Shakespearean plays.',
        topics: [
          {
            id: 'lit-sss-top-1',
            title: 'Dramatic Techniques & Characterization in Prescribed Drama',
            week: 3,
            term: 'Term 1',
            classGrade: 'SS 2',
            subTopics: ['Dramatic devices: Dramatic irony, Soliloquy, Aside, Chorus, Tragic flaw (Hamartia)', 'Analysis of central themes: Power, corruption, betrayal, fate vs free will', 'Character analysis: Protagonist, Antagonist, Foil characters', 'Writing structured WASSCE character and thematic essay answers'],
            performanceObjectives: [
              'Identify and explain dramatic devices in specific scenes of the prescribed play.',
              'Analyze the moral and psychological development of the tragic protagonist.',
              'Write a unified 400-word essay evaluating how a selected theme is explored through dramatic conflict.'
            ],
            contentDetails: [
              'Context of the play: Historical, cultural, and theatrical setting.',
              'Textual citations: Quoting lines accurately to substantiate critical assertions.',
              'Aristotelian tragedy principles: Hamartia, Hubris, Peripeteia, Anagnorisis, Catharsis.'
            ],
            teacherActivities: [
              'Direct dramatic read-throughs and staging of key climactic scenes in class.',
              'Break down model WAEC 25-mark literature essay responses on the board.'
            ],
            studentActivities: [
              'Perform character role-plays in costume.',
              'Draft timed essay responses answering past WASSCE Section B drama questions.'
            ],
            teachingMaterials: ['Copies of the prescribed play text', 'Audio recordings / theatre performance video clips', 'Essay marking guides'],
            evaluationGuide: ['Grade literary essays based on textual knowledge, thematic depth, character analysis, and structural organization.'],
            examRelevance: { waec: true, neco: true, jamb: true, commonExamAreas: ['WASSCE Literature-in-English Paper 2 Drama & Poetry (50 marks)'] }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 7. GOVERNMENT (SS 1 - 3)
  // ========================================================
  {
    id: 'sss-government',
    name: 'Government',
    code: 'GOV-SSS',
    level: 'sss',
    field: 'humanities',
    isCompulsory: false,
    recommendedPeriodsPerWeek: 4,
    targetGrades: ['SS 1', 'SS 2', 'SS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html',
    description: 'Senior Secondary Government curriculum covering Elements of Government (State, Sovereignty, Separation of Powers, Rule of Law, Organs of Government, Political Ideologies), Political Parties & Elections, Colonial Administration in West Africa, Constitutional Developments in Nigeria (1922-1999), Federalism, and Nigerian Foreign Policy.',
    generalObjectives: [
      'Understand foundational political concepts, institutions, and state governance mechanisms.',
      'Analyze the evolution of constitutional frameworks in colonial and post-independence Nigeria.',
      'Examine the structure, revenue allocation, and intergovernmental dynamics of Nigerian federalism.',
      'Understand Nigerian foreign policy, non-alignment, Afrocentrism, and multilateral diplomacy (ECOWAS, AU, UN).'
    ],
    recommendedTextbooks: [
      'Comprehensive Government for Senior Secondary Schools by J. U. Anyaele',
      'Essential Government for Senior Secondary Schools by C. C. Dibie (Tonad Publishers)',
      'Government for Senior Secondary Schools by Oyediran et al.'
    ],
    themes: [
      {
        id: 'gov-sss-theme-1',
        themeNumber: 1,
        title: 'Constitutional Developments in Nigeria (1922 - 1999)',
        description: 'Clifford (1922), Richards (1946), Macpherson (1951), Lyttelton (1954), Independence Constitution (1960), Republican Constitution (1963), Second Republic (1979), and 1999 Fourth Republic Constitutions.',
        topics: [
          {
            id: 'gov-sss-top-1',
            title: 'Clifford (1922) and Richards (1946) Constitutions: Features and Impact',
            week: 5,
            term: 'Term 1',
            classGrade: 'SS 2',
            subTopics: ['Clifford Constitution 1922: Elective principle, 4 elected seats (3 for Lagos, 1 for Calabar), Legislative Council, Newspaper emergence (Lagos Daily News)', 'Richards Constitution 1946: Regionalism (Northern, Western, Eastern regions), House of Chiefs, Unofficial majority', 'Merits and Demerits of both colonial constitutional frameworks', 'Nationalist agitations led by Herbert Macaulay and Nnamdi Azikiwe'],
            performanceObjectives: [
              'Explain the introduction and significance of the Elective Principle in the 1922 Clifford Constitution.',
              'Identify the four elected legislative seats created under Clifford constitution.',
              'Discuss how the 1946 Richards Constitution laid the foundation for Nigerian federal regionalism.',
              'Enumerate three major nationalist criticisms leveled against both colonial constitutions.'
            ],
            contentDetails: [
              'Role of Sir Hugh Clifford and Sir Arthur Richards.',
              'Nationalist agitations led by Herbert Macaulay (Father of Nigerian Nationalism) and Nnamdi Azikiwe.',
              'Franchise qualification under Clifford: British subjects or protected persons with gross income of £100 per annum.'
            ],
            teacherActivities: [
              'Present a historical timeline matrix of Nigerian constitutions on the whiteboard.',
              'Facilitate a classroom historical reenactment of the 1922 Legislative Council elections.'
            ],
            studentActivities: [
              'Construct a comparative table showing features, merits, and flaws of Clifford and Richards constitutions.',
              'Answer essay past questions on the impact of elective principle.'
            ],
            teachingMaterials: ['Historical map of colonial Nigeria (1914-1960)', 'Constitutional timeline charts'],
            evaluationGuide: ['Essay assessment on the features and shortcomings of colonial constitutions.'],
            examRelevance: { waec: true, neco: true, jamb: true, commonExamAreas: ['WASSCE Government Paper 2 Section B Question on Constitutional History'] }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 8. GEOGRAPHY (SS 1 - 3)
  // ========================================================
  {
    id: 'sss-geography',
    name: 'Geography',
    code: 'GEO-SSS',
    level: 'sss',
    field: 'humanities',
    isCompulsory: false,
    recommendedPeriodsPerWeek: 4,
    targetGrades: ['SS 1', 'SS 2', 'SS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html',
    description: 'Senior Secondary Geography curriculum covering Physical Geography (Earth in Space, Rocks & Minerals, Landform Processes, Weather & Climate, Vegetation & Soils), Human & Regional Geography of Nigeria, ECOWAS & the World, and Practical Map Reading, Surveying, and Geographic Information Systems (GIS).',
    generalObjectives: [
      'Understand planetary motions, internal geomorphic forces (volcanism, folding, faulting), and external weathering.',
      'Analyze global climate zones (Köppen classification), weather systems, and environmental ecosystems.',
      'Master practical topographical map reading, contour interpretation, gradient calculation, and cross-section profiling.',
      'Explore the socio-economic and regional geography of Nigeria (resources, agriculture, industrial zones, urbanization).'
    ],
    recommendedTextbooks: [
      'Senior Secondary Geography (Books 1 - 3) by STAN',
      'Essential Geography for Senior Secondary Schools by O. A. Iwena (Tonad Publishers)',
      'Certificate Physical and Human Geography by Goh Cheng Leong'
    ],
    themes: [
      {
        id: 'geo-sss-theme-1',
        themeNumber: 1,
        title: 'Practical Map Reading and Cartographic Interpretation',
        description: 'Scale conversion, conventional symbols, grid references (4-figure and 6-figure), contour lines interpretation (slopes, valleys, spurs, ridges, plateaus), intervisibility, cross-section profiling, and gradient calculation.',
        topics: [
          {
            id: 'geo-sss-top-1',
            title: 'Topographical Map Analysis: Contours, Gradient, and Cross-Section Profiles',
            week: 4,
            term: 'Term 1',
            classGrade: 'SS 2',
            subTopics: ['Scale types and conversions (Representative Fraction, Statement, Linear)', 'Contour representations of landforms: Even/Steep/Gentle slopes, Conical hills, Ridge, Col, Saddle, Gorge', 'Calculation of Vertical Exaggeration (VE = Vertical Scale / Horizontal Scale) and Gradient (Vertical Interval / Horizontal Equivalent)', 'Drawing annotated cross-section profiles between two designated points on a 1:50,000 map'],
            performanceObjectives: [
              'Convert Representative Fraction (RF) map scales to word statements and linear measurements.',
              'Calculate the average gradient between two points on a contour map with correct formula and units.',
              'Construct an accurate cross-section relief profile with appropriate vertical scale and test for intervisibility.'
            ],
            contentDetails: [
              'Contour interval (Vertical Interval - VI) determination.',
              'Horizontal Equivalent (HE) measurement using paper strips along straight or winding lines.',
              'Relating topographical drainage patterns (dendritic, trellis, radial) to underlying rock structures.'
            ],
            teacherActivities: [
              'Project a 1:50,000 Nigerian topographical map extract (e.g. Iseyin, Okene, or Abuja sheet) and demonstrate strip-paper contour transfer onto graph paper.',
              'Guide students in identifying drainage basins and settlement distribution factors.'
            ],
            studentActivities: [
              'Construct cross-section profiles on graph sheets between assigned 6-figure grid coordinates.',
              'Calculate gradient and determine intervisibility between hilltop trigonometrical stations.'
            ],
            teachingMaterials: ['Official 1:50,000 Nigerian Survey Topographical Map Sheets', 'Graph paper, dividers, scale rules, mapping paper strips'],
            evaluationGuide: ['WASSCE Practical Geography Paper 1 Section A 25-mark map reading test grading.'],
            examRelevance: { waec: true, neco: true, commonExamAreas: ['WASSCE Geography Paper 1 Section A Compulsory Map Reading Question (25 marks)'] }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 9. CHRISTIAN RELIGIOUS STUDIES (SENIOR) (SS 1 - 3)
  // ========================================================
  {
    id: 'sss-christian-religious-studies',
    name: 'Christian Religious Studies (Senior)',
    code: 'CRS-SSS',
    level: 'sss',
    field: 'humanities',
    isCompulsory: false,
    recommendedPeriodsPerWeek: 3,
    targetGrades: ['SS 1', 'SS 2', 'SS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html',
    description: 'Senior CRS curriculum exploring the Sovereignty of God, Covenant Relationship, Leadership in Ancient Israel (Moses, Joshua, Deborah, Gideon, Saul, David, Solomon), Prophetic Traditions (Amos, Hosea, Isaiah, Jeremiah), The Gospels (Synoptic narratives of Jesus Christ), Early Apostolic Missions (Acts of the Apostles), and Pauline Epistles on Christian Living.',
    generalObjectives: [
      'Deepen spiritual understanding and ethical discernment through rigorous Biblical textual exegesis.',
      'Analyze the leadership qualities, moral choices, and failures of Old and New Testament figures.',
      'Examine the ethical demands of prophetic ministry regarding social justice, religious purity, and righteousness.',
      'Apply apostolic teachings to contemporary moral dilemmas: integrity, civic obedience, marriage, and persecution.'
    ],
    recommendedTextbooks: [
      'Christian Religious Knowledge for Senior Secondary Schools (Books 1 - 3) by T. N. O. Quarcoopome',
      'Essential CRS for Senior Secondary Schools by O. O. Adeyemo (Tonad Publishers)',
      'Comprehensive CRS for SSS by J. E. Martins'
    ],
    themes: [
      {
        id: 'crs-sss-theme-1',
        themeNumber: 1,
        title: 'Leadership and Prophetic Ministry in Israel',
        description: 'Call of Moses, Covenant at Mount Sinai, Deborah and Gideon\'s military leadership, Reign of King David, Solomon\'s wisdom and downfall, Amos on social justice, Hosea on God\'s divine love and forgiveness.',
        topics: [
          {
            id: 'crs-sss-top-1',
            title: 'Prophet Amos: Social Justice, False Worship, and God\'s Righteous Judgment',
            week: 3,
            term: 'Term 1',
            classGrade: 'SS 2',
            subTopics: ['Historical and socio-economic context of the Northern Kingdom of Israel under Jeroboam II', 'Amos\'s condemnation of social injustices (oppression of the poor, dishonest scales, bribery in courts)', 'Rejection of empty religious rituals without righteousness (Amos 5:21-24: "Let justice roll down like waters...")', 'Visions of judgment (Plumb line, Summer fruit, Basket of ripe fruit) and relevance to modern Nigerian society'],
            performanceObjectives: [
              'Describe the socio-economic conditions prevailing in Israel during the ministry of Prophet Amos.',
              'Enumerate five specific social injustices condemned by Amos in his prophetic addresses.',
              'Explain the contemporary relevance of Amos\'s message on social justice and integrity to Nigerian national life.'
            ],
            contentDetails: [
              'Amos chapters 2, 4, 5, 7, and 8.',
              'Contrast between external religious rituals and genuine moral righteousness.',
              'Application to corruption, exploitation of vulnerable workers, and judicial integrity.'
            ],
            teacherActivities: [
              'Guide students through reading key passages from the Book of Amos in the Revised Standard Version (RSV).',
              'Lead discussion comparing 8th-century BC Samarian economic exploitation with modern societal issues.'
            ],
            studentActivities: [
              'Write an analytical essay on "What Prophet Amos Would Say to 21st-Century Nigerian Leaders".',
              'Memorize and recite Amos 5:24.'
            ],
            teachingMaterials: ['The Holy Bible (Revised Standard Version - RSV)', 'Biblical historical maps of Israel and Judah'],
            evaluationGuide: ['WASSCE-style 20-mark structured essay assessing Biblical content and moral application.'],
            examRelevance: { waec: true, neco: true, jamb: true, commonExamAreas: ['WASSCE CRS Paper 2 Section A Old Testament Prophetic Books'] }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 10. ISLAMIC STUDIES (SENIOR) (SS 1 - 3)
  // ========================================================
  {
    id: 'sss-islamic-studies',
    name: 'Islamic Studies (Senior)',
    code: 'IRS-SSS',
    level: 'sss',
    field: 'humanities',
    isCompulsory: false,
    recommendedPeriodsPerWeek: 3,
    targetGrades: ['SS 1', 'SS 2', 'SS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html',
    description: 'Senior Islamic Studies curriculum covering Quranic Exegesis (Tafsir of selected Surahs from Juz Amma and Surah Al-Baqarah), Hadith Authentication (Sahih Bukhari, Sahih Muslim, An-Nawawi\'s 40 Hadith), Islamic Jurisprudence (Fiqh of Muamalat, Mirath/Inheritance, Nikah/Marriage), and Islamic History (The Prophet\'s Sirah, Khulafa ar-Rashidun, Spread of Islam in West Africa and the Sokoto Caliphate).',
    generalObjectives: [
      'Master advanced Quranic recitation with Tajweed rules and in-depth thematic Tafsir.',
      'Understand the methodology of Hadith sciences (Sanad, Matn, classification into Sahih, Hasan, Da\'if).',
      'Apply Shariah jurisprudence to family law, economic transactions, inheritance distribution, and dispute settlement.',
      'Trace the historical spread of Islam, Islamic scholarship, and reform movements in Nigeria and West Africa.'
    ],
    recommendedTextbooks: [
      'Islamic Studies for Senior Secondary Schools (Books 1 - 3) by B. Aisha Lemu',
      'Essential Islamic Studies for SSS by M. A. Quadri (Tonad Publishers)',
      'Comprehensive Islamic Studies for Senior Secondary by I. A. B. Balogun'
    ],
    themes: [
      {
        id: 'irs-sss-theme-1',
        themeNumber: 1,
        title: 'Hadith Sciences and Compilation History',
        description: 'Definition of Hadith and Sunnah, components of Hadith (Isnad and Matn), criteria for authenticity, the six canonical Hadith collections (Sihah as-Sittah), and study of selected Hadiths of An-Nawawi on intention, piety, and social ethics.',
        topics: [
          {
            id: 'irs-sss-top-1',
            title: 'Hadith Authentication, Classification, and An-Nawawi\'s Hadith 1 (Niyyah/Intention)',
            week: 3,
            term: 'Term 1',
            classGrade: 'SS 2',
            subTopics: ['Difference between Hadith and Sunnah', 'Components of Hadith: Isnad (Chain of narrators) and Matn (Actual text)', 'Classification of Hadith based on reliability: Sahih (Authentic), Hasan (Good), Da\'if (Weak), Mawdu\' (Fabricated)', 'An-Nawawi\'s Hadith 1: "Actions are judged by intentions" (Innamal a\'malu bin-niyyat) - Arabic text, translation, and jurisprudential lessons'],
            performanceObjectives: [
              'Explain the dual structure of Hadith (Isnad and Matn) and outline the five conditions for a Hadith to be classified as Sahih.',
              'Identify the authors of the six canonical Hadith books (Bukhari, Muslim, Abu Dawud, At-Tirmidhi, An-Nasa\'i, Ibn Majah).',
              'Recite Hadith 1 of Imam An-Nawawi in Arabic, translate it, and explain its supreme legal status in Islamic jurisprudence.'
            ],
            contentDetails: [
              'Rigorous biographical scrutiny of narrators (Ilm ar-Rijal / Jarh wa Ta\'dil).',
              'Historical context of Hadith 1: The migration (Hijrah) of a companion for marriage.',
              'Application of the intention principle to worship, business contracts, and daily ethical choices.'
            ],
            teacherActivities: [
              'Model correct Arabic recitation of Hadith 1 and break down the Isnad chain from Umar ibn al-Khattab (RA).',
              'Illustrate the scientific rigor employed by Imam al-Bukhari in compiling his Sahih.'
            ],
            studentActivities: [
              'Memorize Arabic text and English translation of Hadith 1.',
              'Write an essay analyzing how the concept of Niyyah transforms mundane daily actions into acts of worship.'
            ],
            teachingMaterials: ['Sahih al-Bukhari and An-Nawawi\'s 40 Hadith Arabic/English text', 'Isnad methodology diagram posters'],
            evaluationGuide: ['Oral Hadith recitation examination and written theory questions on Hadith classification.'],
            examRelevance: { waec: true, neco: true, jamb: true, commonExamAreas: ['WASSCE Islamic Studies Paper 2 Section A Hadith Studies'] }
          }
        ]
      }
    ]
  }
];
