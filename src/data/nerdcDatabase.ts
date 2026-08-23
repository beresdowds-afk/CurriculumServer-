import { SubjectCurriculum } from '../types';
import { JSS_CURRICULUM_DATABASE } from './curriculum/jssCurriculum';
import { SSS_SCIENCES_CURRICULUM_DATABASE } from './curriculum/sssSciencesCurriculum';
import { SSS_HUMANITIES_BUSINESS_CURRICULUM_DATABASE } from './curriculum/sssHumanitiesBusinessCurriculum';
import { SSS_TRADE_CURRICULUM_DATABASE } from './curriculum/sssTradeCurriculum';

/**
 * NERDC Curricular Database Master Registry
 * Combines full Junior Secondary School (JSS 1 - 3) and Senior Secondary School (SS 1 - 3)
 * official curriculum datasets across Core, Sciences, Technology, Humanities, Business, and Trade fields.
 */
export const NERDC_SUBJECTS_DATABASE: SubjectCurriculum[] = [
  ...JSS_CURRICULUM_DATABASE,
  ...SSS_SCIENCES_CURRICULUM_DATABASE,
  ...SSS_HUMANITIES_BUSINESS_CURRICULUM_DATABASE,
  ...SSS_TRADE_CURRICULUM_DATABASE
];

export const NERDC_STATS = {
  totalSubjectsInDb: NERDC_SUBJECTS_DATABASE.length,
  totalJuniorSubjects: NERDC_SUBJECTS_DATABASE.filter(s => s.level === 'jss').length,
  totalSeniorSubjects: NERDC_SUBJECTS_DATABASE.filter(s => s.level === 'sss').length,
  totalTopics: NERDC_SUBJECTS_DATABASE.reduce((sum, s) => sum + s.themes.reduce((tSum, t) => tSum + t.topics.length, 0), 0),
  officialSources: [
    {
      title: 'NERDC JSS 1 - 3 Curriculum Portal (9-Year Basic Education Curriculum)',
      url: 'https://www.nerdc.gov.ng/content_manager/jss1-3.html'
    },
    {
      title: 'NERDC New Senior Secondary Education Curriculum (SSEC) Portal',
      url: 'https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html'
    }
  ]
};

// Export individual level collections for specialized queries
export {
  JSS_CURRICULUM_DATABASE,
  SSS_SCIENCES_CURRICULUM_DATABASE,
  SSS_HUMANITIES_BUSINESS_CURRICULUM_DATABASE,
  SSS_TRADE_CURRICULUM_DATABASE
};
