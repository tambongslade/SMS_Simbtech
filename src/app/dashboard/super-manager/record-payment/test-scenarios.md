# Record Payment - Test Scenarios

## Manual Testing Checklist

### 1. Navigation Test
- [ ] Navigate to `/dashboard/super-manager/record-payment`
- [ ] Verify page loads without errors
- [ ] Check that "Record Payment" appears in sidebar navigation
- [ ] Verify BanknotesIcon displays correctly in navigation

### 2. Page Load Test
- [ ] Verify page title displays "Record Payment"
- [ ] Check that search input is visible
- [ ] Verify "Record Payment" button is present
- [ ] Confirm payment records table loads (even if empty)

### 3. Modal Functionality
- [ ] Click "Record Payment" button
- [ ] Verify modal opens correctly
- [ ] Check all form fields are present:
  - [ ] Student search input
  - [ ] Bank dropdown
  - [ ] Date paid input
  - [ ] Amount paid input
  - [ ] Payment reference input (optional)
- [ ] Verify "Cancel" button closes modal
- [ ] Test clicking outside modal closes it

### 4. Student Search Test
- [ ] Type in student search field
- [ ] Verify dropdown appears with filtered results
- [ ] Select a student from dropdown
- [ ] Verify student name populates in field
- [ ] Test clearing search field

### 5. Bank Selection Test
- [ ] Click bank dropdown
- [ ] Verify all three banks appear:
  - [ ] Express Union
  - [ ] CCA Bank
  - [ ] 3DC Bank
- [ ] Select each bank option
- [ ] Verify selection updates correctly

### 6. Date Validation Test
- [ ] Try selecting future date (should be prevented)
- [ ] Select today's date (should work)
- [ ] Select past date (should work)
- [ ] Leave date empty and submit (should show error)

### 7. Amount Validation Test
- [ ] Enter negative amount (should show error)
- [ ] Enter zero amount (should show error)
- [ ] Enter valid positive amount (should work)
- [ ] Leave amount empty (should show error)
- [ ] Enter non-numeric value (should be prevented)

### 8. Form Validation Test
- [ ] Submit empty form (should show all required field errors)
- [ ] Fill only student field (should show other required errors)
- [ ] Fill all required fields (should allow submission)
- [ ] Verify error messages are clear and helpful

### 9. Payment Submission Test
- [ ] Fill all required fields correctly
- [ ] Submit form
- [ ] Verify loading state appears
- [ ] Check for success toast message
- [ ] Verify modal closes after successful submission
- [ ] Confirm new payment appears in table

### 10. Payment Matricule Test
- [ ] Submit multiple payments
- [ ] Verify each gets unique matricule
- [ ] Check matricule format: PAY + numbers
- [ ] Ensure no duplicate matricules

### 11. Search Functionality Test
- [ ] Enter student name in main search
- [ ] Verify table filters correctly
- [ ] Search by matricule
- [ ] Search by payment matricule
- [ ] Test partial matches

### 12. Responsive Design Test
- [ ] Test on mobile device/small screen
- [ ] Verify modal is responsive
- [ ] Check table scrolls horizontally if needed
- [ ] Ensure all buttons are accessible

### 13. Error Handling Test
- [ ] Disconnect internet and try to submit
- [ ] Verify appropriate error message
- [ ] Test with invalid API responses
- [ ] Check loading states during errors

### 14. Data Display Test
- [ ] Verify payment records display correctly
- [ ] Check currency formatting (FCFA)
- [ ] Verify date formatting
- [ ] Test with long student names
- [ ] Check bank name display

## API Testing

### 1. Students Endpoint
```bash
# Test students fetch
GET /api/v1/students
```

### 2. Payments Endpoint
```bash
# Test payments fetch
GET /api/v1/fees/:feeId/payments

# Test payment creation
POST /api/v1/fees/:feeId/payments
Content-Type: application/json

{
  "amount": 50000,
  "paymentDate": "2024-01-15",
  "receiptNumber": "RCP123456789",
  "paymentMethod": "CASH",
  "studentId": 1,
  "academicYearId": 2024
}
```

## Performance Testing

### 1. Large Dataset Test
- [ ] Test with 100+ students in dropdown
- [ ] Test with 100+ payment records
- [ ] Verify search performance
- [ ] Check table rendering performance

### 2. Network Conditions
- [ ] Test on slow network
- [ ] Test with network interruptions
- [ ] Verify timeout handling

## Browser Compatibility

### Test in Multiple Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (if available)
- [ ] Edge (latest)

## Accessibility Testing

### 1. Keyboard Navigation
- [ ] Tab through all form fields
- [ ] Use Enter to submit form
- [ ] Use Escape to close modal
- [ ] Navigate dropdown with arrow keys

### 2. Screen Reader
- [ ] Test with screen reader if available
- [ ] Verify form labels are read correctly
- [ ] Check error messages are announced

## Security Testing

### 1. Input Validation
- [ ] Test XSS prevention in text fields
- [ ] Verify SQL injection protection
- [ ] Test with malformed data

### 2. Authorization
- [ ] Verify only super-manager can access
- [ ] Test with different user roles
- [ ] Check API endpoint security

## Expected Results

### Success Criteria
- All form validations work correctly
- Payment records are created successfully
- Unique matricules are generated
- Search functionality works
- Responsive design functions properly
- Error handling is graceful
- Loading states provide good UX

### Common Issues to Watch For
- Dropdown not closing properly
- Form validation not triggering
- API errors not handled gracefully
- Modal not responsive on mobile
- Search not filtering correctly
- Duplicate matricules generated
