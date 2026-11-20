import React, { useEffect, useState } from 'react';
import type { SchoolAdministrationClass, SchoolAdministrationStudent } from '../../packages/shared-types/src/apiContracts';
import { unifiedApiClient } from '../services/unifiedApiClient';

interface Page<T> {
  records: T[];
  page: number;
  pageSize: number;
  total: number;
}

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'error' in error && typeof error.error === 'string') {
    return error.error;
  }
  return 'School records could not be loaded. Please try again.';
}

export async function loadAcademicClasses(page: number): Promise<Page<SchoolAdministrationClass>> {
  const response = await unifiedApiClient.requestAuthenticatedSchoolFlow<{ data: Page<SchoolAdministrationClass> }>(
    `/api/v1/schools/me/classes?page=${page}&pageSize=25`,
    { cache: 'no-store' }
  );
  return response.data;
}

export async function loadAcademicStudents(classId: string, page: number): Promise<Page<SchoolAdministrationStudent>> {
  const query = new URLSearchParams({ classId, page: String(page), pageSize: '25' });
  const response = await unifiedApiClient.requestAuthenticatedSchoolFlow<{ data: Page<SchoolAdministrationStudent> }>(
    `/api/v1/schools/me/students?${query}`,
    { cache: 'no-store' }
  );
  return response.data;
}

export const AcademicRecordsWorkspace: React.FC = () => {
  const [classPage, setClassPage] = useState(1);
  const [classes, setClasses] = useState<Page<SchoolAdministrationClass> | null>(null);
  const [classError, setClassError] = useState('');
  const [classesLoading, setClassesLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [studentPage, setStudentPage] = useState(1);
  const [students, setStudents] = useState<Page<SchoolAdministrationStudent> | null>(null);
  const [studentError, setStudentError] = useState('');
  const [studentsLoading, setStudentsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setClassesLoading(true);
    setClassError('');
    loadAcademicClasses(classPage)
      .then(data => { if (active) setClasses(data); })
      .catch(error => {
        if (active) {
          setClasses(null);
          setClassError(errorMessage(error));
        }
      })
      .finally(() => { if (active) setClassesLoading(false); });
    return () => { active = false; };
  }, [classPage]);

  useEffect(() => {
    if (!selectedClassId) return;
    let active = true;
    setStudentsLoading(true);
    setStudentError('');
    setStudents(null);
    loadAcademicStudents(selectedClassId, studentPage)
      .then(data => { if (active) setStudents(data); })
      .catch(error => {
        if (active) setStudentError(errorMessage(error));
      })
      .finally(() => { if (active) setStudentsLoading(false); });
    return () => { active = false; };
  }, [selectedClassId, studentPage]);

  const selectClass = (id: string) => {
    setStudents(null);
    setStudentError('');
    setStudentPage(1);
    setSelectedClassId(id);
  };

  const changeClassPage = (page: number) => {
    selectClass('');
    setClasses(null);
    setClassPage(page);
  };

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Academic records</h1>
        <p className="text-sm">Classes and students below are loaded from the authenticated school register. Student membership reflects the current class, not historical enrollment.</p>
        <p className="rounded-lg bg-amber-100 p-3 text-sm text-amber-950">
          Score capture, broadsheets, approvals, report cards, transcripts and promotion workflows are not yet available.
          No official results or promotion decisions can be made here.
        </p>
      </header>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Classes</h2>
        {classesLoading && <p role="status">Loading classes...</p>}
        {classError && <p role="alert">{classError}</p>}
        {classes && classes.records.length === 0 && <p>No classes found.</p>}
        {classes && classes.records.length > 0 && (
          <label className="block">
            Select a class
            <select className="mt-1 block w-full max-w-lg rounded border border-slate-400 bg-transparent p-2" value={selectedClassId} onChange={event => selectClass(event.target.value)}>
              <option value="">Select a class</option>
              {classes.records.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} - {item.section} ({item.academic_year}, {item.status})
                </option>
              ))}
            </select>
          </label>
        )}
        {classes && (
          <div className="flex items-center gap-3 text-sm">
            <button type="button" disabled={classPage <= 1} onClick={() => changeClassPage(classPage - 1)}>Previous classes</button>
            <span>Page {classes.page} · {classes.total} classes</span>
            <button type="button" disabled={classPage * classes.pageSize >= classes.total} onClick={() => changeClassPage(classPage + 1)}>Next classes</button>
          </div>
        )}
      </div>

      {selectedClassId && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Current class register</h2>
          {studentsLoading && <p role="status">Loading students...</p>}
          {studentError && <p role="alert">{studentError}</p>}
          {students && students.records.length === 0 && <p>No students found in this class.</p>}
          {students && students.records.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr><th>Admission number</th><th>Student</th><th>Status</th></tr></thead>
                <tbody>
                  {students.records.map(student => (
                    <tr key={student.id}>
                      <td>{student.admission_number}</td>
                      <td>{student.first_name} {student.last_name}</td>
                      <td>{student.lifecycle_status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {students && (
            <div className="flex items-center gap-3 text-sm">
              <button type="button" disabled={studentPage <= 1} onClick={() => setStudentPage(studentPage - 1)}>Previous students</button>
              <span>Page {students.page} · {students.total} students</span>
              <button type="button" disabled={studentPage * students.pageSize >= students.total} onClick={() => setStudentPage(studentPage + 1)}>Next students</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
