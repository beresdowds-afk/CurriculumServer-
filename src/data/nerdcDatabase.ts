import { SubjectCurriculum } from '../types';

export const NERDC_SUBJECTS_DATABASE: SubjectCurriculum[] = [
  // ==========================================
  // JUNIOR SECONDARY SCHOOL (JSS 1 - 3)
  // Source: https://www.nerdc.gov.ng/content_manager/jss1-3.html
  // ==========================================
  {
    id: 'jss-english-studies',
    name: 'English Studies',
    code: 'ENG-JSS',
    level: 'jss',
    field: 'core',
    isCompulsory: true,
    recommendedPeriodsPerWeek: 5,
    targetGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/jss1-3.html',
    description: 'Comprehensive 9-Year Basic Education English curriculum integrating Reading Comprehension, Grammatical Accuracy, Continuous Writing, Oral English (Phonology), and Literature-in-English.',
    generalObjectives: [
      'Equip learners with effective communication skills in spoken and written English.',
      'Develop solid reading comprehension and critical interpretation abilities.',
      'Master English grammar, syntax, punctuation, and structural mechanics.',
      'Foster appreciation of African and world prose, poetry, and drama.'
    ],
    recommendedTextbooks: [
      'NERDC English Studies for Junior Secondary Schools Books 1-3',
      'New Oxford Secondary English Course (NOSEC) for JSS 1-3',
      'Junior English Project for Nigeria by Grant et al.'
    ],
    themes: [
      {
        id: 'eng-theme-1',
        themeNumber: 1,
        title: 'Reading and Comprehension',
        description: 'Developing literal and inferential comprehension, skimming, scanning, vocabulary development, and summary writing techniques.',
        topics: [
          {
            id: 'eng-top-1',
            title: 'Critical Reading and Answering Comprehension Questions',
            week: 2,
            term: 'Term 1',
            classGrade: 'JSS 1',
            subTopics: ['Literal comprehension', 'Inferential comprehension', 'Contextual clue deduction', 'Vocabulary building in context'],
            performanceObjectives: [
              'Read given passages at a recommended speed of 150 words per minute.',
              'Identify the central theme and supporting ideas in the passage.',
              'Infer meanings of unfamiliar words from surrounding context.',
              'Answer factual, inferential, and vocabulary questions accurately.'
            ],
            contentDetails: [
              'Selected reading passages on contemporary Nigerian culture, environmental preservation, and technological growth.',
              'Techniques for locating topic sentences in paragraphs.',
              'Distinction between stated facts and implied attitudes.'
            ],
            teacherActivities: [
              'Model expressively fluent oral reading emphasizing correct phrasing and intonation.',
              'Guide students to skim for the main idea before deep reading.',
              'Lead interactive questioning that prompts deductive thinking.'
            ],
            studentActivities: [
              'Read silently within assigned time limits.',
              'Locate key words and explain meaning in groups.',
              'Write structured answers to comprehension questions in exercise books.'
            ],
            teachingMaterials: [
              'Reading cards and audio passages',
              'Classroom dictionaries and glossaries',
              'Wall charts illustrating reading strategies (SQ3R method)'
            ],
            evaluationGuide: [
              'Assess students on accuracy of comprehension answers.',
              'Grade contextual vocabulary identification quiz.',
              'Evaluate timed reading exercises.'
            ],
            examRelevance: {
              bece: true,
              waec: false,
              commonExamAreas: ['Passage main ideas', 'Vocabulary replacement', 'Tone and mood interpretation']
            }
          },
          {
            id: 'eng-top-2',
            title: 'Summary Writing: Identifying Topic Sentences',
            week: 6,
            term: 'Term 2',
            classGrade: 'JSS 2',
            subTopics: ['Definition of Summary', 'Extracting main points', 'Eliminating illustrative details', 'Drafting concise sentences'],
            performanceObjectives: [
              'State the main point of each paragraph in not more than one sentence.',
              'Exclude redundant adjectives, examples, and parenthetical statements.',
              'Write a unified summary of a 300-word passage in 3 distinct sentences.'
            ],
            contentDetails: [
              'Passages on road safety, personal hygiene, and youth empowerment.',
              'Rules of summary writing: brevity, clarity, fidelity to the passage text.'
            ],
            teacherActivities: [
              'Demonstrate step-by-step extraction of core ideas on the whiteboard.',
              'Highlight the contrast between illustrative examples and core assertions.'
            ],
            studentActivities: [
              'Underline topic sentences in assigned paragraphs.',
              'Re-phrase extracted ideas in their own original words without distorting meaning.'
            ],
            teachingMaterials: ['Exemplary summary charts', 'Explanatory handouts', 'Highlighters'],
            evaluationGuide: ['Evaluate student 3-sentence summaries against strict rubrics (content, expression, mechanical accuracy).'],
            examRelevance: { bece: true }
          }
        ]
      },
      {
        id: 'eng-theme-2',
        themeNumber: 2,
        title: 'Grammatical Accuracy & Mechanics',
        description: 'Parts of speech, sentence structures, active & passive voices, concord, direct & indirect speeches, and punctuation.',
        topics: [
          {
            id: 'eng-top-3',
            title: 'Nouns: Types, Pluralization, and Functions',
            week: 3,
            term: 'Term 1',
            classGrade: 'JSS 1',
            subTopics: ['Proper and Common Nouns', 'Abstract and Concrete Nouns', 'Countable and Uncountable Nouns', 'Syntactic functions as Subject and Object'],
            performanceObjectives: [
              'Differentiate among proper, common, abstract, and collective nouns with relevant examples.',
              'Form plurals of regular and irregular nouns correctly.',
              'Identify the grammatical function of nouns in standard English sentences.'
            ],
            contentDetails: [
              'Definitions and categorization of nouns.',
              'Singular vs Plural inflection rules (-s, -es, -ies, vowel mutations like goose/geese).',
              'Subject, direct object, indirect object, and subject complement roles.'
            ],
            teacherActivities: [
              'Provide flashcards with varied nouns for student categorization games.',
              'Guide structural drills on sentence slots occupied by noun phrases.'
            ],
            studentActivities: [
              'Construct sentences using abstract and collective nouns.',
              'Identify nouns and classify them in a tabular worksheet.'
            ],
            teachingMaterials: ['Noun classification flashcards', 'Smartboard / Chart of irregular noun plurals'],
            evaluationGuide: ['Give a 10-item identification quiz on noun categories and grammatical functions.'],
            examRelevance: { bece: true }
          },
          {
            id: 'eng-top-4',
            title: 'Tenses and Subject-Verb Agreement (Concord)',
            week: 4,
            term: 'Term 1',
            classGrade: 'JSS 2',
            subTopics: ['Rules of Concord (Singular/Plural subject pairing)', 'Proximity Concord', 'Notional Concord', 'Present/Past/Future Perfect Tenses'],
            performanceObjectives: [
              'Apply standard rules of Subject-Verb Concord in written and spoken sentences.',
              'Identify errors in agreement and rewrite sentences correctly.',
              'Conjugate verbs accurately across simple, continuous, and perfect aspects.'
            ],
            contentDetails: [
              'Basic rule: Singular subject takes singular verb, plural subject takes plural verb.',
              'Indefinite pronouns concord (each, everyone, neither, either).',
              'Expressions like "as well as", "together with", "in addition to".'
            ],
            teacherActivities: [
              'Present diagnostic sentences containing common concord errors for class debugging.',
              'Explain the principle of grammatical agreement vs meaning.'
            ],
            studentActivities: [
              'Pair drill: compose dialogue observing strict concord rules.',
              'Complete gap-filling exercise on verb forms.'
            ],
            teachingMaterials: ['Concord rule wall chart', 'Fill-in-the-gap activity sheets'],
            evaluationGuide: ['Test students on 15 concord multiple-choice and sentence correction items.'],
            examRelevance: { bece: true }
          }
        ]
      },
      {
        id: 'eng-theme-3',
        themeNumber: 3,
        title: 'Continuous Writing (Composition)',
        description: 'Narrative, descriptive, expository, argumentative essays, formal and informal letter writing, and speech drafting.',
        topics: [
          {
            id: 'eng-top-5',
            title: 'Informal Letter Writing',
            week: 5,
            term: 'Term 1',
            classGrade: 'JSS 1',
            subTopics: ['Format and Features of Informal Letters', 'Salutation, Body, and Subscription', 'Tone and Register', 'Sample composition to a friend or sibling'],
            performanceObjectives: [
              'State the layout and five structural components of an informal letter.',
              'Write a coherent letter of at least 150 words using appropriate friendly register.',
              'Apply proper punctuation in address, date, salutation, and complimentary close.'
            ],
            contentDetails: [
              'Address format (top right corner) with date.',
              'Salutation (e.g., Dear Chidi, / Hi Fatima,).',
              'Introduction (inquiries about health/wellbeing).',
              'Body paragraphs developing the main topic.',
              'Conclusion and subscription ("Yours sincerely," or "Your loving friend," followed by first name).'
            ],
            teacherActivities: [
              'Display a full annotated model of an informal letter on the board.',
              'Explain marking parameters: Content (10), Organization (10), Expression (20), Mechanical Accuracy (10).'
            ],
            studentActivities: [
              'Draft an informal letter to a cousin narrating experiences in their new secondary school.',
              'Peer-review drafts checking for punctuation and paragraph transitions.'
            ],
            teachingMaterials: ['Sample letter posters', 'Writing guide handouts with marking criteria'],
            evaluationGuide: ['Grade essays based on standard WAEC/NECO/BECE essay scoring rubrics.'],
            examRelevance: { bece: true, commonExamAreas: ['Letter to a friend inviting them for holidays', 'Letter describing an inter-house sports event'] }
          }
        ]
      },
      {
        id: 'eng-theme-4',
        themeNumber: 4,
        title: 'Oral English (Speech & Phonology)',
        description: 'Vowel and consonant sounds, minimal pairs, stress patterns, syllable division, and intonation.',
        topics: [
          {
            id: 'eng-top-6',
            title: 'Pure Vowels (Monophthongs): Short and Long Vowel Contrasts',
            week: 1,
            term: 'Term 1',
            classGrade: 'JSS 1',
            subTopics: ['Vowels /i:/ and /ɪ/ (seat vs sit)', 'Vowels /æ/ and /ɑ:/ (cat vs cart)', 'Vowels /u:/ and /ʊ/ (pool vs pull)', 'IPA phonetic symbols'],
            performanceObjectives: [
              'Articulate the 12 pure vowel sounds in English clearly without mother-tongue interference.',
              'Distinguish between minimal pairs involving long and short vowel contrasts.',
              'Transcribe simple monosyllabic words phonetically.'
            ],
            contentDetails: [
              'Vowel chart showing tongue position (front, central, back) and lip posture (rounded, spread, neutral).',
              'Minimal pairs: bead/bid, sheep/ship, fool/full, park/pack, cord/cod.'
            ],
            teacherActivities: [
              'Pronounce vowel sounds accurately, demonstrating mouth shape and duration.',
              'Play audio recordings of native and Nigerian standard speakers.'
            ],
            studentActivities: [
              'Echo pronunciation in chorus and individually.',
              'Identify corresponding sounds in word lists.'
            ],
            teachingMaterials: ['International Phonetic Alphabet (IPA) chart', 'Audio playback player', 'Mirror for lip placement verification'],
            evaluationGuide: ['Individual oral reading test focusing on target vowel sounds.'],
            examRelevance: { bece: true }
          }
        ]
      }
    ]
  },

  {
    id: 'jss-mathematics',
    name: 'General Mathematics',
    code: 'MTH-JSS',
    level: 'jss',
    field: 'core',
    isCompulsory: true,
    recommendedPeriodsPerWeek: 5,
    targetGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/jss1-3.html',
    description: 'National curriculum covering Number and Numeration, Basic Operations, Algebraic Processes, Geometry and Mensuration, and Everyday Statistics & Probability.',
    generalObjectives: [
      'Develop mathematical problem-solving, logical reasoning, and analytical competencies.',
      'Master arithmetic computation, fractions, decimals, percentages, and standard form.',
      'Understand algebraic equations, factorisation, graphs, and simultaneous relations.',
      'Apply geometric and mensuration concepts to everyday physical measurements.'
    ],
    recommendedTextbooks: [
      'New General Mathematics for Junior Secondary Schools (Books 1 - 3) by Channon, Smith, Head',
      'MAN (Mathematical Association of Nigeria) Mathematics for JSS 1-3',
      'Essential Mathematics for Junior Secondary Schools by Oluwasanmi'
    ],
    themes: [
      {
        id: 'mth-theme-1',
        themeNumber: 1,
        title: 'Number and Numeration',
        description: 'Whole numbers, prime factors, LCM & HCF, fractions, decimals, percentages, standard form, and number bases (Base 2 & 10).',
        topics: [
          {
            id: 'mth-top-1',
            title: 'Highest Common Factor (HCF) and Lowest Common Multiple (LCM)',
            week: 2,
            term: 'Term 1',
            classGrade: 'JSS 1',
            subTopics: ['Prime factorisation index form', 'Finding HCF of 2 and 3 numbers', 'Finding LCM using prime factor method', 'Word problems involving HCF and LCM'],
            performanceObjectives: [
              'Express positive integers as products of their prime factors in index notation.',
              'Calculate the HCF and LCM of up to three 3-digit numbers.',
              'Solve real-life word problems involving sharing, grouping, and periodic intervals using HCF and LCM.'
            ],
            contentDetails: [
              'Prime numbers identification (2, 3, 5, 7, 11, 13, 17, 19...).',
              'Factor tree and successive division methods.',
              'Applications: traffic light synchronisation, tile laying.'
            ],
            teacherActivities: [
              'Guide students through factor tree decomposition on the board.',
              'Illustrate LCM and HCF extraction using intersection and union of prime factor sets.'
            ],
            studentActivities: [
              'Decompose integers into prime factors.',
              'Solve cooperative problem sets in small groups.'
            ],
            teachingMaterials: ['Prime number charts', 'Number grid charts (1-100 Sieve of Eratosthenes)', 'Worksheets'],
            evaluationGuide: ['10-question computation test and 2 real-life application word problems.'],
            examRelevance: { bece: true }
          },
          {
            id: 'mth-top-2',
            title: 'Fractions, Decimals, Percentages, and Approximations',
            week: 3,
            term: 'Term 1',
            classGrade: 'JSS 1',
            subTopics: ['Operations on Fractions (BODMAS)', 'Conversion between fractions, decimals, and percentages', 'Significant figures and Decimal places', 'Percentage Increase and Decrease'],
            performanceObjectives: [
              'Perform combined arithmetic operations on mixed fractions following order of operations (BODMAS).',
              'Convert freely between common fractions, terminating/recurring decimals, and percentages.',
              'Round numbers to given numbers of decimal places and significant figures.'
            ],
            contentDetails: [
              'Addition, subtraction, multiplication, division of fractions.',
              'Expressing quantities as percentages of others.',
              'Rules of significant figures (zeros between non-zero digits, leading vs trailing zeros).'
            ],
            teacherActivities: [
              'Demonstrate step-by-step BODMAS hierarchy.',
              'Show common traps in decimal point placement.'
            ],
            studentActivities: [
              'Calculate percentage profit/loss and discounts from real market scenarios.',
              'Practice rounding calculations in exercise books.'
            ],
            teachingMaterials: ['Fraction discs / models', 'Market price tags simulation sheets'],
            evaluationGuide: ['Timed computation test on fractional arithmetic and approximation.'],
            examRelevance: { bece: true }
          },
          {
            id: 'mth-top-3',
            title: 'Number Bases: Binary Arithmetic (Base 2)',
            week: 5,
            term: 'Term 1',
            classGrade: 'JSS 2',
            subTopics: ['Conversion from Base 10 to Base 2', 'Conversion from Base 2 to Base 10', 'Addition and Subtraction of Binary Numbers', 'Multiplication of Binary Numbers'],
            performanceObjectives: [
              'Convert integers from denary (base 10) to binary (base 2) by repeated division.',
              'Expand and evaluate binary numbers in powers of 2 to obtain denary equivalent.',
              'Perform binary addition, subtraction, and simple multiplication accurately.'
            ],
            contentDetails: [
              'Place values in base 2: 2^0=1, 2^1=2, 2^2=4, 2^3=8, 2^4=16, etc.',
              'Binary addition rules: 0+0=0, 0+1=1, 1+0=1, 1+1=10_2, 1+1+1=11_2.',
              'Significance of binary systems in computer processors and digital electronics.'
            ],
            teacherActivities: [
              'Connect binary digits (0 and 1) to on/off states in digital electronics.',
              'Demonstrate regrouping/carrying in base 2 arithmetic.'
            ],
            studentActivities: [
              'Convert given denary ages/dates to binary strings.',
              'Solve binary arithmetic problems on the whiteboard.'
            ],
            teachingMaterials: ['Binary place-value charts', 'Interactive digital switch model'],
            evaluationGuide: ['Short test with conversions and binary arithmetic problems.'],
            examRelevance: { bece: true }
          }
        ]
      },
      {
        id: 'mth-theme-2',
        themeNumber: 2,
        title: 'Algebraic Processes',
        description: 'Algebraic expressions, simple linear equations, simultaneous linear equations, quadratic factorisation, linear inequalities, and graph plotting.',
        topics: [
          {
            id: 'mth-top-4',
            title: 'Linear Equations in One Variable & Word Problems',
            week: 4,
            term: 'Term 2',
            classGrade: 'JSS 1',
            subTopics: ['Solving equations with unknowns on one side', 'Equations with brackets and fractions', 'Translating word problems into algebraic equations'],
            performanceObjectives: [
              'Solve linear equations of the form ax + b = c and a(x + b) = c(x + d).',
              'Translate verbal statements into algebraic equations and solve them.',
              'Verify solutions by substituting values back into the original equation.'
            ],
            contentDetails: [
              'Balance method: performing the same operation on both sides of the equals sign.',
              'Clearing denominators by multiplying by LCM.',
              'Age, money, and perimeter word problems.'
            ],
            teacherActivities: [
              'Use a physical two-pan balance scale metaphor to teach the balance method.',
              'Model reading comprehension strategies for parsing word problem constraints.'
            ],
            studentActivities: [
              'Formulate equations from real-life prompts (e.g., "The sum of three consecutive numbers is 72").',
              'Solve and cross-check solutions with partners.'
            ],
            teachingMaterials: ['Balance scale illustration', 'Word-to-algebra translation matching cards'],
            evaluationGuide: ['5 algebraic solving questions and 3 word problem applications.'],
            examRelevance: { bece: true }
          },
          {
            id: 'mth-top-5',
            title: 'Simultaneous Linear Equations',
            week: 5,
            term: 'Term 1',
            classGrade: 'JSS 3',
            subTopics: ['Elimination Method', 'Substitution Method', 'Graphical Solution', 'Word problems involving two unknowns'],
            performanceObjectives: [
              'Solve pairs of simultaneous linear equations using the elimination method.',
              'Solve simultaneous linear equations using the substitution method.',
              'Plot linear graphs on Cartesian plane to locate intersection point (x, y).'
            ],
            contentDetails: [
              'Equations in two variables: ax + by = p and cx + dy = q.',
              'Equating coefficients for elimination.',
              'Expressing one variable in terms of the other for substitution.'
            ],
            teacherActivities: [
              'Demonstrate both algebraic methods side-by-side with the same equation pair.',
              'Demonstrate graph plotting on Cartesian grid.'
            ],
            studentActivities: [
              'Work through assigned systems of equations.',
              'Plot graphs on 2mm grid graph sheets to find point of intersection.'
            ],
            teachingMaterials: ['Graph boards & chalk/marker', '2mm graph books', 'Rulers & pencils'],
            evaluationGuide: ['Graded worksheet on elimination, substitution, and graphical solutions.'],
            examRelevance: { bece: true, waec: true }
          }
        ]
      },
      {
        id: 'mth-theme-3',
        themeNumber: 3,
        title: 'Geometry and Mensuration',
        description: 'Plane shapes, angles, Pythagoras theorem, perimeters & areas of plane shapes, surface areas & volumes of 3D solids, circle geometry, and trigonometric ratios (sin, cos, tan).',
        topics: [
          {
            id: 'mth-top-6',
            title: 'Pythagoras Theorem & Right-Angled Triangles',
            week: 3,
            term: 'Term 2',
            classGrade: 'JSS 2',
            subTopics: ['Statement and proof of Pythagoras theorem', 'Finding hypotenuse length', 'Finding adjacent or opposite sides', 'Pythagorean triples (3,4,5; 5,12,13)'],
            performanceObjectives: [
              'State Pythagoras theorem in words and algebraic notation (a² + b² = c²).',
              'Calculate the unknown side of any right-angled triangle given two sides.',
              'Solve practical problems involving ladders, distances, and heights.'
            ],
            contentDetails: [
              'Hypotenuse definition (side opposite right angle).',
              'c = √(a² + b²), a = √(c² - b²).',
              'Real-life applications: finding diagonal of a football field.'
            ],
            teacherActivities: [
              'Demonstrate geometric proof using square grid cutout tiles (3² + 4² = 9 + 16 = 25 = 5²).',
              'Pose practical real-world scenario calculations.'
            ],
            studentActivities: [
              'Draw right-angled triangles with ruler and set-square, measure sides to verify theorem.',
              'Compute hypotenuse and leg lengths.'
            ],
            teachingMaterials: ['Mathematical set instruments', 'Square grid cardboard models', 'Calculators'],
            evaluationGuide: ['Solve 6 computational problems and 2 word problems involving Pythagoras theorem.'],
            examRelevance: { bece: true }
          }
        ]
      }
    ]
  },

  {
    id: 'jss-basic-science',
    name: 'Basic Science',
    code: 'BSC-JSS',
    level: 'jss',
    field: 'core',
    isCompulsory: true,
    recommendedPeriodsPerWeek: 4,
    targetGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/jss1-3.html',
    description: 'Integrated Science curriculum combining foundations of Living Organisms, Materials & Matter, Energy & Forces, Earth, Space & Environmental Science, Human Body, and Science Technology & Society.',
    generalObjectives: [
      'Foster scientific curiosity, keen observation, experimentation, and critical reasoning.',
      'Understand fundamental concepts of living vs non-living systems and ecosystem interactions.',
      'Grasp energy transformations, forces, motion, matter, and chemical changes.',
      'Appreciate human reproductive health, environmental conservation, and drug abuse prevention.'
    ],
    recommendedTextbooks: [
      'STAN (Science Teachers Association of Nigeria) Basic Science for JSS 1-3',
      'NERDC Basic Science for Universal Basic Education',
      'Precious Basic Science for Junior Secondary Schools'
    ],
    themes: [
      {
        id: 'bsc-theme-1',
        themeNumber: 1,
        title: 'You and the Environment',
        description: 'Environmental pollution, sanitation, deforestation, bush burning, flooding, erosion, and conservation of natural resources.',
        topics: [
          {
            id: 'bsc-top-1',
            title: 'Environmental Pollution: Types, Causes, and Control Measures',
            week: 2,
            term: 'Term 1',
            classGrade: 'JSS 1',
            subTopics: ['Air pollution and greenhouse gases', 'Water pollution and aquatic life impact', 'Land/soil pollution and waste disposal', 'Noise pollution and health hazards', 'Control strategies (3Rs: Reduce, Reuse, Recycle)'],
            performanceObjectives: [
              'Define environmental pollution and identify four major types.',
              'List at least three specific pollutants and causes for each pollution type.',
              'Describe the adverse effects of pollution on humans, animals, and ecosystems.',
              'Formulate practical waste management strategies in school and home environments.'
            ],
            contentDetails: [
              'Air pollutants: carbon monoxide, sulfur dioxide, dust, vehicle exhaust.',
              'Water pollutants: untreated industrial effluent, crude oil spillage in Niger Delta, open dumping.',
              'Soil pollutants: non-biodegradable polythene bags, agrochemicals.',
              'Biodegradable vs non-biodegradable waste classification.'
            ],
            teacherActivities: [
              'Show photographic and video evidence of pollution hotspots in Nigerian cities.',
              'Lead a mini campus waste audit and segregation activity.'
            ],
            studentActivities: [
              'Collect waste samples from school compound and classify into recyclable vs organic.',
              'Create educational posters advocating for clean air and water.'
            ],
            teachingMaterials: ['Pollution specimen charts', 'Waste collection bins (color coded)', 'Audio-visual documentary clips'],
            evaluationGuide: ['Written assessment on pollution types, pollutants, and remediation steps.'],
            examRelevance: { bece: true }
          }
        ]
      },
      {
        id: 'bsc-theme-2',
        themeNumber: 2,
        title: 'Living Things and Non-Living Things',
        description: 'Characteristics of living things (MR NIGER D), cell structure, classification of plants & animals, human growth, puberty, reproduction, and genetics.',
        topics: [
          {
            id: 'bsc-top-2',
            title: 'Living Things: Characteristics and Plant vs Animal Cells',
            week: 1,
            term: 'Term 1',
            classGrade: 'JSS 1',
            subTopics: ['Life processes (Movement, Respiration, Nutrition, Irritability, Growth, Excretion, Reproduction, Death)', 'Microscopic structure of a Cell', 'Plant Cell vs Animal Cell organelles', 'Functions of Nucleus, Cytoplasm, Cell Membrane, Cell Wall, Chloroplast'],
            performanceObjectives: [
              'Enumerate all 8 characteristics of living things with descriptive examples.',
              'Draw and label typical plant and animal cells viewed under light microscope.',
              'Construct a comparative table highlighting four distinct differences between plant and animal cells.'
            ],
            contentDetails: [
              'MR NIGER D mnemonic.',
              'Cell as basic structural and functional unit of life.',
              'Differences: Cell wall (present in plants, absent in animals), Chloroplast (present in plants), Vacuole size, shape.'
            ],
            teacherActivities: [
              'Set up compound light microscope with prepared slides of onion epidermal peel and cheek epithelial cells.',
              'Guide students through proper focusing technique (coarse vs fine adjustment).'
            ],
            studentActivities: [
              'View cell slides under microscope.',
              'Draw neat labeled biological diagrams with title and magnification.'
            ],
            teachingMaterials: ['Compound light microscope', 'Prepared slides (Onion epidermal cells, Cheek cells)', 'Cover slips, iodine stain, charts'],
            evaluationGuide: ['Assess labeled cell diagrams and tabular comparison test.'],
            examRelevance: { bece: true }
          }
        ]
      },
      {
        id: 'bsc-theme-3',
        themeNumber: 3,
        title: 'Energy and Matter',
        description: 'Forms of energy, law of conservation of energy, heat transfer, kinetic theory of matter, elements, compounds, mixtures, and chemical reactions.',
        topics: [
          {
            id: 'bsc-top-3',
            title: 'Kinetic Theory of Matter: States of Matter & Phase Changes',
            week: 4,
            term: 'Term 2',
            classGrade: 'JSS 2',
            subTopics: ['Solid, Liquid, Gas particle arrangement', 'Assumptions of Kinetic Theory', 'Melting, Boiling, Evaporation, Condensation, Sublimation', 'Diffusion and Brownian motion in fluids'],
            performanceObjectives: [
              'Describe the arrangement, motion, and inter-particle forces in solids, liquids, and gases.',
              'Explain phase transformations in terms of energy absorption and particle speed.',
              'Demonstrate diffusion using potassium permanganate crystals in water and perfume in air.'
            ],
            contentDetails: [
              'Solid: tightly packed, fixed volume and shape, vibrate about mean positions.',
              'Liquid: loosely packed, fixed volume, takes shape of container.',
              'Gas: far apart, rapid random motion, negligible intermolecular forces.',
              'Diffusion definition: movement of particles from high to low concentration.'
            ],
            teacherActivities: [
              'Perform live demonstration: drop potassium permanganate in a beaker of water.',
              'Spray aerosol in one corner of classroom and time diffusion rate across room.'
            ],
            studentActivities: [
              'Act out particle motion in solids, liquids, and gases via role-play.',
              'Record observation times for diffusion experiment.'
            ],
            teachingMaterials: ['Beakers, water, potassium permanganate crystals', 'Aerosol spray', 'Ball-and-stick molecular models'],
            evaluationGuide: ['Test on kinetic theory postulates and particle characteristics across states.'],
            examRelevance: { bece: true }
          }
        ]
      }
    ]
  },

  {
    id: 'jss-basic-technology',
    name: 'Basic Technology',
    code: 'BTECH-JSS',
    level: 'jss',
    field: 'technology',
    isCompulsory: true,
    recommendedPeriodsPerWeek: 4,
    targetGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/jss1-3.html',
    description: 'Technical education curriculum covering Materials (Wood, Metals, Plastics, Ceramics), Technical Drawing, Hand Tools, Simple Machines, Energy & Power, Building Construction, and Maintenance Safety.',
    generalObjectives: [
      'Instill practical technical skills, workshop safety discipline, and engineering literacy.',
      'Master plane and solid geometry technical drawing using standard drafting tools.',
      'Identify, handle, and maintain woodworking, metalworking, and electrical hand tools.',
      'Understand structural principles in building construction and basic mechanical drives.'
    ],
    recommendedTextbooks: [
      'Basic Technology for Junior Secondary Schools (Books 1-3) by EVB',
      'NERDC Basic Technology Curriculum Guide',
      'Introductory Technology for JSS by Nneji et al.'
    ],
    themes: [
      {
        id: 'btech-theme-1',
        themeNumber: 1,
        title: 'Understanding Technology & Workshop Safety',
        description: 'Technology definition, importance, workshop safety rules, personal protective equipment (PPE), fire safety, and first aid.',
        topics: [
          {
            id: 'btech-top-1',
            title: 'Workshop Safety Rules, Hazards, and Fire Prevention',
            week: 1,
            term: 'Term 1',
            classGrade: 'JSS 1',
            subTopics: ['Causes of workshop accidents', 'Safety rules for tools and machines', 'Personal Protective Equipment (Goggles, Helmets, Boots, Aprons)', 'Types of fire (Class A, B, C, D) and Extinguishers (Water, Foam, CO2, Dry Powder)'],
            performanceObjectives: [
              'List 5 primary causes of accidents in a technical workshop.',
              'State 6 imperative workshop safety regulations for students.',
              'Identify appropriate fire extinguishers for electrical, chemical, and wood fires.'
            ],
            contentDetails: [
              'Unsafe acts vs unsafe conditions.',
              'Safety signs and color codes (Red: prohibition/danger, Yellow: caution, Blue: mandatory, Green: safe/exit).',
              'Operation of a portable fire extinguisher (PASS technique: Pull, Aim, Squeeze, Sweep).'
            ],
            teacherActivities: [
              'Take students on a workshop safety inspection tour.',
              'Demonstrate PASS technique with an inactive fire extinguisher model.'
            ],
            studentActivities: [
              'Inspect workshop for hazards and draft a safety compliance checklist.',
              'Practice donning PPE correctly.'
            ],
            teachingMaterials: ['Safety goggles, heavy gloves, overalls, helmets', 'Fire extinguisher canister', 'Safety symbols wall chart'],
            evaluationGuide: ['Safety rules quiz and fire extinguisher selection test.'],
            examRelevance: { bece: true }
          }
        ]
      },
      {
        id: 'btech-theme-2',
        themeNumber: 2,
        title: 'Drawing Practice & Technical Drafting',
        description: 'Drawing instruments, lettering, border lines, title block, geometric constructions (bisection, angles, triangles, polygons, tangents), isometric and oblique projection.',
        topics: [
          {
            id: 'btech-top-2',
            title: 'Technical Drawing Instruments & Board Practice',
            week: 3,
            term: 'Term 1',
            classGrade: 'JSS 1',
            subTopics: ['Drawing board, T-square, Set-squares (30-60° and 45°)', 'Compass, Dividers, French curves, Scale rule, Drawing pencils (2H, H, HB)', 'Securing paper to board', 'Border lines (10mm) and Title Block (Name, Class, Title, Date, Scale)'],
            performanceObjectives: [
              'Identify all major technical drawing instruments and state their specific functions.',
              'Fasten an A3 drawing paper squarely to the drawing board using masking tape and T-square.',
              'Draw standard 10mm border lines and construct a well-proportioned title block using 2H pencil.'
            ],
            contentDetails: [
              'Care and maintenance of drawing instruments.',
              'Pencil grades: Hard pencils (2H, 3H) for construction and projection lines; Soft/Medium (HB, H) for outlines and lettering.',
              'Single-stroke vertical and inclined capital lettering guidelines.'
            ],
            teacherActivities: [
              'Demonstrate true horizontal alignment of paper using T-square head pressed against board working edge.',
              'Draw model title block on chalkboard using drafting board.'
            ],
            studentActivities: [
              'Mount drawing sheet on individual board.',
              'Rule border lines and complete title block lettering with high precision.'
            ],
            teachingMaterials: ['Drawing boards, T-squares, Set-squares', 'A3 drawing sheets, drafting tape, 2H pencils, erasers'],
            evaluationGuide: ['Assess precision, neatness, line weight consistency, and lettering accuracy.'],
            examRelevance: { bece: true }
          }
        ]
      }
    ]
  },

  {
    id: 'jss-business-studies',
    name: 'Business Studies',
    code: 'BUS-JSS',
    level: 'jss',
    field: 'business',
    isCompulsory: false,
    recommendedPeriodsPerWeek: 4,
    targetGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/jss1-3.html',
    description: 'Foundational commercial curriculum integrating Office Practice, Commerce, Bookkeeping / Accounting, and Keyboarding / Computer Office Applications.',
    generalObjectives: [
      'Acquire basic business knowledge, office ethics, and commercial awareness.',
      'Master fundamental double-entry bookkeeping principles and cash books.',
      'Understand consumer rights, financial institutions, trade channels, and keyboarding skills.'
    ],
    recommendedTextbooks: ['NERDC Business Studies for JSS 1-3', 'WABP Business Studies by Egbe et al.'],
    themes: [
      {
        id: 'bus-theme-1',
        themeNumber: 1,
        title: 'The Office and Office Equipment',
        description: 'Office layout, receptionist duties, filing systems, business correspondence, and office machinery.',
        topics: [
          {
            id: 'bus-top-1',
            title: 'The Office: Definition, Types, and Functions',
            week: 1,
            term: 'Term 1',
            classGrade: 'JSS 1',
            subTopics: ['Open Plan Office vs Closed/Small Office', 'Advantages and Disadvantages of each office type', 'Core office functions (Receiving, Recording, Processing, Storing, and Giving Information)'],
            performanceObjectives: [
              'Define an office and list five essential clerical functions.',
              'Compare open-plan and cellular office arrangements across privacy, cost, supervision, and lighting.',
              'Identify common office machines (computer, photocopier, shredder, filing cabinets).'
            ],
            contentDetails: ['Office definition as administrative hub.', 'Open plan benefits: economical, easy communication, flexible layout; disadvantages: noise, distraction, lack of confidentiality.'],
            teacherActivities: ['Present floor plans of open-plan and cellular offices.', 'Facilitate class discussion on modern digital virtual offices.'],
            studentActivities: ['Draw a comparative chart in notebooks.', 'Simulate an office workflow role-play.'],
            teachingMaterials: ['Office layout blueprints', 'Pictures of modern workstations'],
            evaluationGuide: ['Multiple choice and short answer test on office types and clerical functions.'],
            examRelevance: { bece: true }
          }
        ]
      }
    ]
  },

  // ==========================================
  // SENIOR SECONDARY SCHOOL (SSS 1 - 3)
  // Source: https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html
  // ==========================================
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
    description: 'Senior Secondary English curriculum aligned with WAEC (WASSCE), NECO (SSCE), and JAMB (UTME) syllabi. Covers Advanced Comprehension, Summary Writing, Continuous Writing (Essays & Articles), Lexis & Structure, and Oral English (Vowels, Consonants, Rhyme, Stress & Intonation).',
    generalObjectives: [
      'Cultivate high-level communicative competence, critical analysis, and stylistic versatility in spoken and written English.',
      'Master academic essay writing, argumentative discourse, formal reports, and speech composition.',
      'Achieve advanced competence in grammatical structure, clauses, idioms, phrasal verbs, and lexis.',
      'Attain distinction level preparation for WASSCE, NECO SSCE, and UTME examinations.'
    ],
    recommendedTextbooks: [
      'Round-Up English for Senior Secondary Certificate (WAEC/NECO) by Idowu et al.',
      'Senior English Project for Nigeria (Books 1-3) by Grant & Wang',
      'The Invisible Teacher: A Comprehensive Guide to English Language by B. Adepoju',
      'Count Down to WASSCE/SSCE English Language by Evans'
    ],
    themes: [
      {
        id: 'eng-sss-theme-1',
        themeNumber: 1,
        title: 'Continuous Writing (Advanced Essays & Letters)',
        description: 'Expository essays, argumentative debates, narrative compositions, descriptive prose, formal letters, speeches, and articles for publication in national dailies.',
        topics: [
          {
            id: 'eng-sss-top-1',
            title: 'Article Writing for National Dailies and Magazines',
            week: 3,
            term: 'Term 1',
            classGrade: 'SS 1',
            subTopics: ['Format: Catchy Title, By-line, Introduction, Logical Body, Conclusion', 'Register and Formal Tone', 'Persuasive Rhetoric and Evidence-based Reasoning', 'Sample topic: "Tackling Youth Unemployment through Digital Skills"'],
            performanceObjectives: [
              'Structure an article of 450 words suitable for publication in a national newspaper.',
              'Formulate an engaging headline and by-line reflecting author identity.',
              'Develop cohesive body paragraphs with transitional markers (Furthermore, Consequently, In spite of).',
              'Comply with WAEC/NECO essay grading criteria (Content 10, Organization 10, Expression 20, Mechanical Accuracy 10).'
            ],
            contentDetails: [
              'Difference between an Article, a Letter to the Editor, and an Expository Essay.',
              'Techniques for rhetorical persuasion: statistical reference, expert quotation, counter-argument refutation.',
              'Mechanics: avoiding run-on sentences, dangling modifiers, and punctuation slips.'
            ],
            teacherActivities: [
              'Analyze sample published articles from Nigerian newspapers (The Guardian, Punch, ThisDay).',
              'Conduct a breakdown session on WASSCE Chief Examiner reports on essay writing.'
            ],
            studentActivities: [
              'Draft an outline with thesis statement and 4 supporting arguments.',
              'Write full 450-word article under timed exam conditions (45 minutes).'
            ],
            teachingMaterials: ['Copies of newspaper opinion columns', 'WASSCE marking scheme rubric printouts'],
            evaluationGuide: ['Score compositions out of 50 marks using official WAEC marking criteria.'],
            examRelevance: { waec: true, neco: true, commonExamAreas: ['WASSCE Section A Question 1-5 (Articles & Speeches)'] }
          }
        ]
      },
      {
        id: 'eng-sss-theme-2',
        themeNumber: 2,
        title: 'Advanced Lexis and Structure',
        description: 'Noun clauses, Adjectival clauses, Adverbial clauses, Phrasal verbs, Idiomatic expressions, Prepositional collocations, and Figure of Speech.',
        topics: [
          {
            id: 'eng-sss-top-2',
            title: 'Grammatical Functions of Clauses: Noun, Adjectival & Adverbial Clauses',
            week: 4,
            term: 'Term 2',
            classGrade: 'SS 2',
            subTopics: ['Identifying subordinate clauses in complex sentences', 'Noun clause functions (Subject of verb, Object of verb, Subject complement, Object of preposition, Apposition to noun)', 'Adjectival (Relative) clause modifying nouns', 'Adverbial clauses of time, reason, concession, manner, condition'],
            performanceObjectives: [
              'Isolate underlined subordinate clauses from complex comprehension extracts.',
              'Name the exact grammatical name of the clause.',
              'State the precise grammatical function (e.g., "It modifies the verb...", "It serves as the object of the verb...").'
            ],
            contentDetails: [
              'Noun clause markers: that, what, whatever, whoever, how, why.',
              'Adjectival clause relative pronouns: who, whom, whose, which, that.',
              'Common errors in clause analysis penalized by WAEC examiners.'
            ],
            teacherActivities: [
              'Present 10 authentic WASSCE comprehension clause extraction past questions on the board.',
              'Drill students on the rigid 2-part exam response formula (Grammatical Name + Grammatical Function).'
            ],
            studentActivities: [
              'Analyze 15 test sentences in pairs identifying name and function.',
              'Write original complex sentences containing specified clause types.'
            ],
            teachingMaterials: ['WASSCE past question compilations (2010-2024)', 'Clause classification chart'],
            evaluationGuide: ['Timed 20-mark clause identification test following exact WAEC standard.'],
            examRelevance: { waec: true, neco: true, commonExamAreas: ['WASSCE Paper 2 Comprehension Question (h)'] }
          }
        ]
      }
    ]
  },

  {
    id: 'sss-general-mathematics',
    name: 'General Mathematics',
    code: 'MTH-SSS',
    level: 'sss',
    field: 'core',
    isCompulsory: true,
    recommendedPeriodsPerWeek: 5,
    targetGrades: ['SS 1', 'SS 2', 'SS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html',
    description: 'Senior Secondary General Mathematics syllabus covering Number & Numeration (Logarithms, Surds, Matrices), Algebraic Processes (Quadratic equations, AP & GP, Linear Inequalities, Polynomials), Geometry & Trigonometry (Circle Theorems, Sine & Cosine rules, Bearings & Distances), Mensuration (Surface areas & Volumes of Cones, Pyramids, Spheres, Frustums), and Statistics & Probability.',
    generalObjectives: [
      'Master mathematical theory, deductive geometric proofs, and rigorous analytical methods.',
      'Solve advanced algebraic, trigonometric, and mensuration problems in real-world contexts.',
      'Attain complete mastery for WAEC WASSCE, NECO SSCE, and JAMB UTME mathematics examinations.'
    ],
    recommendedTextbooks: [
      'New General Mathematics for Senior Secondary Schools (Books 1 - 3) by MF Macrae et al.',
      'Comprehensive Mathematics for Senior Secondary Schools by DB Adu',
      'MAN Mathematics for SSS 1-3',
      'JAMB Mathematics Past Questions & Solutions'
    ],
    themes: [
      {
        id: 'mth-sss-theme-1',
        themeNumber: 1,
        title: 'Number and Numeration (Logarithms & Surds)',
        description: 'Indices, laws of logarithms, four-figure tables, operations on surds, rationalization of denominators, sequences and series (AP & GP).',
        topics: [
          {
            id: 'mth-sss-top-1',
            title: 'Surds: Simplification, Conjugate Surds, and Rationalisation',
            week: 4,
            term: 'Term 1',
            classGrade: 'SS 1',
            subTopics: ['Definition of Surds and Radicals', 'Rules of Surds: √(ab) = √a × √b, √(a/b) = √a / √b', 'Addition and Subtraction of like surds', 'Rationalising monomial denominators (a/√b)', 'Rationalising binomial denominators using conjugates (a / (b + √c))'],
            performanceObjectives: [
              'Simplify higher numerical surds to their simplest radical form a√b.',
              'Perform arithmetic addition, subtraction, and multiplication on radical expressions.',
              'Rationalize fractional denominators containing both single and binomial radical terms.'
            ],
            contentDetails: [
              'Conjugate of (√a + √b) is (√a - √b).',
              'Difference of two squares application: (√a + √b)(√a - √b) = a - b.',
              'Solving radical equations containing single unknown under square root.'
            ],
            teacherActivities: [
              'Demonstrate step-by-step why denominators cannot contain irrational numbers in standard mathematical form.',
              'Work through complex WASSCE past question examples on board.'
            ],
            studentActivities: [
              'Simplify assigned list of 10 surd expressions.',
              'Solve rationalization problems and verify answers.'
            ],
            teachingMaterials: ['Radical arithmetic rule charts', 'Scientific calculators for decimal verification'],
            evaluationGuide: ['10-question surd simplification and rationalisation test.'],
            examRelevance: { waec: true, neco: true, jamb: true }
          },
          {
            id: 'mth-sss-top-2',
            title: 'Sequences & Series: Arithmetic Progression (AP) and Geometric Progression (GP)',
            week: 6,
            term: 'Term 2',
            classGrade: 'SS 2',
            subTopics: ['Definition of sequence, series, terms', 'nth term of an AP: Tn = a + (n-1)d', 'Sum of first n terms of an AP: Sn = n/2 [2a + (n-1)d]', 'nth term of a GP: Tn = ar^(n-1)', 'Sum of GP: Sn = a(r^n - 1)/(r - 1) and Sum to Infinity: S∞ = a / (1 - r)'],
            performanceObjectives: [
              'Derive and apply formulas for the nth term and sum of n terms of an Arithmetic Progression.',
              'Calculate the first term (a), common difference (d), or number of terms (n) given system conditions.',
              'Solve geometric sequence problems including sum of finite GP and sum to infinity where |r| < 1.',
              'Solve real-world financial problems on compound growth and depreciation using AP/GP models.'
            ],
            contentDetails: [
              'Simultaneous linear equations arising from AP condition statements (e.g., "The 3rd term is 14 and 8th term is 39").',
              'Geometric means insertion between two numbers.'
            ],
            teacherActivities: [
              'Derive formulas on the whiteboard using Gauss summation technique.',
              'Guide students through multi-step word problems from recent WASSCE past papers.'
            ],
            studentActivities: [
              'Derive AP/GP properties in exercise books.',
              'Work through past exam questions in timed sets.'
            ],
            teachingMaterials: ['Sequence pattern charts', 'Past exam question sheets'],
            evaluationGuide: ['Test comprising 4 AP/GP theory questions and 10 multiple-choice items.'],
            examRelevance: { waec: true, neco: true, jamb: true, commonExamAreas: ['WASSCE Paper 2 Section B 12-mark question'] }
          }
        ]
      },
      {
        id: 'mth-sss-theme-2',
        themeNumber: 2,
        title: 'Circle Theorems & Deductive Geometry',
        description: 'Angle at centre is twice angle at circumference, angles in same segment, angle in semi-circle, cyclic quadrilateral opposite angles sum to 180°, tangent perpendicular to radius, alternate segment theorem.',
        topics: [
          {
            id: 'mth-sss-top-3',
            title: 'The Seven Core Circle Theorems & Geometric Proofs',
            week: 3,
            term: 'Term 1',
            classGrade: 'SS 2',
            subTopics: ['Theorem 1: Straight line drawn from centre to bisect chord is perpendicular', 'Theorem 2: Angle subtended at centre is twice angle at circumference', 'Theorem 3: Angles in the same segment of a circle are equal', 'Theorem 4: Angle in a semi-circle is a right angle (90°)', 'Theorem 5: Opposite angles of a cyclic quadrilateral are supplementary (sum to 180°)', 'Theorem 6: Tangents from external point are equal in length', 'Theorem 7: Alternate Segment Theorem'],
            performanceObjectives: [
              'State and geometrically prove each of the core circle theorems with reasons.',
              'Calculate unknown angles in intricate intersecting geometric circle diagrams.',
              'Provide mathematical justification for every deduction using standard notation.'
            ],
            contentDetails: [
              'Formal deductive proof structures (Given, To Prove, Construction, Proof).',
              'Tangent-chord angle relationships.',
              'Intersecting chord theorem (PA × PB = PC × PD).'
            ],
            teacherActivities: [
              'Draw clear geometric circle diagrams on board with colored chalk/markers.',
              'Guide step-by-step formal theorem proofs.'
            ],
            studentActivities: [
              'Construct theorems with compass and ruler to measure angles and verify experimentally.',
              'Solve multi-angle circle theorem puzzles.'
            ],
            teachingMaterials: ['Board mathematical instruments (Compass, Protractor, Ruler)', 'Dynamic geometry software screenshots / interactive models'],
            evaluationGuide: ['Solve 5 comprehensive circle theorem calculation problems with complete written justifications.'],
            examRelevance: { waec: true, neco: true, commonExamAreas: ['WASSCE Paper 2 compulsory geometry question'] }
          }
        ]
      },
      {
        id: 'mth-sss-theme-3',
        themeNumber: 3,
        title: 'Trigonometry: Sine Rule, Cosine Rule & Bearings',
        description: 'Trigonometric ratios, angles of elevation and depression, Sine rule (a/sinA = b/sinB = c/sinC), Cosine rule (a² = b² + c² - 2bc cosA), 3-figure bearings, and back bearings.',
        topics: [
          {
            id: 'mth-sss-top-4',
            title: 'Bearings and Distances with Sine & Cosine Rules',
            week: 5,
            term: 'Term 2',
            classGrade: 'SS 2',
            subTopics: ['Three-figure bearings (000° to 360°)', 'Cardinal directions and Back bearings', 'Sketching accurate bearing diagrams from narrative descriptions', 'Applying Sine Rule to non-right triangles', 'Applying Cosine Rule to find unknown distances and angles'],
            performanceObjectives: [
              'Convert between compass bearings and three-figure bearings.',
              'Calculate the back bearing of any trajectory accurately.',
              'Draw accurate representative sketches of ships/aircraft navigational routes.',
              'Calculate final distance and bearing between points using Sine and Cosine rules.'
            ],
            contentDetails: [
              'Back bearing rule: add 180° if < 180°; subtract 180° if > 180°.',
              'Selecting between Sine Rule (ASA, AAS, SSA) and Cosine Rule (SAS, SSS).'
            ],
            teacherActivities: [
              'Demonstrate navigational vector plotting on Cartesian board grid.',
              'Illustrate how to identify the correct internal angle inside the triangle formed.'
            ],
            studentActivities: [
              'Sketch bearing diagrams from past exam problem prompts.',
              'Compute distances and angles to 3 significant figures.'
            ],
            teachingMaterials: ['Navigation protractor', 'Compass roses and charts', 'Calculators'],
            evaluationGuide: ['Full 12-mark WASSCE standard bearings problem assessment.'],
            examRelevance: { waec: true, neco: true, jamb: true, commonExamAreas: ['WASSCE Section B Question 10'] }
          }
        ]
      }
    ]
  },

  {
    id: 'sss-biology',
    name: 'Biology',
    code: 'BIO-SSS',
    level: 'sss',
    field: 'science_math',
    isCompulsory: false,
    recommendedPeriodsPerWeek: 4,
    targetGrades: ['SS 1', 'SS 2', 'SS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html',
    description: 'Senior Secondary Biology curriculum covering Organization of Life, Cellular Structure & Physiology, Plant & Animal Nutrition, Transport Systems, Respiration, Excretion & Homeostasis, Ecology & Ecosystems, Reproduction & Growth, and Genetics & Evolution.',
    generalObjectives: [
      'Understand biological structures, physiological mechanisms, and ecological balances.',
      'Master scientific biological drawings with strict compliance to magnification and labeling guidelines.',
      'Perform biological laboratory tests for food substances, enzyme action, and physiological specimens.',
      'Excel in WASSCE, NECO, and UTME Biology practical and theory exams.'
    ],
    recommendedTextbooks: [
      'Modern Biology for Senior Secondary Schools by Sarojini T. Ramalingam (Africana First)',
      'College Biology by Idodo Umeh',
      'Senior Secondary Biology by Ndu et al.'
    ],
    themes: [
      {
        id: 'bio-sss-theme-1',
        themeNumber: 1,
        title: 'Organization of Life & Cell Physiology',
        description: 'Levels of organization (Cell, Tissue, Organ, System), Cell theory, Diffusion, Osmosis, Plasmolysis, Turgidity, Enzyme properties & action.',
        topics: [
          {
            id: 'bio-sss-top-1',
            title: 'Osmosis: Principles, Osmotic Pressure, and Living Tissues',
            week: 3,
            term: 'Term 1',
            classGrade: 'SS 1',
            subTopics: ['Definition of Osmosis and Semi-permeable membranes', 'Hypotonic, Isotonic, Hypertonic solutions', 'Plasmolysis, Flaccidity, Turgidity, Crenation, Haemolysis', 'Demonstration with living tissue (Yam/Potato osmometer) and thistle funnel'],
            performanceObjectives: [
              'Define osmosis precisely in terms of water potential gradient.',
              'Distinguish between endosmosis and exosmosis.',
              'Explain the physiological effects of placing plant and animal cells in hypertonic and hypotonic media.',
              'Set up and explain the potato cup osmometer experiment with concentrated sucrose solution.'
            ],
            contentDetails: [
              'Water potential vs solute concentration.',
              'Plant cell wall preventing lysis in hypotonic medium resulting in turgor pressure.',
              'Red blood cell lacking cell wall bursting in hypotonic medium (haemolysis).'
            ],
            teacherActivities: [
              'Perform live laboratory demonstration: Irish potato osmometer with sugar crystals in water dish.',
              'Show microscope slides of plasmolysed Spirogyra filaments mounted in salt solution.'
            ],
            studentActivities: [
              'Perform potato osmometer experiment in lab groups, measuring initial and final cavity liquid levels.',
              'Draw neat biological diagrams of turgid and plasmolysed plant cells.'
            ],
            teachingMaterials: ['Irish potatoes, sucrose sugar, petridishes, scalpels, pins', 'Microscope, Spirogyra filaments, salt solution'],
            evaluationGuide: ['Practical laboratory write-up and written test on osmotic terminology.'],
            examRelevance: { waec: true, neco: true, jamb: true, commonExamAreas: ['WASSCE Practical Paper 3 Osmometer setup'] }
          }
        ]
      },
      {
        id: 'bio-sss-theme-2',
        themeNumber: 2,
        title: 'Genetics and Heredity',
        description: 'Mendelian genetics, monohybrid & dihybrid crosses, chromosomes & DNA, sex determination, sex-linked traits (haemophilia, color blindness), blood groups (ABO, Rhesus factor), and mutation.',
        topics: [
          {
            id: 'bio-sss-top-2',
            title: 'Mendelian Genetics: Monohybrid Crosses & Blood Group Inheritance',
            week: 4,
            term: 'Term 2',
            classGrade: 'SS 3',
            subTopics: ['Mendel’s First Law of Segregation', 'Genotype vs Phenotype, Dominant vs Recessive alleles, Homozygous vs Heterozygous', 'Punnett square calculation for monohybrid cross', 'Multiple alleles: ABO blood group system and Rhesus factor incompatibility in pregnancy (Erythroblastosis fetalis)', 'Sickle cell gene inheritance (HbA, HbS) and genetic counseling'],
            performanceObjectives: [
              'State Mendel’s first law of inheritance.',
              'Construct Punnett squares to predict genotypic and phenotypic ratios of offspring (3:1, 1:2:1, 1:1 test cross).',
              'Determine possible blood groups and genotypes of children given parental genotypes.',
              'Explain the genetics of Sickle Cell Anemia and justify the importance of genotype compatibility testing before marriage.'
            ],
            contentDetails: [
              'Alleles: I^A, I^B, I^O.',
              'Codominance between I^A and I^B producing AB blood group.',
              'Sickle cell trait (AS) resistance to falciparum malaria.'
            ],
            teacherActivities: [
              'Demonstrate genetic cross notation on the whiteboard using standard genetic symbols.',
              'Lead a vital discussion on Sickle Cell genotype awareness (AA, AS, SS).'
            ],
            studentActivities: [
              'Work through genetic pedigree charts and calculate probability percentages.',
              'Analyze blood grouping cross problems.'
            ],
            teachingMaterials: ['Genetics charts, Punnett square cards', 'Simulated blood grouping test kits'],
            evaluationGuide: ['Solve 4 genetic cross problem sets with full allele breakdown.'],
            examRelevance: { waec: true, neco: true, jamb: true, commonExamAreas: ['WASSCE Paper 2 Theory Section B Question on Genetics'] }
          }
        ]
      }
    ]
  },

  {
    id: 'sss-chemistry',
    name: 'Chemistry',
    code: 'CHE-SSS',
    level: 'sss',
    field: 'science_math',
    isCompulsory: false,
    recommendedPeriodsPerWeek: 4,
    targetGrades: ['SS 1', 'SS 2', 'SS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html',
    description: 'Senior Secondary Chemistry curriculum covering Atomic Structure, Periodic Table, Chemical Bonding, Stoichiometry & Mole Concept, Gas Laws, Energetics & Kinetics, Equilibria, Acids, Bases & Salts, Redox Reactions & Electrolysis, Metals & Non-metals, Organic Chemistry (Hydrocarbons, Alkanols, Alkanoic acids, Polymers), and Volumetric/Qualitative Chemical Analysis.',
    generalObjectives: [
      'Master core chemical concepts, molecular theories, and stoichiometry.',
      'Develop hands-on laboratory titration and qualitative salt analysis competencies.',
      'Understand industrial chemical processes and environmental stewardship.',
      'Excel in WASSCE/NECO Chemistry Theory, Practical (Alternative to Practical), and UTME exams.'
    ],
    recommendedTextbooks: [
      'New School Chemistry for Senior Secondary Schools by Osei Yaw Ababio (Africana First)',
      'Comprehensive Chemistry for Senior Secondary Schools by E.N. Osuagwu',
      'Understanding Chemistry for Schools and Colleges by G.O. Ojokuku'
    ],
    themes: [
      {
        id: 'che-sss-theme-1',
        themeNumber: 1,
        title: 'Stoichiometry and the Mole Concept',
        description: 'Relative atomic mass, Avogadro constant (6.02 × 10^23), molar mass, percentage composition, empirical and molecular formulas, molar volume of gases (22.4 dm^3 at s.t.p.), and chemical equation calculations.',
        topics: [
          {
            id: 'che-sss-top-1',
            title: 'Empirical Formula, Molecular Formula & Mole Calculations',
            week: 3,
            term: 'Term 2',
            classGrade: 'SS 1',
            subTopics: ['Definition of Mole and Avogadro constant', 'Molar mass calculation', 'Calculating percentage by mass of elements in a compound', 'Determining Empirical Formula from combustion/mass data', 'Deducing Molecular Formula given molar mass: (EF)_n = MF'],
            performanceObjectives: [
              'Define mole in terms of carbon-12 standard and Avogadro number.',
              'Calculate the number of moles, mass, and particles in given chemical quantities.',
              'Determine the empirical formula of an organic/inorganic compound from percentage elemental composition.',
              'Calculate the molecular formula when relative molecular mass is provided.'
            ],
            contentDetails: [
              'Formula: Number of moles = Mass (g) / Molar mass (g/mol).',
              'Number of particles = Moles × 6.02 × 10^23.',
              'Gas volume at s.t.p. = Moles × 22.4 dm^3.'
            ],
            teacherActivities: [
              'Demonstrate calculation algorithms systematically in tabular steps.',
              'Work through combustion analysis problems on the board.'
            ],
            studentActivities: [
              'Solve stoichiometric problem sets.',
              'Calculate empirical formulas from experimental data.'
            ],
            teachingMaterials: ['Periodic table wall chart', 'Calculators', 'Chemical formula flashcards'],
            evaluationGuide: ['5 quantitative stoichiometric calculation questions.'],
            examRelevance: { waec: true, neco: true, jamb: true }
          }
        ]
      },
      {
        id: 'che-sss-theme-2',
        themeNumber: 2,
        title: 'Volumetric & Qualitative Analysis (Practical Chemistry)',
        description: 'Acid-base titrations, standard solutions, indicator selection (Methyl Orange, Phenolphthalein), titration calculations (Concentration in mol/dm3 and g/dm3, purity percentage, water of crystallization), and cation/anion salt analysis.',
        topics: [
          {
            id: 'che-sss-top-2',
            title: 'Volumetric Analysis: Acid-Base Titration & Calculations',
            week: 5,
            term: 'Term 1',
            classGrade: 'SS 2',
            subTopics: ['Standard solution preparation', 'Handling burette, pipette (25.0 cm3), conical flask, retort stand', 'Titration table formatting (Rough, 1st, 2nd, 3rd accurate titres concordant within ±0.20 cm3)', 'Titration equation: (Ca × Va) / (Cb × Vb) = na / nb', 'Calculations of molarity, mass concentration, molar mass of unknown acid, percentage purity'],
            performanceObjectives: [
              'Read burette meniscus correctly to two decimal places ending in 0.00 or 0.05 cm3.',
              'Perform accurate acid-base titration recording concordant titres within 0.20 cm3 range.',
              'Calculate the average volume of acid used from concordant values only.',
              'Apply the mole ratio formula to determine concentration in mol/dm3, g/dm3, and percentage purity.'
            ],
            contentDetails: [
              'Indicator color transitions: Methyl orange (Pink in acid, Yellow in base, Orange at neutral endpoint).',
              'Phenolphthalein (Colorless in acid, Pink in base).',
              'Standard experimental precautions: rinsing burette with acid, pipette with base; removing air bubble from burette tip.'
            ],
            teacherActivities: [
              'Demonstrate proper pipetting with suction bulb and titration technique.',
              'Model official WAEC titration table layout and mark deduction rules.'
            ],
            studentActivities: [
              'Perform titration in laboratory pairs (e.g., 0.10 mol/dm3 HCl against unknown Na2CO3).',
              'Record titre readings, average concordant values, and calculate molarity of base.'
            ],
            teachingMaterials: ['Burettes (50 cm3), Pipettes (25 cm3), Conical flasks, Pipette fillers', 'Retort stands & clamps, White tiles, Wash bottles', 'Standard HCl solution, Na2CO3 solution, Methyl orange indicator'],
            evaluationGuide: ['Grade laboratory titre accuracy against teacher standard (±0.20 cm3) and calculation marks.'],
            examRelevance: { waec: true, neco: true, commonExamAreas: ['WASSCE Practical Chemistry Paper 3 Question 1 (50 marks)'] }
          }
        ]
      }
    ]
  },

  {
    id: 'sss-physics',
    name: 'Physics',
    code: 'PHY-SSS',
    level: 'sss',
    field: 'science_math',
    isCompulsory: false,
    recommendedPeriodsPerWeek: 4,
    targetGrades: ['SS 1', 'SS 2', 'SS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html',
    description: 'Senior Secondary Physics curriculum covering Mechanics (Vectors, Kinematics, Projectiles, Newton Laws, Work-Energy-Power, Circular Motion, Gravitation), Thermal Physics, Waves & Optics (Reflection, Refraction, Lenses, Sound waves), Electricity & Magnetism (Ohm law, Kirchhoff laws, Electromagnetic induction, AC circuits), and Modern Physics (Photoelectric effect, Atomic models, Radioactivity, Energy quantization).',
    generalObjectives: [
      'Understand physical principles, vector mechanics, field theories, and quantum models.',
      'Develop experimental laboratory competence: plotting graphs, calculating slopes, intercepts, and error margins.',
      'Solve multi-step mathematical physics equations and real-life engineering problems.',
      'Attain distinction grades in WASSCE, NECO, and UTME Physics examinations.'
    ],
    recommendedTextbooks: [
      'Senior Secondary School Physics by PN Okeke & MW Anyakoha',
      'New School Physics for Senior Secondary Schools by MW Anyakoha (Africana First)',
      'Principles of Physics for Senior Secondary Schools by Nelkon'
    ],
    themes: [
      {
        id: 'phy-sss-theme-1',
        themeNumber: 1,
        title: 'Mechanics: Kinematics and Projectile Motion',
        description: 'Linear motion equations (v=u+at, s=ut+1/2at^2, v^2=u^2+2as), motion under gravity, projectile motion components (Time of flight, Maximum height, Range), Newton’s laws of motion, momentum, and friction.',
        topics: [
          {
            id: 'phy-sss-top-1',
            title: 'Projectile Motion: Trajectory, Time of Flight, and Maximum Range',
            week: 4,
            term: 'Term 1',
            classGrade: 'SS 2',
            subTopics: ['Definition of projectile and trajectory (parabola)', 'Resolution of initial velocity into horizontal (ux = u cosθ) and vertical (uy = u sinθ) components', 'Time to reach maximum height: t = (u sinθ) / g', 'Total Time of Flight: T = (2u sinθ) / g', 'Maximum Height reached: H = (u^2 sin^2θ) / (2g)', 'Horizontal Range: R = (u^2 sin2θ) / g; Condition for maximum range (θ = 45°)'],
            performanceObjectives: [
              'Resolve initial projection velocity into perpendicular horizontal and vertical components.',
              'Derive formulas for time of flight, maximum height, and horizontal range of a projectile.',
              'Calculate maximum range and evaluate the impact of projection angle on trajectory.',
              'Solve numerical physics problems involving projectiles launched horizontally and at an angle.'
            ],
            contentDetails: [
              'Independence of horizontal motion (constant velocity, ax = 0) and vertical motion (constant gravitational acceleration, ay = -g).',
              'Real-life applications: football kicks, artillery ballistic paths, water hose jets.'
            ],
            teacherActivities: [
              'Derive projectile formulas step-by-step from linear equations of motion on the board.',
              'Show physics projectile simulation on interactive screen.'
            ],
            studentActivities: [
              'Derive formulas independently in notebooks.',
              'Solve past WASSCE multi-step numerical calculation questions.'
            ],
            teachingMaterials: ['Projectile launcher apparatus / ramp', 'Stopwatch, measuring tape', 'Scientific calculators'],
            evaluationGuide: ['Written test with formula derivations and 3 multi-step calculation problems.'],
            examRelevance: { waec: true, neco: true, jamb: true, commonExamAreas: ['WASSCE Paper 2 Theory Question 8'] }
          }
        ]
      },
      {
        id: 'phy-sss-theme-2',
        themeNumber: 2,
        title: 'Current Electricity & Circuit Analysis',
        description: 'Electric current, potential difference, electromotive force (e.m.f.), internal resistance, Ohm’s law, series and parallel resistor networks, electrical energy and power, heating effect (Joule’s law), and meter bridge.',
        topics: [
          {
            id: 'phy-sss-top-2',
            title: 'Ohm’s Law, Internal Resistance, and Series-Parallel Circuits',
            week: 3,
            term: 'Term 2',
            classGrade: 'SS 2',
            subTopics: ['Statement of Ohm’s Law: V = IR', 'Verification of Ohm’s law using voltmeter and ammeter', 'Terminal p.d. vs E.m.f.: E = V + Ir = I(R + r)', 'Equivalent resistance in Series: R_total = R1 + R2 + ...', 'Equivalent resistance in Parallel: 1/R_total = 1/R1 + 1/R2 + ...', 'Electrical Power (P = IV = I^2R = V^2/R) and Billing in kWh'],
            performanceObjectives: [
              'State Ohm’s law and specify the limiting physical conditions (temperature and dimensions).',
              'Differentiate between electromotive force (e.m.f.) and terminal potential difference of a cell.',
              'Calculate equivalent resistance and branch currents in complex combined series-parallel resistor networks.',
              'Determine the internal resistance of a dry cell from experimental V vs I graph slope.'
            ],
            contentDetails: [
              'Internal resistance (r) definition.',
              'Lost volts = Ir.',
              'Kirchhoff’s current and voltage laws introductory principles.'
            ],
            teacherActivities: [
              'Set up circuit demonstration: dry cells, rheostat, ammeter, voltmeter, connecting wires, key.',
              'Guide students through graph plotting: choosing suitable scales, line of best fit, calculating slope.'
            ],
            studentActivities: [
              'Assemble electrical circuits in laboratory groups.',
              'Record I and V values, plot V against I graph on 2mm grid paper, and calculate slope (internal resistance r).'
            ],
            teachingMaterials: ['DC power supply / dry cells, rheostats, carbon resistors', 'Digital and analog voltmeters & ammeters, plug keys, connecting wires', '2mm graph sheets, rulers'],
            evaluationGuide: ['Assess laboratory circuit connection, graph precision, and circuit calculation test.'],
            examRelevance: { waec: true, neco: true, jamb: true, commonExamAreas: ['WASSCE Practical Physics Paper 3 Question 3 (Electricity)'] }
          }
        ]
      }
    ]
  },

  {
    id: 'sss-data-processing',
    name: 'Data Processing (Trade Subject)',
    code: 'DPR-SSS',
    level: 'sss',
    field: 'trade_entrepreneurship',
    isCompulsory: false,
    recommendedPeriodsPerWeek: 4,
    targetGrades: ['SS 1', 'SS 2', 'SS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html',
    description: 'Senior Secondary compulsory Trade/Vocational subject curriculum covering Information Processing, Computer Ethics, Word Processing, Spreadsheets, Database Management Systems (MS Access / SQL), Desktop Publishing, Web Design, Computer Maintenance, and Internet Security.',
    generalObjectives: [
      'Equip students with marketable digital skills, data analysis, and database administration competencies.',
      'Master spreadsheet formulas, functions (SUM, AVERAGE, IF, VLOOKUP), and financial modeling.',
      'Design relational databases: tables, primary keys, queries, forms, and reports.',
      'Prepare for WASSCE/NECO Data Processing trade exams and vocational certification.'
    ],
    recommendedTextbooks: [
      'Data Processing for Senior Secondary Schools by NERDC',
      'Comprehensive Data Processing for SSS 1-3 by S. Ojo',
      'Computer Studies & Data Processing by Adedapo'
    ],
    themes: [
      {
        id: 'dpr-sss-theme-1',
        themeNumber: 1,
        title: 'Spreadsheets and Data Analysis',
        description: 'Spreadsheet interface, cells, ranges, data formatting, arithmetic formulas, built-in functions, charts, sorting, filtering, and pivot tables.',
        topics: [
          {
            id: 'dpr-sss-top-1',
            title: 'Spreadsheet Functions: Logical IF, Nested IF, and Data Visualization',
            week: 4,
            term: 'Term 2',
            classGrade: 'SS 2',
            subTopics: ['Cell referencing (Relative, Absolute $A$1, Mixed)', 'Statistical functions: SUM, AVERAGE, COUNT, COUNTA, MAX, MIN', 'Logical functions: IF(logical_test, value_if_true, value_if_false)', 'Nested IF for grading systems (A1, B2, B3, C4, etc.)', 'Creating column, bar, pie, and line charts with data labels and legends'],
            performanceObjectives: [
              'Differentiate between relative and absolute cell references in formulas.',
              'Write syntactically correct IF and Nested IF formulas to calculate student letter grades based on scores.',
              'Generate 2D and 3D charts representing financial or academic datasets.',
              'Format worksheets for professional printing and PDF export.'
            ],
            contentDetails: [
              'Formula syntax: starting with equals sign (=).',
              'Example grading formula: =IF(D2>=75, "A1", IF(D2>=65, "B2", IF(D2>=50, "C6", "F9"))).',
              'Sorting datasets ascending/descending and applying multi-level filters.'
            ],
            teacherActivities: [
              'Demonstrate live spreadsheet building on projector.',
              'Provide raw student score datasets for class practical lab exercise.'
            ],
            studentActivities: [
              'Open spreadsheet application (MS Excel / LibreOffice Calc) on computer.',
              'Enter data, apply formulas, calculate totals, averages, letter grades, and plot comparative bar charts.'
            ],
            teachingMaterials: ['Computer lab workstations', 'Projector and screen', 'Dataset exercise files'],
            evaluationGuide: ['Practical lab exam: produce automated grading spreadsheet and chart within 40 minutes.'],
            examRelevance: { waec: true, neco: true, commonExamAreas: ['WASSCE Data Processing Practical Paper 3'] }
          }
        ]
      },
      {
        id: 'dpr-sss-theme-2',
        themeNumber: 2,
        title: 'Relational Database Management Systems (DBMS)',
        description: 'Database concepts, Tables, Fields, Records, Data Types, Primary Keys, Foreign Keys, Relationships, Queries (SQL), Forms, and Reports.',
        topics: [
          {
            id: 'dpr-sss-top-2',
            title: 'Database Design: Tables, Primary Keys, and Queries',
            week: 5,
            term: 'Term 1',
            classGrade: 'SS 3',
            subTopics: ['Definition of Database, DBMS (MS Access, MySQL)', 'Creating tables in Design View and setting data types (Short Text, Number, Date/Time, AutoNumber, Currency)', 'Setting Primary Key to enforce entity integrity', 'Creating One-to-Many relationships with referential integrity', 'Designing Select Queries with criteria and calculated fields'],
            performanceObjectives: [
              'Define key database terms: entity, attribute, record, field, primary key, foreign key.',
              'Design normalized database tables with appropriate data types and validation rules.',
              'Establish relationships between related tables.',
              'Create queries to extract specific records matching defined criteria (e.g., [Fee_Balance] > 0).'
            ],
            contentDetails: [
              'Comparison between flat files and relational databases.',
              'Query design grid: Field, Table, Sort, Show, Criteria, Or.',
              'Generating printable professional reports.'
            ],
            teacherActivities: [
              'Guide students through the architecture of a School Management Database on projector.',
              'Demonstrate query building with logical criteria operators (AND, OR, NOT, BETWEEN).'
            ],
            studentActivities: [
              'Build a Student Information Database containing StudentsTable and FeesTable.',
              'Create queries filtering students by class and fee payment status.'
            ],
            teachingMaterials: ['Computer lab with MS Access / SQL database tools', 'Projector and sample schema diagrams'],
            evaluationGuide: ['Evaluate student database files against marking rubric (structure, keys, relationships, queries).'],
            examRelevance: { waec: true, neco: true }
          }
        ]
      }
    ]
  },

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
    description: 'Senior Secondary compulsory cross-cutting curriculum covering National Values, Citizenship, Democratic Governance, Rule of Law, Human Rights, Constitutions, Community Development, Public Service, and Youth Empowerment.',
    generalObjectives: [
      'Inculcate patriotism, moral values, civic responsibility, and democratic principles in Nigerian youth.',
      'Understand human rights, rule of law, separation of powers, and electoral integrity.',
      'Address contemporary social challenges: cultism, drug abuse, human trafficking, corruption, and HIV/AIDS.'
    ],
    recommendedTextbooks: [
      'NERDC Civic Education for Senior Secondary Schools Books 1-3',
      'Classic Civic Education for SSS by B. Adebayo',
      'Fundamentals of Civic Education by Evans'
    ],
    themes: [
      {
        id: 'civ-sss-theme-1',
        themeNumber: 1,
        title: 'Democratic Governance and Rule of Law',
        description: 'Democracy, democratic institutions, rule of law, pillars of democracy, free and fair elections, electoral bodies (INEC), and political apathy.',
        topics: [
          {
            id: 'civ-sss-top-1',
            title: 'Rule of Law: Principles, Importance, and Limitations',
            week: 2,
            term: 'Term 1',
            classGrade: 'SS 1',
            subTopics: ['Definition and origin (A.V. Dicey 1885)', 'Three core principles: Supremacy of the Law, Equality before the Law, Protection of Individual Rights', 'Importance of rule of law in preserving democratic stability and preventing tyranny', 'Factors limiting the rule of law: State of Emergency, Diplomatic Immunity, Judicial Corruption, Illiteracy'],
            performanceObjectives: [
              'Define the Rule of Law according to A.V. Dicey.',
              'Explain the three main pillars of the rule of law in modern governance.',
              'Analyze four real-world limitations that hinder the total application of the rule of law in developing democracies.'
            ],
            contentDetails: [
              'Supremacy of law: no individual is above the constitution.',
              'Equality before law: equal justice irrespective of wealth, status, religion, or gender.',
              'Protection of fundamental human rights enforceable in independent courts of law.'
            ],
            teacherActivities: [
              'Lead interactive case study analysis of constitutional court rulings.',
              'Facilitate student mock trial demonstrating due process.'
            ],
            studentActivities: [
              'Participate in classroom debate: "Is the Rule of Law fully operational in Nigeria?"',
              'Draft summaries of Dicey’s principles in notebooks.'
            ],
            teachingMaterials: ['1999 Constitution of the Federal Republic of Nigeria (as amended)', 'Civic rights posters'],
            evaluationGuide: ['Essay test evaluating the principles, significance, and limitations of the rule of law.'],
            examRelevance: { waec: true, neco: true, commonExamAreas: ['WASSCE Civic Education Section B Compulsory Question'] }
          }
        ]
      }
    ]
  },

  {
    id: 'sss-economics',
    name: 'Economics',
    code: 'ECO-SSS',
    level: 'sss',
    field: 'humanities',
    isCompulsory: false,
    recommendedPeriodsPerWeek: 4,
    targetGrades: ['SS 1', 'SS 2', 'SS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html',
    description: 'Senior Secondary Economics curriculum covering Microeconomics (Scarcity & Choice, Demand & Supply, Elasticity, Production, Cost & Revenue, Market Structures) and Macroeconomics (National Income, Money & Banking, Public Finance & Taxation, Inflation, International Trade, Economic Development).',
    generalObjectives: [
      'Understand economic principles, consumer behavior, market equilibrium, and fiscal/monetary policies.',
      'Interpret economic charts, demand-supply schedules, curves, and statistical tables.',
      'Analyze national developmental challenges: unemployment, inflation, public debt, and diversification.'
    ],
    recommendedTextbooks: [
      'Comprehensive Economics for Senior Secondary Schools by Johnson Ugoji Anyaele',
      'Fundamentals of Economics by RA Ison',
      'Essential Economics for SSS by CE Ande'
    ],
    themes: [
      {
        id: 'eco-sss-theme-1',
        themeNumber: 1,
        title: 'Price Theory: Demand, Supply, and Market Equilibrium',
        description: 'Law of demand, demand schedule & curve, shifts vs movements, law of supply, elasticity of demand and supply, price determination at equilibrium, price ceilings, and price floors.',
        topics: [
          {
            id: 'eco-sss-top-1',
            title: 'Price Elasticity of Demand: Types, Calculation, and Determinants',
            week: 4,
            term: 'Term 1',
            classGrade: 'SS 2',
            subTopics: ['Definition of Price Elasticity of Demand (PED)', 'Formula: PED = (% change in Quantity Demanded) / (% change in Price)', 'Types of Elasticity: Perfectly Elastic (∞), Elastic (>1), Unitary Elastic (1), Inelastic (<1), Perfectly Inelastic (0)', 'Determinants: Availability of substitutes, Degree of necessity, Proportion of income spent, Habit/Addiction, Time period', 'Significance to producers (pricing policy) and government (taxation)'],
            performanceObjectives: [
              'Define Price Elasticity of Demand and write its mathematical formula.',
              'Calculate PED given initial and new price-quantity coordinates.',
              'Interpret the calculated numerical coefficient and classify the elasticity type.',
              'Explain how knowledge of elasticity guides government tax policy on luxury vs essential goods.'
            ],
            contentDetails: [
              'Point vs arc elasticity methods.',
              'Relationship between PED and Total Revenue (TR = P × Q).',
              'Graphical representation of elastic vs inelastic demand curves.'
            ],
            teacherActivities: [
              'Derive numerical elasticity examples on the whiteboard.',
              'Illustrate consumer response to fuel price changes vs bread price changes.'
            ],
            studentActivities: [
              'Calculate elasticity coefficients from given market schedules.',
              'Draw and label corresponding demand curves with accurate slopes.'
            ],
            teachingMaterials: ['Economic graphical charts', 'Market price survey data worksheets'],
            evaluationGuide: ['Test with 2 calculation problems and theoretical analysis of elasticity determinants.'],
            examRelevance: { waec: true, neco: true, jamb: true, commonExamAreas: ['WASSCE Economics Paper 2 Section A Question 1/2'] }
          }
        ]
      }
    ]
  },

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
    description: 'Senior Secondary Government curriculum covering Elements of Government (State, Sovereignty, Political Ideologies, Organs of Government, Constitutions, Electoral Systems) and Political & Constitutional Development in Nigeria (Pre-colonial systems, Colonial rule, Constitutional conferences, Post-independence republics, Military regimes, Nigerian Foreign Policy).',
    generalObjectives: [
      'Understand political structures, constitutionalism, governance models, and international relations.',
      'Appreciate Nigerian political evolution from pre-colonial kingdoms to Fourth Republic democracy.',
      'Excel in WASSCE, NECO, and UTME Government exams.'
    ],
    recommendedTextbooks: [
      'Comprehensive Government for Senior Secondary Schools by Johnson Ugoji Anyaele',
      'Government for Senior Secondary Schools by Francis Adigwe',
      'Essential Government for SSS by Dibie'
    ],
    themes: [
      {
        id: 'gov-sss-theme-1',
        themeNumber: 1,
        title: 'Constitutional Development in Nigeria',
        description: 'Colonial constitutions (Clifford 1922, Richards 1946, Macpherson 1951, Lyttelton 1954), Independence Constitution 1960, Republican Constitution 1963, 1979 Second Republic, and 1999 Fourth Republic Constitutions.',
        topics: [
          {
            id: 'gov-sss-top-1',
            title: 'Clifford and Richards Constitutions: Features, Merits, and Demerits',
            week: 5,
            term: 'Term 1',
            classGrade: 'SS 2',
            subTopics: ['Clifford Constitution 1922: Elective principle, 4 elected seats (3 for Lagos, 1 for Calabar), Legislative Council, Newspaper emergence (Lagos Daily News)', 'Richards Constitution 1946: Regionalism (Northern, Western, Eastern regions), House of Chiefs, Unofficial majority', 'Merits and Demerits of both constitutional frameworks'],
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

  {
    id: 'sss-trade-fisheries',
    name: 'Fisheries (Trade Subject)',
    code: 'FSH-SSS',
    level: 'sss',
    field: 'trade_entrepreneurship',
    isCompulsory: false,
    recommendedPeriodsPerWeek: 4,
    targetGrades: ['SS 1', 'SS 2', 'SS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html',
    description: 'Senior Secondary compulsory Trade/Vocational subject covering Fish Biology, Pond Construction (Earthen, Concrete, Tarpaulin, Recirculatory Aquaculture Systems), Water Quality Management, Hatchery & Induced Spawning, Feed Formulation, Fish Processing, Preservation & Marketing.',
    generalObjectives: [
      'Train self-reliant youth in commercial aquaculture and fish farming enterprises.',
      'Master artificial propagation, hypophysation / hormone injection of Clarias gariepinus (Catfish).',
      'Manage water parameters (pH, Dissolved Oxygen, Temperature, Ammonia) and fish health.'
    ],
    recommendedTextbooks: ['NERDC Fisheries for Senior Secondary Schools', 'Aquaculture in the Tropics by Moses'],
    themes: [
      {
        id: 'fsh-sss-theme-1',
        themeNumber: 1,
        title: 'Fish Breeding and Hatchery Operations',
        description: 'Selection of broodstocks, hormone extraction, induced spawning, egg fertilization, incubation, fry nursing, and fingerling management.',
        topics: [
          {
            id: 'fsh-sss-top-1',
            title: 'Artificial Propagation (Induced Breeding) of African Catfish (Clarias gariepinus)',
            week: 4,
            term: 'Term 2',
            classGrade: 'SS 2',
            subTopics: ['Broodstock selection (ripe gravid female, mature active male)', 'Hormone types: Synthetic (Ovaprim, Ovatide) and Pituitary gland extraction', 'Intramuscular injection dosage (0.5ml per kg body weight)', 'Stripping of eggs, sacrificing male for milt, artificial fertilization using saline solution', 'Incubation on kakaban netting in aerated water tanks, hatching within 24-36 hours'],
            performanceObjectives: [
              'Identify mature, gravid broodstock of African Catfish through physical examination of genital papilla.',
              'Calculate correct hormone dosage based on female fish body mass.',
              'Execute the step-by-step artificial fertilization procedure with standard hygiene precautions.',
              'Manage water parameters during incubation and feed newly hatched larvae with Artemia/zooplankton.'
            ],
            contentDetails: [
              'Latency period calculation (varies with water temperature, ~10-12 hours at 28°C).',
              'Importance of clean well-aerated water and prophylaxis treatment.'
            ],
            teacherActivities: [
              'Demonstrate live stripping and artificial fertilization in the school fish hatchery tank.',
              'Explain hygiene, milt preservation, and kakaban mesh installation.'
            ],
            studentActivities: [
              'Weigh broodstock, calculate hormone dosage, assist in stripping eggs and spreading over kakaban mesh.',
              'Monitor hatching rate and log water temperature.'
            ],
            teachingMaterials: ['Live catfish broodstocks, Ovaprim hormone, syringes & needles (2ml)', 'Saline solution, feather, plastic bowls, dissecting kit', 'Incubation tanks, kakaban mesh, aerators / air pumps'],
            evaluationGuide: ['Practical laboratory hatchery exam and written test on induced breeding steps.'],
            examRelevance: { waec: true, neco: true, commonExamAreas: ['WASSCE Fisheries Practical Paper 3 Question 1'] }
          }
        ]
      }
    ]
  }
];

export const NERDC_STATS = {
  totalSubjectsInDb: NERDC_SUBJECTS_DATABASE.length,
  totalJuniorSubjects: NERDC_SUBJECTS_DATABASE.filter(s => s.level === 'jss').length,
  totalSeniorSubjects: NERDC_SUBJECTS_DATABASE.filter(s => s.level === 'sss').length,
  totalTopics: NERDC_SUBJECTS_DATABASE.reduce((sum, s) => sum + s.themes.reduce((tSum, t) => tSum + t.topics.length, 0), 0),
  officialSources: [
    {
      title: 'NERDC JSS 1 - 3 Curriculum Portal',
      url: 'https://www.nerdc.gov.ng/content_manager/jss1-3.html'
    },
    {
      title: 'NERDC New Senior Secondary Curriculum Portal',
      url: 'https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html'
    }
  ]
};
