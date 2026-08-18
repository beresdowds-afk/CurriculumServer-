import React from 'react';
import { SubjectField, ClassGrade, EducationLevel } from '../types';
import { Filter, CheckCircle2 } from 'lucide-react';

interface FilterBarProps {
  selectedLevel: EducationLevel;
  selectedField: SubjectField | 'all';
  onSelectField: (field: SubjectField | 'all') => void;
  selectedGrade: ClassGrade | 'all';
  onSelectGrade: (grade: ClassGrade | 'all') => void;
  compulsoryOnly: boolean;
  onToggleCompulsoryOnly: () => void;
  totalFilteredCount: number;
}

const FIELD_OPTIONS: { id: SubjectField | 'all'; label: string }[] = [
  { id: 'all', label: 'All Fields' },
  { id: 'core', label: 'Core / Cross-Cutting' },
  { id: 'science_math', label: 'Science & Math' },
  { id: 'humanities', label: 'Humanities & Arts' },
  { id: 'business', label: 'Business Studies' },
  { id: 'technology', label: 'Technology' },
  { id: 'trade_entrepreneurship', label: '34 Trade Subjects' },
];

const GRADE_OPTIONS: { id: ClassGrade | 'all'; label: string; levelLimit?: 'jss' | 'sss' }[] = [
  { id: 'all', label: 'All Classes' },
  { id: 'JSS 1', label: 'JSS 1 (Year 7)', levelLimit: 'jss' },
  { id: 'JSS 2', label: 'JSS 2 (Year 8)', levelLimit: 'jss' },
  { id: 'JSS 3', label: 'JSS 3 (Year 9)', levelLimit: 'jss' },
  { id: 'SS 1', label: 'SS 1 (Year 10)', levelLimit: 'sss' },
  { id: 'SS 2', label: 'SS 2 (Year 11)', levelLimit: 'sss' },
  { id: 'SS 3', label: 'SS 3 (Year 12)', levelLimit: 'sss' },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  selectedLevel,
  selectedField,
  onSelectField,
  selectedGrade,
  onSelectGrade,
  compulsoryOnly,
  onToggleCompulsoryOnly,
  totalFilteredCount,
}) => {
  // Filter grades based on selected level
  const availableGrades = GRADE_OPTIONS.filter((g) => {
    if (g.id === 'all') return true;
    if (selectedLevel === 'all') return true;
    return g.levelLimit === selectedLevel;
  });

  return (
    <div id="filter-bar" className="bg-slate-900/90 border-b border-slate-800 py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Fields list */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1 shrink-0 pr-1">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            Field:
          </span>
          {FIELD_OPTIONS.map((field) => (
            <button
              key={field.id}
              id={`filter-field-${field.id}`}
              onClick={() => onSelectField(field.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedField === field.id
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
              }`}
            >
              {field.label}
            </button>
          ))}
        </div>

        {/* Grade and Compulsory filter options */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Grade Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="grade-select" className="text-xs text-slate-400 font-medium">
              Class:
            </label>
            <select
              id="grade-select"
              value={selectedGrade}
              onChange={(e) => onSelectGrade(e.target.value as any)}
              className="bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {availableGrades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          {/* Compulsory Only Checkbox */}
          <button
            id="toggle-compulsory-btn"
            onClick={onToggleCompulsoryOnly}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              compulsoryOnly
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${compulsoryOnly ? 'text-amber-400' : 'text-slate-500'}`} />
            <span>Compulsory Subjects</span>
          </button>

          {/* Results count */}
          <div className="text-xs text-slate-400 pl-2 font-mono">
            <span className="text-emerald-400 font-bold">{totalFilteredCount}</span> subjects
          </div>
        </div>
      </div>
    </div>
  );
};
