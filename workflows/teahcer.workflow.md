# TEACHER Role - Complete Workflow & UX Design

## Post-Login Teacher Dashboard (`/teacher/dashboard`)

### **API Integration**
**Primary Endpoint:** `GET /api/v1/teachers/dashboard`
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
      teacher: {
        id: number;
        name: string;
        title?: string;           // "Mathematics Teacher"
        totalWeeklyHours: number;
      };
      subjects: Array<{
        id: number;
        name: string;
        code: string;
        classCount: number;       // Classes teaching this subject
        studentCount: number;     // Total students across classes
      }>;
      classes: Array<{
        id: number;
        name: string;
        subclassName: string;
        studentCount: number;
      }>;
      todaysSchedule: Array<{
        id: number;
        startTime: string;        // "08:00"
        endTime: string;          // "09:00"
        subjectName: string;
        className: string;
        subclassName: string;
        roomNumber?: string;
      }>;
      pendingTasks: {
        marksToEnter: number;     // Count of ungraded assessments
        quizzesToGrade: number;   // Count of pending quiz submissions
        messagesUnread: number;   // Unread parent/admin messages
        attendanceToRecord: number; // Days without attendance recorded
      };
      quickStats: {
        totalSubjects: number;
        totalStudents: number;
        totalClasses: number;
        weeklyHours: number;
        attendanceRate: number;   // Teacher's own attendance percentage
        activeQuizzes: number;
      };
      upcomingPeriods: Array<{
        startTime: string;
        endTime: string;
        subjectName: string;
        className: string;
        subclassName: string;
      }>;
    };
  }
  ```

### **Main Dashboard Layout**
```
┌─────────────────────────────────────────────────────────┐
│ [🏠] School Management System    [🔔] [👤] [⚙️] [🚪]    │
├─────────────────────────────────────────────────────────┤
│ Welcome back, [Teacher Name] | Academic Year: 2024-2025  │
│ Mathematics Teacher | Total Weekly Hours: 24             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─── Quick Stats (Cards) ───┐                          │
│ │ 📚 Subjects Teaching: 3    👨‍🎓 Total Students: 120     │
│ │ 🏫 Classes Taught: 4       📝 Marks to Enter: 15      │
│ │ ⏰ Upcoming Periods: 3     📊 Weekly Hours: 24        │
│ │ 📈 Attendance Rate: 95%    🎯 Active Quizzes: 2       │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Current & Next Classes ───┐                       │
│ │ 🕐 NOW: Math - Form 5A (25 mins left)               │
│ │ 🕑 NEXT: Physics - Form 2A (in 5 mins)              │
│ │ [Real-time view updates every minute]                │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Today's Schedule ───┐                              │
│ │ 8:00-9:00   Math - Form 5A   Room 201               │
│ │ 9:00-10:00  Math - Form 4B   Room 201               │
│ │ 11:00-12:00 Physics - Form 5A Room 301               │
│ │ [View Full Timetable]                                │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Pending Tasks ───┐                                 │
│ │ • Enter marks for Form 5A Mathematics (Seq 2)        │
│ │ • Grade Physics quiz submissions (8 pending)         │
│ │ • Review attendance for this week                    │
│ │ • Respond to parent message from Mrs. Johnson        │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Real-Time Timetable (`/teacher/timetable/current-next`)

### **API Integration**
**Primary Endpoint:** `GET /api/v1/teachers/me/timetable/current-next`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number; // Optional, defaults to current academic year
  }
  ```
- **Response Data:**
  ```typescript
  {
    success: true;
    data: {
      current: {
        period: {
          id: number;
          name: string;           // "Period 1"
          startTime: string;      // "08:00"
          endTime: string;        // "08:55"
          dayOfWeek: string;      // "MONDAY"
        };
        subject: {
          id: number;
          name: string;           // "Mathematics"
          category: string;       // "SCIENCE"
        };
        subClass: {
          id: number;
          name: string;           // "Form 1A"
          className: string;      // "Form 1"
        };
        isActive: boolean;        // true if currently in this period
        minutesRemaining: number; // Minutes left in current period
      } | null;
      next: {
        period: {
          id: number;
          name: string;           // "Period 2"
          startTime: string;      // "09:00"
          endTime: string;        // "09:55"
          dayOfWeek: string;      // "MONDAY"
        };
        subject: {
          id: number;
          name: string;           // "Physics"
          category: string;       // "SCIENCE"
        };
        subClass: {
          id: number;
          name: string;           // "Form 2A"
          className: string;      // "Form 2"
        };
        minutesToStart: number;   // Minutes until this period starts
        isToday: boolean;         // true if this is today's schedule
      } | null;
      requestTime: string;        // ISO timestamp of request
      currentDay: string;         // "MONDAY", "TUESDAY", etc.
    };
  }
  ```

### **Real-Time Timetable Feature**
```
┌─── Live Timetable Widget ───┐
│ 🕐 Current Time: 8:30 AM     │
│ 📅 Monday, January 22, 2025  │
│                               │
│ ┌─── NOW TEACHING ───┐       │
│ │ 📚 Mathematics              │
│ │ 👥 Form 5A (30 students)    │
│ │ ⏰ Period 1: 8:00-8:55      │
│ │ ⏱️  25 minutes remaining     │
│ │ [Take Attendance] [Enter]   │
│ └─────────────────────────────┘ │
│                               │
│ ┌─── UP NEXT ───┐             │
│ │ 🧪 Physics                  │
│ │ 👥 Form 2A (28 students)    │
│ │ ⏰ Period 2: 9:00-9:55      │
│ │ ⏱️  Starting in 5 minutes    │
│ │ [Prepare Materials]         │
│ └─────────────────────────────┘ │
│                               │
│ 🔄 Auto-refresh: Every minute │
└─────────────────────────────────┘
```

### **Key Features:**
- **Real-time updates:** Widget refreshes automatically every minute
- **Current period tracking:** Shows active class with countdown timer
- **Next period preview:** Displays upcoming class with preparation time
- **Quick actions:** Direct access to attendance and materials
- **Context-aware:** Only shows periods where teacher has assignments
- **Day-aware:** Adapts to current day of week and schedule
- **Academic year filtering:** Works with selected academic year context

### **Implementation Notes:**
- **Frontend:** JavaScript interval polling every 60 seconds
- **Backend:** Time-based calculations using current server time
- **Timezone:** Uses school's configured timezone
- **Caching:** Timetable data cached for performance
- **Fallback:** Graceful handling when no current/next periods exist
- **Weekend/holiday handling:** Shows appropriate message when no school day

## My Subjects Page (`/teacher/subjects`)

### **API Integration**
**Primary Endpoint:** `GET /api/v1/teachers/subjects`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
  }
  ```
- **Response Data:**
  ```typescript
  {
    success: true;
    data: Array<{
      id: number;
      name: string;
      code: string;
      category: string;         // "SCIENCE" | "ARTS" | "TECHNICAL"
      coefficient: number;
      teacherAssignments: Array<{
        id: number;
        classId: number;
        className: string;
        subclassId: number;
        subclassName: string;
        studentCount: number;
        weeklyHours: number;
      }>;
      totalStudents: number;    // Sum across all classes
      totalClasses: number;
      averagePerformance: number; // Overall average across all classes
    }>;
  }
  ```

### **Subjects Overview**
```
┌─── My Teaching Subjects ───┐
│ [Filter: All] [Sort: Name ▼] [Academic Year: 2024-2025] │
│                                                         │
│ ┌─── Mathematics ───┐  ┌─── Physics ───┐               │
│ │ Code: MATH         │  │ Code: PHY      │               │
│ │ Category: Science  │  │ Category: Science              │
│ │ Coefficient: 6     │  │ Coefficient: 4                 │
│ │ Classes: 3         │  │ Classes: 2                     │
│ │ Students: 85       │  │ Students: 60                   │
│ │ [Manage] [Students]│  │ [Manage] [Students]            │
│ └─────────────────── │  └──────────────────────────────│
│                                                         │
│ ┌─── Computer Science ───┐                              │
│ │ Code: CS              │                               │
│ │ Category: Science & Tech                              │
│ │ Coefficient: 3        │                               │
│ │ Classes: 1            │                               │
│ │ Students: 25          │                               │
│ │ [Manage] [Students]   │                               │
│ └─────────────────────┘                               │
└───────────────────────────────────────────────────────┘
```

### **Subject Detail Page** (`/teacher/subjects/:subjectId`)

#### **API Integration**
**Get Subject Details:** `GET /api/v1/teachers/subjects/:subjectId`
- **Response includes:** Subject info, assigned classes, students, performance metrics

**Get Subject Students:** `GET /api/v1/teachers/subjects/:subjectId/students`
- **Query Parameters:**
  ```typescript
  {
    classId?: number;        // Filter by specific class
    academicYearId?: number;
  }
  ```

```
┌─── Mathematics Details ───┐
│ Subject: Mathematics        │
│ Code: MATH | Coefficient: 6 │
│ Category: Science & Tech    │
│ Total Students: 85          │
│ Active Classes: 3           │
└───────────────────────────┘

┌─── Classes Teaching This Subject ───┐
│ Class        Students  Avg Score  Action           │
│ Form 5A      30        15.2/20    [Enter Marks]    │
│ Form 4B      28        14.8/20    [View Students]  │
│ Form 4A      27        16.1/20    [Enter Marks]    │
└─────────────────────────────────────────────────────┘

┌─── Quick Actions ───┐
│ [Create Quiz] [Enter Marks] [View All Students]     │
│ [Attendance] [Performance Analytics] [Messages]     │
└───────────────────────────────────────────────────┘
```

## My Students Page (`/teacher/students`)

### **API Integration**
**Primary Endpoint:** `GET /api/v1/teachers/students`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
    classId?: number;        // Filter by class
    subjectId?: number;      // Filter by subject
    search?: string;         // Search by name or matricule
    page?: number;
    limit?: number;
  }
  ```
- **Response Data:**
  ```typescript
  {
    success: true;
    data: Array<{
      id: number;
      name: string;
      matricule: string;
      photo?: string;
      classInfo: {
        className: string;
        subclassName: string;
      };
      subjects: Array<{        // Only subjects taught by this teacher
        id: number;
        name: string;
        averageMark?: number;
        latestMark?: number;
        sequence?: string;
      }>;
      overallAverage: number;  // Across all subjects taught by teacher
      attendanceRate: number;
      disciplineIssues: number;
      recentActivity: Array<{
        type: "QUIZ" | "MARK" | "ATTENDANCE";
        description: string;
        date: string;
      }>;
    }>;
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }
  ```

### **Students Overview**
```
┌─── My Students ───┐
│ [Filter by Class ▼] [Filter by Subject ▼] [Search...] │
│ Showing 120 students across all classes               │
│                                                       │
│ ┌─── Filters Applied ───┐                            │
│ │ Class: Form 5A | Subject: Mathematics              │
│ │ [Clear Filters]                                    │
│ └─────────────────────────────────────────────────┘ │
│                                                       │
│ Student           Class    Subject      Avg    Action │
│ John Doe          Form 5A  Mathematics  15.2   [View] │
│ Mary Smith        Form 5A  Mathematics  16.8   [View] │
│ Peter Johnson     Form 5A  Mathematics  14.1   [View] │
│ Sarah Williams    Form 5A  Mathematics  17.2   [View] │
│ [Previous] [1] [2] [3] [Next]                        │
└─────────────────────────────────────────────────────┘
```

### **Individual Student Detail** (`/teacher/students/:studentId`)

#### **API Integration**
**Get Student Details:** `GET /api/v1/teachers/students/:studentId`
- **Response includes:** Full student profile for subjects taught by this teacher

**Record Attendance:** `POST /api/v1/attendance`
- **Request Body:**
  ```typescript
  {
    studentId: number;
    date: string;              // "YYYY-MM-DD"
    status: "PRESENT" | "ABSENT" | "LATE";
    subjectId?: number;        // If subject-specific attendance
    notes?: string;
  }
  ```

**Send Message to Parent:** `POST /api/v1/teachers/message-parent`
- **Request Body:**
  ```typescript
  {
    studentId: number;
    subject: string;
    message: string;
    priority?: "LOW" | "MEDIUM" | "HIGH";
  }
  ```

```
┌─── Student Profile ───┐
│ [Photo] John Doe       │
│ Matricule: STU2024001  │
│ Class: Form 5A         │
│ Overall Average: 15.2  │
└─────────────────────┘

┌─── Performance in My Subjects ───┐
│ Subject      Seq1  Seq2  Seq3  Average  Trend │
│ Mathematics  16    15    -     15.5     ↘️     │
│ Physics      17    18    -     17.5     ↗️     │
│ [Enter New Mark] [View History]               │
└─────────────────────────────────────────────┘

┌─── Attendance & Behavior ───┐
│ Attendance Rate: 92%              │
│ Recent Absences: 2 (last 2 weeks) │
│ Discipline Issues: 0               │
│ [Mark Absent] [View Full Record]   │
└──────────────────────────────────┘

┌─── Quick Actions ───┐
│ [Enter Mark] [Mark Attendance] [Send Message to Parent] │
└─────────────────────────────────────────────────────────┘
```

## Marks Management (`/teacher/marks`)

### **API Integration**

#### **1. Get Marks for Entry**
**Endpoint:** `GET /api/v1/teachers/marks`
- **Query Parameters:**
  ```typescript
  {
    subjectId: number;       // Required
    classId: number;         // Required  
    sequenceId: number;      // Required
    academicYearId?: number;
  }
  ```
- **Response:**
  ```typescript
  {
    success: true;
    data: {
      subject: { id: number; name: string; };
      class: { id: number; name: string; subclassName: string; };
      sequence: { id: number; name: string; };
      students: Array<{
        id: number;
        name: string;
        matricule: string;
        currentMark?: {
          id: number;
          score: number;
          maxScore: number;
          comments?: string;
          enteredAt: string;
        };
      }>;
      stats: {
        totalStudents: number;
        marksEntered: number;
        marksRemaining: number;
        classAverage?: number;
      };
    };
  }
  ```

#### **2. Enter/Update Mark**
**Endpoint:** `POST /api/v1/marks` (create) or `PUT /api/v1/marks/:markId` (update)
- **Request Body:**
  ```typescript
  {
    studentId: number;
    subjectId: number;
    sequenceId: number;
    score: number;           // The mark value
    maxScore?: number;       // Defaults to subject's max score
    comments?: string;
    academicYearId?: number;
  }
  ```
- **Response:**
  ```typescript
  {
    success: true;
    data: {
      id: number;
      studentId: number;
      subjectId: number;
      sequenceId: number;
      score: number;
      maxScore: number;
      comments?: string;
      enteredBy: number;      // Teacher ID
      enteredAt: string;
      updatedAt: string;
    };
  }
  ```

#### **3. Bulk Marks Entry**
**Endpoint:** `POST /api/v1/marks/bulk`
- **Request Body:**
  ```typescript
  {
    subjectId: number;
    sequenceId: number;
    classId: number;
    marks: Array<{
      studentId: number;
      score: number;
      comments?: string;
    }>;
    academicYearId?: number;
  }
  ```

### **Marks Entry Dashboard**
```
┌─── Marks Entry ───┐
│ [Select Subject ▼] [Select Class ▼] [Select Sequence ▼] │
│ Subject: Mathematics | Class: Form 5A | Sequence: 2     │
│                                                         │
│ ┌─── Current Selection ───┐                            │
│ │ Students: 30 | Total Possible: 20 marks             │
│ │ Entered: 25 | Remaining: 5                          │
│ │ Last Updated: 2024-01-20                            │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Student Name      Matricule    Current Mark  Action     │
│ John Doe          STU2024001   15/20        [Edit]     │
│ Mary Smith        STU2024002   16/20        [Edit]     │
│ Peter Johnson     STU2024003   -            [Enter]    │
│ Sarah Williams    STU2024004   17/20        [Edit]     │
│ Michael Brown     STU2024005   -            [Enter]    │
│                                                         │
│ [Bulk Enter] [Export] [Save All] [Submit for Review]   │
└───────────────────────────────────────────────────────┘
```

### **Mark Entry Modal**
```
┌─── Enter Mark - John Doe ───┐
│ Student: John Doe             │
│ Subject: Mathematics          │
│ Sequence: 2                   │
│ Current Mark: 15/20           │
│ ─────────────────────────     │
│ New Mark: [___]/20            │
│ Comments: [Text area]         │
│ ─────────────────────────     │
│ [Save] [Cancel]               │
└─────────────────────────────┘
```

### **Bulk Marks Entry**
```
┌─── Bulk Entry - Form 5A Mathematics Seq 2 ───┐
│ Enter marks for all students (Format: /20)     │
│                                                │
│ Student              Matricule      Mark       │
│ John Doe            STU2024001      [15]/20    │
│ Mary Smith          STU2024002      [16]/20    │
│ Peter Johnson       STU2024003      [__]/20    │
│ Sarah Williams      STU2024004      [17]/20    │
│ Michael Brown       STU2024005      [__]/20    │
│                                                │
│ [Validate All] [Clear All] [Save Draft] [Submit]│
└──────────────────────────────────────────────┘
```

## Quiz Management (`/teacher/quizzes`)

### **API Integration**

#### **1. Get Teacher's Quizzes**
**Endpoint:** `GET /api/v1/teachers/quizzes`
- **Query Parameters:**
  ```typescript
  {
    status?: "ACTIVE" | "DRAFT" | "COMPLETED" | "ARCHIVED";
    subjectId?: number;
    page?: number;
    limit?: number;
  }
  ```
- **Response:**
  ```typescript
  {
    success: true;
    data: Array<{
      id: number;
      title: string;
      description?: string;
      subjectId: number;
      subjectName: string;
      createdById: number;
      status: "ACTIVE" | "DRAFT" | "COMPLETED" | "ARCHIVED";
      timeLimit?: number;      // in minutes
      totalQuestions: number;
      totalMarks: number;
      assignedClasses: Array<{
        classId: number;
        className: string;
        subclassName: string;
        studentCount: number;
        completedCount: number;
      }>;
      dueDate?: string;
      createdAt: string;
      stats?: {
        totalAssigned: number;
        completed: number;
        averageScore: number;
      };
    }>;
  }
  ```

#### **2. Create Quiz**
**Endpoint:** `POST /api/v1/teachers/quizzes`
- **Request Body:**
  ```typescript
  {
    title: string;
    description?: string;
    subjectId: number;
    timeLimit?: number;      // in minutes
    dueDate?: string;        // "YYYY-MM-DD"
    questions: Array<{
      questionText: string;
      questionType: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
      options?: Array<string>;    // For multiple choice
      correctAnswer: string;
      points: number;
    }>;
    assignedClasses: Array<{
      classId: number;
      subclassId?: number;
    }>;
  }
  ```

#### **3. Get Quiz Results**
**Endpoint:** `GET /api/v1/teachers/quizzes/:quizId/results`
- **Response includes:** Student submissions, scores, completion status

### **Quiz Dashboard**
```
┌─── My Quizzes ───┐
│ [Create New Quiz] [Templates] [Statistics] [Archive]   │
│                                                        │
│ ┌─── Active Quizzes ───┐                              │
│ │ 📝 Mathematics Quiz 1 - Due: Jan 25                 │
│ │    Form 5A, 5B | 15/30 completed | Avg: 78%        │
│ │    [View Results] [Edit] [Extend Deadline]          │
│ │                                                     │
│ │ 📝 Physics Chapter 3 Quiz - Due: Jan 28            │
│ │    Form 4A | 8/25 completed | Avg: 82%             │
│ │    [View Results] [Send Reminder]                   │
│ └───────────────────────────────────────────────────┘ │
│                                                        │
│ ┌─── Draft Quizzes ───┐                               │
│ │ 📄 Algebra Quiz 2 (Draft)                          │
│ │    10 questions | Not assigned                      │
│ │    [Continue Editing] [Assign to Classes]          │
│ └───────────────────────────────────────────────────┘ │
│                                                        │
│ ┌─── Recent Results ───┐                              │
│ │ • Chemistry Quiz completed - 22/25 students        │
│ │ • Physics Test graded - Average: 85%               │
│ │ • Math Quiz 1 extended deadline to Feb 1           │
│ └───────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### **Create Quiz Workflow** (`/teacher/quizzes/create`)
```
┌─── Create New Quiz ───┐
│ ┌─── Basic Information ───┐                          │
│ │ Quiz Title: [Text Input]                           │
│ │ Subject: [Mathematics ▼]                           │
│ │ Description: [Text Area]                           │
│ │ Time Limit: [30] minutes                           │
│ │ Due Date: [Date Picker]                            │
│ └──────────────────────────────────────────────────┘ │
│                                                       │
│ ┌─── Questions ───┐                                   │
│ │ Question 1: [Text Area]                            │
│ │ Type: [Multiple Choice ▼]                          │
│ │ Points: [2]                                        │
│ │ Options:                                           │
│ │ ● A) [Option text]                                 │
│ │ ○ B) [Option text]                                 │
│ │ ○ C) [Option text]                                 │
│ │ ○ D) [Option text]                                 │
│ │ [Add Question] [Remove] [Preview]                   │
│ └──────────────────────────────────────────────────┘ │
│                                                       │
│ ┌─── Assign to Classes ───┐                          │
│ │ ☑️ Form 5A (30 students)                           │
│ │ ☑️ Form 5B (28 students)                           │
│ │ ☐ Form 4A (27 students)                           │
│ │ Total Students: 58                                 │
│ └──────────────────────────────────────────────────┘ │
│                                                       │
│ [Save as Draft] [Publish Quiz] [Cancel]               │
└─────────────────────────────────────────────────────┘
```

## Attendance Management (`/teacher/attendance`)

### **API Integration**

#### **1. Get Class Attendance**
**Endpoint:** `GET /api/v1/teachers/attendance`
- **Query Parameters:**
  ```typescript
  {
    classId: number;
    date?: string;           // "YYYY-MM-DD", defaults to today
    subjectId?: number;      // For subject-specific attendance
    academicYearId?: number;
  }
  ```

#### **2. Record Attendance**
**Endpoint:** `POST /api/v1/attendance/bulk`
- **Request Body:**
  ```typescript
  {
    classId: number;
    date: string;           // "YYYY-MM-DD"
    subjectId?: number;     // If subject-specific
    attendance: Array<{
      studentId: number;
      status: "PRESENT" | "ABSENT" | "LATE";
      notes?: string;
    }>;
  }
  ```

### **Attendance Dashboard**
```
┌─── Attendance Management ───┐
│ [Today's Attendance] [Weekly View] [Monthly Report]    │
│ Class: [Form 5A ▼] | Date: [Today ▼] | Subject: [Math ▼]│
│                                                        │
│ ┌─── Quick Stats ───┐                                  │
│ │ Total Students: 30 | Present: 28 | Absent: 2        │
│ │ Attendance Rate: 93% | Class Average: 92%           │
│ └──────────────────────────────────────────────────── │
│                                                        │
│ Student Name      Status    Late  Notes       Action   │
│ John Doe          ✅ Present  -    -          [Edit]   │
│ Mary Smith        ✅ Present  -    -          [Edit]   │
│ Peter Johnson     ❌ Absent   -    Sick       [Edit]   │
│ Sarah Williams    ✅ Present  ⏰   Traffic jam  [Edit]   │
│                                                        │
│ [Mark All Present] [Save Changes] [Send Absences Report]│
└──────────────────────────────────────────────────────┘
```

## Messaging (`/teacher/messages`)

### **API Integration**
**Get Messages:** `GET /api/v1/messaging/threads`
**Send Message:** `POST /api/v1/teachers/message-parent` (parent)
**Send Message:** `POST /api/v1/messaging/send` (general)

### **Teacher Messaging Center**
```
┌─── Teacher Messaging ───┐
│ [📧 Inbox] [✉️ Compose] [👨‍👩‍👧‍👦 Parents] [👥 Colleagues] │
│                                                        │
│ ┌─── Quick Message to Parent ───┐                      │
│ │ Student: [Select Student ▼]                          │
│ │ Selected: John Doe (STU2024001) - Form 5A           │
│ │ Parent: Mr. Johnson (Auto-detected)                 │
│ │ Subject: [Text Input]                                │
│ │ Message: [Text Area]                                 │
│ │ Priority: [●Normal] [○High] [○Low]                   │
│ │ [Send Message] [Save Draft]                          │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ ┌─── Recent Conversations ───┐                         │
│ │ 📧 Mrs. Johnson (Parent)     | 1 hour ago           │
│ │    Re: John's Mathematics Progress                   │
│ │    "Thank you for the update on his improvement..." │
│ │                                                      │
│ │ 📧 HOD Mathematics          | 2 days ago            │
│ │    Subject: Curriculum Planning Meeting             │
│ │    "The meeting is scheduled for next Friday..."    │
│ │                                                      │
│ │ 📧 Principal                | 3 days ago            │
│ │    Subject: Staff Meeting Agenda                    │
│ │    "Please review the attached agenda before..."    │
│ └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

## Analytics & Reports (`/teacher/analytics`)

### **API Integration**
**Get Teacher Analytics:** `GET /api/v1/teachers/analytics`
- **Query Parameters:**
  ```typescript
  {
    subjectId?: number;
    classId?: number;
    dateRange?: {
      startDate: string;
      endDate: string;
    };
    academicYearId?: number;
  }
  ```

### **Teacher Analytics Dashboard**
```
┌─── Teaching Analytics ───┐
│ [📊 Overview] [📈 Performance] [📅 Time Analysis] [📋 Reports]│
│                                                            │
│ ┌─── Performance Overview ───┐                             │
│ │ Subject      Classes  Avg Score  Trend  Completion      │
│ │ Mathematics  3        15.2/20    ↗️      95%            │
│ │ Physics      2        16.8/20    →       98%            │
│ │ [Export Performance Report]                             │
│ └──────────────────────────────────────────────────────── │
│                                                            │
│ ┌─── Class Comparison ───┐                                 │
│ │ [📊 Chart showing average scores by class]               │
│ │ Form 5A: 15.2 | Form 4B: 14.8 | Form 4A: 16.1         │
│ └──────────────────────────────────────────────────────── │
│                                                            │
│ ┌─── Teaching Load ───┐                                    │
│ │ Weekly Hours: 24 | Classes: 6 | Students: 145          │
│ │ Quiz Creation: 5 this month | Marks Entered: 450        │
│ │ Response Rate to Messages: 98%                          │
│ └──────────────────────────────────────────────────────── │
└──────────────────────────────────────────────────────────┘
```

## Settings & Preferences (`/teacher/settings`)

### **API Integration**
**Get Profile:** `GET /api/v1/users/me`
**Update Profile:** `PUT /api/v1/users/me`
**Update Preferences:** `PUT /api/v1/teachers/preferences`

### **Teacher Settings**
```
┌─── Teacher Settings ───┐
│ [👤 Profile] [🔔 Notifications] [📚 Teaching] [🔒 Security]│
│                                                          │
│ ┌─── Profile Information ───┐                            │
│ │ Name: [Mr. Johnson]                                    │
│ │ Email: [johnson@school.com]                            │
│ │ Phone: [677123456]                                     │
│ │ Department: [Mathematics]                              │
│ │ Qualification: [B.Sc Mathematics]                      │
│ │ [Update Profile]                                       │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─── Teaching Preferences ───┐                           │
│ │ Default Mark Scale: [20 ▼] [100] [Letter Grades]      │
│ │ Quiz Time Limit: [30] minutes                          │
│ │ Mark Entry Reminders: [✅ Enabled]                     │
│ │ Auto-save Frequency: [5] minutes                       │
│ │ [Save Teaching Preferences]                            │
│ └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

## Error Handling & Loading States

### **API Error Handling**
```typescript
// Standard error response format
{
  success: false;
  error: string; // User-friendly error message
}

// Teacher-specific error scenarios:
// 400: "Invalid mark value" | "Student not in your class"
// 403: "Cannot modify marks after deadline" | "Quiz already published"
// 404: "Subject not assigned to you" | "Student not found"
// 409: "Mark already exists for this sequence"
// 500: "Failed to save marks" | "Quiz creation failed"
```

### **Loading & Validation States**
- Validate mark entries (0-20 scale, numeric only)
- Auto-save draft marks every 5 minutes
- Real-time class average calculations
- Quiz question validation before publishing
- Attendance conflict detection (same student, same period)

### **Success Feedback**
- Toast notifications for successful mark entries
- Progress indicators for bulk operations
- Real-time student count updates
- Quiz publish confirmation dialogs
- Parent message delivery confirmations

**Frontend Implementation Notes:**
1. Implement mark entry with keyboard navigation (Tab, Enter)
2. Add real-time validation for mark ranges
3. Use optimistic updates for attendance marking
4. Cache frequently accessed class/student data
5. Implement offline capability for mark entry
6. Add bulk selection for attendance management
7. Use debounced search for student lookup
8. Implement proper form validation for quiz creation
9. Add auto-calculation for class statistics
10. Use proper loading states for large data sets
