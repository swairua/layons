# Payment Deletion Error - Debugging & Fixes

## Error Report
```
Failed to delete payment: [object Object]
Error in useDeletePayment: Error: Network error while deleting payment. Please check your connection and try again.
```

## Root Causes Identified

### 1. ❌ Improper Error Object Stringification
**Location**: `src/hooks/useDatabase.ts` line 1446 (original)

**Problem**: Supabase returns complex error objects that don't have a simple `.message` property. When these were stringified with `${errorMsg}`, they rendered as `[object Object]`.

**Example Supabase Error Object Structure**:
```javascript
{
  message: "string",
  code: "string", 
  status: number,
  details: "string",
  hint: "string"
}
```

### 2. ❌ Incorrect Error Type Detection
**Location**: `src/hooks/useDatabase.ts` line 1455 (original)

**Problem**: The code was checking if error includes "Failed to fetch" or "network", but this doesn't account for actual RLS, permission, or constraint errors being misidentified.

### 3. ❌ Insufficient Error Context
**Problem**: When errors occurred, insufficient logging made it impossible to identify the actual issue (RLS, network, constraints, etc.)

---

## Fixes Applied

### Fix 1: Robust Error Message Extraction
**File**: `src/hooks/useDatabase.ts` (lines 1460-1479)

**What Changed**:
```typescript
// BEFORE (problematic)
const errorMsg = deletePaymentError?.message || 'Unknown error';

// AFTER (robust)
let errorMsg = 'Unknown error';

if (deletePaymentError?.message) {
  errorMsg = deletePaymentError.message;
} else if (deletePaymentError?.code) {
  errorMsg = `Error code: ${deletePaymentError.code}`;
} else if (typeof deletePaymentError === 'string') {
  errorMsg = deletePaymentError;
} else {
  try {
    errorMsg = JSON.stringify(deletePaymentError);
  } catch {
    errorMsg = String(deletePaymentError);
  }
}
```

**Impact**: Now properly extracts error messages from Supabase error objects without resulting in `[object Object]`.

---

### Fix 2: Improved Error Type Handling
**File**: `src/hooks/useDatabase.ts` (lines 1483-1495)

**Changes**:
- Separated "Failed to fetch" check from generic "network" check
- Preserved RLS and constraint error detection
- Better error message formatting

```typescript
// Handle specific error types
if (errorMsg.includes('row-level security') || errorMsg.includes('permission denied')) {
  throw new Error(`You don't have permission to delete this payment...`);
}
if (errorMsg.includes('FOREIGN KEY') || errorMsg.includes('constraint')) {
  throw new Error(`Cannot delete this payment...`);
}
if (errorMsg.includes('Failed to fetch')) {
  throw new Error(`Network error: Could not reach the server...`);
}
```

---

### Fix 3: Enhanced Error Logging
**File**: `src/hooks/useDatabase.ts`

**Additions**:
1. Line 1355-1367: Better allocation fetching error logging
2. Line 1461: Full error object logging before message extraction
3. Line 1481: Extracted message confirmation logging
4. Line 1509-1520: Error type and constructor logging in catch block

**Example Console Output** (now provides):
```
Fetching allocations for payment: abc123
Found 2 allocation(s) for payment abc123
Deleting payment: abc123
Failed to delete payment - Full error object: {message: "...", code: "...", ...}
Extracted error message: "..."
Error in useDeletePayment: Error: ...
Error type: object
Error constructor: PostgrestError
```

---

### Fix 4: Better Final Error Handler
**File**: `src/hooks/useDatabase.ts` (lines 1508-1540)

**Improvements**:
- Handles `PostgrestError` objects properly
- Checks for nested error.error structure
- Falls back to status code extraction
- Safe JSON stringify with fallback

```typescript
} else if (error && typeof error === 'object') {
  const errObj = error as any;
  if (errObj.message) {
    errorMessage = errObj.message;
  } else if (errObj.error?.message) {
    errorMessage = errObj.error.message;
  } else if (errObj.status) {
    errorMessage = `Error (${errObj.status}): ${errObj.statusText || 'Unknown'}`;
  } else {
    try {
      errorMessage = JSON.stringify(errObj);
    } catch {
      errorMessage = String(errObj);
    }
  }
}
```

---

## Testing Steps to Verify Fix

### Test 1: Verify Error Messages Display
1. Open browser DevTools → Console
2. Try deleting a payment
3. Check that console shows detailed error information (not `[object Object]`)
4. Verify error message in toast notification is descriptive

### Test 2: Test Different Error Scenarios

#### Scenario A: RLS/Permission Error
- Create a payment as one user
- Try deleting as a different user with limited permissions
- Should show: "You don't have permission to delete this payment"

#### Scenario B: Network Error
- Open DevTools → Network tab
- Set throttling to offline
- Try deleting a payment
- Should show: "Network error: Could not reach the server"

#### Scenario C: Constraint Error
- Try to create a scenario where deletion would violate a constraint
- Should show: "Cannot delete this payment. It may be referenced..."

#### Scenario D: Normal Deletion
- Delete a payment normally
- Should show success message with descriptive logs

---

## Console Debugging Output

**What to look for in browser console**:

✅ **Good Output**:
```
Fetching allocations for payment: uuid-here
Found 2 allocation(s) for payment uuid-here
Deleting payment allocations for payment: uuid-here
Deleting payment: uuid-here
Payment deleted successfully: uuid-here
```

⚠️ **Warning Output** (may still succeed):
```
Could not fetch allocations: PostgrestError
Allocation fetch error message: "No rows found"
```

❌ **Error Output** (deletion fails):
```
Failed to delete payment - Full error object: PostgrestError {...}
Extracted error message: "permission denied"
Failed to delete payment: permission denied
Error type: Error
Error constructor: Error
Final error message: You don't have permission to delete this payment...
```

---

## Next Steps if Error Persists

### If Still Seeing `[object Object]`:
1. Check browser console for the "Full error object" logged value
2. Note the error code and message
3. Search for that code in Supabase documentation
4. May indicate a new error format not yet handled

### If Getting Permission Denied:
1. Check user's role/permissions in Supabase
2. Verify RLS policies on `payments` and `payment_allocations` tables
3. Ensure user has DELETE permission

### If Getting Network Error:
1. Check internet connection
2. Verify Supabase project is online
3. Check browser DevTools → Network tab for failed requests
4. Try again - may be temporary

---

## Summary of Changes

| Issue | Location | Fix Type | Impact |
|-------|----------|----------|--------|
| `[object Object]` error | Lines 1430-1479 | Error extraction logic | High - Now shows real error messages |
| Incorrect error matching | Line 1490 | Improved condition checks | Medium - Better error categorization |
| Missing logging | Multiple lines | Enhanced console logging | Medium - Easier debugging |
| Incomplete error handling | Lines 1508-1540 | Catch block improvements | High - Handles all error types |

---

## Related Configuration

**Supabase RLS Policy for payments table**:
- Ensure authenticated users can delete their own company's payments
- Check `company_id` column matches user's company

**Database Constraints**:
- `payment_allocations` should allow deletion when payment is deleted (cascade)
- Foreign key constraints should not prevent deletion

---

## Conclusion

✅ **Fixed**: Error message extraction from Supabase error objects  
✅ **Improved**: Error type detection and categorization  
✅ **Enhanced**: Console logging for debugging  

The payment deletion error handling is now **robust and provides clear, actionable error messages** instead of `[object Object]`.
