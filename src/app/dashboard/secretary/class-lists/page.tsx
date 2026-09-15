'use client';

import { useEffect, useState } from 'react';
import { sortClassesByLevel } from '@/lib/classOrdering';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { DocumentArrowDownIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { useLanguage } from '@/components/context/LanguageContext';
import { Button, Select } from '@/components/ui';
import {
  fetchClasses,
  fetchSubClasses,
  exportClassList,
  exportSubclassList,
  downloadBlob,
  type ClassInfo,
  type SubClassInfo,
} from '../lib/secretaryApi';

type Scope = 'subclass' | 'class';
type Format = 'pdf' | 'docx';

export default function SecretaryClassListsPage() {
  const { selectedAcademicYear } = useAuth();
  const { t } = useLanguage();

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subClasses, setSubClasses] = useState<SubClassInfo[]>([]);

  const [scope, setScope] = useState<Scope>('subclass');
  const [classId, setClassId] = useState('');
  const [subClassId, setSubClassId] = useState('');
  const [format, setFormat] = useState<Format>('pdf');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchClasses().then((c) => setClasses(sortClassesByLevel(c))).catch(() => setClasses([]));
    fetchSubClasses().then(setSubClasses).catch(() => setSubClasses([]));
  }, []);

  const handleExport = async () => {
    const academicYearId = selectedAcademicYear?.id;

    if (scope === 'subclass' && !subClassId) {
      toast.error(t('Please select a subclass.'));
      return;
    }
    if (scope === 'class' && !classId) {
      toast.error(t('Please select a class.'));
      return;
    }

    const dateStr = new Date().toISOString().split('T')[0];
    setIsExporting(true);
    toast.loading(t('Generating export…'), { id: 'class-list-export' });
    try {
      let blob: Blob;
      let name: string;
      if (scope === 'subclass') {
        const sc = subClasses.find((s) => String(s.id) === subClassId);
        name = sc?.name || `subclass_${subClassId}`;
        blob = await exportSubclassList(Number(subClassId), format, academicYearId);
      } else {
        const c = classes.find((cl) => String(cl.id) === classId);
        name = c?.name || `class_${classId}`;
        blob = await exportClassList(Number(classId), format, academicYearId);
      }
      downloadBlob(blob, `${name.replace(/\s+/g, '_')}_students_${dateStr}.${format}`);
      toast.success(t('Export downloaded.'), { id: 'class-list-export' });
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || t('Export failed.'), { id: 'class-list-export' });
      } else {
        toast.dismiss('class-list-export');
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <Link
          href="/dashboard/secretary"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-1.5 sm:hidden"
        >
          <ChevronLeftIcon className="h-4 w-4 mr-1" />
          {t('Menu')}
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('Class Lists')}</h1>
        <p className="text-sm text-gray-600 mt-1">
          {t('Export student lists for a class or subclass')}
          {selectedAcademicYear ? ` · ${selectedAcademicYear.name}` : ''}.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <Select
          label={t('Export scope')}
          value={scope}
          onChange={(e) => setScope(e.target.value as Scope)}
          options={[
            { value: 'subclass', label: t('Single subclass') },
            { value: 'class', label: t('Whole class (all subclasses)') },
          ]}
        />

        {scope === 'subclass' ? (
          <Select
            label={t('Subclass')}
            value={subClassId}
            onChange={(e) => setSubClassId(e.target.value)}
            options={[
              { value: '', label: t('Select a subclass') },
              ...subClasses.map((sc) => ({ value: String(sc.id), label: sc.name })),
            ]}
          />
        ) : (
          <Select
            label={t('Class')}
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            options={[
              { value: '', label: t('Select a class') },
              ...classes.map((c) => ({ value: String(c.id), label: c.name })),
            ]}
          />
        )}

        <Select
          label={t('Format')}
          value={format}
          onChange={(e) => setFormat(e.target.value as Format)}
          options={[
            { value: 'pdf', label: 'PDF' },
            { value: 'docx', label: t('Word (DOCX)') },
          ]}
        />

        <div className="pt-2">
          <Button
            color="primary"
            leftIcon={DocumentArrowDownIcon}
            className="w-full sm:w-auto justify-center"
            isLoading={isExporting}
            onClick={handleExport}
          >
            {t('Export List')}
          </Button>
        </div>
      </div>
    </div>
  );
}
