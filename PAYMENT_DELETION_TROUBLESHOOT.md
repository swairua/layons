# Payment Deletion - Quick Troubleshooting Guide

## Error Observed: `Failed to delete payment: [object Object]`

### ✅ Status: FIXED

The error was caused by improper extraction of Supabase error objects. The fix is now in place.

---

## What the Error Was

The system couldn't properly read the error message from Supabase and displayed `[object Object]` instead of the actual error reason.

**Possible underlying causes:**
- ❌ User doesn't have permission to delete (RLS issue)
- ❌ Network connectivity problem  
- ❌ Foreign key constraint violation
- ❌ Database connection issue

---

## After the Fix

Now when you delete a payment, you'll see one of these errors instead:

### 1. Permission Error
```
You don't have permission to delete this payment. Please check your access settings.
```
**Solution**: Verify your user role and Supabase RLS policies

### 2. Network Error
```
Network error: Could not reach the server. Please check your connection and try again.
```
**Solution**: Check your internet connection, retry

### 3. Constraint Error
```
Cannot delete this payment. It may be referenced by other records. Please try again or contact support.
```
**Solution**: Check if payment is referenced elsewhere, contact support

### 4. Specific Database Error
```
Failed to delete payment: [actual error code]
```
**Solution**: Check browser console for detailed error information

---

## Debugging in Browser Console

### Step 1: Open DevTools
- **Chrome/Edge**: `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
- **Firefox**: `F12`

### Step 2: Go to Console Tab
Look for messages like:

```
Fetching allocations for payment: abc-123-def
Found 2 allocation(s) for payment abc-123-def
Deleting payment: abc-123-def
Failed to delete payment - Full error object: {code: "...", message: "..."}
Extracted error message: [ACTUAL ERROR HERE]
Error type: Error
Error constructor: PostgrestError
Final error message: [DESCRIPTIVE MESSAGE]
```

### Step 3: Note the Actual Error
The "Extracted error message" line shows the real issue.

---

## Common Solutions

### Issue: "permission denied"
```
✅ Check Supabase Dashboard:
   1. Go to Authentication > Users
   2. Verify your user role
   3. Go to Database > Policies
   4. Check RLS policies on payments table
   5. Ensure role has DELETE permission
```

### Issue: "Network error" or "Failed to fetch"
```
✅ Troubleshooting steps:
   1. Check internet connection (open google.com)
   2. Refresh the page (Ctrl+R)
   3. Clear browser cache (Ctrl+Shift+Delete)
   4. Try in incognito/private mode
   5. Retry the operation
```

### Issue: "FOREIGN KEY violation"
```
✅ Check what references this payment:
   1. Look at payment_allocations table
   2. Check if other records reference this payment
   3. Delete references first, then try payment deletion
   4. Contact support if can't identify references
```

### Issue: Still shows different error
```
✅ Gather information:
   1. Copy the exact error message
   2. Take a screenshot of browser console
   3. Note which payment you were trying to delete
   4. Note your user ID/email
   5. Contact support with this information
```

---

## Quick Reference - Error Messages

| Error Message | Meaning | Action |
|---|---|---|
| "permission denied" | RLS policy prevents deletion | Check user role and database policies |
| "Failed to fetch" | Network issue | Check connection, try again |
| "FOREIGN KEY violation" | Record references this payment | Delete references first |
| "No rows found" | Payment doesn't exist | Refresh page, try again |
| Anything else | Check browser console | See debugging steps above |

---

## Testing Your Fix

### Test Case 1: Normal Deletion
```
1. Record a payment for an invoice
2. Go to Payments page
3. Delete the payment
4. Should see success message
5. Check invoice status is reversed in Invoices page
```

### Test Case 2: Permission Issue
```
1. Login as user with limited permissions
2. Try deleting a payment from another company
3. Should see "permission denied" message (not [object Object])
```

### Test Case 3: Network Test
```
1. Open DevTools > Network tab
2. Set throttling to "Offline"
3. Try deleting a payment
4. Should see "Network error" message
5. Turn throttling back to "No throttling"
```

---

## Still Having Issues?

### Gather This Information
1. **Exact error message** (from toast notification)
2. **Browser console full error** (from DevTools)
3. **Payment ID** (if possible)
4. **User email/ID**
5. **Steps to reproduce**

### Where to Get Support
1. Check browser console for technical details
2. Verify your internet connection
3. Clear browser cache and try again
4. Contact support with gathered information

---

## Success Indicators

✅ **Good Sign**: 
- Error message is descriptive (not `[object Object]`)
- Browser console shows detailed logs
- Clear indication of what went wrong
- Payment deletes successfully for valid deletions

❌ **Problem Sign**:
- Still seeing `[object Object]` error
- No information in browser console
- Error message is unclear
- Random inconsistent errors

---

## Technical Summary

**Problem Fixed**: Error message extraction from Supabase error objects  
**Files Changed**: `src/hooks/useDatabase.ts` (useDeletePayment hook)  
**Lines Modified**: 1355-1540  
**Type of Fix**: Error handling improvement  

**Benefits**:
- Clear, actionable error messages
- Better debugging capabilities
- No more `[object Object]` errors
- Identifies actual issue (permissions, network, constraints)

---

## Next Steps

1. Try deleting a payment again
2. Check if error message is now clear
3. If still experiencing issues:
   - Open browser DevTools (F12)
   - Check console for detailed error information
   - Gather the "Extracted error message"
   - Contact support with this information

---

**Still need help?** See:
- `PAYMENT_DELETION_ERROR_FIX.md` - Detailed technical guide
- `PAYMENT_DELETION_AUDIT.md` - Complete audit of payment deletion logic
- `CHANGES_APPLIED_PAYMENT_DELETION.md` - Exact code changes made
