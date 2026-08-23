import { SubjectCurriculum } from '../../types';

export const SSS_SCIENCES_CURRICULUM_DATABASE: SubjectCurriculum[] = [
  // ========================================================
  // 1. GENERAL MATHEMATICS (SS 1 - 3)
  // ========================================================
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
    description: 'Senior Secondary Mathematics curriculum covering Number Bases, Modular Arithmetic, Surds, Logarithms, Quadratic & Simultaneous Equations, Coordinate Geometry, Trigonometry, Circle Geometry, Calculus, and Statistics & Probability.',
    generalObjectives: [
      'Equip students with mathematical thinking, analytical calculation, and abstract modeling skills.',
      'Master algebraic manipulation, functions, quadratic graphs, and simultaneous non-linear systems.',
      'Apply Euclidean geometry, circle theorems, and trigonometry to spatial problems and navigation.',
      'Analyze statistical data, calculate measures of dispersion, and compute probability distributions.'
    ],
    recommendedTextbooks: [
      'New General Mathematics for Senior Secondary Schools (Books 1 - 3) by Channon, Smith, Head',
      'MAN Senior Secondary Mathematics for SS 1-3',
      'Essential Mathematics for Senior Secondary Schools by Oluwasanmi'
    ],
    themes: [
      {
        id: 'mth-sss-theme-1',
        themeNumber: 1,
        title: 'Number and Numeration (Senior Secondary)',
        description: 'Number bases operations, modular arithmetic, indices, logarithms using tables, surds simplification, sequences and series (AP & GP), matrices and determinants.',
        topics: [
          {
            id: 'mth-sss-top-1',
            title: 'Modular Arithmetic & Cyclic Systems',
            week: 3,
            term: 'Term 1',
            classGrade: 'SS 1',
            subTopics: ['Concept of Modular Arithmetic (Clock arithmetic)', 'Addition, Subtraction, and Multiplication in given modulo', 'Finding the truth set for linear equations in modular systems', 'Real-world cyclic applications (days of the week, calendar months, rotation angles)'],
            performanceObjectives: [
              'Explain the concept of congruence modulo n (a ≡ b mod n).',
              'Construct addition and multiplication tables in given modulo systems (e.g. Modulo 4, 5, 7).',
              'Solve linear congruence equations of the form ax ≡ b (mod m).'
            ],
            contentDetails: [
              'Definition: a mod m represents remainder when a is divided by m.',
              'Multiplicative inverses in modular arithmetic and prime modulo conditions.',
              'Calendar calculations: determining day of the week for given future or past dates.'
            ],
            teacherActivities: [
              'Use a 12-hour clock face diagram on the board to illustrate modular equivalence.',
              'Guide students through the construction of modular arithmetic Cayley tables.'
            ],
            studentActivities: [
              'Construct modular addition and multiplication tables.',
              'Solve modular arithmetic equations in workbooks.'
            ],
            teachingMaterials: ['Clock face model', 'Modular multiplication grid posters'],
            evaluationGuide: ['Written test with 10 computation items on modular arithmetic operations.'],
            examRelevance: { waec: true, neco: true, jamb: true }
          },
          {
            id: 'mth-sss-top-2',
            title: 'Sequences and Series: Arithmetic and Geometric Progressions',
            week: 4,
            term: 'Term 1',
            classGrade: 'SS 2',
            subTopics: ['Arithmetic Progression (AP): First term (a), Common difference (d), nth term (Un = a + (n-1)d)', 'Sum of first n terms of an AP: Sn = n/2 [2a + (n-1)d]', 'Geometric Progression (GP): First term (a), Common ratio (r), nth term (Un = a*r^(n-1))', 'Sum of GP and Sum to Infinity (S_inf = a / (1 - r) for |r| < 1)'],
            performanceObjectives: [
              'Derive the general nth term and sum formulas for both Arithmetic and Geometric Progressions.',
              'Calculate any unknown parameter (a, d, r, n, Un, Sn) given sufficient constraints.',
              'Apply AP and GP to real-life compounding problems like population growth and compound interest.'
            ],
            contentDetails: [
              'Definitions of arithmetic mean and geometric mean.',
              'Convergence criteria for infinite geometric series: -1 < r < 1.',
              'Step-by-step solving of simultaneous equations arising from AP and GP word problems.'
            ],
            teacherActivities: [
              'Illustrate AP using staircase steps and GP using cell division diagrams.',
              'Derive summation formulas clearly on the whiteboard.'
            ],
            studentActivities: [
              'Solve past WASSCE and NECO questions on AP and GP.',
              'Calculate compound interest as an application of GP.'
            ],
            teachingMaterials: ['AP/GP formula summary wall charts', 'Financial compound interest calculation tables'],
            evaluationGuide: ['Standard WASSCE-style multi-part structured theory problem on AP and GP.'],
            examRelevance: { waec: true, neco: true, jamb: true, commonExamAreas: ['WASSCE Section B 12-mark compulsory question on AP/GP'] }
          }
        ]
      },
      {
        id: 'mth-sss-theme-2',
        themeNumber: 2,
        title: 'Geometry, Trigonometry, and Coordinate Systems',
        description: 'Circle geometry theorems, trigonometric ratios, sine and cosine rules, angles of elevation and depression, bearings and distances, circle mensuration (sectors, segments), vectors in 2D.',
        topics: [
          {
            id: 'mth-sss-top-3',
            title: 'Circle Theorems: Angles at Center, Cyclic Quadrilaterals, Tangents',
            week: 5,
            term: 'Term 2',
            classGrade: 'SS 2',
            subTopics: ['Theorem: Angle subtended at center is twice angle at circumference', 'Theorem: Angles in the same segment of a circle are equal', 'Theorem: Opposite angles of a cyclic quadrilateral are supplementary (sum = 180°)', 'Theorem: Alternate segment theorem (angle between tangent and chord)'],
            performanceObjectives: [
              'State and geometrically prove the four foundational circle theorems.',
              'Calculate unknown angles in complex geometric circle figures using appropriate geometric justifications.',
              'Construct tangents to a circle from an external point using compass and ruler.'
            ],
            contentDetails: [
              'Formal mathematical proofs with clear step-by-step reasons in parentheses.',
              'Properties of chords, perpendicular bisector from center to chord.',
              'Properties of intersecting chords inside and outside a circle.'
            ],
            teacherActivities: [
              'Use dynamic geometry software or board compasses to demonstrate theorem proofs.',
              'Break down complex examination composite circle diagrams into recognizable theorem components.'
            ],
            studentActivities: [
              'Draw circle figures with compasses and verify angle relationships using protractors.',
              'Solve 5 WAEC past theory questions requiring geometric proofs.'
            ],
            teachingMaterials: ['Chalkboard compass and protractor instruments', 'Circle theorem summary charts'],
            evaluationGuide: ['Grade students on geometric proof rigor and calculation accuracy.'],
            examRelevance: { waec: true, neco: true, jamb: true, commonExamAreas: ['WASSCE Theory Paper 2 Section A & B Circle Geometry'] }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 2. BIOLOGY (SS 1 - 3)
  // ========================================================
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
    description: 'Senior Secondary Biology curriculum covering Cellular Organization, Plant & Animal Physiology, Genetics & Heredity, Ecology & Ecosystems, Evolution, and Applied Biotechnology.',
    generalObjectives: [
      'Understand the biochemical and cellular basis of living organisms.',
      'Explore physiological mechanisms: nutrition, respiration, transport, excretion, and reproduction.',
      'Master Mendelian genetics, DNA structure, monohybrid/dihybrid crosses, and variation.',
      'Develop biological drawing and dissection laboratory competencies.'
    ],
    recommendedTextbooks: [
      'Modern Biology for Senior Secondary Schools by Sarojini T. Ramalingam (Africana First Publishers)',
      'Senior Secondary Biology (Books 1 - 3) by STAN',
      'Essential Biology for Senior Secondary Schools by M. C. Michael'
    ],
    themes: [
      {
        id: 'bio-sss-theme-1',
        themeNumber: 1,
        title: 'Organization of Life and Cellular Physiology',
        description: 'Levels of organization (cells, tissues, organs, systems), cell division (mitosis and meiosis), transport mechanisms (diffusion, osmosis, plasmolysis), enzymes and biochemical reactions.',
        topics: [
          {
            id: 'bio-sss-top-1',
            title: 'Cell Division: Mitosis and Meiosis Comparison',
            week: 3,
            term: 'Term 1',
            classGrade: 'SS 2',
            subTopics: ['Stages of Mitosis: Prophase, Metaphase, Anaphase, Telophase', 'Biological significance of Mitosis (growth, repair, asexual reproduction)', 'Stages of Meiosis: Reduction division (Meiosis I and Meiosis II)', 'Crossing over (chiasma formation) and genetic variation in gametes'],
            performanceObjectives: [
              'Illustrate with clear diagrams the sequential stages of mitotic cell division.',
              'Contrast Mitosis and Meiosis on at least six distinct parameters.',
              'Explain the role of Meiosis in maintaining constant chromosome numbers across generations.'
            ],
            contentDetails: [
              'Chromosomes, chromatids, centromere, spindle fibers, centrioles.',
              'Cytokinesis in animal cells (cleavage furrow) vs plant cells (cell plate formation).',
              'Non-disjunction anomalies (Down syndrome, Klinefelter syndrome).'
            ],
            teacherActivities: [
              'Use 3D cell division models or animation slides to display mitotic phases.',
              'Demonstrate microscopic identification of onion root tip squashes showing mitotic chromosomes.'
            ],
            studentActivities: [
              'Draw and label stages of mitosis in biology practical workbooks.',
              'Construct a comparative table of Mitosis vs Meiosis.'
            ],
            teachingMaterials: ['Prepared microscope slides of onion root tip mitosis', 'High-power biological microscope', 'Mitosis 3D chart models'],
            evaluationGuide: ['Practical drawing examination and written theory questions.'],
            examRelevance: { waec: true, neco: true, jamb: true }
          }
        ]
      },
      {
        id: 'bio-sss-theme-2',
        themeNumber: 2,
        title: 'Genetics, Heredity, and Molecular Biology',
        description: 'Mendel\'s Laws of Inheritance, monohybrid and dihybrid crosses, codominance, multiple alleles (ABO blood groups), sex-linked inheritance (color blindness, hemophilia), sickle cell anemia and pedigree charts.',
        topics: [
          {
            id: 'bio-sss-top-2',
            title: 'Mendelian Genetics, Blood Grouping & Sickle Cell Heredity',
            week: 4,
            term: 'Term 2',
            classGrade: 'SS 3',
            subTopics: ['Mendel\'s First Law of Segregation and Second Law of Independent Assortment', 'Punnett Square analysis for monohybrid and dihybrid crosses', 'ABO Blood Group System (IA, IB, IO) and Rhesus factor compatibility', 'Sickle cell gene inheritance (HbA and HbS alleles, genotype counseling for AA, AS, SS)'],
            performanceObjectives: [
              'State Mendel\'s First and Second Laws of Inheritance with standard genetic notations.',
              'Determine genotypic and phenotypic ratios of offspring using Punnett squares.',
              'Explain the genetic basis of Sickle Cell Anemia and justify pre-marital genotype compatibility testing.'
            ],
            contentDetails: [
              'Dominant vs Recessive alleles, homozygous vs heterozygous genotypes.',
              'Co-dominance in AB blood group.',
              'Sickle cell trait (AS) resistance to malaria parasite (Plasmodium falciparum) in tropical regions.'
            ],
            teacherActivities: [
              'Work through genetic pedigree crossing problems on the board.',
              'Lead interactive discussion on the social and medical imperative of genotype testing before marriage in Nigeria.'
            ],
            studentActivities: [
              'Calculate expected offspring phenotypic ratios for assigned parental genetic crosses.',
              'Map a 3-generation family pedigree chart tracking genetic inheritance.'
            ],
            teachingMaterials: ['Genetics crossing chart posters', 'Blood grouping simulated test kit', 'Punnett square worksheets'],
            evaluationGuide: ['Grade complex genetic problem solving in theory test.'],
            examRelevance: { waec: true, neco: true, jamb: true, commonExamAreas: ['WASSCE Biology Paper 2 Section B Genetics 20-mark essay question'] }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 3. CHEMISTRY (SS 1 - 3)
  // ========================================================
  {
    id: 'sss-chemistry',
    name: 'Chemistry',
    code: 'CHM-SSS',
    level: 'sss',
    field: 'science_math',
    isCompulsory: false,
    recommendedPeriodsPerWeek: 4,
    targetGrades: ['SS 1', 'SS 2', 'SS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html',
    description: 'Senior Secondary Chemistry curriculum covering Atomic Structure, Periodic Trends, Chemical Bonding, Stoichiometry & Mole Concept, Acids, Bases & Salts, Chemical Kinetics, Energetics, Electrochemistry, Organic Chemistry, and Qualitative Analysis.',
    generalObjectives: [
      'Understand the atomic and molecular nature of matter and periodic properties.',
      'Perform stoichiometric calculations involving mole ratios, molar masses, and gas laws.',
      'Master the principles of volumetric titration and qualitative inorganic analysis.',
      'Explore organic reaction mechanisms, functional groups, hydrocarbons, and industrial processes.'
    ],
    recommendedTextbooks: [
      'New School Chemistry for Senior Secondary Schools by Osei Yaw Ababio (Africana First Publishers)',
      'Senior Secondary Chemistry (Books 1 - 3) by STAN',
      'Essential Chemistry for Senior Secondary Schools by I. A. Odesina'
    ],
    themes: [
      {
        id: 'chm-sss-theme-1',
        themeNumber: 1,
        title: 'Atomic Structure, Bonding, and Stoichiometry',
        description: 'Electronic configuration, periodic trends, ionic and covalent bonding, mole concept, balancing chemical equations, gas laws, and stoichiometric calculations.',
        topics: [
          {
            id: 'chm-sss-top-1',
            title: 'The Mole Concept, Molar Volume, and Stoichiometric Calculations',
            week: 4,
            term: 'Term 1',
            classGrade: 'SS 1',
            subTopics: ['Avogadro\'s number (6.022 x 10^23 particles/mol) and molar mass', 'Calculations involving moles, mass, and number of particles: n = m / M', 'Molar volume of gases at s.t.p. (22.4 dm^3/mol)', 'Percentage composition by mass and Empirical vs Molecular formula determination'],
            performanceObjectives: [
              'Define the mole and state the numerical value of Avogadro\'s constant.',
              'Calculate the number of moles, mass, and volume of gases at standard temperature and pressure.',
              'Determine the empirical and molecular formulas of chemical compounds from experimental combustion data.'
            ],
            contentDetails: [
              'Relative atomic mass (Ar) and relative molecular mass (Mr).',
              'Reacting masses and volumes in balanced chemical equations.',
              'Limiting and excess reactants in chemical syntheses.'
            ],
            teacherActivities: [
              'Demonstrate step-by-step unit conversion and dimensional analysis on the whiteboard.',
              'Lead calculations finding empirical formulas from percentage mass compositions.'
            ],
            studentActivities: [
              'Solve multi-step stoichiometry problem sets in notebooks.',
              'Calculate molar masses of given complex salts (e.g. hydrated copper(II) sulfate CuSO4.5H2O).'
            ],
            teachingMaterials: ['Periodic Table of the Elements wall chart', 'Calculators, stoichiometric formula summary sheets'],
            evaluationGuide: ['Written examination with numerical stoichiometry problem solving.'],
            examRelevance: { waec: true, neco: true, jamb: true }
          }
        ]
      },
      {
        id: 'chm-sss-theme-2',
        themeNumber: 2,
        title: 'Volumetric Analysis (Titration) & Acid-Base Equilibria',
        description: 'Acids, bases, pH scale, standard solutions, acid-base titration indicators, volumetric calculations, and qualitative testing.',
        topics: [
          {
            id: 'chm-sss-top-2',
            title: 'Volumetric Analysis: Acid-Base Titration & Concentration Calculations',
            week: 3,
            term: 'Term 2',
            classGrade: 'SS 2',
            subTopics: ['Preparation of standard primary solutions (e.g., anhydrous Na2CO3)', 'Titration technique: Burette, pipette, conical flask handling', 'Choice of acid-base indicators (Methyl orange, Phenolphthalein)', 'Titration calculation using CaVa / CbVb = na / nb'],
            performanceObjectives: [
              'Prepare a 0.05 mol/dm^3 standard solution of sodium carbonate in a 250 cm^3 volumetric flask.',
              'Perform accurate volumetric titrations within concordance limits of ±0.10 cm^3.',
              'Calculate molar concentration (mol/dm^3), mass concentration (g/dm^3), percentage purity, and water of crystallization from titration data.'
            ],
            contentDetails: [
              'Meniscus reading techniques (bottom of meniscus for clear solutions).',
              'Indicator color transitions: Methyl Orange (Red in acid, Yellow in base), Phenolphthalein (Colorless in acid, Pink in base).',
              'Titration equation: (Concentration of Acid * Volume of Acid) / (Concentration of Base * Volume of Base) = Mole ratio of Acid / Mole ratio of Base.'
            ],
            teacherActivities: [
              'Demonstrate proper pipette filling with suction bulb, burette mounting, and swirl technique during titration in the laboratory.',
              'Work through complete WASSCE titration calculation algorithms on the board.'
            ],
            studentActivities: [
              'Carry out live titrations in pairs and record concordant titres in standard 3-trial tables.',
              'Calculate unknown acid concentrations and water of crystallization.'
            ],
            teachingMaterials: ['Burettes (50ml), Pipettes (20/25ml), Pipette fillers, Retort stands and clamps', 'Conical flasks, volumetric flasks (250ml), chemical reagents (0.1M HCl, 0.05M Na2CO3), indicators'],
            evaluationGuide: ['WASSCE Practical Chemistry Paper 3 titration grading rubric (titre accuracy within ±0.20 cm^3 of teacher value, table format, arithmetic calculations).'],
            examRelevance: { waec: true, neco: true, jamb: true, commonExamAreas: ['WASSCE Chemistry Paper 3 Practical Question 1 (25 marks)'] }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 4. PHYSICS (SS 1 - 3)
  // ========================================================
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
    description: 'Senior Secondary Physics curriculum covering Mechanics, Thermal Physics, Waves & Optics, Electricity & Magnetism, Atomic & Nuclear Physics, and Modern Electronics.',
    generalObjectives: [
      'Master classical mechanics: Newton\'s Laws, vectors, kinematics, energy conservation, circular motion.',
      'Understand wave phenomena, electromagnetic spectrum, geometrical optics, sound resonance.',
      'Analyze DC/AC electrical circuits, Ohm\'s Law, magnetic induction, and transformer operations.',
      'Develop experimental physics competencies in graph plotting, error estimation, and slope determination.'
    ],
    recommendedTextbooks: [
      'Senior Secondary School Physics by P. N. Okeke and M. W. Anyakoha',
      'New School Physics for Senior Secondary Schools by M. W. Anyakoha (Africana First Publishers)',
      'Principles of Physics for Senior Secondary Schools by Nelkon'
    ],
    themes: [
      {
        id: 'phy-sss-theme-1',
        themeNumber: 1,
        title: 'Mechanics and Properties of Matter',
        description: 'Rectilinear motion equations, Newton\'s laws of motion, projectile motion, momentum conservation, friction, circular motion, simple harmonic motion, elasticity, fluid dynamics.',
        topics: [
          {
            id: 'phy-sss-top-1',
            title: 'Projectile Motion: Trajectory, Maximum Height, Time of Flight, Range',
            week: 3,
            term: 'Term 1',
            classGrade: 'SS 2',
            subTopics: ['Resolution of initial velocity vector into horizontal (u cos θ) and vertical (u sin θ) components', 'Time to reach maximum height: t = (u sin θ) / g', 'Total time of flight: T = (2u sin θ) / g', 'Maximum height: H = (u^2 sin^2 θ) / (2g)', 'Horizontal range: R = (u^2 sin 2θ) / g and condition for maximum range (θ = 45°)'],
            performanceObjectives: [
              'Derive the mathematical expressions for time of flight, maximum height, and horizontal range of a projectile launched at an angle θ.',
              'Calculate projectile trajectory parameters given initial velocity and launch angle.',
              'Explain why horizontal velocity remains constant throughout projectile flight when air resistance is neglected.'
            ],
            contentDetails: [
              'Independence of horizontal and vertical motions.',
              'Parabolic trajectory equation: y = x tan θ - (g x^2) / (2 u^2 cos^2 θ).',
              'Applications in sports (javelin, football), artillery ballistics, and aerospace.'
            ],
            teacherActivities: [
              'Demonstrate projectile motion using a spring-loaded marble launcher at varied angles.',
              'Derive kinematics equations systematically on the board.'
            ],
            studentActivities: [
              'Launch projectiles at angles from 15° to 75° and record horizontal landing distances.',
              'Plot Range vs Angle θ showing peak at 45°.'
            ],
            teachingMaterials: ['Projectile launcher apparatus', 'Measuring tape, carbon paper, metal ball bearings', 'Scientific calculators'],
            evaluationGuide: ['Written test solving multi-step projectile motion word problems.'],
            examRelevance: { waec: true, neco: true, jamb: true }
          }
        ]
      },
      {
        id: 'phy-sss-theme-2',
        themeNumber: 2,
        title: 'Current Electricity & Circuitry',
        description: 'Ohm\'s Law, series and parallel circuits, electromotive force (e.m.f.) and internal resistance, electrical energy and power, heating effect of electric currents, potentiometer and Wheatstone bridge.',
        topics: [
          {
            id: 'phy-sss-top-2',
            title: 'Ohm\'s Law, Resistivity, and Internal Resistance of Cells',
            week: 4,
            term: 'Term 2',
            classGrade: 'SS 2',
            subTopics: ['Statement and verification of Ohm\'s Law: V = IR', 'Factors affecting resistance: Length, Cross-sectional area, Temperature, Material resistivity (R = ρL / A)', 'Electromotive force (E) vs Terminal Potential Difference (V): E = V + Ir = I(R + r)', 'Experimental determination of internal resistance using Potentiometer / Voltmeter-Ammeter method'],
            performanceObjectives: [
              'State Ohm\'s Law and specify the necessary physical conditions under which it holds.',
              'Calculate equivalent resistance of series-parallel resistor networks.',
              'Determine the electromotive force (E) and internal resistance (r) of an electric cell from a V versus I linear graph.'
            ],
            contentDetails: [
              'Ohmic vs Non-Ohmic conductors (e.g. filament lamp, diode).',
              'Graph plotting rules: large scales, line of best fit, slope determination from a large intercept triangle (ΔV / ΔI).',
              'Precautions in electrical experiments (tight connections, opening key between readings to prevent overheating).'
            ],
            teacherActivities: [
              'Assemble electrical circuits on demonstration boards with ammeters, voltmeters, rheostats, and standard cells.',
              'Guide students through graph plotting and error estimation protocols.'
            ],
            studentActivities: [
              'Connect circuits in laboratory groups to obtain 5 sets of voltage-current readings.',
              'Plot V vs I graphs on standard graph sheets and deduce internal resistance from slope and intercept.'
            ],
            teachingMaterials: ['DC power supplies / Dry cells, Rheostats (0-50Ω), Standard resistance boxes', 'Digital/Analog multimeters, DC ammeters, DC voltmeters, connecting wires, keys'],
            evaluationGuide: ['WASSCE Practical Physics Paper 3 grading rubric (table with correct decimal places, accurate graph scale, slope calculation, correct units).'],
            examRelevance: { waec: true, neco: true, jamb: true, commonExamAreas: ['WASSCE Physics Practical Paper 3 Question 2 (25 marks)'] }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 5. FURTHER MATHEMATICS (SS 1 - 3)
  // ========================================================
  {
    id: 'sss-further-mathematics',
    name: 'Further Mathematics',
    code: 'FMTH-SSS',
    level: 'sss',
    field: 'science_math',
    isCompulsory: false,
    recommendedPeriodsPerWeek: 4,
    targetGrades: ['SS 1', 'SS 2', 'SS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html',
    description: 'Advanced Mathematics curriculum covering Pure Mathematics (Matrices, Conic Sections, Calculus, Vectors in 3D), Statistics & Probability Distributions, and Mechanics (Statics, Dynamics, Collisions).',
    generalObjectives: [
      'Prepare students for advanced STEM tertiary disciplines in engineering, mathematics, and physics.',
      'Master differential and integral calculus and their applications to optimization and kinematics.',
      'Analyze vectors in three dimensions, matrix transformations, and conic sections (parabola, ellipse, hyperbola).',
      'Solve complex problems in statics (coplanar forces, moments) and dynamics (Newtonian motion, momentum).'
    ],
    recommendedTextbooks: [
      'Further Mathematics for Senior Secondary Schools (Books 1 - 3) by Bostock and Chandler',
      'Comprehensive Further Mathematics for Senior Secondary by Egbe et al.',
      'New Further Mathematics Project by Tuttuh-Adegun and Godspower'
    ],
    themes: [
      {
        id: 'fmth-sss-theme-1',
        themeNumber: 1,
        title: 'Differential and Integral Calculus',
        description: 'Limits of functions, differentiation from first principles, product rule, quotient rule, chain rule, implicit differentiation, optimization problems, integration techniques, definite integrals, and area under curves.',
        topics: [
          {
            id: 'fmth-sss-top-1',
            title: 'Differentiation: Rules of Differentiation & Tangents/Normals',
            week: 4,
            term: 'Term 1',
            classGrade: 'SS 2',
            subTopics: ['Differentiation from First Principles for polynomials: f\'(x) = lim_{h->0} [f(x+h) - f(x)] / h', 'Product Rule: d/dx (uv) = u(dv/dx) + v(du/dx)', 'Quotient Rule: d/dx (u/v) = [v(du/dx) - u(dv/dx)] / v^2', 'Chain Rule (Function of a function): dy/dx = (dy/du) * (du/dx)', 'Equations of Tangents and Normals to curves at given points'],
            performanceObjectives: [
              'Differentiate algebraic functions from first principles.',
              'Apply product, quotient, and chain rules to differentiate complex composite functions.',
              'Determine the gradient, stationary points, and equations of tangent and normal lines to a curve.'
            ],
            contentDetails: [
              'Rate of change interpretation.',
              'Condition for perpendicular lines: m1 * m2 = -1 (where m_normal = -1 / m_tangent).',
              'Second derivative test for classifying maxima, minima, and points of inflection (d^2y/dx^2).'
            ],
            teacherActivities: [
              'Derive product and quotient differentiation rules algebraically on the whiteboard.',
              'Illustrate geometric tangent and normal constructions using coordinate curve graphs.'
            ],
            studentActivities: [
              'Differentiate assigned sets of composite algebraic and trigonometric functions.',
              'Calculate equations of tangents and normals to cubic and quadratic curves.'
            ],
            teachingMaterials: ['Calculus formula reference sheets', 'Graphing tools / whiteboard coordinate grids'],
            evaluationGuide: ['Written examination with advanced calculus differentiation problems.'],
            examRelevance: { waec: true, neco: true, jamb: true, commonExamAreas: ['WASSCE Further Maths Paper 2 Section A & B Calculus questions'] }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 6. AGRICULTURAL SCIENCE (SENIOR) (SS 1 - 3)
  // ========================================================
  {
    id: 'sss-agricultural-science',
    name: 'Agricultural Science (Senior)',
    code: 'AGR-SSS',
    level: 'sss',
    field: 'science_math',
    isCompulsory: false,
    recommendedPeriodsPerWeek: 4,
    targetGrades: ['SS 1', 'SS 2', 'SS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html',
    description: 'Senior Agricultural Science curriculum covering Agricultural Ecology, Agronomy, Crop Improvement, Animal Nutrition & Anatomy, Agricultural Economics, Extension, and Farm Machinery.',
    generalObjectives: [
      'Master commercial farming principles, soil fertility management, and crop breeding techniques.',
      'Understand livestock anatomy, feed formulation, disease diagnostics, and animal breeding.',
      'Analyze agricultural marketing, supply-demand economics, farm budgeting, and cooperatives.',
      'Operate and maintain modern farm tractors, implements, and irrigation systems.'
    ],
    recommendedTextbooks: [
      'Senior Secondary Agricultural Science (Books 1 - 3) by O. Akinsanmi',
      'Essential Agricultural Science for Senior Secondary Schools by O. A. Iwena',
      'Comprehensive Agricultural Science for SSS by Anyanwu'
    ],
    themes: [
      {
        id: 'agr-sss-theme-1',
        themeNumber: 1,
        title: 'Crop Husbandry and Improvement',
        description: 'Plant breeding principles, hybridization, cultivation of cereal, legume, root, tuber, and tree crops, pest management, and post-harvest storage technologies.',
        topics: [
          {
            id: 'agr-sss-top-1',
            title: 'Crop Improvement: Selection, Hybridization, and Breeding Methods',
            week: 3,
            term: 'Term 1',
            classGrade: 'SS 2',
            subTopics: ['Aims of crop improvement (higher yield, pest/disease resistance, early maturity, nutritional quality)', 'Methods of crop improvement: Introduction, Selection (Mass, Pureline, Progeny selection), Hybridization (Cross-breeding)', 'Mendelian genetics applied to agronomic traits', 'Artificial pollination techniques in maize and cowpea'],
            performanceObjectives: [
              'Enumerate five primary objectives of crop improvement programs in Nigeria.',
              'Explain the operational differences between Mass selection and Pureline selection.',
              'Describe the step-by-step procedure of artificial hybridization (emasculation, bagging, pollination).'
            ],
            contentDetails: [
              'Role of agricultural research institutes in Nigeria: IITA, NCRI, CRIN, NIHORT, NSPRI.',
              'Genetically Modified Crops (GMOs) vs conventional breeding.',
              'Hybrid vigor (heterosis) and agronomic yield enhancement.'
            ],
            teacherActivities: [
              'Demonstrate emasculation and pollination on maize tassel and silk on the school demonstration farm.',
              'Present slides of high-yielding crop varieties developed by IITA Ibadan.'
            ],
            studentActivities: [
              'Practice bagging and artificial cross-pollination on experimental maize plots.',
              'Write a comparative summary of crop improvement methodologies.'
            ],
            teachingMaterials: ['School demonstration farm crop plots', 'Emasculation forceps, pollination bags, tags, crop improvement charts'],
            evaluationGuide: ['Practical field examination and theory essay on crop improvement methods.'],
            examRelevance: { waec: true, neco: true, jamb: true }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 7. COMPUTER STUDIES / ICT (SENIOR) (SS 1 - 3)
  // ========================================================
  {
    id: 'sss-computer-studies',
    name: 'Computer Studies',
    code: 'CSC-SSS',
    level: 'sss',
    field: 'technology',
    isCompulsory: false,
    recommendedPeriodsPerWeek: 4,
    targetGrades: ['SS 1', 'SS 2', 'SS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html',
    description: 'Senior Computer Studies curriculum covering Computer Architecture, Logic Circuits, High-Level Programming (Python/BASIC), Database Management Systems (SQL), Web Technologies, Networking, and Cyber Law.',
    generalObjectives: [
      'Master digital electronics logic gates (AND, OR, NOT, NAND, NOR, XOR) and truth tables.',
      'Develop algorithmic problem-solving and structured programming skills in high-level languages.',
      'Design relational databases, write SQL queries, and manage database integrity constraints.',
      'Understand computer network topologies, OSI model, IP addressing, web development, and cyber security ethics.'
    ],
    recommendedTextbooks: [
      'Senior Secondary Computer Studies (Books 1 - 3) by Hiit',
      'Computer Studies for Senior Secondary Schools by Agba et al.',
      'Modern Computer Science for SSS by Evans'
    ],
    themes: [
      {
        id: 'csc-sss-theme-1',
        themeNumber: 1,
        title: 'Digital Logic Gates and Computer Architecture',
        description: 'Logic gates, truth tables, combinational circuits, logic expressions, binary adders, and microprocessor bus architecture.',
        topics: [
          {
            id: 'csc-sss-top-1',
            title: 'Logic Gates: Standard Symbols, Truth Tables, and Combinational Circuits',
            week: 3,
            term: 'Term 1',
            classGrade: 'SS 1',
            subTopics: ['Fundamental logic gates: AND, OR, NOT (Inverter)', 'Universal logic gates: NAND, NOR', 'Special logic gates: XOR (Exclusive-OR), XNOR', 'Constructing truth tables for complex combinational logic expressions', 'Designing simple digital circuits (Half Adder and Full Adder)'],
            performanceObjectives: [
              'Draw standard IEEE logic gate symbols and state their Boolean algebraic equations.',
              'Construct complete truth tables for Boolean expressions with up to three input variables.',
              'Explain why NAND and NOR gates are termed "universal gates" in digital circuit fabrication.'
            ],
            contentDetails: [
              'Boolean algebra laws: De Morgan\'s Theorems, Distributive, Associative, Commutative laws.',
              'Logic circuit output calculation: Y = (A · B) + (A\' · C).',
              'Silicon semiconductor implementation using transistors.'
            ],
            teacherActivities: [
              'Demonstrate digital logic gates using breadboards, 7400-series IC chips (7408 AND, 7432 OR, 7404 NOT), LEDs, and switches in the computer lab.',
              'Guide Boolean algebra simplification on the whiteboard.'
            ],
            studentActivities: [
              'Construct logic circuits on digital electronics trainer kits or logic simulators.',
              'Verify truth tables by testing switch combinations and observing LED outputs.'
            ],
            teachingMaterials: ['Digital logic trainer boards / Breadboards', '74-series TTL logic gate ICs (7408, 7432, 7400, 7404), LEDs, 5V DC power supply', 'Logic gate simulation software on lab PCs'],
            evaluationGuide: ['Practical circuit wiring evaluation and written truth table derivation test.'],
            examRelevance: { waec: true, neco: true, jamb: true }
          }
        ]
      }
    ]
  },

  // ========================================================
  // 8. TECHNICAL DRAWING (SS 1 - 3)
  // ========================================================
  {
    id: 'sss-technical-drawing',
    name: 'Technical Drawing',
    code: 'TD-SSS',
    level: 'sss',
    field: 'technology',
    isCompulsory: false,
    recommendedPeriodsPerWeek: 4,
    targetGrades: ['SS 1', 'SS 2', 'SS 3'],
    officialSourceUrl: 'https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html',
    description: 'Senior Technical Drawing curriculum covering Plane Geometry, Solid Geometry, Orthographic Projection (First and Third Angle), Isometric and Oblique Drawing, Sectional Views, Building Drawing, and Computer-Aided Design (CAD).',
    generalObjectives: [
      'Master geometric constructions of plane figures, loci, conic sections, and tangents.',
      'Produce standard First Angle and Third Angle orthographic projections from pictorial drawings.',
      'Draw complete building plans, elevations, sections, and structural reinforcement details.',
      'Develop proficiency in mechanical machine assembly drawing and CAD drafting.'
    ],
    recommendedTextbooks: [
      'Technical Drawing for School Certificate and GCE by J. N. Green',
      'Engineering Drawing (Books 1 & 2) by Pickup and Parker',
      'Technical Drawing for Senior Secondary Schools by NERDC'
    ],
    themes: [
      {
        id: 'td-sss-theme-1',
        themeNumber: 1,
        title: 'Orthographic and Pictorial Projections',
        description: 'First angle vs Third angle orthographic projections, isometric drawing, oblique drawing, sectional views, and auxiliary projections.',
        topics: [
          {
            id: 'td-sss-top-1',
            title: 'First Angle and Third Angle Orthographic Projections',
            week: 4,
            term: 'Term 1',
            classGrade: 'SS 2',
            subTopics: ['Principles of orthographic projection: Front Elevation, End Elevation, and Plan view', 'First Angle Projection convention (European standard: Plan below Front Elevation)', 'Third Angle Projection convention (American standard: Plan above Front Elevation)', 'Standard projection symbols, dimensioning conventions, and sectional hatching'],
            performanceObjectives: [
              'Differentiate between First Angle and Third Angle orthographic projection layout rules.',
              'Draw standard orthographic projection symbols accurately.',
              'Project the Front Elevation, Side Elevation, and Plan of complex machine blocks in First or Third angle.'
            ],
            contentDetails: [
              'BS 8888 / ISO technical drafting standards.',
              'Hidden detail dashed lines, center lines (chain thin), cutting planes.',
              'Proper dimensioning rules: dimension lines, extension lines, arrowheads, leader lines.'
            ],
            teacherActivities: [
              'Demonstrate projection techniques using glass-box 3D models on the chalkboard.',
              'Guide students step-by-step in establishing projection lines and 45° mitre lines.'
            ],
            studentActivities: [
              'Draft full orthographic views on A2 drawing sheets using Tee-squares and set squares.',
              'Dimension drawings completely according to technical drafting conventions.'
            ],
            teachingMaterials: ['Wooden drawing boards and drafting tables', 'Tee squares, 30-60° and 45° set squares, compasses, scale rules', '3D machined metal/wood block models for projection'],
            evaluationGuide: ['Grade technical drawing sheets for projection accuracy, line weight hierarchy, dimensioning, and neatness.'],
            examRelevance: { waec: true, neco: true, commonExamAreas: ['WASSCE Technical Drawing Paper 2 Section A & B'] }
          }
        ]
      }
    ]
  }
];
