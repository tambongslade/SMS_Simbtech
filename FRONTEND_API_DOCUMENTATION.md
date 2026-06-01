# Frontend API Documentation - Messaging & Announcements System

## 🎯 Overview

This documentation provides comprehensive guidance for frontend developers implementing the School Management System's messaging and announcement features. The system uses **role-based permissions** and **in-app notifications** for seamless communication between staff and parents.

## 🔐 Authentication & Authorization

### **Authentication Header**
All API requests require authentication:
```http
Authorization: Bearer <jwt_token>
```

### **User Roles & Permissions**

| Role | Prefix | Announcements | Messaging | Notifications |
|------|--------|---------------|-----------|---------------|
| `SUPER_MANAGER` | CEO | ✅ Create/Read | ✅ Send/Receive | ✅ All |
| `MANAGER` | SA | ✅ Create/Read | ✅ Send/Receive | ✅ All |
| `PRINCIPAL` | SA | ✅ Create/Read | ✅ Send/Receive | ✅ All |
| `VICE_PRINCIPAL` | SA | ✅ Create/Read | ✅ Send/Receive | ✅ All |
| `BURSAR` | SA | ❌ Read Only | ✅ Send/Receive | ✅ Own |
| `TEACHER` | ST | ❌ Read Only | ✅ Send/Receive | ✅ Own |
| `DISCIPLINE_MASTER` | SDM | ❌ Read Only | ✅ Send/Receive | ✅ Own |
| `GUIDANCE_COUNSELOR` | SO | ❌ Read Only | ✅ Send/Receive | ✅ Own |
| `PARENT` | SO | ❌ Read Only | ✅ Send/Receive | ✅ Own |
| `HOD` | ST | ❌ Read Only | ✅ Send/Receive | ✅ Own |

**Admin Staff** = `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`

---

## 📢 ANNOUNCEMENTS API

### **1. Create Announcement** *(Admin Only)*

**Endpoint:** `POST /api/v1/communications/announcements`

**Permission:** Admin staff only (`SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`)

**Request Body:**
```json
{
  "title": "Important School Notice",
  "message": "School will be closed tomorrow due to maintenance work.",
  "audience": "BOTH",
  "academicYearId": 2024
}
```

**Field Descriptions:**
- `title` *(required)*: Announcement title (max 200 chars)
- `message` *(required)*: Announcement content (max 1000 chars)
- `audience` *(required)*: Target audience
  - `"INTERNAL"` - All staff members only
  - `"EXTERNAL"` - All parents only  
  - `"BOTH"` - All staff and parents
- `academicYearId` *(optional)*: Academic year ID (defaults to current year)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "Important School Notice",
    "message": "School will be closed tomorrow...",
    "audience": "BOTH",
    "academicYearId": 2024,
    "createdById": 456,
    "datePosted": "2024-01-15T08:30:00.000Z",
    "createdAt": "2024-01-15T08:30:00.000Z",
    "updatedAt": "2024-01-15T08:30:00.000Z"
  }
}
```

**Auto-Triggered Actions:**
- ✅ In-app notifications sent to all targeted users
- ✅ Notification count updated for recipients
- ✅ Real-time notification delivery

### **2. Get Announcements**

**Endpoint:** `GET /api/v1/communications/announcements`

**Permission:** All authenticated users

**Query Parameters:**
```http
GET /api/v1/communications/announcements?page=1&limit=10&academicYearId=2024
```

- `page` *(optional)*: Page number (default: 1)
- `limit` *(optional)*: Items per page (default: 10, max: 50)
- `academicYearId` *(optional)*: Filter by academic year (default: current year)

**Response:**
```json
{
  "success": true,
  "data": {
    "announcements": [
      {
        "id": 123,
        "title": "Important School Notice",
        "message": "School will be closed tomorrow...",
        "audience": "BOTH",
        "datePosted": "2024-01-15T08:30:00.000Z",
        "createdBy": {
          "id": 456,
          "name": "John Principal",
          "role": "PRINCIPAL"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 25,
      "itemsPerPage": 10
    }
  }
}
```

### **3. Get Single Announcement**

**Endpoint:** `GET /api/v1/communications/announcements/:id`

**Permission:** All authenticated users

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "Important School Notice",
    "message": "School will be closed tomorrow due to maintenance work.",
    "audience": "BOTH",
    "academicYearId": 2024,
    "datePosted": "2024-01-15T08:30:00.000Z",
    "createdBy": {
      "id": 456,
      "name": "John Principal",
      "role": "PRINCIPAL"
    },
    "academicYear": {
      "id": 2024,
      "name": "2024-2025",
      "isCurrent": true
    }
  }
}
```

---

## 💬 MESSAGING API

### **1. Send Simple Message**

**Endpoint:** `POST /api/v1/messaging/simple/send`

**Permission:** All authenticated users

**Request Body:**
```json
{
  "receiverId": 789,
  "subject": "Student Absence Notification",
  "content": "My child John will be absent tomorrow due to a medical appointment.",
  "category": "ACADEMIC"
}
```

**Field Descriptions:**
- `receiverId` *(required)*: ID of the message recipient
- `subject` *(required)*: Message subject (max 200 chars)
- `content` *(required)*: Message content (max 1000 chars)
- `category` *(required)*: Message category
  - `"ACADEMIC"` - Academic matters, performance, homework
  - `"FINANCIAL"` - Fee payments, financial concerns
  - `"DISCIPLINARY"` - Behavior issues, disciplinary actions
  - `"GENERAL"` - General communication

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 456,
    "senderId": 123,
    "receiverId": 789,
    "subject": "Student Absence Notification",
    "content": "My child John will be absent tomorrow...",
    "category": "ACADEMIC",
    "status": "SENT",
    "createdAt": "2024-01-15T10:15:00.000Z",
    "sender": {
      "id": 123,
      "name": "Mary Parent",
      "role": "PARENT"
    },
    "receiver": {
      "id": 789,
      "name": "Jane Teacher",
      "role": "TEACHER"
    }
  }
}
```

**Auto-Triggered Actions:**
- ✅ In-app notification sent to recipient
- ✅ Recipient's notification count updated

### **2. Get Messages**

**Endpoint:** `GET /api/v1/messaging/simple/messages`

**Permission:** All authenticated users (can only see own messages)

**Query Parameters:**
```http
GET /api/v1/messaging/simple/messages?type=inbox&page=1&limit=20&category=ACADEMIC
```

- `type` *(optional)*: Message type
  - `"inbox"` - Received messages (default)
  - `"sent"` - Sent messages
- `page` *(optional)*: Page number (default: 1)
- `limit` *(optional)*: Items per page (default: 20, max: 50)
- `category` *(optional)*: Filter by category (`ACADEMIC`, `FINANCIAL`, `DISCIPLINARY`, `GENERAL`)

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": 456,
        "from": "Mary Parent",
        "to": "Jane Teacher",
        "subject": "Student Absence Notification",
        "content": "My child John will be absent tomorrow...",
        "category": "ACADEMIC",
        "date": "2024-01-15T10:15:00.000Z",
        "isRead": false,
        "senderRole": "PARENT",
        "receiverRole": "TEACHER"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalItems": 35,
      "itemsPerPage": 20
    },
    "summary": {
      "totalUnread": 5,
      "categoryCounts": {
        "ACADEMIC": 15,
        "FINANCIAL": 8,
        "DISCIPLINARY": 2,
        "GENERAL": 10
      }
    }
  }
}
```

### **3. Get Available Contacts**

**Endpoint:** `GET /api/v1/messaging/simple/contacts`

**Permission:** All authenticated users

**Query Parameters:**
```http
GET /api/v1/messaging/simple/contacts?role=TEACHER&search=john
```

- `role` *(optional)*: Filter by user role
- `search` *(optional)*: Search by name

**Response:**
```json
{
  "success": true,
  "data": {
    "contacts": [
      {
        "id": 789,
        "name": "Jane Teacher",
        "role": "TEACHER",
        "subjects": ["Mathematics", "Physics"],
        "canMessage": true,
        "lastMessageDate": "2024-01-10T14:20:00.000Z"
      },
      {
        "id": 234,
        "name": "John Principal",
        "role": "PRINCIPAL", 
        "canMessage": true,
        "lastMessageDate": null
      }
    ],
    "groups": {
      "ADMIN_STAFF": 4,
      "TEACHERS": 25,
      "PARENTS": 150,
      "OTHER_STAFF": 8
    }
  }
}
```

### **4. Mark Message as Read**

**Endpoint:** `PATCH /api/v1/messaging/simple/messages/:id/read`

**Permission:** Message recipient only

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 456,
    "isRead": true,
    "readAt": "2024-01-15T11:30:00.000Z"
  }
}
```

### **5. Delete Message**

**Endpoint:** `DELETE /api/v1/messaging/simple/messages/:id`

**Permission:** Message sender or recipient

**Description:**
This performs a "soft delete". The message is hidden from the user's view but not immediately deleted from the database. It is permanently removed only after both the sender and receiver have deleted it.

**Response:**
```json
{
  "success": true,
  "message": "Message has been removed from your view."
}
```
---

## 🔔 NOTIFICATIONS API

### **1. Get User Notifications**

**Endpoint:** `GET /api/v1/notifications/me`

**Permission:** All authenticated users (own notifications only)

**Query Parameters:**
```http
GET /api/v1/notifications/me?page=1&limit=30&status=SENT
```

- `page` *(optional)*: Page number (default: 1)
- `limit` *(optional)*: Items per page (default: 30, max: 100)
- `status` *(optional)*: Filter by status (`SENT`, `DELIVERED`, `READ`)

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": 789,
        "message": "New Announcement: Important School Notice\n\nSchool will be closed tomorrow...",
        "status": "SENT",
        "dateSent": "2024-01-15T08:30:00.000Z",
        "type": "ANNOUNCEMENT",
        "relatedId": 123
      },
      {
        "id": 790,
        "message": "New message from Mary Parent: Student Absence Notification",
        "status": "READ",
        "dateSent": "2024-01-15T10:15:00.000Z",
        "type": "MESSAGE",
        "relatedId": 456
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 142,
      "itemsPerPage": 30
    },
    "summary": {
      "totalUnread": 8,
      "totalNotifications": 142
    }
  }
}
```

### **2. Get Unread Notification Count**

**Endpoint:** `GET /api/v1/notifications/me/unread-count`

**Permission:** All authenticated users

**Response:**
```json
{
  "success": true,
  "data": {
    "unreadCount": 8,
    "breakdown": {
      "announcements": 3,
      "messages": 5
    }
  }
}
```

### **3. Mark Notification as Read**

**Endpoint:** `PUT /api/v1/notifications/:id/read`

**Permission:** Notification owner only

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 789,
    "status": "READ",
    "readAt": "2024-01-15T12:00:00.000Z"
  }
}
```

### **4. Mark All Notifications as Read**

**Endpoint:** `PUT /api/v1/notifications/mark-all-read`

**Permission:** All authenticated users

**Response:**
```json
{
  "success": true,
  "data": {
    "markedCount": 8,
    "message": "All notifications marked as read"
  }
}
```

### **5. Delete Notification**

**Endpoint:** `DELETE /api/v1/notifications/:id`

**Permission:** Notification owner only

**Response:**
```json
{
  "success": true,
  "message": "Notification deleted successfully."
}
```

---

## 🎨 Frontend Implementation Guide

### **Role-Based UI Components**

```typescript
// Example: Conditional rendering based on user role
const canCreateAnnouncements = ['SUPER_MANAGER', 'MANAGER', 'PRINCIPAL', 'VICE_PRINCIPAL'].includes(userRole);

if (canCreateAnnouncements) {
  return <CreateAnnouncementButton />;
}
```

### **Message Categories UI**

```typescript
const MESSAGE_CATEGORIES = [
  { value: 'ACADEMIC', label: 'Academic', icon: '📚', color: 'blue' },
  { value: 'FINANCIAL', label: 'Financial', icon: '💰', color: 'green' },
  { value: 'DISCIPLINARY', label: 'Disciplinary', icon: '⚠️', color: 'red' },
  { value: 'GENERAL', label: 'General', icon: '💬', color: 'gray' }
];
```

### **Real-time Notifications**

```typescript
// Example: Polling for new notifications
useEffect(() => {
  const interval = setInterval(async () => {
    const response = await fetch('/api/v1/notifications/me/unread-count', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const { data } = await response.json();
    setUnreadCount(data.unreadCount);
  }, 30000); // Poll every 30 seconds

  return () => clearInterval(interval);
}, [token]);
```

### **Audience Targeting (Admin Only)**

```typescript
const AUDIENCE_OPTIONS = [
  { 
    value: 'INTERNAL', 
    label: 'Staff Only', 
    description: 'All teachers and administrative staff',
    icon: '👥'
  },
  { 
    value: 'EXTERNAL', 
    label: 'Parents Only', 
    description: 'All parents and guardians',
    icon: '👨‍👩‍👧‍👦'
  },
  { 
    value: 'BOTH', 
    label: 'Everyone', 
    description: 'All staff, teachers, and parents',
    icon: '🌍'
  }
];
```

---

## ⚠️ Error Handling

### **Common Error Responses**

```json
// Unauthorized (401)
{
  "success": false,
  "error": "User not authenticated"
}

// Forbidden (403)
{
  "success": false,
  "error": "Insufficient permissions to create announcements"
}

// Validation Error (400)
{
  "success": false,
  "error": "Title and message are required",
  "details": {
    "title": "Title is required",
    "message": "Message cannot be empty"
  }
}

// Not Found (404)
{
  "success": false,
  "error": "Announcement not found"
}

// Server Error (500)
{
  "success": false,
  "error": "Internal server error"
}
```

### **Frontend Error Handling Example**

```typescript
try {
  const response = await fetch('/api/v1/communications/announcements', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(announcementData)
  });

  const result = await response.json();

  if (!result.success) {
    if (response.status === 403) {
      showError('You do not have permission to create announcements');
    } else if (response.status === 400) {
      showValidationErrors(result.details);
    } else {
      showError(result.error);
    }
    return;
  }

  showSuccess('Announcement created successfully!');
  // Refresh announcements list
  refetchAnnouncements();

} catch (error) {
  showError('Network error. Please check your connection.');
}
```

---

## 🔄 Data Flow Examples

### **Creating an Announcement Flow**

1. **Admin user** fills announcement form
2. **Frontend** validates input and sends POST request
3. **Backend** creates announcement in database
4. **Backend** automatically identifies target users based on audience
5. **Backend** creates in-app notifications for all target users
6. **Frontend** shows success message and refreshes announcement list
7. **Target users** see notification count update in real-time

### **Sending a Message Flow**

1. **User** selects recipient from contacts
2. **User** chooses category and writes message
3. **Frontend** sends POST request to messaging endpoint
4. **Backend** creates message and sends notification to recipient
5. **Frontend** shows success and adds message to sent items
6. **Recipient** sees notification count increase
7. **Recipient** can read message in their inbox

---

## 📱 Mobile-Friendly Considerations

### **Responsive Design Tips**
- Use bottom sheets for message composition on mobile
- Implement pull-to-refresh for notification updates
- Add swipe actions for marking messages as read
- Use infinite scroll for long message lists

### **Offline Support**
- Cache recent notifications locally
- Show cached data when offline
- Queue messages to send when connection restored
- Display offline status clearly to users

---

## 🚀 Performance Optimizations

### **Frontend Optimizations**
- Implement pagination for all list views
- Use virtual scrolling for large message lists
- Cache contact lists locally
- Debounce search inputs
- Lazy load message content

### **API Usage Best Practices**
- Limit API calls with reasonable polling intervals
- Use page sizes appropriate for device screen size
- Implement efficient caching strategies
- Handle rate limiting gracefully

---

This documentation provides everything needed to implement the messaging and announcement system frontend. The system is designed to be simple and intuitive for older users while providing all necessary functionality for school communication management. 