# GUIDANCE_COUNSELOR Role - Complete Workflow & UX Design

*Note: Based on the current API documentation, the GUIDANCE_COUNSELOR role appears to have limited specific endpoints. This workflow is designed using available general endpoints that a counselor would logically need access to.*

## Post-Login Guidance Counselor Dashboard (`/counselor/dashboard`)

#### **API Integration:**
```http
GET /api/v1/counselor/dashboard
Authorization: Bearer {token}

Query Parameters:
?academicYearId=1

Success Response (200):
{
  "success": true,
  "data": {
    "overview": {
      "totalStudents": 1245,
      "activeCases": 15,
      "studentsNeedingSupport": 23,
      "appointmentsToday": 8,
      "highPriorityCases": 3,
      "successRate": 87,
      "monthlyInterventions": 45,
      "followUpsRequired": 12
    },
    "todaySchedule": [
      {
        "time": "09:00",
        "studentId": 240,
        "studentName": "John Doe",
        "class": "Form 5A",
        "sessionType": "INDIVIDUAL",
        "status": "SCHEDULED"
      },
      {
        "time": "10:30",
        "studentId": 241,
        "studentName": "Mary Smith", 
        "class": "Form 3B",
        "sessionType": "FOLLOW_UP",
        "status": "SCHEDULED"
      }
    ],
    "priorityCases": [
      {
        "studentId": 242,
        "studentName": "Alice Brown",
        "class": "Form 3A",
        "issueType": "BEHAVIORAL",
        "priority": "HIGH",
        "lastSession": "2024-01-20",
        "concerns": "Behavioral concerns"
      },
      {
        "studentId": 243,
        "studentName": "David Jones",
        "class": "Form 4B", 
        "issueType": "ACADEMIC",
        "priority": "HIGH",
        "lastSession": "2024-01-18",
        "concerns": "Academic stress"
      }
    ],
    "recentActivities": [
      {
        "activity": "Completed session with John Doe - Academic planning",
        "timestamp": "2024-01-22T09:00:00Z",
        "type": "SESSION"
      },
      {
        "activity": "Parent consultation for Mary Smith - Family support",
        "timestamp": "2024-01-21T14:00:00Z",
        "type": "CONSULTATION"
      }
    ]
  }
}

// Note: Since the counselor role has limited specific endpoints,
// many features will need to use general student endpoints
// with counselor-specific filtering and data interpretation
```

### **Main Dashboard Layout**
```
┌─────────────────────────────────────────────────────────┐
│ [🏠] School Management System    [🔔] [👤] [⚙️] [🚪]    │
├─────────────────────────────────────────────────────────┤
│ Welcome back, [Counselor Name] | Academic Year: 2024-2025│
│ School Guidance Counselor - Student Support & Wellness  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ⚠️ Note: Limited API endpoints available for this role  │
│ Contact administrator for full counselor features       │
│                                                         │
│ ┌─── Student Wellness Overview ───┐                     │
│ │ 👨‍🎓 Total Students: 1,245      📋 Active Cases: 15     │
│ │ 🔍 Students Needing Support: 23  📅 Appointments: 8    │
│ │ ⚠️ High Priority Cases: 3        📊 Success Rate: 87%  │
│ │ 📈 Monthly Interventions: 45     🎯 Follow-ups: 12     │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Today's Schedule ───┐        ┌─── Priority Cases ───┐│
│ │ 9:00 AM  - John Doe (Form 5A)  │ │ 🚨 Urgent Attention:   ││
│ │ 10:30 AM - Mary Smith (Form 3B) │ │ • Alice Brown (Form 3A)││
│ │ 2:00 PM  - Peter J. (Form 4A)  │ │   Behavioral concerns  ││
│ │ 3:30 PM  - Group Session       │ │ • David Jones (Form 4B)││
│ │ [View Full Schedule]            │ │   Academic stress      ││
│ │ [Add Appointment]               │ │ • Sarah W. (Form 2C)   ││
│ │                                │ │   Family issues        ││
│ │ Available: 11:00-12:00,        │ │ [Review All Cases]     ││
│ │           4:00-5:00 PM         │ │                        ││
│ └─────────────────────────────── │ └──────────────────────┘│
│                                                         │
│ ┌─── Recent Activities ───┐                             │
│ │ • Completed session with John Doe - Academic planning │
│ │ • Parent consultation for Mary Smith - Family support │
│ │ • Group therapy session - Stress management           │
│ │ • Teacher consultation - Classroom behavior strategies│
│ │ [View All Activities] [Add Activity] [Weekly Report]  │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Student Counseling Cases (`/counselor/students`)

#### **API Integration:**
```http
GET /api/v1/students
Authorization: Bearer {token}

Query Parameters:
?academicYearId=1&includeAcademicInfo=true&includeDiscipline=true&page=1&limit=50

Success Response (200):
{
  "success": true,
  "data": {
    "students": [
      {
        "id": 240,
        "name": "Alice Brown",
        "matricule": "STU2024015",
        "class": "Form 3A",
        "age": 15,
        "gender": "FEMALE",
        "parentContact": {
          "name": "Mrs. Brown",
          "phone": "+237677123456",
          "email": "brown.parent@email.com"
        },
        "academicInfo": {
          "currentAverage": 12.5,
          "attendanceRate": 78,
          "recentDecline": -2.3,
          "teacherConcerns": 3
        },
        "disciplineHistory": {
          "totalIssues": 5,
          "recentIssues": [
            {
              "date": "2024-01-22",
              "type": "CLASSROOM_MISCONDUCT",
              "description": "Disruptive behavior in class"
            },
            {
              "date": "2024-01-15", 
              "type": "LATENESS",
              "description": "Late arrival to school"
            }
          ],
          "pattern": "INCREASING_FREQUENCY"
        },
        "counselingInfo": {
          "hasActiveCases": true,
          "caseType": "BEHAVIORAL",
          "priority": "HIGH",
          "startDate": "2024-01-10",
          "sessionsCompleted": 3,
          "nextSession": "2024-01-25T14:00:00Z"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1245,
      "totalPages": 25
    },
    "summary": {
      "totalStudents": 1245,
      "studentsWithConcerns": 85,
      "activeCounselingCases": 15,
      "highPriorityCases": 3,
      "newReferrals": 6
    }
  }
}

GET /api/v1/students/:studentId
Authorization: Bearer {token}

Query Parameters:
?includeAcademicDetails=true&includeDisciplineHistory=true

Success Response (200):
{
  "success": true,
  "data": {
    "student": {
      "id": 240,
      "name": "Alice Brown",
      "matricule": "STU2024015",
      "class": "Form 3A",
      "age": 15,
      "dateOfBirth": "2008-05-15",
      "gender": "FEMALE",
      "address": "123 Main Street, Douala",
      "parentInfo": {
        "id": 269,
        "name": "Mrs. Brown",
        "phone": "+237677123456",
        "email": "brown.parent@email.com",
        "relationship": "MOTHER"
      }
    },
    "academicDetails": {
      "currentAverage": 12.5,
      "previousAverage": 14.8,
      "attendanceRate": 78,
      "totalAbsences": 12,
      "subjectPerformance": [
        {
          "subject": "Mathematics",
          "currentMark": 14.5,
          "trend": "STABLE"
        },
        {
          "subject": "English",
          "currentMark": 11.2,
          "trend": "DECLINING"
        }
      ],
      "teacherComments": [
        {
          "teacher": "Math Teacher",
          "subject": "Mathematics", 
          "comment": "Shows potential but needs more focus",
          "date": "2024-01-20"
        }
      ]
    },
    "disciplineHistory": {
      "totalIncidents": 5,
      "incidentsByType": {
        "LATENESS": 2,
        "CLASSROOM_MISCONDUCT": 2,
        "UNIFORM_VIOLATION": 1
      },
      "recentIncidents": [
        {
          "id": 123,
          "date": "2024-01-22",
          "type": "CLASSROOM_MISCONDUCT",
          "description": "Disruptive behavior during physics class",
          "actionTaken": "Warning issued",
          "reportedBy": "Physics Teacher"
        }
      ],
      "pattern": "Recent increase in behavioral issues",
      "riskLevel": "MEDIUM"
    }
  }
}

GET /api/v1/discipline-master/student-profile/:studentId
Authorization: Bearer {token}

Query Parameters:
?academicYearId=1&includeHistory=true

Success Response (200):
{
  "success": true,
  "data": {
    "studentInfo": {
      "id": 240,
      "name": "Alice Brown",
      "class": "Form 3A"
    },
    "disciplineProfile": {
      "totalIssues": 5,
      "severityBreakdown": {
        "LOW": 2,
        "MEDIUM": 2, 
        "HIGH": 1
      },
      "frequencyPattern": "INCREASING",
      "riskAssessment": "MEDIUM_RISK",
      "interventionsRecommended": [
        "Individual counseling sessions",
        "Parent conference",
        "Academic support plan"
      ]
    },
    "referralInfo": {
      "referredToCounselor": true,
      "referralDate": "2024-01-10",
      "referralReason": "Behavioral concerns and academic decline"
    }
  }
}
```

### **Student Cases Dashboard**
```
┌─── Student Counseling Cases ───┐
│ [Active Cases] [New Referrals] [Completed] [Search] [Reports] │
│                                                               │
│ ⚠️ API Limitation: Using general student endpoints            │
│ Full counselor features require additional API development    │
│                                                               │
│ ┌─── Case Management Filters ───┐                            │
│ │ Status: [Active ▼] [All] [Pending] [Completed]             │
│ │ Priority: [All ▼] [High] [Medium] [Low]                    │
│ │ Type: [All ▼] [Academic] [Behavioral] [Personal] [Family]  │
│ │ Class: [All ▼] [Form 1-6]                                  │
│ │ Date Range: [Last 30 days ▼]                               │
│ │ [Apply Filters] [Clear] [Export]                           │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─── Active Cases Requiring Attention ───┐                   │
│ │ Student Name    Class   Type        Priority  Last Session │
│ │ Alice Brown     3A      Behavioral  High      Jan 20      │
│ │ David Jones     4B      Academic    High      Jan 18      │
│ │ Sarah Williams  2C      Personal    Medium    Jan 22      │
│ │ Michael Smith   5A      Family      Medium    Jan 15      │
│ │ Lisa Davis      1B      Academic    Low       Jan 10      │
│ │                                                           │
│ │ [View All: 15 active cases] [Add New Case] [Bulk Actions] │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─── New Referrals This Week ───┐                            │
│ │ From Discipline Master: 3 students                         │
│ │ • Peter Johnson (Form 4A) - Behavioral issues             │
│ │ • Emma Wilson (Form 3C) - Repeated lateness               │
│ │ • James Brown (Form 5B) - Classroom disruption            │
│ │                                                           │
│ │ From Teachers: 2 students                                  │
│ │ • Maria Garcia (Form 2A) - Academic struggling            │
│ │ • Tom Davis (Form 6A) - Stress/anxiety                    │
│ │                                                           │
│ │ Self-Referrals: 1 student                                 │
│ │ • Anna Smith (Form 4C) - Personal counseling request      │
│ │                                                           │
│ │ [Review Referrals] [Accept All] [Schedule Assessments]     │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### **Individual Student Case** (`/counselor/students/:studentId`)
```
┌─── Student Case - Alice Brown ───┐
│ ⚠️ Using general student endpoint │
│ Limited counseling-specific data  │
│                                  │
│ ┌─── Student Information ───┐     │
│ │ Name: Alice Brown         │     │
│ │ Class: Form 3A            │     │
│ │ Age: 15 years             │     │
│ │ Matricule: STU2024015     │     │
│ │ Parent: Mrs. Brown        │     │
│ │ Contact: 677123456        │     │
│ └─────────────────────────┘     │
│                                  │
│ ┌─── Academic Overview ───┐       │
│ │ Current Average: 12.5/20  │     │
│ │ Attendance Rate: 78%      │     │
│ │ Recent Decline: -2.3 pts  │     │
│ │ Teachers' Concerns: 3     │     │
│ │ [View Academic Details]   │     │
│ └─────────────────────────┘     │
│                                  │
│ ┌─── Discipline History ───┐      │
│ │ Total Issues: 5 this term │     │
│ │ Recent Issues:            │     │
│ │ • Jan 22: Classroom misc. │     │
│ │ • Jan 15: Late arrival    │     │
│ │ • Jan 10: Uniform issues  │     │
│ │ Pattern: Increasing freq. │     │
│ │ [View Full History]       │     │
│ └─────────────────────────┘     │
│                                  │
│ ┌─── Counseling Notes ───┐        │
│ │ Case Type: Behavioral     │     │
│ │ Priority: High            │     │
│ │ Start Date: Jan 10, 2024  │     │
│ │ Sessions: 3 completed     │     │
│ │ Next Session: Jan 25, 2:00 PM │ │
│ │                           │     │
│ │ Progress Notes:           │     │
│ │ [Local storage/manual tracking] │ │
│ │ - Shows signs of stress   │     │
│ │ - Family situation complex│     │
│ │ - Responding to interventions│   │
│ │                           │     │
│ │ [Add Session Notes]       │     │
│ │ [Schedule Follow-up]      │     │
│ │ [Contact Parent]          │     │
│ └─────────────────────────┘     │
└────────────────────────────────────┘
```

## Counseling Sessions (`/counselor/sessions`)

#### **API Integration & Limitations:**
```http
// Note: The current API has limited support for counseling session management
// Most session data will need to be managed through local storage or manual tracking

// Available endpoints for related data:

GET /api/v1/messaging/dashboard
Authorization: Bearer {token}

Query Parameters:
?role=GUIDANCE_COUNSELOR&academicYearId=1

Success Response (200):
{
  "success": true,
  "data": {
    "messagingSummary": {
      "totalSent": 25,
      "totalReceived": 45,
      "unreadMessages": 5
    },
    "recentCommunications": [
      {
        "id": 1,
        "from": "Parent - Mrs. Brown",
        "subject": "Concern about Alice's behavior",
        "timestamp": "2024-01-22T10:00:00Z",
        "priority": "HIGH"
      }
    ]
  }
}

POST /api/v1/messaging/send
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "recipients": {
    "specificUsers": [269], // Parent ID
    "roles": ["TEACHER"],
    "academicYearId": 1
  },
  "message": {
    "subject": "Student Support Plan Update",
    "content": "Following our counseling session with Alice...",
    "priority": "MEDIUM",
    "type": "COUNSELING_UPDATE"
  }
}

// For session tracking, implement local storage solution:
// localStorage schema recommendation:
{
  "counselingSessions": [
    {
      "sessionId": "unique_session_id",
      "studentId": 240,
      "studentName": "Alice Brown",
      "date": "2024-01-22",
      "startTime": "09:00",
      "endTime": "09:45",
      "sessionType": "INDIVIDUAL",
      "status": "COMPLETED",
      "notes": "Student discussed academic challenges...",
      "goals": ["Improve study habits", "Reduce anxiety"],
      "followUpRequired": true,
      "nextSessionDate": "2024-01-25",
      "attachments": [],
      "parentInformed": true
    }
  ],
  "sessionTemplates": [
    {
      "type": "INITIAL_ASSESSMENT",
      "duration": 45,
      "questions": ["What brings you here today?", "How are things at home?"]
    }
  ]
}
```

### **Session Management**
*Note: This section requires custom local storage or manual tracking due to API limitations*

```
┌─── Counseling Sessions Management ───┐
│ [Today's Sessions] [Schedule] [Session Notes] [Follow-ups] │
│                                                            │
│ ⚠️ Session data requires local storage or manual tracking  │
│ API does not currently support counseling session records │
│                                                            │
│ ┌─── Today's Session Schedule ───┐                         │
│ │ Monday, January 22, 2024                                │
│ │                                                         │
│ │ 9:00-9:45 AM   Alice Brown (Individual)     [Start]    │
│ │ 10:00-10:45 AM David Jones (Academic)       [Start]    │
│ │ 11:00-11:45 AM Available Slot               [Book]     │
│ │ 2:00-2:45 PM   Peter Johnson (Initial)      [Prepare]  │
│ │ 3:00-4:00 PM   Group Session (5 students)   [Prepare]  │
│ │ 4:15-5:00 PM   Available Slot               [Book]     │
│ │                                                         │
│ │ [View Week] [Add Session] [Block Time] [Export Schedule] │
│ └─────────────────────────────────────────────────────────┘ │
│                                                            │
│ ┌─── Quick Session Actions ───┐                            │
│ │ [Start Session] - Begin timer and notes                 │
│ │ [Emergency Session] - Immediate intervention             │
│ │ [Group Session] - Multiple students                     │
│ │ [Parent Conference] - Family involvement                │
│ │ [Teacher Consultation] - Classroom strategies           │
│ │ [Assessment Session] - Initial evaluation               │
│ └─────────────────────────────────────────────────────────┘ │
│                                                            │
│ ┌─── Session Statistics ───┐                               │
│ │ This Week: 15 sessions completed                        │
│ │ Individual Sessions: 12                                 │
│ │ Group Sessions: 3                                       │
│ │ Average Session Length: 42 minutes                     │
│ │ No-shows: 1 (7% rate)                                  │
│ │ Follow-up Required: 8 students                          │
│ │ [Weekly Report] [Monthly Summary] [Export Data]         │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### **Session Notes Interface**
```
┌─── Session Notes - Alice Brown ───┐
│ Date: January 22, 2024             │
│ Time: 9:00-9:45 AM                 │
│ Session Type: Individual Counseling │
│ Session #: 4                       │
│                                    │
│ ┌─── Session Objectives ───┐        │
│ │ [☑️] Discuss recent behavioral incidents │
│ │ [☑️] Explore stress management techniques │
│ │ [☐] Family situation follow-up   │
│ │ [☐] Academic support planning    │
│ │ [Add Objective]                  │
│ └────────────────────────────────┘ │
│                                    │
│ ┌─── Session Notes ───┐             │
│ │ [Rich Text Editor]                │
│ │ Student arrived on time and       │
│ │ appeared more relaxed than        │
│ │ previous session. Discussed       │
│ │ the classroom incident from       │
│ │ yesterday. She acknowledged       │
│ │ her behavior and expressed        │
│ │ understanding of consequences...  │
│ │                                  │
│ │ Key Points:                      │
│ │ - Shows improvement in self-awareness │
│ │ - Family stress still a factor   │
│ │ - Responding well to coping strategies │
│ └────────────────────────────────┘ │
│                                    │
│ ┌─── Action Items ───┐              │
│ │ [☐] Practice breathing exercises  │
│ │ [☐] Complete stress journal       │
│ │ [☐] Schedule parent meeting       │
│ │ [☐] Follow up with class teacher  │
│ │ [Add Action Item]                 │
│ └────────────────────────────────┘ │
│                                    │
│ ┌─── Next Session ───┐              │
│ │ Recommended: 1 week               │
│ │ Focus: Family coping strategies   │
│ │ [Schedule Next] [Save Notes] [Close] │
│ └────────────────────────────────┘ │
└──────────────────────────────────────┘
```

## Student Support Programs (`/counselor/programs`)

### **Support Programs Dashboard**
```
┌─── Student Support Programs ───┐
│ [Group Programs] [Individual Plans] [Workshops] [Resources] │
│                                                            │
│ ┌─── Active Programs ───┐                                  │
│ │ 🧠 Stress Management Workshop                            │
│ │ Sessions: Wednesdays 3:00-4:00 PM                       │
│ │ Participants: 8 students                                │
│ │ Progress: Week 3 of 6                                   │
│ │ [Manage] [View Participants] [Add Students]             │
│ │ ────────────────────────────────────                    │
│ │ 📚 Academic Success Program                             │
│ │ Sessions: Individual & group combined                   │
│ │ Participants: 12 students                               │
│ │ Focus: Study skills & motivation                        │
│ │ [Manage] [Track Progress] [Add Students]                │
│ │ ────────────────────────────────────                    │
│ │ 👥 Social Skills Development                            │
│ │ Sessions: Fridays 2:00-3:00 PM                         │
│ │ Participants: 6 students                                │
│ │ Focus: Communication & conflict resolution              │
│ │ [Manage] [View Progress] [Add Students]                 │
│ └──────────────────────────────────────────────────────┘ │
│                                                            │
│ ┌─── Program Effectiveness ───┐                            │
│ │ Stress Management: 87% improvement rate                 │
│ │ Academic Success: 78% grade improvement                 │
│ │ Social Skills: 92% teacher-reported improvement         │
│ │ Overall Student Satisfaction: 91%                       │
│ │ [Detailed Analytics] [Success Stories] [Improvements]   │
│ └──────────────────────────────────────────────────────┘ │
│                                                            │
│ ┌─── Resource Library ───┐                                 │
│ │ 📖 Self-Help Guides: 15 available                       │
│ │ 🎥 Educational Videos: 8 resources                      │
│ │ 📝 Assessment Tools: 12 instruments                     │
│ │ 👨‍👩‍👧‍👦 Parent Resources: 6 guides                          │
│ │ 👨‍🏫 Teacher Resources: 10 strategies                      │
│ │ [Browse All] [Add Resource] [Usage Statistics]          │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## Communications (`/counselor/communications`)

### **Communication Center**
```
┌─── Counselor Communications ───┐
│ [Messages] [Parent Contacts] [Teacher Consultations] [Reports] │
│                                                                │
│ ⚠️ Using general messaging system - limited counselor features │
│                                                                │
│ ┌─── Quick Communication ───┐                                  │
│ │ To: [Select Recipient ▼]                                    │
│ │ • Student Parents                                           │
│ │ • Subject Teachers                                          │
│ │ • Class Masters                                             │
│ │ • Discipline Master                                         │
│ │ • Vice Principal                                            │
│ │ • Principal                                                 │
│ │                                                            │
│ │ Regarding: [Select Student ▼]                              │
│ │ Type: [Counseling Update ▼]                                │
│ │ • Progress Report  • Concern Alert                         │
│ │ • Success Story    • Referral Request                      │
│ │ • Parent Meeting   • Strategy Suggestion                   │
│ │                                                            │
│ │ Subject: [Text Input]                                      │
│ │ Message: [Text Area with templates]                        │
│ │ Confidentiality: [Standard ●] [High ○] [Restricted ○]     │
│ │                                                            │
│ │ [Send Message] [Save Template] [Schedule Send]             │
│ └──────────────────────────────────────────────────────────┘ │
│                                                                │
│ ┌─── Recent Communications ───┐                                │
│ │ Jan 22 - Mrs. Brown (Alice's mother)                        │
│ │ Subject: Progress update and home support strategies        │
│ │ Status: Sent ✅ | Response: Awaiting                        │
│ │                                                            │
│ │ Jan 21 - Mr. Johnson (Mathematics teacher)                  │
│ │ Subject: Classroom strategies for David Jones              │
│ │ Status: Read ✅ | Response: Implemented                     │
│ │                                                            │
│ │ Jan 20 - SDM (Discipline Master)                           │
│ │ Subject: Behavioral intervention plan for Peter            │
│ │ Status: Collaborative plan in progress                      │
│ │ [View All] [Follow Up] [Archive]                           │
│ └──────────────────────────────────────────────────────────┘ │
│                                                                │
│ ┌─── Consultation Requests ───┐                                │
│ │ From Teachers: 3 pending                                    │
│ │ • Mrs. Davis: Classroom behavior strategies needed          │
│ │ • Mr. Wilson: Student motivation techniques                 │
│ │ • Ms. Garcia: Dealing with anxious student                 │
│ │                                                            │
│ │ From Parents: 2 pending                                     │
│ │ • Home support for academic difficulties                   │
│ │ • Family counseling session request                        │
│ │                                                            │
│ │ [Respond to Requests] [Schedule Consultations] [Priority]   │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## Reports & Documentation (`/counselor/reports`)

### **Counseling Reports Dashboard**
```
┌─── Counseling Reports & Documentation ───┐
│ [Student Progress] [Program Effectiveness] [Monthly Summary] │
│                                                             │
│ ⚠️ Limited reporting due to API constraints                 │
│ Manual data collection and local storage required          │
│                                                             │
│ ┌─── Report Generation ───┐                                 │
│ │ Report Type: [Student Progress ▼]                        │
│ │ • Individual Student Progress                             │
│ │ • Group Program Effectiveness                            │
│ │ • Monthly Counseling Summary                             │
│ │ • Referral Tracking Report                               │
│ │ • Intervention Outcomes                                  │
│ │ • Resource Utilization                                   │
│ │                                                          │
│ │ Date Range: [Jan 1 - Jan 22, 2024]                      │
│ │ Include: [☑️] Confidential data [☐] Sensitive details    │
│ │ Recipients: [Principal ▼] [VP] [Parents] [Teachers]      │
│ │                                                          │
│ │ [Generate Report] [Preview] [Schedule Regular]           │
│ └───────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─── Monthly Summary (January 2024) ───┐                    │
│ │ Total Students Served: 23                               │
│ │ New Cases: 8 | Ongoing: 15 | Completed: 6              │
│ │ Individual Sessions: 45                                 │
│ │ Group Sessions: 12                                      │
│ │ Parent Consultations: 8                                 │
│ │ Teacher Consultations: 15                               │
│ │ Emergency Interventions: 3                              │
│ │ Success Rate: 87%                                       │
│ │ [Detailed Breakdown] [Export] [Share with Admin]        │
│ └───────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─── Documentation Requirements ───┐                        │
│ │ 📋 Session notes: 42 completed                          │
│ │ 📝 Progress reports: 8 due this week                    │
│ │ 📊 Outcome assessments: 5 pending                       │
│ │ 📧 Parent communications: All current                   │
│ │ 🔒 Confidentiality forms: Up to date                    │
│ │ [Review Documentation] [Update Forms] [Compliance Check] │
│ └───────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

## Navigation Structure

### **Main Navigation**
```
🏠 Dashboard | 👨‍🎓 Students | 📅 Sessions | 🎯 Programs | 📧 Communications | 📊 Reports | ⚙️ Resources
```

### **Quick Actions**
```
⚡ Counselor Actions:
• [Emergency Session]
• [Quick Notes]
• [Contact Parent]
• [Refer Student]
• [Schedule Session]
• [Resource Lookup]
```

### **Mobile Navigation**
```
[🏠 Home] [👨‍🎓 Students] [📅 Sessions] [📧 Messages] [📊 Reports]
```

## API Limitations & Workarounds:

### **Current Limitations:**
1. **No Counseling Session API** - Requires local storage or manual tracking
2. **Limited Counseling Records** - No specialized counseling database tables
3. **No Program Management API** - Manual program tracking needed
4. **Basic Communication** - Uses general messaging system

### **Recommended Workarounds:**
1. **Local Storage** - Use browser storage for session notes and progress tracking
2. **Integration with Existing APIs** - Leverage student and discipline data
3. **Manual Documentation** - External tools for detailed counseling records
4. **Collaboration Tools** - Work with SDM and VP for comprehensive student support

## Key Features for Guidance Counselor MVP:

### **Student Support:**
1. **Case Management** - Track students needing counseling support
2. **Session Scheduling** - Manage counseling appointments
3. **Progress Monitoring** - Track student improvement and outcomes
4. **Crisis Intervention** - Emergency counseling and support

### **Collaboration:**
1. **Staff Communication** - Coordinate with teachers and administrators
2. **Parent Engagement** - Regular updates and home support strategies
3. **Referral Management** - Handle referrals from teachers and SDM
4. **Resource Sharing** - Provide tools and strategies to stakeholders

### **Program Management:**
1. **Group Programs** - Organize and run group counseling sessions
2. **Workshop Planning** - Educational and therapeutic workshops
3. **Resource Library** - Maintain counseling tools and materials
4. **Outcome Tracking** - Monitor program effectiveness

## Critical UX Principles:

1. **Confidentiality** - Secure handling of sensitive student information
2. **Accessibility** - Easy access to student data and communication tools
3. **Efficiency** - Quick session notes and progress tracking
4. **Collaboration** - Seamless integration with other school roles
5. **Documentation** - Comprehensive record keeping for compliance
6. **Crisis Response** - Rapid access to emergency protocols
7. **Resource Management** - Easy access to counseling tools and materials
