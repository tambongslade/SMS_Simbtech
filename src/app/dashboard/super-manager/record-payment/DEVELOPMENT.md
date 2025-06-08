# Record Payment - Development Guide

## Project Structure

```
src/app/dashboard/super-manager/record-payment/
├── page.tsx                          # Main page component
├── components/
│   ├── RecordPaymentForm.tsx         # Payment form component
│   └── PaymentRecordModal.tsx        # Modal wrapper component
├── utils/
│   └── matriculeGenerator.ts         # Utility functions for matricule generation
├── demo/
│   └── sampleData.ts                 # Sample data for testing
├── README.md                         # Feature documentation
├── DEVELOPMENT.md                    # This file
└── test-scenarios.md                 # Testing guidelines
```

## Development Setup

### 1. Prerequisites
- Node.js and npm/yarn installed
- Next.js project setup
- Tailwind CSS configured
- Heroicons installed
- React Hot Toast installed

### 2. Dependencies Used
```json
{
  "@heroicons/react": "^2.0.0",
  "react-hot-toast": "^2.0.0",
  "react": "^18.0.0",
  "next": "^14.0.0"
}
```

### 3. Environment Variables
Ensure these are set in your `.env.local`:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
```

## Development Workflow

### 1. Running the Development Server
```bash
npm run dev
# or
yarn dev
```

### 2. Accessing the Feature
Navigate to: `http://localhost:3000/dashboard/super-manager/record-payment`

### 3. Testing with Mock Data
To test without a backend, you can temporarily replace the API calls with mock data:

```typescript
// In page.tsx, replace apiService calls with mockApiService
import { mockApiService } from './demo/sampleData';

// Replace:
const result = await apiService.get('/students');
// With:
const result = await mockApiService.get('/students');
```

## Code Architecture

### 1. State Management
- Uses React hooks (useState, useEffect)
- Local component state for form data
- Centralized state in main page component

### 2. API Integration
- Uses centralized `apiService` from `src/lib/apiService.ts`
- Consistent error handling with toast notifications
- Loading states for better UX

### 3. Form Validation
- Client-side validation with immediate feedback
- Required field validation
- Data type validation (numbers, dates)
- Custom validation rules

### 4. Component Communication
- Props drilling for simple data flow
- Callback functions for event handling
- Modal state managed by parent component

## Key Features Implementation

### 1. Student Search
```typescript
// Autocomplete search with filtering
const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.matricule?.toLowerCase().includes(searchTerm.toLowerCase())
);
```

### 2. Matricule Generation
```typescript
// Unique payment identifier
export function generatePaymentMatricule(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PAY${timestamp}${random}`;
}
```

### 3. Form Validation
```typescript
// Validation with error state
const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.studentId) {
        newErrors.studentId = 'Please select a student';
    }
    // ... more validations
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
};
```

## Styling Guidelines

### 1. Tailwind CSS Classes
- Use consistent spacing: `p-4`, `m-4`, `space-y-4`
- Color scheme: `bg-white`, `text-gray-900`, `border-gray-300`
- Interactive states: `hover:bg-gray-50`, `focus:ring-blue-500`

### 2. Responsive Design
- Mobile-first approach
- Use responsive prefixes: `sm:`, `md:`, `lg:`
- Ensure touch-friendly button sizes

### 3. Accessibility
- Proper ARIA labels
- Keyboard navigation support
- Screen reader compatibility
- Color contrast compliance

## API Endpoints

### 1. Students Endpoint
```
GET /api/v1/students
Response: {
  data: [
    {
      id: number,
      name: string,
      matricule: string,
      class: {
        id: number,
        name: string
      }
    }
  ]
}
```

### 2. Payments Endpoint
```
GET /api/v1/payments
POST /api/v1/payments

POST Body: {
  student_id: number,
  bank: string,
  date_paid: string,
  amount_paid: number,
  payment_matricule: string,
  payment_reference?: string
}
```

## Common Development Tasks

### 1. Adding New Bank
1. Update `BANKS` array in `page.tsx`
2. Add bank option to form dropdown
3. Update type definitions if needed

### 2. Modifying Form Fields
1. Update form state in `RecordPaymentForm.tsx`
2. Add validation rules
3. Update API payload structure
4. Update TypeScript types

### 3. Changing Matricule Format
1. Modify `generatePaymentMatricule` function
2. Update validation in `isValidPaymentMatricule`
3. Update display formatting if needed

### 4. Adding New Validation
1. Add validation logic to `validateForm` function
2. Add error state to component state
3. Display error message in UI

## Debugging Tips

### 1. Common Issues
- **Modal not opening**: Check state management and button click handlers
- **Form not submitting**: Verify validation logic and API endpoints
- **Search not working**: Check filtering logic and state updates
- **Styling issues**: Verify Tailwind classes and responsive design

### 2. Debug Tools
- React Developer Tools
- Browser Network tab for API calls
- Console logs for state debugging
- Toast notifications for user feedback

### 3. Testing Strategies
- Test with different screen sizes
- Test form validation edge cases
- Test API error scenarios
- Test with large datasets

## Performance Considerations

### 1. Optimization Techniques
- Debounce search input for better performance
- Lazy load large student lists
- Memoize expensive calculations
- Optimize re-renders with React.memo

### 2. Bundle Size
- Import only needed Heroicons
- Use dynamic imports for large components
- Optimize images and assets

## Security Considerations

### 1. Input Validation
- Sanitize all user inputs
- Validate data types and ranges
- Prevent XSS attacks

### 2. API Security
- Validate user permissions
- Use HTTPS for all API calls
- Implement rate limiting

## Future Enhancements

### 1. Planned Features
- Payment editing functionality
- Bulk payment import
- Payment receipt generation
- Advanced search filters
- Export functionality

### 2. Technical Improvements
- Add unit tests
- Implement caching
- Add offline support
- Improve error handling

## Troubleshooting

### 1. Build Issues
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### 2. TypeScript Errors
- Check import paths
- Verify type definitions
- Update TypeScript configuration

### 3. Styling Issues
- Verify Tailwind CSS configuration
- Check for conflicting styles
- Test in different browsers
