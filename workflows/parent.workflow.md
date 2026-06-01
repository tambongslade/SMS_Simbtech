# PARENT Role - Complete Workflow & UX Design

## Post-Login Parent Dashboard (`/parent/dashboard`)

### **API Integration**
**Primary Endpoint:** `GET /api/v1/parents/dashboard`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number; // Optional, defaults to current year
  }
  ```
- **Response Data:**
  ```typescript
  {
    success: true;
    data: {
      totalChildren: number;
      childrenEnrolled: number;
      pendingFees: number;        // Total fees owed in FCFA
      totalFeesOwed: number;      // Same as pendingFees
      latestGrades: number;       // Count of recent grades
      disciplineIssues: number;   // Active discipline issues
      unreadMessages: number;     // Unread messages count
      upcomingEvents: number;     // Upcoming school events
      children: Array<{
        id: number;
        name: string;
        className?: string;
        subclassName?: string;
        enrollmentStatus: string;
        photo?: string;
        attendanceRate: number;   // Percentage
        latestMarks: Array<{
          subjectName: string;
          latestMark: number;
          sequence: string;
          date: string;
        }>;
        pendingFees: number;      // Individual child's pending fees
        disciplineIssues: number; // Child's discipline issues
        recentAbsences: number;   // Recent absence count
      }>;
    };
  }
  ```

### **Main Dashboard Layout**
```
┌─────────────────────────────────────────────────────────┐
│ [🏠] School Management System    [🔔] [👤] [⚙️] [🚪]    │
├─────────────────────────────────────────────────────────┤
│ Welcome back, [Parent Name] | Academic Year: 2024-2025  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─── Quick Stats (Cards) ───┐                          │
│ │ 👨‍👩‍👧‍👦 Total Children: 2    💰 Pending Fees: 50,000 FCFA │
│ │ 📚 Enrolled: 2            📊 Latest Grades: 5         │
│ │ ⚠️ Discipline Issues: 0    📧 Unread Messages: 3      │
│ │ 📅 Upcoming Events: 2                                 │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── My Children ───┐                                   │
│ │ [Child 1 Card] [Child 2 Card]                        │ 
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Recent Activity ───┐                               │
│ │ • New quiz result for John - Math (85%)              │
│ │ • Fee payment recorded for Mary - 25,000 FCFA        │
│ │ • New announcement: Parent-Teacher Meeting            │
│ └─────────────────────────────────────────────────────┘
```

### **Child Cards Design**
Each child gets a card showing:
```
┌─── [Child Photo] John Doe ───┐
│ Form 5A - Science Stream     │
│ ─────────────────────────    │
│ 📊 Attendance: 92%           │
│ 📚 Latest Average: 15.2/20   │
│ 💰 Pending Fees: 25,000 FCFA │
│ ⚠️ Discipline Issues: 0       │
│ [View Details] [Quick Actions]│
└─────────────────────────────┘
```

## Child Details Page (`/parent/children/:studentId`)

### **API Integration**
**Primary Endpoint:** `GET /api/v1/parents/children/:studentId`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number; // Optional, defaults to current year
  }
  ```
- **Response Data:**
  ```typescript
  {
    success: true;
    data: {
      id: number;
      name: string;
      matricule: string;
      dateOfBirth: string;
      classInfo?: {
        className: string;
        subclassName: string;
        classMaster?: string;
      };
      attendance: {
        presentDays: number;
        absentDays: number;
        lateDays: number;
        attendanceRate: number; // Percentage
      };
      academicPerformance: {
        subjects: Array<{
          subjectName: string;
          teacherName: string;
          marks: Array<{
            sequence: string;
            mark: number;
            total: number;
            date: string;
          }>;
          average: number;
        }>;
        overallAverage: number;
        positionInClass?: number;
      };
      fees: {
        totalExpected: number;
        totalPaid: number;
        outstandingBalance: number;
        lastPaymentDate?: string;
        paymentHistory: Array<{
          id: number;
          amount: number;
          paymentDate: string;
          paymentMethod: string;
          receiptNumber?: string;
          recordedBy: string;
        }>;
      };
      discipline: {
        totalIssues: number;
        recentIssues: Array<{
          id: number;
          type: string;
          description: string;
          dateOccurred: string;
          status: string;
          resolvedAt?: string;
        }>;
      };
      reports: {
        availableReports: Array<{
          id: number;
          reportType: "SINGLE_STUDENT" | "SUBCLASS";
          examSequence: {
            id: number;
            name: string;
          academicYear: string;
          };
          status: "COMPLETED" | "GENERATING" | "FAILED" | "PENDING";
          generatedAt?: string;
          filePath?: string;
          downloadUrl?: string;
          pageNumber?: number;
          errorMessage?: string;
          fileSize?: string; // e.g., "2.5 MB"
          lastAccessedAt?: string;
        }>;
        reportSummary: {
          totalReports: number;
          completedReports: number;
          generatingReports: number;
          failedReports: number;
          lastGeneratedDate?: string;
        };
      };
    };
  }
  ```

### **Navigation Tabs**
```
[📊 Overview] [💰 Fees] [📚 Academics] [📄 Report Cards] [🎯 Quizzes] [⚠️ Discipline] [📊 Analytics]
```

### **1. Overview Tab**
```
┌─── Student Information ───┐
│ Photo: [Image]            │
│ Name: John Doe            │
│ Matricule: STU2024001     │
│ Class: Form 5A            │
│ Class Master: Mrs. Smith  │
└─────────────────────────┘

┌─── Quick Metrics ───┐
│ Attendance Rate: 92%  │
│ Overall Average: 15.2 │
│ Class Rank: 5/30      │
│ Fee Status: Partial   │
└─────────────────────┘

┌─── Recent Activity ───┐
│ • Math Quiz: 85% (2 days ago)        │
│ • English Essay submitted             │
│ • Fee payment: 25,000 FCFA received  │
└─────────────────────────────────────┘
```

### **2. Fees Tab**
**API Integration:**

#### **Get Student Fee Information**
**Endpoint:** `GET /api/v1/fees/student/:studentId`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `studentId` (number): Student ID
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number; // Optional, defaults to current year
  }
  ```
- **Response:**
  ```typescript
  {
    success: true;
    data: {
      studentId: number;
      studentName: string;
      studentMatricule: string;
      academicYear: string;
      totalExpected: number;
      totalPaid: number;
      outstandingBalance: number;
      lastPaymentDate?: string;
      nextDueDate?: string;
      feeSummary: {
        schoolFees: number;
        miscellaneousFees: number;
        newStudentFees?: number;
        termFees: {
          firstTerm: number;
          secondTerm: number;
          thirdTerm: number;
        };
      };
      paymentHistory: Array<{
        id: number;
        amount: number;
        paymentDate: string;
        paymentMethod: "EXPRESS_UNION" | "CCA" | "3DC";
        receiptNumber?: string;
        recordedBy: string;
        notes?: string;
      }>;
      outstandingFees: Array<{
        id: number;
        feeType: string;
        amountDue: number;
        dueDate: string;
        daysOverdue?: number;
        description?: string;
      }>;
      paymentMethodBreakdown: Array<{
        method: string;
        totalAmount: number;
        transactionCount: number;
        percentage: number;
      }>;
    };
  }
  ```

```
┌─── Fee Summary ───┐
│ Total Expected: 150,000 FCFA    │
│ Total Paid: 100,000 FCFA        │
│ Outstanding: 50,000 FCFA        │
│ Last Payment: 2024-01-15        │
└───────────────────────────────┘

┌─── Payment History ───┐
│ Date        Amount      Method       Receipt    │
│ 2024-01-15  25,000 FCFA EXPRESS_UNION #R001   │
│ 2023-12-10  75,000 FCFA CCA          #R002    │
│ [View All Payments]                           │
└─────────────────────────────────────────────┘

┌─── Outstanding Fees ───┐
│ Fee Type: School Fees               │
│ Amount Due: 50,000 FCFA            │
│ Due Date: 2024-02-15               │
│ [Contact Bursar] [Payment Guide]   │
└──────────────────────────────────┘
```

### **3. Academics Tab**
**Additional API Endpoints:**
- Academic performance data is included in the main child details endpoint

```
┌─── Performance Overview ───┐
│ Overall Average: 15.2/20          │
│ Grade: B                          │
│ Class Position: 5/30              │
│ Trend: ↗️ Improving               │
└─────────────────────────────────┘

┌─── Subject Performance ───┐
│ Subject     Teacher        Seq1  Seq2  Avg   │
│ Mathematics Mr. Johnson    16    15    15.5  │
│ English     Mrs. Brown     14    16    15.0  │
│ Physics     Dr. Wilson     18    17    17.5  │
│ Chemistry   Ms. Davis      12    14    13.0  │
│ [View Detailed Marks]                        │
└────────────────────────────────────────────┘

┌─── Available Report Cards ───┐
│ 📄 Sequence 1 Report Card - 2024-2025  [Download] [View] │
│ 📄 Sequence 2 Report Card - 2024-2025  [Download] [View] │
│ 📄 Sequence 3 Report Card - 2024-2025  [Generating...] │
│ 📄 Mid-Year Report - 2024-2025         [Download] [View] │
│ 📄 Final Report - 2023-2024           [Download] [View] │
│ [View All Academic Years] [Request Missing Reports]     │
└────────────────────────────────────────────────────────┘
```

### **4. Report Cards Tab**
**API Integration:**

#### **Get Student Report Cards**
**Endpoint:** `GET /api/v1/parents/children/:studentId/report-cards`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `studentId` (number): Student ID
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number; // Optional, defaults to current year
    sequenceId?: number;     // Optional, filter by specific sequence
    status?: "COMPLETED" | "GENERATING" | "FAILED" | "PENDING"; // Optional filter
  }
  ```
- **Response:**
  ```typescript
  {
    success: true;
    data: {
      studentInfo: {
        id: number;
        name: string;
        matricule: string;
        className?: string;
        subclassName?: string;
      };
      reportSummary: {
        totalReports: number;
        completedReports: number;
        generatingReports: number;
        failedReports: number;
        lastGeneratedDate?: string;
      };
      availableReports: Array<{
        id: number;
        reportType: "SINGLE_STUDENT";
        examSequence: {
          id: number;
          name: string;
          academicYear: string;
        };
        status: "COMPLETED" | "GENERATING" | "FAILED" | "PENDING";
        generatedAt?: string;
        filePath?: string;
        downloadUrl?: string;
        pageNumber?: number;
        errorMessage?: string;
        fileSize?: string; // e.g., "2.5 MB"
        lastAccessedAt?: string;
      }>;
      historicalReports: Array<{
        academicYear: string;
        reportCount: number;
        latestReportDate?: string;
      }>;
    };
  }
  ```

#### **Download Report Card**
**Endpoint:** `GET /api/v1/parents/children/:studentId/report-cards/:reportId/download`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** 
  - `studentId` (number): Student ID
  - `reportId` (number): Generated report ID
- **Response:** PDF file download with proper headers

#### **Get Report Card Status**
**Endpoint:** `GET /api/v1/parents/children/:studentId/report-cards/:reportId/status`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
  ```typescript
  {
    success: true;
    data: {
      id: number;
      status: "COMPLETED" | "GENERATING" | "FAILED" | "PENDING";
      progress?: number; // 0-100 for generating reports
      estimatedCompletion?: string; // For generating reports
      errorMessage?: string;
      lastUpdated: string;
    };
  }
  ```

### **Report Cards Tab Layout**
```
┌─── Report Card Management ───┐
│ [🏠 Current Year] [📅 All Years] [🔄 Refresh Status]     │
│                                                          │
│ ┌─── Report Summary ───┐                                 │
│ │ 📊 Total Reports: 6        📥 Completed: 4            │
│ │ ⏳ Generating: 1           ❌ Failed: 0               │
│ │ 📅 Last Generated: 2024-01-20                          │
│ └────────────────────────────────────────────────────── │
│                                                          │
│ ┌─── Current Academic Year (2024-2025) ───┐              │
│ │                                                        │
│ │ 📄 Sequence 1 Report Card                             │
│ │ │  Status: ✅ Completed | Generated: 2024-01-15       │
│ │ │  Size: 2.1 MB | Last Accessed: 2024-01-16          │
│ │ │  [📥 Download] [👁️ View] [📤 Share]                │
│ │                                                        │
│ │ 📄 Sequence 2 Report Card                             │
│ │ │  Status: ✅ Completed | Generated: 2024-03-20       │
│ │ │  Size: 2.3 MB | Last Accessed: Never               │
│ │ │  [📥 Download] [👁️ View] [📤 Share]                │
│ │                                                        │
│ │ 📄 Sequence 3 Report Card                             │
│ │ │  Status: ⏳ Generating... (Progress: 75%)           │
│ │ │  Estimated completion: 5 minutes                    │
│ │ │  [🔄 Check Status] [ℹ️ Details]                     │
│ │                                                        │
│ │ 📄 Mid-Year Report                                     │
│ │ │  Status: ⏳ Pending Generation                       │
│ │ │  Expected: After Sequence 3 completion             │
│ │ │  [📧 Notify When Ready]                             │
│ │                                                        │
│ │ 📄 Final Year Report                                   │
│ │ │  Status: ⏸️ Not Available (End of year)             │
│ │ │  Expected: June 2025                               │
│ └──────────────────────────────────────────────────────┘│
│                                                          │
│ ┌─── Previous Academic Years ───┐                        │
│ │ 📂 2023-2024 Academic Year (6 reports available)      │
│ │ │  📄 Final Report - Form 4 | [Download] [View]       │
│ │ │  📄 Mid-Year Report - Form 4 | [Download] [View]    │
│ │ │  📄 Sequence 6 Report | [Download] [View]          │
│ │ │  📄 Sequence 5 Report | [Download] [View]          │
│ │ │  [▼ Show All 2023-2024 Reports]                    │
│ │                                                        │
│ │ 📂 2022-2023 Academic Year (6 reports available)      │
│ │ │  [▼ Show 2022-2023 Reports]                        │
│ └──────────────────────────────────────────────────────┘│
│                                                          │
│ ┌─── Quick Actions ───┐                                  │
│ │ [📧 Request Missing Report] [❓ Report Issue]           │
│ │ [📞 Contact Class Master] [💬 Ask Question]            │
│ └──────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────┘
```

### **Report Card Download Modal**
When user clicks "Download" or "View":
```
┌─── Report Card Download ───┐
│ 📄 Sequence 1 Report Card - John Doe                    │
│ ─────────────────────────────────────────              │
│ 📊 Academic Year: 2024-2025                             │
│ 📅 Sequence: Sequence 1 (Sept-Oct 2024)                │
│ 📝 Generated: January 15, 2024 at 2:30 PM              │
│ 📏 File Size: 2.1 MB                                    │
│ 📋 Pages: 1 page                                        │
│                                                          │
│ ┌─── Download Options ───┐                              │
│ │ [📥 Download PDF] [👁️ View in Browser]                │
│ │ [📧 Email Copy] [📤 Share Link]                       │
│ │ [🖨️ Print] [💾 Save to Cloud]                         │
│ └──────────────────────────────────────────────────────┘│
│                                                          │
│ 💡 Tip: Report cards are automatically generated after  │
│    each examination sequence is completed.               │
│                                                          │
│ [Close] [Download Now]                                   │
└────────────────────────────────────────────────────────┘
```

### **Report Generation Status Modal**
For reports being generated:
```
┌─── Report Generation Status ───┐
│ 📄 Sequence 3 Report Card - John Doe                    │
│ ─────────────────────────────────────────              │
│ Status: ⏳ Generating Report Card...                     │
│                                                          │
│ ████████████████░░░░ 75% Complete                       │
│                                                          │
│ Current Step: Calculating subject averages              │
│ Estimated Time Remaining: 3-5 minutes                   │
│ Started: 10:30 AM                                       │
│                                                          │
│ ℹ️ Your report card is being generated in the           │
│    background. You'll receive a notification when       │
│    it's ready for download.                             │
│                                                          │
│ ✅ Marks collected and verified                          │
│ ✅ Attendance calculated                                 │
│ ⏳ Generating performance analytics                      │
│ ⏸️ Creating PDF document                                 │
│ ⏸️ Final quality checks                                  │
│                                                          │
│ [🔄 Refresh Status] [📧 Notify Me] [Close]              │
└────────────────────────────────────────────────────────┘
```

### **5. Quizzes Tab**
**API Integration:**

#### **Get Available Quizzes for Student**
**Endpoint:** `GET /api/v1/quiz/student/:studentId/available`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number; // Optional, defaults to current year
  }
  ```
- **Response Data:**
  ```typescript
  {
    success: true;
    data: Array<{
      id: number;
      quizTitle: string;
      description?: string;
      subject: string;
      timeLimit?: number;
      totalMarks: number;
      questionCount: number;
      startDate?: string;
      endDate?: string;
      status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
      lastAttempt?: {
        score: number;
        percentage: number;
      };
    }>;
  }
  ```

#### **Start Quiz**
**Endpoint:** `POST /api/v1/quiz/start`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```typescript
  {
    quizId: number;
    studentId: number;
  }
  ```
- **Response (201):**
  ```typescript
  {
    success: true;
    message: "Quiz started successfully";
    data: {
      id: number;
      quizId: number;
      studentId: number;
      parentId: number;
      status: "IN_PROGRESS";
      startedAt: string;
    };
  }
  ```

#### **Submit Quiz**
**Endpoint:** `POST /api/v1/quiz/submissions/:submissionId/submit`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `submissionId` (number): Quiz submission ID
- **Request Body:**
  ```typescript
  {
    responses: Array<{
      questionId: number;
      selectedAnswer: string;
      timeSpent?: number; // Seconds
    }>;
  }
  ```
- **Response (200):**
  ```typescript
  {
    success: true;
    message: "Quiz submitted successfully";
    data: {
      id: number;
      quizId: number;
      studentId: number;
      score: number;
      percentage: number;
      status: "COMPLETED";
      submittedAt: string;
    };
  }
  ```

#### **Get Quiz Results (Detailed)**
**Endpoint:** `GET /api/v1/quiz/student/:studentId/results`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `studentId` (number): Student ID
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number; // Optional, defaults to current year
    quizId?: number;         // Optional, filter by specific quiz
  }
  ```
- **Response (200):**
  ```typescript
  {
    success: true;
    data: Array<{
      id: number;
      quizTitle: string;
      subjectName: string;
      completedAt: string;
      score: number;
      totalMarks: number;
      percentage: number;
      status: "COMPLETED" | "PENDING" | "OVERDUE";
      submissionId: number; // Link to detailed submission
    }>;
  }
  ```

#### **Get Detailed Quiz Submission**
**Endpoint:** `GET /api/v1/quiz/submissions/:submissionId/detailed`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `submissionId` (number): Quiz submission ID
- **Response (200):**
  ```typescript
  {
    success: true;
    data: {
      submissionId: number;
      quizTitle: string;
      studentName: string;
      score: number;
      totalMarks: number;
      percentage: number;
      submittedAt: string;
      timeTaken: number; // Minutes
      questions: Array<{
        questionId: number;
        questionText: string;
        questionType: "MCQ" | "LONG_ANSWER";
        options?: string[];
        correctAnswer: string;
        selectedAnswer: string;
        isCorrect: boolean;
        marksEarned: number;
        maxMarks: number;
        explanation?: string;
      }>;
    };
  }
  ```

```
┌─── Quiz Summary ───┐
│ Total Quizzes: 12       │
│ Completed: 10           │
│ Average Score: 78%      │
│ Completion Rate: 83%    │
└───────────────────────┘

┌─── Recent Quizzes ───┐
│ Subject    Date       Score    Status      Action     │
│ Math       2024-01-20 85%      Completed   [View]     │
│ English    2024-01-18 92%      Completed   [View]     │
│ Physics    2024-01-15 78%      Completed   [View]     │
│ Chemistry  2024-01-22 -        Available   [Start]    │
└──────────────────────────────────────────────────────┘

[View All Quiz Results]
```

### **5. Discipline Tab**
**API Integration:**
- Discipline data is included in the main child details endpoint

```
┌─── Discipline Summary ───┐
│ Total Issues: 2             │
│ Resolved: 2                 │
│ Pending: 0                  │
│ Latest Issue: 2023-12-05    │
└───────────────────────────┘

┌─── Discipline History ───┐
│ Date       Type         Description        Status    │
│ 2023-12-05 Lateness     Arrived 8:30 AM    Resolved  │
│ 2023-11-20 Class Absence Missed History    Resolved  │
│ [View Details]                                       │
└────────────────────────────────────────────────────┘

┌─── Attendance Tracking ───┐
│ This Month: 20/22 days present           │
│ Attendance Rate: 91%                     │
│ Recent Absences: 2                       │
│ [View Attendance Calendar]               │
└────────────────────────────────────────┘
```

### **6. Analytics Tab**
**API Integration:**
- `GET /api/v1/parents/children/:studentId/analytics`
- Query Parameters: `{ academicYearId?: number }`
- **Response Data:**
  ```typescript
  {
    success: true;
    data: {
      studentInfo: {
        id: number;
        name: string;
        classInfo: object;
      };
      performanceAnalytics: {
        overallAverage: number;
        grade: string;
        classRank?: number;
        improvementTrend: "IMPROVING" | "DECLINING" | "STABLE";
        subjectsAboveAverage: number;
        subjectsBelowAverage: number;
        recommendation: string;
      };
      attendanceAnalytics: {
        totalDays: number;
        presentDays: number;
        absentDays: number;
        attendanceRate: number;
        status: string;
        monthlyTrends: Array<{
          month: string;
          attendanceRate: number;
        }>;
      };
      quizAnalytics: {
        totalQuizzes: number;
        completedQuizzes: number;
        averageScore: number;
        highestScore: number;
        completionRate: number;
        recentQuizzes: Array<object>;
      };
      subjectTrends: Array<{
        subjectName: string;
        currentAverage: number;
        trend: "IMPROVING" | "DECLINING" | "STABLE";
        bestMark: number;
        lowestMark: number;
      }>;
      comparativeAnalytics: {
        studentAverage: number;
        classAverage: number;
        aboveClassAverage: boolean;
        percentileRank?: number;
      };
    };
  }
  ```

```
┌─── Performance Analytics ───┐
│ Current Average: 15.2/20         │
│ Class Rank: 5/30                 │
│ Improvement Trend: ↗️ Improving  │
│ Above Class Average: ✅ Yes       │
│ Recommendation: Focus on Chemistry│
└────────────────────────────────┘

┌─── Subject Trends ───┐
│ [📊 Chart showing performance trends by subject] │
│ Mathematics: ↗️ Improving                        │
│ English: → Stable                               │
│ Physics: ↗️ Improving                           │
│ Chemistry: ↘️ Declining                         │
└───────────────────────────────────────────────┘

┌─── Comparative Analytics ───┐
│ Your Child's Average: 15.2/20    │
│ Class Average: 14.8/20           │
│ Performance: Above Average        │
│ Percentile Rank: 75th            │
└─────────────────────────────────┘
```

## All Children Overview (`/parent/children`)

### **API Integration**
**Primary Endpoint:** `GET /api/v1/parents/children/quiz-results`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number; // Optional
  }
  ```

```
┌─── All My Children ───┐
│ [Filter: All Classes] [Sort: Name ▼]                    │
│                                                         │
│ ┌─── John Doe (Form 5A) ───┐                            │
│ │ 📊 Attendance: 92% | 📚 Average: 15.2/20             │
│ │ 💰 Pending: 25,000 FCFA | ⚠️ Issues: 0               │
│ │ Recent: Math Quiz 85% | Physics Test 17/20           │
│ │ [View Details] [Quick Message]                       │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Mary Doe (Form 3B) ───┐                            │
│ │ 📊 Attendance: 95% | 📚 Average: 14.8/20             │
│ │ 💰 Pending: 0 FCFA | ⚠️ Issues: 1                    │
│ │ Recent: English Essay A+ | Chemistry Quiz 12/20      │
│ │ [View Details] [Quick Message]                       │
│ └─────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────┘
```

## Messaging (`/parent/messages`)

### **API Integration**

#### **Send Message to Staff**
**Endpoint:** `POST /api/v1/messaging/threads`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```typescript
  {
    subject: string;
    participants: Array<number>; // Staff member IDs (e.g., [recipientId])
    category?: "GENERAL" | "ACADEMIC" | "DISCIPLINARY" | "FINANCIAL" | "ADMINISTRATIVE" | "EMERGENCY"; // Default: "GENERAL"
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT"; // Default: "MEDIUM"
    initialMessage: string; // The message content
    tags?: Array<string>;
  }
  ```
- **Response (201):**
  ```typescript
  {
    success: true;
    message: "Message thread created successfully";
    data: {
      id: number;
      subject: string;
      participants: Array<{
        userId: number;
        userName: string;
        userRole: string;
      }>;
      messageCount: number;
      lastMessageAt: string;
      lastMessagePreview: string;
      priority: string;
      category: string;
      status: string;
      tags: Array<string>;
      createdAt: string;
      createdBy: {
        id: number;
        name: string;
        role: string;
      };
    };
  }
  ```

#### **Get Message Threads**
**Endpoint:** `GET /api/v1/messaging/threads`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    category?: string;     // "GENERAL" | "ACADEMIC" | "DISCIPLINARY" | "FINANCIAL" | "ADMINISTRATIVE" | "EMERGENCY"
    priority?: string;     // "LOW" | "MEDIUM" | "HIGH" | "URGENT"
    status?: string;       // "ACTIVE" | "RESOLVED" | "ARCHIVED"
    search?: string;       // Search in subject, preview, tags
    page?: number;         // Default: 1
    limit?: number;        // Default: 20
  }
  ```
- **Response (200):**
  ```typescript
  {
    success: true;
    data: Array<{
      id: number;
      subject: string;
      participants: Array<{
        userId: number;
        userName: string;
        userRole: string;
        isActive: boolean;
        lastReadAt?: string;
      }>;
      messageCount: number;
      lastMessageAt: string;
      lastMessagePreview: string;
      priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
      category: "GENERAL" | "ACADEMIC" | "DISCIPLINARY" | "FINANCIAL" | "ADMINISTRATIVE" | "EMERGENCY";
      status: "ACTIVE" | "RESOLVED" | "ARCHIVED";
      tags: Array<string>;
      createdAt: string;
      createdBy: {
        id: number;
        name: string;
        role: string;
      };
    }>;
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }
  ```

#### **Get Thread Messages**
**Endpoint:** `GET /api/v1/messaging/threads/:threadId/messages`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `threadId` (number): Thread ID
- **Query Parameters:**
  ```typescript
  {
    page?: number;         // Default: 1
    limit?: number;        // Default: 50
  }
  ```
- **Response (200):**
  ```typescript
  {
    success: true;
    data: Array<{
      id: number;
      threadId: number;
      senderId: number;
      senderName: string;
      senderRole: string;
      content: string;
      messageType: "TEXT" | "ANNOUNCEMENT" | "ALERT" | "REMINDER" | "URGENT";
      priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
      isRead: boolean;
      readAt?: string;
      readBy: Array<{
        userId: number;
        userName: string;
        readAt: string;
      }>;
      attachments: Array<{
        id: number;
        fileName: string;
        fileUrl: string;
        fileSize: number;
        uploadedAt: string;
      }>;
      reactions: Array<{
        userId: number;
        userName: string;
        reaction: "👍" | "👎" | "❤️" | "😂" | "😮" | "😢" | "😡";
        reactedAt: string;
      }>;
      mentions: Array<{
        userId: number;
        userName: string;
        position: number;
      }>;
      deliveryStatus: "SENT" | "DELIVERED" | "READ" | "FAILED";
      sentAt: string;
      editedAt?: string;
      isEdited: boolean;
    }>;
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }
  ```

#### **Send Message to Thread**
**Endpoint:** `POST /api/v1/messaging/threads/:threadId/messages`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `threadId` (number): Thread ID
- **Request Body:**
  ```typescript
  {
    content: string;
    messageType?: string;          // Default: "TEXT"
    priority?: string;             // Default: "MEDIUM"
    mentions?: Array<number>;      // User IDs to mention
    attachments?: Array<{
      fileName: string;
      fileUrl: string;
      fileSize: number;
    }>;
  }
  ```
- **Response (201):**
  ```typescript
  {
    success: true;
    message: "Message sent successfully";
    data: {
      id: number;
      threadId: number;
      senderId: number;
      senderName: string;
      content: string;
      sentAt: string;
    };
  }
  ```

#### **Get Notification Preferences**
**Endpoint:** `GET /api/v1/messaging/preferences`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):**
  ```typescript
  {
    success: true;
    data: {
      userId: number;
      emailNotifications: boolean;
      pushNotifications: boolean;
      smsNotifications: boolean;
      priority: {
        low: boolean;
        medium: boolean;
        high: boolean;
        urgent: boolean;
      };
      categories: {
        general: boolean;
        academic: boolean;
        disciplinary: boolean;
        financial: boolean;
        administrative: boolean;
        emergency: boolean;
      };
      quietHours: {
        enabled: boolean;
        startTime: string;
        endTime: string;
      };
      digestFrequency: "IMMEDIATE" | "HOURLY" | "DAILY" | "WEEKLY" | "DISABLED";
    };
  }
  ```

#### **Update Notification Preferences**
**Endpoint:** `PUT /api/v1/messaging/preferences`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```typescript
  {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    smsNotifications?: boolean;
    priority?: {
      low?: boolean;
      medium?: boolean;
      high?: boolean;
      urgent?: boolean;
    };
    categories?: {
      general?: boolean;
      academic?: boolean;
      disciplinary?: boolean;
      financial?: boolean;
      administrative?: boolean;
      emergency?: boolean;
    };
    quietHours?: {
      enabled?: boolean;
      startTime?: string;
      endTime?: string;
    };
    digestFrequency?: "IMMEDIATE" | "HOURLY" | "DAILY" | "WEEKLY" | "DISABLED";
  }
  ```
- **Response (200):**
  ```typescript
  {
    success: true;
    message: "Notification preferences updated successfully";
    data: {
      userId: number;
      emailNotifications: boolean;
      pushNotifications: boolean;
      smsNotifications: boolean;
    };
  }
  ```

```
┌─── Parent Messaging Center ───┐
│ [📝 Compose] [📥 Inbox] [📤 Sent] [⭐ Important]       │
│                                                        │
│ ┌─── Quick Message to Staff ───┐                       │
│ │ To: [Select Staff ▼] Teacher | Class Master | HOD    │
│ │     [Search: Mr. Johnson, Mrs. Smith...]             │
│ │ About Child: [Select Child ▼] [John Doe] [Mary Doe] │
│ │ Subject: [Text Input]                                │
│ │ Priority: [●Medium] [○Low] [○High]                   │
│ │ Message: [Text Area]                                 │
│ │ [Send Message] [Save Draft]                          │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ ┌─── Recent Conversations ───┐                         │
│ │ 📧 Mr. Johnson (Math Teacher)     | 2 hours ago     │
│ │    Re: John's Math Performance                       │
│ │    "Thank you for the update..."                     │
│ │                                                      │
│ │ 📧 Mrs. Smith (Class Master)      | 1 day ago       │
│ │    Mary's Attendance Query                           │
│ │    "I'll check the records..."                       │
│ │                                                      │
│ │ 📧 Principal                      | 3 days ago       │
│ │    Parent-Teacher Meeting Notice                     │
│ │    "Dear parents, we are..."                         │
│ │                                                      │
│ │ [View All Messages]                                  │
│ └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

## School Announcements (`/parent/announcements`)

### **API Integration**
**Primary Endpoint:** `GET /api/v1/communications/announcements`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    page?: number;
    limit?: number;
    audience?: "ALL" | "STUDENTS" | "PARENTS" | "TEACHERS" | "STAFF";
    academicYearId?: number;
    startDate?: string; // "YYYY-MM-DD"
    endDate?: string; // "YYYY-MM-DD"
    active?: boolean;
  }
  ```
- **Response:**
  ```typescript
  {
    success: true;
    data: {
      announcements: Array<{
      id: number;
      title: string;
      content: string;
        audience: "ALL" | "STUDENTS" | "PARENTS" | "TEACHERS" | "STAFF";
        priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
        isActive: boolean;
        publishDate: string;
        expiryDate?: string;
        academicYearId?: number;
        authorId: number;
        createdAt: string;
        updatedAt: string;
        author: {
          id: number;
          name: string;
          email: string;
        };
        academicYear?: {
          id: number;
          name: string;
          startDate: string;
          endDate: string;
        };
    }>;
      pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
      };
    };
  }
  ```

```
┌─── School Announcements ───┐
│ [🔔 All] [📚 Academic] [💰 Financial] [📅 Events]     │
│                                                        │
│ ┌─── 🔴 URGENT: School Closure Notice ───┐             │
│ │ Published: January 20, 2024 | Principal             │
│ │ Due to heavy rains, school will be closed            │
│ │ tomorrow (January 21). All classes resuming          │
│ │ Monday. Stay safe!                                   │
│ │ [Read More] [Download Notice]                        │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ ┌─── 📅 Parent-Teacher Conference ───┐                  │
│ │ Published: January 18, 2024 | Academic Office       │
│ │ Annual parent-teacher conference scheduled           │
│ │ for February 5-7. Book your appointments...         │
│ │ [Read More] [Book Appointment]                       │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ ┌─── 💰 Fee Payment Reminder ───┐                       │
│ │ Published: January 15, 2024 | Bursar                │
│ │ Second term fees due January 31st.                  │
│ │ Various payment methods available...                 │
│ │ [Read More] [Payment Guide]                          │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ [Load More Announcements]                              │
└──────────────────────────────────────────────────────┘
```

## Settings & Profile (`/parent/settings`)

### **API Integration**
**Get Profile:** `GET /api/v1/users/me`
**Update Profile:** `PUT /api/v1/users/me`
**Update Preferences:** `PUT /api/v1/messaging/preferences`

```
┌─── Parent Settings ───┐
│ [👤 Profile] [🔔 Notifications] [🔒 Security] [👨‍👩‍👧‍👦 Children]│
│                                                        │
│ ┌─── Profile Information ───┐                          │
│ │ Name: [Mr. Johnson]                                  │
│ │ Email: [johnson@email.com]                           │
│ │ Phone: [677123456]                                   │
│ │ WhatsApp: [677123456]                                │
│ │ Address: [123 Main Street, Douala]                   │
│ │ [Update Profile]                                     │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ ┌─── Notification Preferences ───┐                     │
│ │ ✅ Email Notifications                               │
│ │ ✅ SMS Notifications                                 │
│ │ ✅ Academic Updates                                  │
│ │ ✅ Fee Reminders                                     │
│ │ ✅ Discipline Alerts                                 │
│ │ ❌ Marketing Messages                                │
│ │ [Save Preferences]                                   │
│ └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

## Error States & Loading

### **API Error Handling**
```typescript
// Standard error response format
{
  success: false;
  error: string; // User-friendly error message
}

// Common error scenarios:
// 401: "User not authenticated" - Redirect to login
// 403: "Access denied: insufficient permissions"  
// 404: "Student/Resource not found"
// 500: "Internal server error" - Show generic error message
```

### **Loading States**
- Show skeleton loaders for dashboard cards
- Spinner for individual API calls
- Progressive loading for large data sets
- Offline state handling with cached data

### **Data Refresh**
- Auto-refresh dashboard every 5 minutes
- Pull-to-refresh on mobile
- Real-time updates for critical notifications
- Cache strategy for frequently accessed data

**Frontend Implementation Notes:**
1. Use React Query or SWR for efficient data fetching and caching
2. Implement optimistic updates for better UX
3. Handle network failures gracefully with retry mechanisms
4. Store authentication token securely
5. Implement proper TypeScript interfaces matching API response types
