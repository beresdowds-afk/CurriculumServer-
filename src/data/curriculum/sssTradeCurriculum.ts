import { SubjectCurriculum } from '../../types';

export const SSS_TRADE_CURRICULUM_DATABASE: SubjectCurriculum[] = [
  // ========================================================
  // 1. DATA PROCESSING (SS 1 - 3)
  // ========================================================
  {
    id: 'sss-data-processing',
    name: 'Data Processing',
    code: 'DPR-SSS',
    level: 'sss',
    field: 'trade_entrepreneurship',
    isCompulsory: false,
    recommendedPeriodsPerWeek: 4,
    targetGrades: ['SS 1', 'SS 2', 'SS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html',
    description: 'Senior Secondary Data Processing curriculum covering History of Computing, Data and Information Processing, Spreadsheet Modeling, Database Management (MS Access / MySQL), Desktop Publishing (CorelDraw/Photoshop), Web Design (HTML/CSS), Computer Maintenance, and Information System Security.',
    generalObjectives: [
      'Master data processing life cycle: collection, input, processing, storage, and retrieval.',
      'Develop hands-on proficiency in spreadsheet financial modeling and database querying (SQL).',
      'Create professional graphic publications and responsive web layouts.',
      'Implement data backup policies, antivirus protocols, and cyber security safeguards.'
    ],
    recommendedTextbooks: [
      'Data Processing for Senior Secondary Schools (Books 1 - 3) by Hiit Plc',
      'Essential Data Processing for SSS by B. A. Olowookere',
      'Senior Secondary Data Processing by NERDC'
    ],
    themes: [
      {
        id: 'dpr-sss-theme-1',
        themeNumber: 1,
        title: 'Relational Database Design and SQL Operations',
        description: 'Database concepts (tables, records, fields, keys), relational models, data types, primary and foreign keys, entity-relationship diagrams (ERD), queries (SELECT, INSERT, UPDATE, DELETE), and report generation.',
        topics: [
          {
            id: 'dpr-sss-top-1',
            title: 'Database Management Systems: Tables, Keys, and Structured Query Language (SQL)',
            week: 4,
            term: 'Term 2',
            classGrade: 'SS 2',
            subTopics: ['Database concepts: Table, Record, Field, Primary Key, Foreign Key, Candidate Key', 'Entity-Relationship Diagrams (ERD) and One-to-Many Relationships', 'Creating tables and specifying data types (VARCHAR, INT, DATE, BOOLEAN)', 'Writing fundamental SQL Queries: SELECT * FROM, WHERE, ORDER BY, GROUP BY, JOIN'],
            performanceObjectives: [
              'Define primary key, foreign key, and composite key with concrete examples.',
              'Design a normalized relational database schema with at least three connected entities.',
              'Write executable SQL statements to query, filter, and extract specific database records.'
            ],
            contentDetails: [
              'Data integrity constraints (NOT NULL, UNIQUE, CHECK, FOREIGN KEY).',
              'Database Normalization (1NF, 2NF, 3NF) removing data redundancies.',
              'Real-world applications in school management and banking systems.'
            ],
            teacherActivities: [
              'Demonstrate live database creation and table relationship linking in MS Access and MySQL Workbench in the computer laboratory.',
              'Guide students through SQL syntax step-by-step.'
            ],
            studentActivities: [
              'Create a student records database containing 10 student profiles in the lab.',
              'Write SQL queries to find all students in SS 2 with grades above 70%.'
            ],
            teachingMaterials: ['Computer lab workstations with MS Access / MySQL', 'ERD design worksheets and SQL cheatsheet handouts'],
            evaluationGuide: ['Practical laboratory examination creating tables and executing SQL queries.'],
            examRelevance: { waec: true, neco: true, jamb: true, commonExamAreas: ['WASSCE Data Processing Practical Paper 2 & 3'] }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 2. ANIMAL HUSBANDRY (SS 1 - 3)
  // ========================================================
  {
    id: 'sss-animal-husbandry',
    name: 'Animal Husbandry',
    code: 'ANH-SSS',
    level: 'sss',
    field: 'trade_entrepreneurship',
    isCompulsory: false,
    recommendedPeriodsPerWeek: 4,
    targetGrades: ['SS 1', 'SS 2', 'SS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html',
    description: 'Senior Animal Husbandry curriculum covering Livestock Anatomy & Physiology, Ruminant & Non-Ruminant Digestion, Livestock Feed Formulation, Animal Breeding & Artificial Insemination, Disease & Parasite Control, and Farm Livestock Processing & Marketing.',
    generalObjectives: [
      'Understand anatomical and physiological systems of farm animals (cattle, sheep, goats, swine, poultry).',
      'Formulate balanced livestock feeds using Pearson Square and least-cost ration techniques.',
      'Master vaccination schedules, quarantine protocols, and bio-security in commercial livestock units.',
      'Manage commercial broilers, layers, and feedlot cattle for profitable enterprise.'
    ],
    recommendedTextbooks: [
      'Animal Husbandry for Senior Secondary Schools (Books 1 - 3) by O. Akinsanmi',
      'Modern Animal Husbandry for SSS by Oluyemi and Roberts',
      'NERDC Animal Husbandry for Senior Secondary Schools'
    ],
    themes: [
      {
        id: 'anh-sss-theme-1',
        themeNumber: 1,
        title: 'Livestock Nutrition and Feed Formulation',
        description: 'Nutritional requirements of farm animals, feed classification (roughages, concentrates, supplements), digestive physiology of monogastrics vs ruminants, and ration formulation using Pearson Square.',
        topics: [
          {
            id: 'anh-sss-top-1',
            title: 'Pearson Square Method of Feed Ration Formulation',
            week: 4,
            term: 'Term 1',
            classGrade: 'SS 2',
            subTopics: ['Classes of animal feeds: Energy concentrates (Maize, Sorghum), Protein concentrates (Soybean meal, Fish meal), Roughages', 'Crude Protein (CP) requirements for broilers (Starter: 23%, Finisher: 20%) and layers (16.5%)', 'Step-by-step Pearson Square calculation protocol', 'Feed additives: Premixes, toxin binders, enzymes, and coccidiostats'],
            performanceObjectives: [
              'Classify animal feedstuffs into basal/energy and protein concentrates.',
              'Calculate precise percentage inclusion rates of maize and soybean meal to achieve a target 20% Crude Protein broiler finisher feed using Pearson Square.',
              'Explain the economic importance of least-cost ration formulation in commercial poultry production.'
            ],
            contentDetails: [
              'Pearson Square mathematics: diagonal subtraction ignoring positive/negative signs.',
              'Total parts summation and percentage ratio calculation.',
              'Feed quality control, storage conditions, and aflatoxin prevention.'
            ],
            teacherActivities: [
              'Work through Pearson Square examples on the whiteboard with varied feed ingredients.',
              'Demonstrate physical feed mixing on the school farm.'
            ],
            studentActivities: [
              'Formulate rations for assigned livestock scenarios in notebooks.',
              'Weigh and mix a sample 10kg experimental broiler feed ration on the school farm.'
            ],
            teachingMaterials: ['Feed ingredient samples (Yellow maize, SBM, GNC, Fish meal, Bone meal, Premix)', 'Weighing scales, Pearson Square calculation worksheets'],
            evaluationGuide: ['Graded calculation quiz on feed formulation and written assessment on nutritional classes.'],
            examRelevance: { waec: true, neco: true, commonExamAreas: ['WASSCE Animal Husbandry Paper 2 Section B Feed Formulation Question'] }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 3. FISHERIES (SS 1 - 3)
  // ========================================================
  {
    id: 'sss-fisheries',
    name: 'Fisheries',
    code: 'FSH-SSS',
    level: 'sss',
    field: 'trade_entrepreneurship',
    isCompulsory: false,
    recommendedPeriodsPerWeek: 4,
    targetGrades: ['SS 1', 'SS 2', 'SS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html',
    description: 'Senior Secondary Fisheries curriculum covering Fish Taxonomy, Aquaculture System Construction (Earthen ponds, Concrete tanks, Tarpaulin, RAS), Fish Breeding & Induced Spawning (Catfish / Tilapia), Water Quality Management, Post-Harvest Fish Processing (Smoking, Sun drying, Freezing), and Fishery Law & Regulations in Nigeria.',
    generalObjectives: [
      'Understand aquatic biology, fish anatomy, and ecological requirements of commercially viable species.',
      'Design, construct, and manage freshwater aquaculture systems with optimal water quality.',
      'Master artificial propagation, hormone injection, egg stripping, and fry hatchery management.',
      'Operate fish smoking kilns and post-harvest preservation technologies.'
    ],
    recommendedTextbooks: [
      'Fisheries for Senior Secondary Schools (Books 1 - 3) by NERDC',
      'Aquaculture in the Tropics by Moses',
      'Handbook of Practical Fish Farming by Eyo et al.'
    ],
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
  },

  // ========================================================
  // 4. CATERING CRAFT PRACTICE (SS 1 - 3)
  // ========================================================
  {
    id: 'sss-catering-craft',
    name: 'Catering Craft Practice',
    code: 'CCP-SSS',
    level: 'sss',
    field: 'trade_entrepreneurship',
    isCompulsory: false,
    recommendedPeriodsPerWeek: 4,
    targetGrades: ['SS 1', 'SS 2', 'SS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html',
    description: 'Senior Catering Craft Practice curriculum covering Hospitality Industry Structure, Kitchen Organization & Safety, Culinary Arts (African & Continental Cookery), Menu Planning & Costing, Food & Beverage Service, Table Setting, Baking & Confectionery, and Sanitation & Hygiene standards.',
    generalObjectives: [
      'Understand commercial kitchen operations, culinary terminology, and kitchen ergonomics.',
      'Prepare traditional Nigerian delicacies, international continental dishes, and pastry confectionery.',
      'Plan balanced menus with accurate food costing, portion control, and profit calculation.',
      'Execute standard formal restaurant table layouts, buffet staging, and silver service techniques.'
    ],
    recommendedTextbooks: [
      'Catering Craft Practice for Senior Secondary Schools (Books 1 - 3) by NERDC',
      'Practical Cookery by Foskett et al.',
      'Food and Beverage Service by Dennis Lillicrap'
    ],
    themes: [
      {
        id: 'ccp-sss-theme-1',
        themeNumber: 1,
        title: 'Culinary Arts and Menu Planning',
        description: 'Menu types (Table d\'Hôte, À la Carte), menu costing, culinary preparation methods (boiling, baking, roasting, grilling, braising), pastry making, and standard food presentation.',
        topics: [
          {
            id: 'ccp-sss-top-1',
            title: 'Table d\'Hôte and À la Carte Menu Planning and Food Costing',
            week: 3,
            term: 'Term 1',
            classGrade: 'SS 2',
            subTopics: ['Differences between Table d\'Hôte (fixed price, limited choices) and À la Carte (individually priced dishes)', 'Principles of menu planning (nutritional balance, color, texture, seasonal availability, kitchen equipment capability)', 'Food costing calculation: Food cost % = (Cost of food ingredients / Selling price) * 100', 'Pricing strategies and gross profit margins in catering enterprises'],
            performanceObjectives: [
              'Distinguish between Table d\'Hôte and À la Carte menus on four structural characteristics.',
              'Design a balanced 3-course Table d\'Hôte menu for a formal banquet incorporating Nigerian and continental dishes.',
              'Calculate the selling price of a dish given the ingredient cost and a target 35% food cost percentage.'
            ],
            contentDetails: [
              '3-Course structure: Appetizer/Soup, Main Course with accompaniments, Dessert.',
              'Portion control tools (ladles, scoops, scales) to maintain food cost margins.',
              'Allergen declarations and dietary specifications (vegetarian, halal, gluten-free).'
            ],
            teacherActivities: [
              'Present standard hotel restaurant menus for classroom critical critique.',
              'Demonstrate food cost sheet calculation on the whiteboard.'
            ],
            studentActivities: [
              'Design and illustrate formal menu cards with appropriate typography.',
              'Prepare complete food costing sheets for a designated 3-course meal.'
            ],
            teachingMaterials: ['Sample restaurant menu cards', 'Food costing calculation templates', 'Culinary reference guides'],
            evaluationGuide: ['Practical menu card design evaluation and written costing calculation test.'],
            examRelevance: { waec: true, neco: true, commonExamAreas: ['WASSCE Catering Craft Practice Paper 2 Section A'] }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 5. MARKETING (SS 1 - 3)
  // ========================================================
  {
    id: 'sss-marketing',
    name: 'Marketing',
    code: 'MKT-SSS',
    level: 'sss',
    field: 'trade_entrepreneurship',
    isCompulsory: false,
    recommendedPeriodsPerWeek: 4,
    targetGrades: ['SS 1', 'SS 2', 'SS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html',
    description: 'Senior Secondary Marketing curriculum covering Marketing Concepts, The Marketing Mix (4Ps: Product, Price, Place, Promotion), Consumer Behavior, Market Segmentation, Digital & Social Media Marketing, Distribution Logistics, Salesmanship, and Marketing Ethics & Consumer Rights.',
    generalObjectives: [
      'Understand the marketing concept, customer value creation, and competitive differentiation.',
      'Formulate comprehensive marketing mix strategies (Product design, Pricing models, Distribution channels, Promotional campaigns).',
      'Conduct market research, demographic segmentation, and target market positioning.',
      'Leverage digital marketing channels (social media, search engine marketing, email campaigns) for business growth.'
    ],
    recommendedTextbooks: [
      'Marketing for Senior Secondary Schools (Books 1 - 3) by NERDC',
      'Essential Marketing for SSS by O. A. Longe',
      'Principles of Marketing by Kotler and Armstrong'
    ],
    themes: [
      {
        id: 'mkt-sss-theme-1',
        themeNumber: 1,
        title: 'The Marketing Mix (4Ps) and Market Segmentation',
        description: 'Product life cycle, pricing strategies (penetration, skimming, cost-plus), distribution channels (direct vs indirect), promotional mix (advertising, sales promotion, PR, personal selling), and market segmentation criteria.',
        topics: [
          {
            id: 'mkt-sss-top-1',
            title: 'The Marketing Mix (4Ps) and Product Life Cycle (PLC)',
            week: 4,
            term: 'Term 1',
            classGrade: 'SS 2',
            subTopics: ['The 4Ps of Marketing: Product, Price, Place, Promotion', 'Stages of the Product Life Cycle: Introduction, Growth, Maturity, Decline', 'Marketing mix adjustments at each stage of the PLC', 'Pricing strategies: Price Skimming vs Market Penetration'],
            performanceObjectives: [
              'Explain each element of the traditional 4Ps Marketing Mix model.',
              'Draw and label the Product Life Cycle (PLC) curve showing sales and profit trajectories.',
              'Recommend appropriate marketing mix strategies for a new product entering the growth stage versus a mature product facing decline.'
            ],
            contentDetails: [
              'Extended 7Ps for service marketing (People, Process, Physical Evidence).',
              'Case studies of Nigerian consumer brands (e.g. Indomie, Peak Milk) managing product life cycles.',
              'Brand equity, packaging, and trademark protection.'
            ],
            teacherActivities: [
              'Present brand case studies of Nigerian consumer products and analyze their marketing campaigns.',
              'Lead discussion on the strategic choice between price skimming and penetration pricing.'
            ],
            studentActivities: [
              'Develop a complete 4Ps marketing plan for a simulated student entrepreneurial product.',
              'Plot the PLC curve and indicate marketing mix tactics at each stage.'
            ],
            teachingMaterials: ['Product packaging samples', 'Marketing strategy case study handouts', 'PLC chart posters'],
            evaluationGuide: ['Grade student marketing plan presentations and written theory exam questions.'],
            examRelevance: { waec: true, neco: true, commonExamAreas: ['WASSCE Marketing Paper 2 Section A 4Ps and PLC Questions'] }
          }
        ]
      }
    ]
  }
];
