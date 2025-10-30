# Session Management Fix - Implementation Guide

## Overview
This guide contains the complete implementation for fixing the session management and authentication issues where users receive "Erreur de connexion" after multiple login/logout cycles.

## What Was Fixed

### 1. **Token Blacklisting** ✅
- Added `TokenBlacklist` model to database schema
- Backend now invalidates tokens on logout
- Prevents reuse of old tokens

### 2. **Rate Limiting** ✅
- Added rate limiting to prevent too many rapid login attempts
- Protects against brute force and repeated authentication failures
- Shows user-friendly error message

### 3. **Session Validation** ✅
- Added `/check-session` endpoint to validate tokens
- Periodic session checks (every 5 minutes)
- Automatic logout if session becomes invalid

### 4. **Proper Cleanup** ✅
- Enhanced logout to clear all storage data
- Clears localStorage, sessionStorage
- Calls backend to blacklist token

### 5. **Better UX** ✅
- Improved login page with loading states
- Clear error messages
- Auto-redirect if already authenticated
- Password field cleared on error

## Installation Steps

### Step 1: Run Database Migration

```powershell
cd backend
npx prisma migrate dev --name add_token_blacklist
npx prisma generate
```

This creates the `TokenBlacklist` table in your database.

### Step 2: Restart Backend Server

```powershell
cd backend
npm run dev
```

The new authentication endpoints will now be available.

### Step 3: Restart Frontend

```powershell
cd frontend
npm run dev
```

### Step 4: Test the Changes

1. **Test Login**
   - Go to `/login`
   - Login with valid credentials
   - Should redirect to dashboard

2. **Test Logout**
   - Click logout button
   - Should clear all data and redirect to home
   - Token should be blacklisted in database

3. **Test Multiple Login/Logout Cycles**
   - Login → Logout → Login → Logout (repeat 5-10 times)
   - Should work smoothly without "Erreur de connexion"

4. **Test Rate Limiting**
   - Try logging in 4+ times rapidly (within 2 seconds)
   - Should show rate limit message

5. **Test Session Expiry**
   - Login successfully
   - In database, manually blacklist the current token
   - Wait 5 minutes or refresh page
   - Should automatically logout

## Optional: Set Up Token Cleanup Cron Job

To prevent the `TokenBlacklist` table from growing indefinitely, set up a periodic cleanup:

### Windows (Task Scheduler)

1. Open Task Scheduler
2. Create Basic Task
3. Name: "SBS Token Cleanup"
4. Trigger: Daily at 3:00 AM
5. Action: Start a program
6. Program: `node`
7. Arguments: `C:\Users\HP\OneDrive\Bureau\SBS\backend\dist\utils\cleanup-tokens.js`

### Linux/Mac (Crontab)

```bash
# Run cleanup daily at 3 AM
0 3 * * * cd /path/to/SBS/backend && node dist/utils/cleanup-tokens.js
```

## Files Modified

### Backend
- ✅ `backend/prisma/schema.prisma` - Added TokenBlacklist model
- ✅ `backend/src/routes/auth.ts` - Added /logout and /check-session endpoints
- ✅ `backend/src/utils/cleanup-tokens.ts` - Token cleanup script (new file)

### Frontend
- ✅ `frontend/components/auth-context.tsx` - Enhanced with rate limiting and proper cleanup
- ✅ `frontend/app/login/page.tsx` - Improved UX and error handling
- ✅ `frontend/components/session-monitor.tsx` - Session monitoring component (new file)
- ✅ `frontend/app/layout.tsx` - Added SessionMonitor

## Configuration

### JWT Expiration (Optional)
You can adjust token expiration time in `backend/src/routes/auth.ts`:

```typescript
const token = jwt.sign(
  { id: user.id, role: user.role, email: user.email, name: user.name }, 
  process.env.JWT_SECRET || '',
  { expiresIn: '24h' } // Change this value
);
```

### Session Check Interval (Optional)
Adjust in `frontend/components/session-monitor.tsx`:

```typescript
checkIntervalRef.current = setInterval(() => {
  performSessionCheck()
}, 5 * 60 * 1000) // Change 5 to desired minutes
```

### Rate Limit Settings (Optional)
Adjust in `frontend/components/auth-context.tsx`:

```typescript
if (timeSinceLastLogin < 2000 && loginAttemptsRef.current >= 3) {
  // Change 2000 (milliseconds) or 3 (attempts)
}
```

## Troubleshooting

### Issue: TypeScript errors in backend
**Solution:** Run `npx prisma generate` to regenerate Prisma client

### Issue: "TokenBlacklist not found" error
**Solution:** Make sure you ran the migration: `npx prisma migrate dev`

### Issue: Users still getting logged out unexpectedly
**Solution:** Check JWT_SECRET is set in `.env` file and consistent across restarts

### Issue: Session check failing
**Solution:** Verify backend API URL is correct in `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Security Improvements

This implementation adds:
- ✅ Token invalidation on logout
- ✅ Protection against token reuse
- ✅ Rate limiting for login attempts
- ✅ Periodic session validation
- ✅ Automatic cleanup of sensitive data
- ✅ Better error messages without exposing security details

## Performance Considerations

- Token blacklist grows over time → Use cleanup script
- Session checks every 5 minutes per user → Minimal impact
- Rate limiting only applies during active login attempts → No normal operation impact

## Next Steps (Optional Enhancements)

1. **Add Refresh Tokens** - Implement refresh token flow for longer sessions
2. **Add 2FA** - Two-factor authentication for admin users
3. **Add Session History** - Track all login sessions per user
4. **Add IP Whitelisting** - Restrict access based on IP for admins
5. **Add Audit Logging** - Log all authentication events

## Questions?

If you encounter any issues or need clarification, check:
1. Browser console for frontend errors
2. Backend logs for API errors
3. Database to verify TokenBlacklist table exists
4. Network tab to see API request/response details
