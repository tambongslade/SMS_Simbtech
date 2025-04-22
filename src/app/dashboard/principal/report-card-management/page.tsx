'use client'

import { useState } from 'react'
import Table from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Download } from 'lucide-react'

// Define the type for a report card item
interface ReportCard {
  id: number;
  studentName: string;
  class: string;
  term: string;
  status: string;
}

// Define the type for the columns expected by the Table component
// Assuming the Table component exports or defines a similar type Column<T>
// If not, this might need adjustment based on the actual Table component's props.
interface Column<T> {
  key: keyof T | 'actions'; // Allow 'actions' as a key
  header: string;
  render?: (value: any, item: T) => React.ReactNode;
}

export default function ReportCardManagement() {
  const [reportCards, setReportCards] = useState<ReportCard[]>([
    // Sample data - replace with actual API call
    {
      id: 1,
      studentName: 'John Doe',
      class: '10A',
      term: '2023-24 Term 1',
      status: 'Generated',
    },
    // ... more report cards
  ])

  const handleGenerateReportCard = async (studentId: number) => {
    // Implementation for generating report card
    console.log('Generating report card for student:', studentId)
  }

  const handleDownloadReportCard = async (studentId: number) => {
    // Implementation for downloading report card
    console.log('Downloading report card for student:', studentId)
  }

  // Define the columns for the table
  const columns: Column<ReportCard>[] = [
    { key: 'studentName', header: 'Student Name' },
    { key: 'class', header: 'Class' },
    { key: 'term', header: 'Term' },
    { key: 'status', header: 'Status' },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, item) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGenerateReportCard(item.id)}
          >
            Generate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownloadReportCard(item.id)}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Report Card Management</h1>
      
      <Table<ReportCard> columns={columns} data={reportCards} />
    </div>
  )
}