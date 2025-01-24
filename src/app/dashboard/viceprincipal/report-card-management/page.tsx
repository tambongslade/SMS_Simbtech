'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { jsPDF } from "jspdf";

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

const generateReportCard = async (): Promise<string> => {
  const reportCardData: ReportCardData = {
    studentName: "WANDJI CONRAD RYAN KADJIBOUÈ",
    studentId: "N3NSOP3",
    class: "Form 3 March",
    gender: "Male",
    academicYear: "2024-2025",
    subjects: {
      languages: [
        {
          name: "English Language",
          mark: 11.00,
          coef: 4,
          total: 44.00,
          rank: "40th",
          remarks: "A"
        },
        {
          name: "Literature in English",
          mark: 17.00,
          coef: 4,
          total: 68.00,
          rank: "18th",
          remarks: "A"
        },
        {
          name: "French Language",
          mark: 18.00,
          coef: 3,
          total: 54.00,
          rank: "6th",
          remarks: "A+"
        }
      ],
      socialSciences: [
        {
          name: "Economics",
          mark: 15.09,
          coef: 11,
          total: 166.00,
          rank: "38th",
          remarks: "B+"
        },
        {
          name: "Geography",
          mark: 18.00,
          coef: 3,
          total: 54.00,
          rank: "34th",
          remarks: "A+"
        },
        {
          name: "History",
          mark: 20.00,
          coef: 3,
          total: 60.00,
          rank: "1st",
          remarks: "A+"
        },
        {
          name: "Religious Studies",
          mark: 17.00,
          coef: 3,
          total: 51.00,
          rank: "9th",
          remarks: "A"
        },
        {
          name: "Logic",
          mark: 18.00,
          coef: 3,
          total: 54.00,
          rank: "27th",
          remarks: "A+"
        }
      ],
      pureSciences: [
        {
          name: "Biology",
          mark: 18.20,
          coef: 15,
          total: 273.00,
          rank: "18th",
          remarks: "A+"
        },
        {
          name: "Chemistry",
          mark: 20.00,
          coef: 3,
          total: 60.00,
          rank: "1st",
          remarks: "A+"
        },
        {
          name: "Mathematics",
          mark: 20.00,
          coef: 2,
          total: 40.00,
          rank: "1st",
          remarks: "A+"
        },
        {
          name: "Physics",
          mark: 8.00,
          coef: 4,
          total: 32.00,
          rank: "50th",
          remarks: "D"
        }
      ],
      others: [
        {
          name: "Manual Labour",
          mark: 15.00,
          coef: 1,
          total: 15.00,
          rank: "1st",
          remarks: "B+"
        },
        {
          name: "Physical Education",
          mark: 18.00,
          coef: 1,
          total: 18.00,
          rank: "1st",
          remarks: "A+"
        }
      ]
    },
    summary: {
      totalMarks: 709.80,
      average: 15.40,
      rank: "24th",
      subjectsPassed: 13,
      classAverage: 11.15,
      standardDeviation: 2.89
    }
  };

  return JSON.stringify(reportCardData);
};

const generatePDF = (data: ReportCardData) => {
  const doc = new jsPDF();
  let currentY = 20; // Start a bit lower
  const lineHeight = 6;

  // Header section - Left side
  doc.setFontSize(8);
  doc.text('REPUBLIC OF CAMEROON', 20, currentY);
  doc.text('REGIONAL DELEGATION OF CENTRE', 20, currentY + lineHeight);
  doc.text('DIVISIONAL DELEGATION OF MFOUNDI', 20, currentY + lineHeight * 2);

  // Header section - Right side
  doc.text('REPUBLIQUE DU CAMEROUN', doc.internal.pageSize.width - 20, currentY, { align: 'right' });
  doc.text('DELEGATION REGIONALE DU CENTRE', doc.internal.pageSize.width - 20, currentY + lineHeight, { align: 'right' });
  doc.text('DELEGATION DEPARTEMENTALE DU MFOUNDI', doc.internal.pageSize.width - 20, currentY + lineHeight * 2, { align: 'right' });

  // School name
  currentY += lineHeight * 4; // Space after header
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('ST STEPHEN\'S INTERNAL COLLEGE', doc.internal.pageSize.width/2, currentY, { align: 'center' });

  // Academic year
  currentY += lineHeight * 3;
  doc.setFontSize(9);
  doc.text('2024-2025 / Evaluation N°1', doc.internal.pageSize.width/2, currentY, { align: 'center' });

  // Subject table helper function
  const createSubjectTable = (title: string, subjects: Subject[], startY: number) => {
    currentY = startY;
    
    // Section title
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 20, currentY);
    currentY += lineHeight;

    // Table structure
    const startTableY = currentY;
    doc.setFontSize(8);
    
    // Column positions (x-coordinates)
    const columns = {
      start: 20,
      subject: 85,    // Subjects column end
      mark: 100,      // Mark column end
      coef: 115,      // Coef column end
      total: 130,     // Total column end
      rank: 145,      // Rank column end
      remarks: 165,   // Remarks column end
      end: 190        // Table end
    };

    // Draw vertical lines for the entire table
    Object.values(columns).forEach(x => {
      doc.line(x, startTableY, x, startTableY + ((subjects.length + 1) * lineHeight));
    });

    // Headers
    doc.text('Subjects', columns.start + 5, currentY);
    doc.text('Mark', columns.subject + 5, currentY);
    doc.text('Coef', columns.mark + 5, currentY);
    doc.text('Total', columns.coef + 5, currentY);
    doc.text('Rk', columns.total + 5, currentY);
    doc.text('Remarks', columns.rank + 5, currentY);
    doc.text('Class', columns.remarks + 5, currentY);

    // Draw header bottom line
    doc.line(columns.start, currentY + 2, columns.end, currentY + 2);
    currentY += lineHeight;

    // Subject rows
    doc.setFont('helvetica', 'normal');
    subjects.forEach(subject => {
      doc.text(subject.name, columns.start + 5, currentY);
      doc.text(subject.mark.toFixed(2), columns.subject + 5, currentY);
      doc.text(subject.coef.toString(), columns.mark + 5, currentY);
      doc.text(subject.total.toFixed(2), columns.coef + 5, currentY);
      doc.text(subject.rank, columns.total + 5, currentY);
      doc.text(subject.remarks, columns.rank + 5, currentY);
      currentY += lineHeight;
    });

    // Draw bottom line for subject section
    doc.line(columns.start, currentY, columns.end, currentY);

    // Summary row with statistics
    currentY += lineHeight;
    doc.text('SUMMARY', columns.start + 5, currentY);
    
    // Statistics line
    currentY += lineHeight;
    doc.text('Min.', columns.start + 5, currentY);
    doc.text('Avg.', columns.start + 25, currentY);
    doc.text('Max.', columns.start + 45, currentY);
    doc.text('S.R.', columns.start + 65, currentY);

    // Draw final bottom line
    doc.line(columns.start, currentY + 2, columns.end, currentY + 2);

    return currentY + lineHeight;
  };

  // Create subject tables
  currentY = 70; // Start position for first table
  currentY = createSubjectTable('LANGUAGES AND LITERATURE', data.subjects.languages, currentY);
  currentY = createSubjectTable('SOCIAL SCIENCES', data.subjects.socialSciences, currentY + lineHeight);
  currentY = createSubjectTable('PURE SCIENCES', data.subjects.pureSciences, currentY + lineHeight);
  currentY = createSubjectTable('OTHERS', data.subjects.others, currentY + lineHeight);

  // Summary section with lines
  currentY += lineHeight * 2;
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', 20, currentY);
  doc.text(data.summary.totalMarks.toFixed(2), 120, currentY);
  doc.line(20, currentY + 2, 200, currentY + 2); // Line under total

  // Summary boxes with borders
  currentY += lineHeight * 2;
  // Left summary box
  doc.rect(20, currentY, 70, 40);
  doc.setFontSize(7);
  doc.text('Subjects passed:', 25, currentY + 8);
  doc.text(data.summary.subjectsPassed.toString(), 65, currentY + 8);
  doc.text('Overall avg/20:', 25, currentY + 16);
  doc.text(data.summary.average.toFixed(2), 65, currentY + 16);
  doc.text('Rank:', 25, currentY + 24);
  doc.text(data.summary.rank, 65, currentY + 24);
  doc.text('Class average:', 25, currentY + 32);
  doc.text(data.summary.classAverage.toFixed(2), 65, currentY + 32);

  // Right discipline box
  doc.rect(doc.internal.pageSize.width - 90, currentY, 70, 40);
  doc.text('DISCIPLINE', doc.internal.pageSize.width - 85, currentY + 8);
  doc.text('Absences:', doc.internal.pageSize.width - 85, currentY + 16);
  doc.text('Warnings:', doc.internal.pageSize.width - 85, currentY + 24);
  doc.text('Encouragements:', doc.internal.pageSize.width - 85, currentY + 32);

  // Signatures
  currentY += lineHeight * 10;
  doc.text('Yaoundé, December 14, 2024', doc.internal.pageSize.width/2, currentY, { align: 'center' });
  currentY += lineHeight * 2;
  doc.text('Parent', 20, currentY);
  doc.text('Class Master', doc.internal.pageSize.width/2, currentY, { align: 'center' });
  doc.text('Principal', doc.internal.pageSize.width - 40, currentY);

  return doc;
};

// Update the downloadReportCard function
const downloadReportCard = (data: string) => {
  const reportCardData: ReportCardData = JSON.parse(data);
  const doc = generatePDF(reportCardData);
  doc.save('report-card.pdf');
};

export default function ReportCardManagement() {
  const [loading, setLoading] = useState(false)

  const handleGenerateReportCard = async () => {
    setLoading(true)
    try {
      // Example logic for generating a report card
      const reportCardData = await generateReportCard(); // Replace with actual generation logic
      downloadReportCard(reportCardData); // Function to handle the download
    } catch (error) {
      console.error('Error generating report card:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Report Card Management</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Generate Report Cards</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            {/* Add filters and selection options here */}
            <div className="flex justify-end">
              <Button 
                onClick={handleGenerateReportCard}
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate & Download Report Card'}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}