'use client'

import { useState } from 'react'
import {
  Table,
    TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Download } from 'lucide-react'

export default function ReportCardManagement() {
  const [reportCards, setReportCards] = useState([
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

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Report Card Management</h1>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student Name</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Term</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reportCards.map((reportCard) => (
            <TableRow key={reportCard.id}>
              <TableCell>{reportCard.studentName}</TableCell>
              <TableCell>{reportCard.class}</TableCell>
              <TableCell>{reportCard.term}</TableCell>
              <TableCell>{reportCard.status}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateReportCard(reportCard.id)}
                  >
                    Generate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadReportCard(reportCard.id)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}