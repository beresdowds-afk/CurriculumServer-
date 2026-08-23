import { SubjectCurriculum } from '../../types';

export const JSS_CURRICULUM_DATABASE: SubjectCurriculum[] = [
  // ========================================================
  // 1. ENGLISH STUDIES (JSS 1 - 3)
  // ========================================================
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
          }
        ]
      },
      {
        id: 'eng-theme-3',
        themeNumber: 3,
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
            teachingMaterials: ['International Phonetic Alphabet (IPA) chart', 'Audio playback player'],
            evaluationGuide: ['Individual oral reading test focusing on target vowel sounds.'],
            examRelevance: { bece: true }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 2. GENERAL MATHEMATICS (JSS 1 - 3)
  // ========================================================
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
      'MAN Mathematics for JSS 1-3',
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
        description: 'Linear equations, simultaneous equations, quadratic factorization, linear inequalities, and graph plotting.',
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
              'Solve linear equations in workbooks.',
              'Write own word problems and swap with classmates to solve.'
            ],
            teachingMaterials: ['Balance scale model', 'Algebra worksheet cards'],
            evaluationGuide: ['Grade a 5-item structured problem set.'],
            examRelevance: { bece: true }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 3. BASIC SCIENCE (JSS 1 - 3)
  // ========================================================
  {
    id: 'jss-basic-science',
    name: 'Basic Science',
    code: 'BSC-JSS',
    level: 'jss',
    field: 'science_math',
    isCompulsory: true,
    recommendedPeriodsPerWeek: 4,
    targetGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/jss1-3.html',
    description: 'Basic Science curriculum integrating Living Things, Non-Living Matter, Energy Transformations, Earth and Space Science, Environmental Conservation, and STI/HIV/Drug Abuse prevention.',
    generalObjectives: [
      'Inculcate scientific inquiry, observational rigor, and experimental skills.',
      'Understand the biological organization of living organisms and ecological interdependencies.',
      'Explore properties of matter, energy forms, forces, and technological applications.',
      'Cultivate health awareness, environmental protection, and sound hygienic practices.'
    ],
    recommendedTextbooks: [
      'STAN (Science Teachers Association of Nigeria) Basic Science for JSS 1-3',
      'NERDC Basic Science for Junior Secondary Schools (Books 1-3)',
      'Precious Basic Science for JSS by Akpan et al.'
    ],
    themes: [
      {
        id: 'bsc-theme-1',
        themeNumber: 1,
        title: 'Living Things and Environment',
        description: 'Characteristics of living things, plant and animal cell structures, habitat ecology, feeding relationships, reproduction, and disease control.',
        topics: [
          {
            id: 'bsc-top-1',
            title: 'Characteristics of Living Things & Cell Structure',
            week: 2,
            term: 'Term 1',
            classGrade: 'JSS 1',
            subTopics: ['Life characteristics (MR NIGER D)', 'Plant cell vs Animal cell structures', 'Functions of cell organelles (Nucleus, Mitochondria, Cell wall, Chloroplast)', 'Microscopic examination of onion epidermal cells'],
            performanceObjectives: [
              'List and explain the 8 fundamental characteristics of living organisms (MR NIGER D).',
              'Draw and label plant and animal cells, indicating at least five differences.',
              'Prepare a wet mount slide of onion epidermis and observe under a light microscope.'
            ],
            contentDetails: [
              'Movement, Respiration, Nutrition, Irritability, Growth, Excretion, Reproduction, Death.',
              'Protoplasm, cytoplasm, nucleus, cell membrane, vacuole, cell wall, chloroplasts.',
              'Comparison table: Plant vs Animal cells.'
            ],
            teacherActivities: [
              'Demonstrate microscope focusing techniques (low and high power).',
              'Guide slide preparation using iodine stain on onion epidermal peel.'
            ],
            studentActivities: [
              'Examine prepared slides under light microscope.',
              'Draw and label cell diagrams in science practical notebooks.'
            ],
            teachingMaterials: ['Compound light microscopes', 'Glass slides, cover slips, iodine solution', 'Fresh onion bulb, forceps, scalpel'],
            evaluationGuide: ['Practical drawing assessment (accuracy of proportions, magnification, labeling lines).'],
            examRelevance: { bece: true }
          }
        ]
      },
      {
        id: 'bsc-theme-2',
        themeNumber: 2,
        title: 'Energy and Energy Transformations',
        description: 'Forms of energy, renewable vs non-renewable energy, law of conservation of energy, thermal energy transfer (conduction, convection, radiation).',
        topics: [
          {
            id: 'bsc-top-2',
            title: 'Forms of Energy and Energy Conversions',
            week: 5,
            term: 'Term 2',
            classGrade: 'JSS 2',
            subTopics: ['Potential and Kinetic Energy', 'Chemical, Electrical, Light, Sound, and Nuclear Energy', 'Law of Conservation of Energy', 'Energy conversion devices in daily life'],
            performanceObjectives: [
              'Differentiate between potential and kinetic energy with mathematical and everyday examples.',
              'State the Law of Conservation of Energy.',
              'Trace energy conversion pathways in appliances (e.g. electric fan, flashlight, hydro-electric turbine).'
            ],
            contentDetails: [
              'Calculations of PE = mgh and KE = 1/2 mv^2.',
              'Energy transformations: Chemical -> Electrical -> Light in torchlight cells.',
              'Solar photovoltaic conversion and sustainable green energy in Nigeria.'
            ],
            teacherActivities: [
              'Demonstrate energy transfer using simple pendulums and dynamic carts.',
              'Showcase solar cell powering a DC buzzer/motor.'
            ],
            studentActivities: [
              'Calculate potential energy of masses lifted to measured heights.',
              'Construct a chart illustrating 5 energy transformations at home.'
            ],
            teachingMaterials: ['Pendulum bob and string', 'Solar panel model kit', 'Dynamo, torch cells, connecting wires'],
            evaluationGuide: ['Written quiz on energy definitions, calculations, and conversion diagrams.'],
            examRelevance: { bece: true }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 4. BASIC TECHNOLOGY (JSS 1 - 3)
  // ========================================================
  {
    id: 'jss-basic-technology',
    name: 'Basic Technology',
    code: 'BTE-JSS',
    level: 'jss',
    field: 'technology',
    isCompulsory: true,
    recommendedPeriodsPerWeek: 4,
    targetGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/jss1-3.html',
    description: 'Technical education curriculum covering Workshop Safety, Materials (Wood, Metal, Plastics, Ceramics), Hand Tools, Technical Drawing & Scales, Building Construction, Mechanism & Energy.',
    generalObjectives: [
      'Impart foundational technical literacy and workshop safety culture.',
      'Understand properties, processing, and applications of engineering materials.',
      'Master the use and maintenance of woodworking, metalworking, and electrical tools.',
      'Develop isometric, oblique, and orthographic technical drawing skills.'
    ],
    recommendedTextbooks: [
      'Basic Technology for Junior Secondary Schools by NERDC',
      'Introductory Technology for JSS (Books 1-3) by Evans',
      'Modern Basic Technology for JSS by Osuagwu'
    ],
    themes: [
      {
        id: 'btech-theme-1',
        themeNumber: 1,
        title: 'Safety and Workshop Culture',
        description: 'Workshop safety rules, hazard identification, personal protective equipment (PPE), fire safety and extinguishers, first aid administration in workshop injuries.',
        topics: [
          {
            id: 'btech-top-1',
            title: 'Workshop Safety Rules, Hazards, and Fire Fighting',
            week: 1,
            term: 'Term 1',
            classGrade: 'JSS 1',
            subTopics: ['Causes of workshop accidents', 'Safety rules in technical workshops', 'Personal Protective Equipment (Goggles, Aprons, Safety boots, Gloves)', 'Types of fire (Class A, B, C, D) and Fire Extinguishers (Water, Foam, CO2, Dry Powder)'],
            performanceObjectives: [
              'Identify at least five major causes of accidents in a school technical workshop.',
              'Demonstrate proper donning and usage of mandatory Personal Protective Equipment (PPE).',
              'Classify fires according to combustible materials and select the appropriate extinguisher type.'
            ],
            contentDetails: [
              'Unsafe acts vs unsafe conditions.',
              'Color coding of fire extinguisher cylinders: Water (Signal Red), Foam (Cream), CO2 (Black), Dry Chemical Powder (French Blue).',
              'PASS method: Pull pin, Aim nozzle, Squeeze lever, Sweep across base of fire.'
            ],
            teacherActivities: [
              'Conduct a guided inspection of the school technology laboratory / workshop.',
              'Demonstrate the PASS technique with a training fire extinguisher.'
            ],
            studentActivities: [
              'Perform a simulated emergency evacuation drill.',
              'Draft a 10-point Workshop Safety Manifesto on poster cardboard.'
            ],
            teachingMaterials: ['Assorted fire extinguishers (training units)', 'PPE set (safety goggles, ear defenders, leather apron, heavy boots)', 'Workshop safety wall charts'],
            evaluationGuide: ['Practical simulation test on workshop safety response and extinguisher identification.'],
            examRelevance: { bece: true }
          }
        ]
      },
      {
        id: 'btech-theme-2',
        themeNumber: 2,
        title: 'Technical Drawing Fundamentals',
        description: 'Drawing instruments, board practice, lettering, geometric constructions (lines, angles, triangles, circles), orthographic and pictorial projections.',
        topics: [
          {
            id: 'btech-top-2',
            title: 'Drawing Instruments, Board Practice, and Line Types',
            week: 3,
            term: 'Term 1',
            classGrade: 'JSS 1',
            subTopics: ['Drawing board, Tee-square, Set-squares (30-60° and 45°), Compass, Divider, Scale rule', 'Fixing drawing paper with masking tape', 'Standard border lines and Title block', 'Types of lines in Technical Drawing (Continuous thick, Continuous thin, Dashed, Chain thin, Zig-zag)'],
            performanceObjectives: [
              'Set up a drawing sheet properly on a drawing board using Tee-square and drafting tape.',
              'Draw standard border margins (10mm) and construct a compliant 4-row Title Block.',
              'Differentiate and apply continuous thick lines (outlines), thin lines (dimensions), and dashed lines (hidden details).'
            ],
            contentDetails: [
              'Pencil grades: 2H for construction/guidelines, H/HB for finished outlines and lettering.',
              'Single stroke vertical Gothic lettering techniques.',
              'Line weight contrast principles according to BS 308 / ISO standards.'
            ],
            teacherActivities: [
              'Demonstrate Tee-square alignment with drawing board working edge.',
              'Guide students step-by-step through constructing the standard title block.'
            ],
            studentActivities: [
              'Mount A3 drawing sheets on individual drawing boards.',
              'Complete title blocks containing Name, Class, Date, Scale, and Drawing Title.'
            ],
            teachingMaterials: ['Wooden drawing boards and Tee-squares', 'Set squares, compasses, masking tape, 2H/H pencils', 'Sample drawing portfolio sheets'],
            evaluationGuide: ['Grade student drawing sheets for line precision, cleanliness, and title block accuracy.'],
            examRelevance: { bece: true }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 5. INFORMATION TECHNOLOGY / COMPUTER STUDIES (JSS 1 - 3)
  // ========================================================
  {
    id: 'jss-information-technology',
    name: 'Information Technology (Computer Studies)',
    code: 'ICT-JSS',
    level: 'jss',
    field: 'technology',
    isCompulsory: true,
    recommendedPeriodsPerWeek: 3,
    targetGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/jss1-3.html',
    description: 'Basic Education IT curriculum covering Computer Systems Architecture, Operating Systems, Keyboard Skills, Word Processing, Spreadsheets, Internet, Cyber Safety, Algorithms & Flowcharts.',
    generalObjectives: [
      'Understand digital hardware components, peripherals, and software categories.',
      'Develop touch typing, document formatting, and spreadsheet computation proficiency.',
      'Understand internet browsing, email protocols, search engines, and cyber hygiene.',
      'Learn problem-solving fundamentals using structured algorithms and flowcharting.'
    ],
    recommendedTextbooks: [
      'NERDC Computer Studies for Junior Secondary Schools (Books 1-3)',
      'Computer Studies for Junior Secondary Schools by Agba et al.',
      'Hiit Computer Studies for JSS 1-3'
    ],
    themes: [
      {
        id: 'ict-jss-theme-1',
        themeNumber: 1,
        title: 'Computer Hardware and Software Operations',
        description: 'Input, Output, Storage, Processing devices, System software, Application packages, and basic maintenance.',
        topics: [
          {
            id: 'ict-jss-top-1',
            title: 'Computer System Architecture & Peripherals',
            week: 2,
            term: 'Term 1',
            classGrade: 'JSS 1',
            subTopics: ['Central Processing Unit (ALU, Control Unit, Registers)', 'Input Devices (Keyboard, Mouse, Scanner, Microphone)', 'Output Devices (VDU Monitor, Laser Printer, Projector, Speakers)', 'Storage Devices (RAM, ROM, SSD, HDD, Flash drives)'],
            performanceObjectives: [
              'Identify the three functional subunits of the Central Processing Unit (CPU).',
              'Classify peripheral computer devices into Input, Output, and Auxiliary Storage.',
              'Explain the operational differences between volatile RAM and non-volatile ROM.'
            ],
            contentDetails: [
              'Von Neumann computer architecture model.',
              'Data vs Information pipeline: Input -> Processing -> Storage -> Output.',
              'Capacity measurements: Bit, Byte, Kilobyte, Megabyte, Gigabyte, Terabyte.'
            ],
            teacherActivities: [
              'Disassemble an open desktop system unit showing CPU socket, RAM slots, motherboard, power supply.',
              'Demonstrate boot sequence in the school computer lab.'
            ],
            studentActivities: [
              'Identify components in the computer lab hardware showcase.',
              'Complete a classification table of input and output hardware.'
            ],
            teachingMaterials: ['Demonstration PC system unit with removable side panel', 'Sample RAM sticks, hard drive, CPU heatsink', 'Wall charts of motherboard architecture'],
            evaluationGuide: ['Practical hardware identification quiz and written multiple choice test.'],
            examRelevance: { bece: true }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 6. PHYSICAL AND HEALTH EDUCATION (JSS 1 - 3)
  // ========================================================
  {
    id: 'jss-physical-health-education',
    name: 'Physical and Health Education (PHE)',
    code: 'PHE-JSS',
    level: 'jss',
    field: 'vocational',
    isCompulsory: true,
    recommendedPeriodsPerWeek: 3,
    targetGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/jss1-3.html',
    description: 'Physical and Health Education curriculum integrating Athletics, Ball Games, Gymnastics, Human Anatomy & Physiology, First Aid, Drug Abuse prevention, and Community Health.',
    generalObjectives: [
      'Promote physical fitness, neuromuscular coordination, and sportsmanship.',
      'Master track and field events (sprints, relays, long jump, high jump, shot put).',
      'Learn rules, skills, and officiating in major ball games (football, basketball, volleyball).',
      'Understand personal hygiene, communicable disease control, and emergency first aid.'
    ],
    recommendedTextbooks: [
      'NERDC Physical and Health Education for JSS 1-3',
      'Comprehensive Physical and Health Education by Fagbemi',
      'PHE for Junior Secondary Schools by Evans'
    ],
    themes: [
      {
        id: 'phe-jss-theme-1',
        themeNumber: 1,
        title: 'Athletics (Track and Field)',
        description: 'Sprint mechanics, sprint start (crouch start), baton exchange in relays, hurdle clearance, long jump techniques (hang, sail, hitch-kick), high jump (Fosbury flop, Western roll).',
        topics: [
          {
            id: 'phe-jss-top-1',
            title: 'Track Events: Sprints, Relay Races, and Baton Exchange',
            week: 3,
            term: 'Term 1',
            classGrade: 'JSS 1',
            subTopics: ['Sprint races (100m, 200m, 400m)', 'Crouch start commands: On your marks, Set, Go (Gun fired)', 'Relay races (4x100m, 4x400m, Medley)', 'Visual and Non-visual baton exchange techniques inside the 20m take-over zone'],
            performanceObjectives: [
              'Execute the three phases of the crouch start with correct block positioning.',
              'Demonstrate non-visual baton passing within the regulation 20-meter take-over zone.',
              'Explain the rules governing lane discipline, false starts, and baton drops in relays.'
            ],
            contentDetails: [
              'Starting blocks placement and body center of gravity.',
              'Acceleration phase, maximum velocity phase, deceleration and finish techniques (torso lean).',
              'Baton exchange techniques: Up-sweep vs Down-sweep.'
            ],
            teacherActivities: [
              'Demonstrate crouch start posture on the school athletic track.',
              'Organize lane pairing drills for relay handover practice.'
            ],
            studentActivities: [
              'Practice starting block drills on teacher whistle commands.',
              'Execute paired sprint handover runs across marked exchange zones.'
            ],
            teachingMaterials: ['Starting blocks, relay batons, running spikes / sneakers', 'Stopwatches, whistle, athletic cones, lane marker tape'],
            evaluationGuide: ['Practical field performance grading on starting technique and relay baton transition speed.'],
            examRelevance: { bece: true }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 7. CIVIC EDUCATION (JSS 1 - 3)
  // ========================================================
  {
    id: 'jss-civic-education',
    name: 'Civic Education',
    code: 'CIV-JSS',
    level: 'jss',
    field: 'core',
    isCompulsory: true,
    recommendedPeriodsPerWeek: 3,
    targetGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/jss1-3.html',
    description: 'National Values curriculum covering Democratic Governance, Nigerian Constitution, National Symbols, Human Rights, Rule of Law, Integrity, and Anti-Corruption agencies.',
    generalObjectives: [
      'Inculcate patriotic values, civic responsibilities, and respect for national symbols.',
      'Understand fundamental human rights, constitutional provisions, and rule of law.',
      'Promote democratic culture, electoral participation, and peaceful co-existence.',
      'Expose hazards of corruption, cultism, and social vices while promoting national unity.'
    ],
    recommendedTextbooks: [
      'NERDC Civic Education for Junior Secondary Schools (Books 1-3)',
      'Basic Civic Education for JSS by Ukegbu',
      'Civic Education for Nigerian Schools by Rasmed'
    ],
    themes: [
      {
        id: 'civ-jss-theme-1',
        themeNumber: 1,
        title: 'National Values and Democratic Citizenship',
        description: 'National identity, national symbols, constitution, rule of law, citizenship rights, and civic duties.',
        topics: [
          {
            id: 'civ-jss-top-1',
            title: 'National Values: Honesty, Integrity, and Self-Reliance',
            week: 2,
            term: 'Term 1',
            classGrade: 'JSS 1',
            subTopics: ['Definition of Values and National Values', 'Importance of honesty and discipline in school and community', 'Attributes of integrity', 'Consequences of dishonesty and examination malpractice'],
            performanceObjectives: [
              'Define values and explain their importance in shaping societal order.',
              'Enumerate five personal and civic benefits of honesty and integrity.',
              'Discuss the moral and legal consequences of corruption and examination malpractice in Nigeria.'
            ],
            contentDetails: [
              'Core Nigerian constitutional values: discipline, integrity, dignity of labor, social justice, religious tolerance, self-reliance.',
              'Role models of integrity in Nigerian national history.',
              'Anti-corruption agencies: EFCC, ICPC, Code of Conduct Bureau.'
            ],
            teacherActivities: [
              'Facilitate class role-playing dilemmas demonstrating honest choices vs dishonest temptations.',
              'Lead discussion on national heroes and heroines known for exemplary integrity.'
            ],
            studentActivities: [
              'Participate in classroom integrity role-plays.',
              'Write an essay on "How Honesty Builds a Great Nation".'
            ],
            teachingMaterials: ['Constitution of the Federal Republic of Nigeria (abridged)', 'National values posters and civic handbook'],
            evaluationGuide: ['Written essay and objective test on civic values and consequences of corruption.'],
            examRelevance: { bece: true }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 8. SOCIAL STUDIES (JSS 1 - 3)
  // ========================================================
  {
    id: 'jss-social-studies',
    name: 'Social Studies',
    code: 'SST-JSS',
    level: 'jss',
    field: 'core',
    isCompulsory: true,
    recommendedPeriodsPerWeek: 3,
    targetGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/jss1-3.html',
    description: 'Social Studies curriculum exploring Man and His Environment, Social Institutions (Family, Marriage, Religion), Cultural Heritage, Social Issues, Conflict Resolution, and Globalization.',
    generalObjectives: [
      'Examine human social interactions, family dynamics, and cultural heritage in Nigeria.',
      'Analyze contemporary social issues (poverty, gender inequality, child trafficking, substance abuse).',
      'Foster tolerance, intercultural respect, and conflict management skills.',
      'Understand the socio-economic and political challenges confronting developing nations.'
    ],
    recommendedTextbooks: [
      'NERDC Social Studies for Junior Secondary Schools 1-3',
      'Evans Social Studies for JSS by Onibonoje',
      'Comprehensive Social Studies for JSS by Adegoke'
    ],
    themes: [
      {
        id: 'sst-jss-theme-1',
        themeNumber: 1,
        title: 'Man and His Social and Cultural Environment',
        description: 'Family types, marriage customs across Nigerian ethnic nationalities, socialization agents, and preservation of indigenous culture.',
        topics: [
          {
            id: 'sst-jss-top-1',
            title: 'Family as a Primary Social Institution & Marriage Systems',
            week: 3,
            term: 'Term 1',
            classGrade: 'JSS 1',
            subTopics: ['Types of family (Nuclear, Extended, Single-parent, Blended)', 'Functions of the family in child socialization', 'Marriage systems in Nigeria (Traditional, Christian, Islamic, Court/Statutory)', 'Conditions for a stable and harmonious family'],
            performanceObjectives: [
              'Compare nuclear and extended family structures, stating advantages and disadvantages of each.',
              'Explain the three major types of marriage recognized under Nigerian law and custom.',
              'Identify the primary socialization responsibilities of parents towards adolescent children.'
            ],
            contentDetails: [
              'Kinship systems and lineage networks.',
              'Customary marriage requirements: bride price, parental consent, introduction ceremonies.',
              'Causes and consequences of broken homes and divorce on student academic performance.'
            ],
            teacherActivities: [
              'Present a graphic pedigree chart showing family relationships.',
              'Guide students to share diverse cultural traditions regarding marriage ceremonies.'
            ],
            studentActivities: [
              'Draw personal family tree diagrams tracing three generations.',
              'Debate: "The Extended Family System is More Beneficial in African Society Than the Nuclear Family".'
            ],
            teachingMaterials: ['Family tree chart posters', 'Photographs depicting Nigerian cultural wedding ceremonies'],
            evaluationGuide: ['Assess family tree projects and administer test on marriage types.'],
            examRelevance: { bece: true }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 9. SECURITY EDUCATION (JSS 1 - 3)
  // ========================================================
  {
    id: 'jss-security-education',
    name: 'Security Education',
    code: 'SEC-JSS',
    level: 'jss',
    field: 'core',
    isCompulsory: true,
    recommendedPeriodsPerWeek: 2,
    targetGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/jss1-3.html',
    description: 'National Security curriculum covering Personal Safety, Home Security, School Security, Crime Awareness, Emergency Response, Neighborhood Watch, and Cyber Safety.',
    generalObjectives: [
      'Cultivate security consciousness and personal situational awareness among learners.',
      'Identify common criminal threats (theft, kidnapping, vandalism, cultism, cyber fraud).',
      'Learn protocol for reporting security breaches to parents, school authorities, and law enforcement.',
      'Understand national security architecture and role of security agencies (Police, NSCDC, FRSC, Military).'
    ],
    recommendedTextbooks: [
      'NERDC Security Education for Junior Secondary Schools 1-3',
      'Security Education for Nigerian Schools by Evans',
      'Comprehensive Security Education by Adeleke'
    ],
    themes: [
      {
        id: 'sec-jss-theme-1',
        themeNumber: 1,
        title: 'Personal and Environmental Security Management',
        description: 'Personal safety precautions, suspicious movement detection, emergency hotlines, and anti-kidnapping strategies.',
        topics: [
          {
            id: 'sec-jss-top-1',
            title: 'Personal Safety Precautions & Stranger Danger Awareness',
            week: 4,
            term: 'Term 1',
            classGrade: 'JSS 1',
            subTopics: ['Identifying dangerous places and unlit routes', 'Stranger awareness and anti-abduction guidelines', 'Emergency distress signals and phone numbers (112, 199)', 'Security measures when alone at home or walking to school'],
            performanceObjectives: [
              'Enumerate five fundamental security rules when walking to and from school.',
              'Explain how to respond calmly and safely when approached by suspicious strangers.',
              'Recite national emergency dispatch contact lines (112) and demonstrate distress alert procedures.'
            ],
            contentDetails: [
              'Situational awareness (not wearing loud earphones while walking near roads).',
              'The "NO, GO, YELL, TELL" abduction defense strategy.',
              'Role of Nigeria Police Force, NSCDC (Civil Defence), and Neighborhood Security Corps.'
            ],
            teacherActivities: [
              'Simulate stranger approach scenarios with controlled classroom role-plays.',
              'Provide emergency phone contact stickers for student notebook covers.'
            ],
            studentActivities: [
              'Participate in situational awareness drills.',
              'Map safe routes from home to school identifying police stations and hospitals.'
            ],
            teachingMaterials: ['Emergency contact charts', 'Security safety handbook and route maps'],
            evaluationGuide: ['Scenario-based evaluation test on emergency response and security protocols.'],
            examRelevance: { bece: true }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 10. AGRICULTURAL SCIENCE (JSS 1 - 3)
  // ========================================================
  {
    id: 'jss-agricultural-science',
    name: 'Agricultural Science',
    code: 'AGR-JSS',
    level: 'jss',
    field: 'vocational',
    isCompulsory: true,
    recommendedPeriodsPerWeek: 3,
    targetGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/jss1-3.html',
    description: 'Pre-Vocational Agriculture curriculum covering Soil Science, Crop Husbandry, Farm Animals, Farm Tools & Machinery, Weeds & Pests Control, and Agricultural Economics.',
    generalObjectives: [
      'Instill interest in farming as an entrepreneurial and commercial enterprise.',
      'Understand soil fertility, plant nutrition, and practical crop production techniques.',
      'Learn farm animal rearing, feeding, housing, and disease management.',
      'Master simple farm tools maintenance and modern agricultural practices.'
    ],
    recommendedTextbooks: [
      'NERDC Agricultural Science for Junior Secondary Schools (Books 1-3)',
      'Junior Secondary Agricultural Science by Akinsanmi',
      'Comprehensive Agricultural Science for JSS by Anyanwu'
    ],
    themes: [
      {
        id: 'agr-jss-theme-1',
        themeNumber: 1,
        title: 'Crop Production and Soil Science',
        description: 'Soil classification, soil composition, soil fertility, tillage, crop propagation, planting dates, and harvesting.',
        topics: [
          {
            id: 'agr-jss-top-1',
            title: 'Soil Types, Composition, and Fertility Management',
            week: 3,
            term: 'Term 1',
            classGrade: 'JSS 1',
            subTopics: ['Soil components (Mineral matter, Organic matter, Soil water, Soil air, Living organisms)', 'Types of soil: Sandy, Clayey, Loamy', 'Soil texture and structure experiments', 'Methods of maintaining soil fertility (Crop rotation, Manuring, Liming, Cover cropping)'],
            performanceObjectives: [
              'Demonstrate the percentage composition of garden soil through sedimentation and heating experiments.',
              'Differentiate among sandy, clayey, and loamy soils based on water-holding capacity and particle size.',
              'Explain the agronomic principles of a 4-year crop rotation plan.'
            ],
            contentDetails: [
              'Soil formation processes (physical, chemical, biological weathering).',
              'Organic manures (Farmyard manure, Compost, Green manure) vs Inorganic fertilizers (NPK, Urea).',
              'Soil pH testing and correction with agricultural lime (CaCO3).'
            ],
            teacherActivities: [
              'Set up laboratory soil sedimentation cylinder experiments.',
              'Guide students in compost pit construction on the school farm.'
            ],
            studentActivities: [
              'Conduct soil percolation and capillarity tests in lab teams.',
              'Assist in maintaining the school garden vegetable nursery.'
            ],
            teachingMaterials: ['Soil samples (sand, clay, loam), measuring cylinders, funnels, filter papers', 'Soil pH testing kit, compost pit on school farm'],
            evaluationGuide: ['Laboratory practical write-up on soil water retention and written theory test.'],
            examRelevance: { bece: true }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 11. HOME ECONOMICS (JSS 1 - 3)
  // ========================================================
  {
    id: 'jss-home-economics',
    name: 'Home Economics',
    code: 'HEC-JSS',
    level: 'jss',
    field: 'vocational',
    isCompulsory: true,
    recommendedPeriodsPerWeek: 3,
    targetGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/jss1-3.html',
    description: 'Pre-Vocational Home Economics curriculum integrating Food & Nutrition, Clothing & Textiles, Home Management, Child Development, and Consumer Education.',
    generalObjectives: [
      'Equip learners with practical home management, culinary, and garment construction skills.',
      'Understand nutrient classes, balanced diet planning, and food preservation methods.',
      'Learn sewing machine operation, hand stitches, pattern drafting, and fabric care.',
      'Develop personal hygiene, family budget planning, and consumer rights awareness.'
    ],
    recommendedTextbooks: [
      'NERDC Home Economics for Junior Secondary Schools 1-3',
      'Home Economics for JSS by Anyakoha',
      'Comprehensive Home Economics by Olaitan'
    ],
    themes: [
      {
        id: 'hec-jss-theme-1',
        themeNumber: 1,
        title: 'Food, Nutrition, and Kitchen Management',
        description: 'Nutrient classes, malnutrition diseases, cooking methods (boiling, frying, baking, steaming), meal planning for vulnerable groups, kitchen hygiene and equipment care.',
        topics: [
          {
            id: 'hec-jss-top-1',
            title: 'Nutrient Classes, Balanced Diet, and Malnutrition Prevention',
            week: 3,
            term: 'Term 1',
            classGrade: 'JSS 1',
            subTopics: ['Six classes of food: Carbohydrates, Proteins, Fats & Oils, Vitamins, Minerals, Water', 'Functions and food sources available in Nigerian markets', 'Balanced diet formulation using the Food Pyramid', 'Deficiency diseases: Kwashiorkor, Marasmus, Scurvy, Rickets, Beriberi, Goitre, Anemia'],
            performanceObjectives: [
              'Identify the six essential classes of food with at least three local Nigerian sources for each.',
              'Formulate a 3-course balanced daily meal plan for a school adolescent.',
              'Match nutritional deficiency diseases with their corresponding missing vitamins or minerals.'
            ],
            contentDetails: [
              'Macronutrients vs Micronutrients.',
              'Food energy values and metabolic requirements.',
              'Dietary guidelines for preventing childhood stunting and obesity.'
            ],
            teacherActivities: [
              'Display local foodstuffs from local markets and guide classification.',
              'Demonstrate food testing for starch (iodine test) and simple sugars (Benedict test).'
            ],
            studentActivities: [
              'Design colorful balanced meal charts for their own age group.',
              'Perform simple food nutrient tests in the Home Economics laboratory.'
            ],
            teachingMaterials: ['Sample foodstuffs (yams, beans, palm oil, citrus fruits, leafy vegetables)', 'Food test chemicals (Iodine, Biuret, Benedict reagents)'],
            evaluationGuide: ['Practical laboratory food test assessment and menu planning workbook grading.'],
            examRelevance: { bece: true }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 12. CULTURAL AND CREATIVE ARTS (JSS 1 - 3)
  // ========================================================
  {
    id: 'jss-cultural-creative-arts',
    name: 'Cultural and Creative Arts (CCA)',
    code: 'CCA-JSS',
    level: 'jss',
    field: 'vocational',
    isCompulsory: true,
    recommendedPeriodsPerWeek: 3,
    targetGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/jss1-3.html',
    description: 'Arts & Performing curriculum combining Visual Arts (Drawing, Painting, Sculpture, Crafts), Performing Arts (Music, Dance, Drama), Art History, and Creative Entrepreneurship.',
    generalObjectives: [
      'Stimulate creative expression, aesthetic appreciation, and artistic craftsmanship.',
      'Master basic elements and principles of design (line, shape, color, texture, balance).',
      'Learn musical theory (stave notation, solfa notes, musical instruments) and theatrical performance.',
      'Explore Nigerian indigenous art traditions (Nok, Ife, Benin, Igbo-Ukwu) and festival arts.'
    ],
    recommendedTextbooks: [
      'NERDC Cultural and Creative Arts for JSS 1-3',
      'Cultural and Creative Arts for Nigerian Schools by Ibrahim et al.',
      'Comprehensive CCA for Junior Secondary by Ogundele'
    ],
    themes: [
      {
        id: 'cca-jss-theme-1',
        themeNumber: 1,
        title: 'Visual Arts and Design Fundamentals',
        description: 'Elements of art, principles of design, color theory (primary, secondary, tertiary, complementary), still life drawing, and local crafts (pottery, tie-dye, beadwork).',
        topics: [
          {
            id: 'cca-jss-top-1',
            title: 'Elements and Principles of Design & Color Wheel Theory',
            week: 2,
            term: 'Term 1',
            classGrade: 'JSS 1',
            subTopics: ['Elements of Art: Line, Shape, Form, Color, Texture, Value, Space', 'Principles of Design: Balance, Rhythm, Proportion, Dominance, Harmony, Variety', '12-part Color Wheel: Primary (Red, Yellow, Blue), Secondary, Tertiary colors', 'Color harmonies: Complementary, Analogous, Monochromatic shades'],
            performanceObjectives: [
              'Define and illustrate the seven fundamental elements of visual art.',
              'Mix primary color paints to create a standard 12-part circular color wheel.',
              'Apply shading techniques (hatching, cross-hatching, stippling, smudging) in still-life pencil drawings.'
            ],
            contentDetails: [
              'Color temperatures: Warm colors (reds, oranges) vs Cool colors (blues, greens).',
              'Tonal gradation scales from white to deep black.',
              'Art appreciation of Nigerian cultural artifacts.'
            ],
            teacherActivities: [
              'Demonstrate paint mixing with poster colors on a demonstration palette.',
              'Set up a still-life arrangement of clay pots and calabashes for class drawing.'
            ],
            studentActivities: [
              'Paint an accurate 12-segment color wheel in their art sketchpads.',
              'Draw and shade the classroom still life composition.'
            ],
            teachingMaterials: ['Poster color paints, watercolor brushes, mixing palettes, drawing paper', 'Still life display objects (Nigerian traditional terracotta pots, gourds)'],
            evaluationGuide: ['Grade artwork based on color mixing accuracy, tonal depth, and composition balance.'],
            examRelevance: { bece: true }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 13. BUSINESS STUDIES (JSS 1 - 3)
  // ========================================================
  {
    id: 'jss-business-studies',
    name: 'Business Studies',
    code: 'BUS-JSS',
    level: 'jss',
    field: 'business',
    isCompulsory: true,
    recommendedPeriodsPerWeek: 4,
    targetGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/jss1-3.html',
    description: 'Pre-vocational Business curriculum integrating Commerce, Bookkeeping & Accounting, Office Practice, Keyboarding/Typing, Consumer Rights, and Entrepreneurship.',
    generalObjectives: [
      'Introduce fundamental concepts of commerce, trade, and economic enterprise.',
      'Master the principles of double-entry bookkeeping, cash books, and simple ledgers.',
      'Understand office organization, filing systems, correspondence, and telecommunication.',
      'Develop touch-typing proficiency and consumer rights protection awareness.'
    ],
    recommendedTextbooks: [
      'NERDC Business Studies for Junior Secondary Schools (Books 1-3)',
      'WABP Business Studies for JSS by Egbe et al.',
      'Comprehensive Business Studies for Junior Secondary by Adebayo'
    ],
    themes: [
      {
        id: 'bus-theme-1',
        themeNumber: 1,
        title: 'Introduction to Business and Commerce',
        description: 'Concepts of business, sole proprietorship, partnership, trade (home and foreign), aids to trade (banking, insurance, advertising, transport, warehousing).',
        topics: [
          {
            id: 'bus-top-1',
            title: 'Business Concepts, Types of Occupation, and Aids to Trade',
            week: 2,
            term: 'Term 1',
            classGrade: 'JSS 1',
            subTopics: ['Definition of Business and Commerce', 'Types of Occupation (Extractive, Manufacturing, Constructive, Commercial, Direct services)', 'Aids to Trade (Banking, Insurance, Transport, Communication, Advertising, Warehousing)', 'Qualities of an entrepreneur'],
            performanceObjectives: [
              'Define business and explain its role in satisfying human wants.',
              'Classify occupations with at least three Nigerian industry examples for each.',
              'Explain how the six aids to trade facilitate seamless commercial transactions.'
            ],
            contentDetails: [
              'Direct vs Indirect services.',
              'Importance of commerce in employment generation and GDP contribution in Nigeria.',
              'Ethics in business transactions (truthfulness, fair weights and measures).'
            ],
            teacherActivities: [
              'Use a flow chart showing the journey of a commodity (e.g. cocoa or petroleum) from farm/wellhead to end consumer.',
              'Organize a mini-market simulation in class.'
            ],
            studentActivities: [
              'Create a diagrammatic matrix linking occupations to final consumer goods.',
              'List businesses operating within their local community.'
            ],
            teachingMaterials: ['Occupational chart posters', 'Samples of commercial documentation (receipts, invoices)'],
            evaluationGuide: ['Objective test on occupational classification and short answer questions on aids to trade.'],
            examRelevance: { bece: true }
          }
        ]
      },
      {
        id: 'bus-theme-2',
        themeNumber: 2,
        title: 'Bookkeeping and Simple Ledger Accounts',
        description: 'Double entry principles, Books of original entry, Ledger accounts, Two-column and Three-column Cash Books, Petty Cash Book, and Trial Balance.',
        topics: [
          {
            id: 'bus-top-2',
            title: 'Double Entry Principle & The Two-Column Cash Book',
            week: 6,
            term: 'Term 2',
            classGrade: 'JSS 2',
            subTopics: ['Rules of Debit and Credit: Debit the receiver, Credit the giver', 'Assets, Liabilities, and Capital accounting equation', 'Two-column Cash Book format (Cash and Bank columns)', 'Posting transactions, balancing off, and carrying down balances (c/d & b/d)'],
            performanceObjectives: [
              'State the fundamental golden rule of double-entry bookkeeping.',
              'Record transactions involving cash and cheque payments in a Two-Column Cash Book.',
              'Balance off the Cash Book at the end of a trading period and extract closing balances.'
            ],
            contentDetails: [
              'Accounting Equation: Assets = Capital + Liabilities.',
              'Contra entries (cash deposited into bank or withdrawn from bank for office use).',
              'Distinction between discount allowed and discount received.'
            ],
            teacherActivities: [
              'Draw a model \'T\' account and two-column cash book format on the board.',
              'Work through sample transactional entries step-by-step with contra entry illustrations.'
            ],
            studentActivities: [
              'Post a 10-transaction sample problem into ruled two-column cash book exercise books.',
              'Calculate closing balances and verify arithmetic equality.'
            ],
            teachingMaterials: ['Ruled accounting ledger paper', 'Two-column cash book poster template'],
            evaluationGuide: ['Practical accounting exercise grading for debit/credit accuracy, contra symbols, and neat ledger ruling.'],
            examRelevance: { bece: true }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 14. CHRISTIAN RELIGIOUS STUDIES (JSS 1 - 3)
  // ========================================================
  {
    id: 'jss-christian-religious-studies',
    name: 'Christian Religious Studies (CRS)',
    code: 'CRS-JSS',
    level: 'jss',
    field: 'humanities',
    isCompulsory: false,
    recommendedPeriodsPerWeek: 3,
    targetGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/jss1-3.html',
    description: 'Religious & Values curriculum exploring the Sovereignty of God, Creation, Early Patriarchs, Life and Ministry of Jesus Christ, Early Apostolic Church, and Christian Moral Conduct in Society.',
    generalObjectives: [
      'Foster spiritual, moral, and ethical values grounded in Biblical teachings.',
      'Understand God as Creator, Sustainer, and Lawgiver.',
      'Examine the life, parables, miracles, death, and resurrection of Jesus Christ.',
      'Apply Christian principles of love, forgiveness, humility, justice, and civic responsibility.'
    ],
    recommendedTextbooks: [
      'NERDC Christian Religious Studies for JSS 1-3',
      'CRS for Junior Secondary Schools by Quarcoopome',
      'Essential CRS for JSS by Adeyemo'
    ],
    themes: [
      {
        id: 'crs-jss-theme-1',
        themeNumber: 1,
        title: 'God and Creation & The Life of Jesus Christ',
        description: 'Creation story, Fall of man, Call of Abraham, Birth, Baptism, Temptation, Sermon on the Mount, and Parables of Jesus Christ.',
        topics: [
          {
            id: 'crs-jss-top-1',
            title: 'The Creation Narrative & Man as God\'s Steward',
            week: 1,
            term: 'Term 1',
            classGrade: 'JSS 1',
            subTopics: ['Account of Creation (Genesis 1 & 2)', 'Order of creation across the 6 days', 'Creation of man in the image and likeness of God', 'Man\'s mandate of stewardship over nature and environment'],
            performanceObjectives: [
              'Narrate the sequential order of God\'s creation from Day 1 to Day 6.',
              'Explain the unique spiritual purpose and dignity of human beings as image-bearers of God.',
              'Discuss five practical ways students can fulfill their mandate as good stewards of the environment.'
            ],
            contentDetails: [
              'Genesis 1:1 - 2:25.',
              'Sabbath institution on the 7th day.',
              'Contrast between creative stewardship and destructive exploitation of nature.'
            ],
            teacherActivities: [
              'Guide students through reading selected Genesis passages from the Holy Bible.',
              'Facilitate discussion on environmental stewardship.'
            ],
            studentActivities: [
              'Construct a timeline chart depicting the 6 days of creation.',
              'Recite Genesis 1:1-3 from memory.'
            ],
            teachingMaterials: ['The Holy Bible (RSV / NIV)', 'Creation narrative illustrated charts'],
            evaluationGuide: ['Oral recitation and written essay assessing knowledge of creation order.'],
            examRelevance: { bece: true }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 15. ISLAMIC RELIGIOUS STUDIES (JSS 1 - 3)
  // ========================================================
  {
    id: 'jss-islamic-religious-studies',
    name: 'Islamic Religious Studies (IRS)',
    code: 'IRS-JSS',
    level: 'jss',
    field: 'humanities',
    isCompulsory: false,
    recommendedPeriodsPerWeek: 3,
    targetGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/jss1-3.html',
    description: 'Religious & Values curriculum covering Quranic Recitation & Translation (Surahs Al-Fatihah to An-Nas), Hadith Studies, Tawhid (Articles of Faith), Fiqh (Taharah, Salah, Zakah, Sawm), and Islamic History.',
    generalObjectives: [
      'Instill Islamic faith, monotheism (Tawhid), and spiritual moral excellence (Akhlaq).',
      'Learn correct Arabic pronunciation, recitation, and translation of selected Quranic chapters.',
      'Master the practical rules of ritual purification (Wudu, Ghusl, Tayammum) and daily Salah.',
      'Understand the life of Prophet Muhammad (SAW) and the Rightly Guided Caliphs.'
    ],
    recommendedTextbooks: [
      'NERDC Islamic Studies for Junior Secondary Schools 1-3',
      'Islamic Religious Knowledge for JSS by Malik',
      'A Comprehensive Islamic Studies for Schools by Lemu'
    ],
    themes: [
      {
        id: 'irs-jss-theme-1',
        themeNumber: 1,
        title: 'Tawhid and Quranic Studies',
        description: 'Six Articles of Faith (Iman), Surahs Al-Fatihah, Al-Ikhlas, Al-Falaq, An-Nas, Arabic orthography, and meaning.',
        topics: [
          {
            id: 'irs-jss-top-1',
            title: 'Tawhid: Oneness of Allah & Surah Al-Ikhlas',
            week: 1,
            term: 'Term 1',
            classGrade: 'JSS 1',
            subTopics: ['Concept of Tawhid (Tawhid ar-Rububiyyah, Tawhid al-Uluhiyyah, Tawhid al-Asma was-Sifat)', 'Surah Al-Ikhlas (Chapter 112): Arabic text, transliteration, and English meaning', 'Shirk (polytheism) as the unforgivable sin in Islam', 'Attributes of Allah (Al-Khaliq, Ar-Rahman, Ar-Rahim)'],
            performanceObjectives: [
              'Explain the three dimensions of Tawhid with relevant Quranic proofs.',
              'Recite Surah Al-Ikhlas fluently in Arabic and translate all four verses into English.',
              'Identify forms of Shirk (major and minor) and explain why it is strictly prohibited.'
            ],
            contentDetails: [
              'Surah 112: Qul huwa Allahu Ahad, Allahus-Samad, Lam yalid wa lam yulad, Wa lam yakun lahu kufuwan ahad.',
              'Significance: Equivalent to one-third of the Holy Quran in spiritual merit.',
              'Practical manifestation of Tawhid in daily Muslim life and supplication (Dua).'
            ],
            teacherActivities: [
              'Model correct Tajweed pronunciation of Surah Al-Ikhlas verse by verse.',
              'Explain the meaning of Samad (the Eternal, Self-Sufficient Refuge).'
            ],
            studentActivities: [
              'Choral and individual recitation of Surah Al-Ikhlas.',
              'Write Arabic text and English translation in IRS exercise notebooks.'
            ],
            teachingMaterials: ['The Holy Quran (Mushaf with translation)', 'Arabic calligraphy Tajweed flashcards'],
            evaluationGuide: ['Oral Tajweed recitation test and written exam on the meaning of Tawhid.'],
            examRelevance: { bece: true }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 16. NIGERIAN HISTORY (JSS 1 - 3)
  // ========================================================
  {
    id: 'jss-history',
    name: 'Nigerian History',
    code: 'HIS-JSS',
    level: 'jss',
    field: 'humanities',
    isCompulsory: true,
    recommendedPeriodsPerWeek: 2,
    targetGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/jss1-3.html',
    description: 'Disarticulated compulsory National History curriculum tracing Pre-Colonial Kingdoms, Nok/Ife/Benin civilizations, Trans-Saharan/Atlantic trade, British Colonization, 1914 Amalgamation, and 1960 Independence.',
    generalObjectives: [
      'Inculcate historical consciousness, cultural pride, and national unity.',
      'Understand the socio-political organization of pre-colonial Nigerian civilizations.',
      'Analyze the economic and social impacts of the Trans-Saharan and Atlantic trade routes.',
      'Examine the imposition of British colonial rule, nationalist struggles, and attainment of Independence.'
    ],
    recommendedTextbooks: [
      'NERDC History for Junior Secondary Schools (Books 1-3)',
      'History of Nigeria for Basic Education by Falola et al.',
      'Groundwork of Nigerian History by Obaro Ikime'
    ],
    themes: [
      {
        id: 'his-jss-theme-1',
        themeNumber: 1,
        title: 'Pre-Colonial Nigerian Civilizations',
        description: 'Nok culture (terracotta), Ile-Ife bronzes, Benin Kingdom empire, Igbo-Ukwu bronzes, Kanem-Borno empire, Hausa states, Sokoto Caliphate.',
        topics: [
          {
            id: 'his-jss-top-1',
            title: 'Nok Culture, Igbo-Ukwu, and Ile-Ife Civilizations',
            week: 2,
            term: 'Term 1',
            classGrade: 'JSS 1',
            subTopics: ['Discovery of Nok culture by Bernard Fagg (1928/1943) in Kaduna/Plateau states', 'Characteristics of Nok terracotta sculptures (perforated pupils, elaborate hair styles)', 'Igbo-Ukwu bronze casting by Thurstan Shaw', 'Ile-Ife naturalistic brass heads and the legend of Oduduwa'],
            performanceObjectives: [
              'Locate the geographic centers of Nok, Igbo-Ukwu, and Ile-Ife on a map of Nigeria.',
              'Describe the unique artistic features of Nok terracotta sculptures.',
              'Explain how archaeological findings debunked colonial myths that African societies had no pre-colonial bronze technology.'
            ],
            contentDetails: [
              'Iron smelting technology in Nok dating to 500 BC - 200 AD.',
              'Lost-wax (cire perdue) casting technique in Ife and Benin.',
              'Significance of archaeological preservation in national museums.'
            ],
            teacherActivities: [
              'Display high-resolution photographs of Nok terracotta, Igbo-Ukwu roped pots, and Ife bronze heads.',
              'Map archaeological excavation sites across Nigeria on a large map.'
            ],
            studentActivities: [
              'Color and label historical civilization zones on an outline map of Nigeria.',
              'Write a short report describing the artistic brilliance of Nok terracotta.'
            ],
            teachingMaterials: ['Photographs/replicas of Nigerian ancient art pieces', 'Historical map of Nigeria showing archaeological sites'],
            evaluationGuide: ['Map-work test and short essay on Nok culture features and historical significance.'],
            examRelevance: { bece: true }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 17. FRENCH LANGUAGE (JSS 1 - 3)
  // ========================================================
  {
    id: 'jss-french-language',
    name: 'French Language',
    code: 'FRN-JSS',
    level: 'jss',
    field: 'humanities',
    isCompulsory: false,
    recommendedPeriodsPerWeek: 3,
    targetGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/jss1-3.html',
    description: 'Basic Education French curriculum fostering functional francophone communication, greetings, self-introduction, family descriptions, grammar (present tense verbs), and oral dialogues.',
    generalObjectives: [
      'Develop basic communicative listening, speaking, reading, and writing skills in French.',
      'Promote regional integration with Francophone neighboring countries (Benin, Niger, Cameroon, Chad).',
      'Master basic French grammar, conjugation of regular (-er, -ir, -re) and irregular (avoir, être, aller, faire) verbs.',
      'Conduct daily interpersonal exchanges and express personal preferences in French.'
    ],
    recommendedTextbooks: [
      'NERDC Le Français au Junior Secondary (Books 1-3)',
      'Nouvelle Méthode de Français pour JSS by Ajiboye',
      'On y Va! French for Junior Secondary Schools'
    ],
    themes: [
      {
        id: 'frn-jss-theme-1',
        themeNumber: 1,
        title: 'Greetings, Self-Introduction, and Daily Expressions',
        description: 'Salutations (Bonjour, Bonsoir, Bonne nuit), Se présenter (Name, Age, Nationality, Profession), Conjugation of être and avoir, Numbers 1 - 100.',
        topics: [
          {
            id: 'frn-jss-top-1',
            title: 'Salutations et Présentation Personnelle (Greetings & Self-Introduction)',
            week: 1,
            term: 'Term 1',
            classGrade: 'JSS 1',
            subTopics: ['Formal and informal greetings (Bonjour Monsieur, Salut Paul, Comment ça va?)', 'Presenting oneself: Je m\'appelle..., J\'ai ... ans, Je suis Nigérian(e), J\'habite à Lagos', 'Subject pronouns: Je, Tu, Il, Elle, Nous, Vous, Ils, Elles', 'Present tense conjugation of auxiliary verbs: ÊTRE (to be) and AVOIR (to have)'],
            performanceObjectives: [
              'Greet people appropriately according to the time of day and degree of familiarity in French.',
              'Introduce oneself fluently in French stating name, age, nationality, and residence in 4 complete sentences.',
              'Conjugate and correctly use the verbs "être" and "avoir" in simple present tense sentences.'
            ],
            contentDetails: [
              'Polite expressions: S\'il vous plaît, Merci beaucoup, De rien, Excusez-moi.',
              'Gender agreement for nationalities: Nigérian (m) vs Nigériane (f).',
              'Oral pronunciation of French nasal vowels.'
            ],
            teacherActivities: [
              'Model French greeting dialogues with voice modulation and hand gestures.',
              'Conduct paired oral role-play exchanges across the classroom.'
            ],
            studentActivities: [
              'Role-play greeting scenarios in pairs.',
              'Write a 4-sentence introductory self-profile in French in their exercise books.'
            ],
            teachingMaterials: ['French audio dialog recordings', 'Flashcards of greetings and subject pronouns'],
            evaluationGuide: ['Oral conversational assessment on self-introduction and written conjugation quiz.'],
            examRelevance: { bece: true }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 18. NIGERIAN LANGUAGES (YORUBA, IGBO, HAUSA) (JSS 1 - 3)
  // ========================================================
  {
    id: 'jss-nigerian-languages',
    name: 'Nigerian Languages (Hausa / Igbo / Yoruba)',
    code: 'NIG-LANG-JSS',
    level: 'jss',
    field: 'humanities',
    isCompulsory: true,
    recommendedPeriodsPerWeek: 3,
    targetGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/jss1-3.html',
    description: 'National Language curriculum teaching Orthography, Phonology, Grammar, Comprehension, Composition, and Cultural Traditions (proverbs, folktales, festivals, moral values) across major Nigerian languages.',
    generalObjectives: [
      'Preserve and promote indigenous Nigerian linguistic and cultural heritage.',
      'Master tonal orthography, vowels (oral and nasal), consonants, and grammatical rules.',
      'Develop reading fluency and creative composition in mother tongue / language of choice.',
      'Appreciate indigenous folklore, idiomatic expressions, proverbs, and customs.'
    ],
    recommendedTextbooks: [
      'NERDC Ede Yoruba / Asusu Igbo / Harshen Hausa for JSS 1-3',
      'Eko Ede Yoruba Titun for JSS by Mustapha et al.',
      'Utoasusu Igbo maka JSS by Ogbalu',
      'Koyar Da Hausa A Saukake by Dangambo'
    ],
    themes: [
      {
        id: 'lang-jss-theme-1',
        themeNumber: 1,
        title: 'Linguistic Structure, Tones, and Cultural Traditions',
        description: 'Orthography (Alifabeti/Mkpuruokwu/Bakake), Tonal markings (Do, Re, Mi), Greetings and Respect, Proverbs, and Indigenous Festivals.',
        topics: [
          {
            id: 'lang-jss-top-1',
            title: 'Orthography, Tonal Marking, and Traditional Greetings',
            week: 2,
            term: 'Term 1',
            classGrade: 'JSS 1',
            subTopics: ['Alphabet and Vowel systems (Oral and Nasal vowels)', 'Three primary tone marks: High (//), Mid (unmarked), Low (\\)', 'Importance of tone marks in distinguishing lexical meaning', 'Traditional greeting postures and expressions according to time and hierarchy'],
            performanceObjectives: [
              'List and pronounce all vowels and consonants in the selected Nigerian language.',
              'Place tone marks accurately on words to reflect meaning (e.g. Yoruba: ọkọ = husband, ọkọ = vehicle, ọkọ = hoe; Igbo: akwa = cloth, egg, cry; Hausa: fari = white, drought).',
              'Demonstrate respectful traditional greetings for elders.'
            ],
            contentDetails: [
              'Tonal notation systems.',
              'Kinship terms and cultural forms of address.',
              'Proverbs as vehicles of traditional wisdom and conflict resolution.'
            ],
            teacherActivities: [
              'Demonstrate melodic pitch variations corresponding to High, Mid, and Low tones.',
              'Facilitate cultural greeting demonstrations in class.'
            ],
            studentActivities: [
              'Tone-mark given sentences in the language.',
              'Demonstrate traditional greeting postures.'
            ],
            teachingMaterials: ['Alphabet and tone charts for Nigerian languages', 'Folklore story audio clips'],
            evaluationGuide: ['Tone-marking test and reading comprehension assessment in the selected indigenous language.'],
            examRelevance: { bece: true }
          }
        ]
      }
    ]
  }
];
