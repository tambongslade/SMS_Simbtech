"use client"
import React, { useState } from 'react';
import { jsPDF } from "jspdf";
import { 
  DocumentChartBarIcon, 
  PrinterIcon, 
  ArrowDownTrayIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

// Type definitions
interface Subject {
  name: string;
  mark: number;
  coef: number;
  total: number;
  rank: string;
  remarks: string;
}

interface ReportCardData {
  studentName: string;
  studentId: string;
  class: string;
  gender: string;
  academicYear: string;
  subjects: {
    languages: Subject[];
    socialSciences: Subject[];
    pureSciences: Subject[];
    others: Subject[];
  };
  summary: {
    totalMarks: number;
    average: number;
    rank: string;
    subjectsPassed: number;
    classAverage: number;
    standardDeviation: number;
  };
}

const ReportCardManagement = () => {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubClass, setSelectedSubClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState<ReportCardData | null>(null);

  // Mock data - replace with API calls
  const mockClasses = [
    { id: 1, name: 'Form 1' },
    { id: 2, name: 'Form 2' }
  ];

  const mockSubClasses = {
    'Form 1': [
      { id: 1, name: 'Form 1 South' },
      { id: 2, name: 'Form 1 North' }
    ],
    'Form 2': [
      { id: 3, name: 'Form 2 South' },
      { id: 4, name: 'Form 2 North' }
    ]
  };

  const generatePDF = (data: ReportCardData) => {
    const doc = new jsPDF();
    let currentY = 20;
    const lineHeight = 6;

    // Header section
    doc.setFontSize(8);
    doc.text('REPUBLIC OF CAMEROON', 20, currentY);
    doc.text('REPUBLIQUE DU CAMEROUN', doc.internal.pageSize.width - 20, currentY, { align: 'right' });
    doc.text('REGIONAL DELEGATION OF CENTRE', 20, currentY + lineHeight);
    doc.text('DELEGATION REGIONALE DU CENTRE', doc.internal.pageSize.width - 20, currentY + lineHeight, { align: 'right' });

    // School name
    currentY += lineHeight * 4;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ST STEPHEN\'S INTERNAL COLLEGE', doc.internal.pageSize.width/2, currentY, { align: 'center' });

    // Student info
    currentY += lineHeight * 2;
    doc.setFontSize(10);
    doc.text(`Name: ${data.studentName}`, 20, currentY);
    doc.text(`Class: ${data.class}`, doc.internal.pageSize.width - 60, currentY);
    
    // Create subject table helper function
    const createSubjectTable = (title: string, subjects: Subject[], startY: number) => {
      currentY = startY;
      
      // Section title
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 20, currentY);
      currentY += lineHeight;

      // Table headers
      const columns = {
        subject: 20,
        mark: 100,
        coef: 120,
        total: 140,
        rank: 160,
        remarks: 180
      };

      doc.text('Subject', columns.subject, currentY);
      doc.text('Mark', columns.mark, currentY);
      doc.text('Coef', columns.coef, currentY);
      doc.text('Total', columns.total, currentY);
      doc.text('Rank', columns.rank, currentY);
      doc.text('Remarks', columns.remarks, currentY);
      
      currentY += lineHeight;

      // Draw subject rows
      subjects.forEach(subject => {
        doc.setFont('helvetica', 'normal');
        doc.text(subject.name, columns.subject, currentY);
        doc.text(subject.mark.toString(), columns.mark, currentY);
        doc.text(subject.coef.toString(), columns.coef, currentY);
        doc.text(subject.total.toString(), columns.total, currentY);
        doc.text(subject.rank, columns.rank, currentY);
        doc.text(subject.remarks, columns.remarks, currentY);
        currentY += lineHeight;
      });

      return currentY + lineHeight;
    };

    // Generate tables for each subject category
    currentY = createSubjectTable('LANGUAGES', data.subjects.languages, currentY);
    currentY = createSubjectTable('SOCIAL SCIENCES', data.subjects.socialSciences, currentY);
    currentY = createSubjectTable('PURE SCIENCES', data.subjects.pureSciences, currentY);
    currentY = createSubjectTable('OTHERS', data.subjects.others, currentY);

    // Summary section
    currentY += lineHeight * 2;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Marks: ${data.summary.totalMarks}`, 20, currentY);
    doc.text(`Average: ${data.summary.average}`, 100, currentY);
    doc.text(`Rank: ${data.summary.rank}`, 160, currentY);

    // Signatures
    currentY += lineHeight * 4;
    doc.text('Principal: _________________', 20, currentY);
    doc.text('Class Teacher: _________________', 120, currentY);

    return doc;
  };

  const handleGenerateReportCards = async (type: 'preview' | 'print' | 'export') => {
    if (!selectedClass) {
      setError('Please select a class');
      return;
    }

    setLoading(true);
    try {
      // Replace with actual API call
      const response = await fetch('/api/report-cards/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId: selectedClass,
          subClassId: selectedSubClass,
          studentId: selectedStudent,
          type
        }),
      });
      
      const data: ReportCardData = await response.json();
      
      if (type === 'preview') {
        setPreviewData(data);
      } else if (type === 'export') {
        const doc = generatePDF(data);
        doc.save(`report_card_${selectedStudent || selectedSubClass || selectedClass}.pdf`);
      } else if (type === 'print') {
        const doc = generatePDF(data);
        doc.autoPrint();
        doc.output('dataurlnewwindow');
      }
      
      setError('');
    } catch (err) {
      setError('Failed to generate report cards');
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DocumentChartBarIcon className="w-8 h-8" />
          Report Card Management
        </h1>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
          <ExclamationCircleIcon className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div>
          <label className="block mb-2 font-medium">Select Class</label>
          <select
            className="w-full p-2 border rounded"
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setSelectedSubClass('');
              setSelectedStudent('');
            }}
          >
            <option value="">Select a class...</option>
            {mockClasses.map(cls => (
              <option key={cls.id} value={cls.name}>{cls.name}</option>
            ))}
          </select>
        </div>

        {selectedClass && (
          <div>
            <label className="block mb-2 font-medium">Select Sub-Class</label>
            <select
              className="w-full p-2 border rounded"
              value={selectedSubClass}
              onChange={(e) => {
                setSelectedSubClass(e.target.value);
                setSelectedStudent('');
              }}
            >
              <option value="">All sub-classes</option>
              {mockSubClasses[selectedClass]?.map(subCls => (
                <option key={subCls.id} value={subCls.name}>{subCls.name}</option>
              ))}
            </select>
          </div>
        )}

        {selectedClass && (
          <div>
            <label className="block mb-2 font-medium">Select Student (Optional)</label>
            <select
              className="w-full p-2 border rounded"
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
            >
              <option value="">All students</option>
              {/* Replace with actual student data */}
              <option value="1">Student 1</option>
              <option value="2">Student 2</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex gap-4 mb-8">
        <button
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          onClick={() => handleGenerateReportCards('preview')}
          disabled={loading || !selectedClass}
        >
          Preview Report Cards
        </button>
        
        <button
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
          onClick={() => handleGenerateReportCards('print')}
          disabled={loading || !selectedClass}
        >
          <PrinterIcon className="w-5 h-5" />
          Print Report Cards
        </button>

        <button
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          onClick={() => handleGenerateReportCards('export')}
          disabled={loading || !selectedClass}
        >
          <ArrowDownTrayIcon className="w-5 h-5" />
          Export Report Cards
        </button>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4">Processing report cards...</p>
        </div>
      )}

      {previewData && (
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Report Card Preview</h2>
          <pre className="whitespace-pre-wrap overflow-auto bg-gray-50 p-4 rounded">
            {JSON.stringify(previewData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ReportCardManagement;