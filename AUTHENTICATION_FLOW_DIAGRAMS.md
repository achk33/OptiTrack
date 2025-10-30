# 🔄 Authentication Flow Diagrams

## Before Fix (Problem Scenario)

```
┌─────────────┐
│   Login 1   │
└──────┬──────┘
       │ Token A created
       ▼
┌─────────────┐
│  Use App    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Logout 1   │ ❌ Token A NOT invalidated
└──────┬──────┘     Token A still in localStorage
       │            May cause conflicts
       ▼
┌─────────────┐
│   Login 2   │ ❌ Token A + Token B coexist
└──────┬──────┘     Confusion between old/new tokens
       │            Backend may receive old token
       ▼
     ❌ "ERREUR DE CONNEXION"
```

---

## After Fix (Solution)

### Login Flow
```
┌──────────────────────────────────────────────────┐
│                    LOGIN                         │
└──────────────────────────────────────────────────┘

1. User enters credentials
   ↓
2. Frontend: Clear old storage ✨ NEW
   - localStorage.removeItem('token')
   - localStorage.removeItem('user')
   - sessionStorage.clear()
   ↓
3. Wait 50ms for cleanup to complete ✨ NEW
   ↓
4. Backend: Validate credentials
   ↓
5. Backend: Create JWT token
   ↓
6. Frontend: Save new token & user
   - localStorage.setItem('token', newToken)
   - localStorage.setItem('user', userData)
   ↓
7. Frontend: Reset rate limiter ✨ NEW
   ↓
8. Redirect to dashboard
   ↓
✅ SUCCESS - Clean state, no conflicts
```

### Logout Flow
```
┌──────────────────────────────────────────────────┐
│                   LOGOUT                         │
└──────────────────────────────────────────────────┘

1. User clicks logout
   ↓
2. Frontend: Call /logout endpoint ✨ NEW
   - Headers: { Authorization: Bearer ${token} }
   ↓
3. Backend: Add token to blacklist ✨ NEW
   - INSERT INTO TokenBlacklist
   - Token can never be used again
   ↓
4. Frontend: Clear all storage ✨ ENHANCED
   - localStorage.clear()
   - sessionStorage.clear()
   - Clear auth-related cookies
   ↓
5. Frontend: Clear auth state
   - setUser(null)
   - setToken(null)
   ↓
6. Redirect to login page
   ↓
✅ SUCCESS - Completely clean state
```

### Session Monitoring Flow
```
┌──────────────────────────────────────────────────┐
│              SESSION MONITOR                     │
│         (Runs every 5 minutes)                   │
└──────────────────────────────────────────────────┘

Every 5 minutes:
   ↓
1. Check: Is user logged in?
   ├─ No → Do nothing
   └─ Yes → Continue
   ↓
2. Check: On protected route?
   ├─ No → Do nothing
   └─ Yes → Continue
   ↓
3. Call: GET /check-session ✨ NEW
   - Headers: { Authorization: Bearer ${token} }
   ↓
4. Backend validates:
   ├─ Valid JWT signature?
   ├─ User still exists?
   └─ Token not blacklisted?
   ↓
5. Response:
   ├─ Valid → Continue normally ✅
   └─ Invalid → Auto logout & redirect ❌
```

---

## Multiple Login/Logout Cycles

### Before Fix
```
Login 1  → Token A
Logout 1 → Token A remains in storage ❌
Login 2  → Token B + Token A conflict ❌
         → "Erreur de connexion" ❌
```

### After Fix
```
Login 1  → Token A
Logout 1 → Token A blacklisted ✅
         → Storage cleared ✅
Login 2  → Token B (clean state) ✅
Logout 2 → Token B blacklisted ✅
         → Storage cleared ✅
Login 3  → Token C (clean state) ✅
...
Login 100 → Still works! ✅
```

---

## Rate Limiting Flow

```
┌──────────────────────────────────────────────────┐
│               RATE LIMITING                      │
└──────────────────────────────────────────────────┘

Login Attempt #1 (t=0s)
   ↓
   ✅ Allowed (attempts: 1)
   ↓
Login Attempt #2 (t=0.5s)
   ↓
   ✅ Allowed (attempts: 2)
   ↓
Login Attempt #3 (t=1.0s)
   ↓
   ✅ Allowed (attempts: 3)
   ↓
Login Attempt #4 (t=1.5s)
   ↓
   Check: (now - lastLogin) < 2000ms AND attempts >= 3?
   ├─ Yes → ❌ REJECT
   │        "Trop de tentatives..."
   └─ No → ✅ Allow
   ↓
Wait 2+ seconds...
   ↓
Login Attempt #5 (t=3.0s)
   ↓
   ✅ Allowed (timer reset)
```

---

## Token Lifecycle

```
┌──────────────────────────────────────────────────┐
│             TOKEN LIFECYCLE                      │
└──────────────────────────────────────────────────┘

1. TOKEN CREATION
   ┌─────────────┐
   │   Login     │
   └──────┬──────┘
          │
          ▼
   JWT Token Created
   - Signed with JWT_SECRET
   - Contains: { id, role, email, name }
   - Optional: expiresIn
          │
          ▼
   [ACTIVE STATE]

2. TOKEN USAGE
   ┌─────────────┐
   │  Use Token  │
   └──────┬──────┘
          │
          ▼
   Every API request:
   - Headers: Authorization: Bearer ${token}
   - Middleware validates signature
   - Checks if blacklisted ✨ NEW
          │
          ▼
   [ACTIVE STATE]

3. TOKEN INVALIDATION
   ┌─────────────┐
   │   Logout    │
   └──────┬──────┘
          │
          ▼
   Add to TokenBlacklist ✨ NEW
   - token (unique)
   - expiresAt (from JWT or +24h)
          │
          ▼
   [BLACKLISTED STATE]

4. TOKEN CLEANUP
   ┌─────────────┐
   │ Daily Cron  │
   └──────┬──────┘
          │
          ▼
   Delete expired tokens
   - WHERE expiresAt < NOW()
          │
          ▼
   [REMOVED STATE]
```

---

## Database State Changes

### TokenBlacklist Table

#### After First Logout
```sql
id     | token       | createdAt           | expiresAt
-------|-------------|---------------------|---------------------
uuid-1 | eyJhbGc... | 2025-10-19 10:00:00 | 2025-10-20 10:00:00
```

#### After Multiple Sessions
```sql
id     | token       | createdAt           | expiresAt
-------|-------------|---------------------|---------------------
uuid-1 | eyJhbGc... | 2025-10-19 10:00:00 | 2025-10-20 10:00:00
uuid-2 | eyJhbGd... | 2025-10-19 11:00:00 | 2025-10-20 11:00:00
uuid-3 | eyJhbGh... | 2025-10-19 12:00:00 | 2025-10-20 12:00:00
```

#### After Cleanup (Next Day)
```sql
id     | token       | createdAt           | expiresAt
-------|-------------|---------------------|---------------------
uuid-3 | eyJhbGh... | 2025-10-19 12:00:00 | 2025-10-20 12:00:00
```
*(uuid-1 and uuid-2 deleted because expiresAt < NOW)*

---

## Security Architecture

```
┌────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                     │
└────────────────────────────────────────────────────────┘

Layer 1: Rate Limiting (Frontend)
   ↓ Prevents: Brute force attempts
   ↓ Max: 3 attempts per 2 seconds

Layer 2: JWT Signature (Backend)
   ↓ Prevents: Token tampering
   ↓ Validates: Signature with JWT_SECRET

Layer 3: Token Blacklist (Backend) ✨ NEW
   ↓ Prevents: Token reuse after logout
   ↓ Checks: If token in blacklist

Layer 4: User Existence (Backend)
   ↓ Prevents: Deleted user access
   ↓ Checks: User still in database

Layer 5: Session Monitoring (Frontend) ✨ NEW
   ↓ Prevents: Expired session usage
   ↓ Checks: Every 5 minutes

Layer 6: Storage Cleanup (Frontend) ✨ NEW
   ↓ Prevents: Old data conflicts
   ↓ Clears: On login & logout
```

---

## API Endpoint Flow

### POST /auth/login
```
Request:
  POST /auth/login
  Body: { email, password }
  
Processing:
  1. Find user by email
  2. Verify password (bcrypt)
  3. Create JWT token
  4. Return token + user data
  
Response:
  200: { token, user: { id, role, email, name } }
  401: { error: "Identifiants invalides" }
```

### POST /auth/logout ✨ NEW
```
Request:
  POST /auth/logout
  Headers: { Authorization: Bearer ${token} }
  
Processing:
  1. Extract token from header
  2. Decode to get expiration
  3. Add to TokenBlacklist
  4. Return success
  
Response:
  200: { message: "Déconnexion réussie" }
```

### GET /auth/check-session ✨ NEW
```
Request:
  GET /auth/check-session
  Headers: { Authorization: Bearer ${token} }
  
Processing:
  1. Verify JWT signature
  2. Check user exists
  3. Check not blacklisted
  4. Return validation result
  
Response:
  200: { valid: true, user: {...} }
  401: { valid: false, error: "..." }
```

---

## Error Handling Flow

### Before Fix
```
Any Error → "Erreur de connexion" ❌
```

### After Fix
```
Invalid Credentials
  ↓
  "Identifiants invalides"

Too Many Attempts
  ↓
  "Trop de tentatives de connexion rapides..."

Token Expired
  ↓
  "Token invalide ou expiré"

Token Blacklisted
  ↓
  "Token révoqué"
  + Auto logout + Redirect

User Not Found
  ↓
  "Utilisateur introuvable"

Network Error
  ↓
  "Erreur de connexion. Veuillez vérifier..."
```

---

## Component Hierarchy

```
App (layout.tsx)
├── Providers
│   └── AuthProvider (auth-context.tsx)
│       ├── State Management
│       ├── Login Function ✨ ENHANCED
│       ├── Logout Function ✨ ENHANCED
│       └── CheckSession Function ✨ NEW
├── SessionMonitor ✨ NEW
│   └── Periodic Validation (every 5 min)
├── Navigation
└── Pages
    ├── Login (login/page.tsx) ✨ ENHANCED
    │   ├── Rate Limiting
    │   ├── Better UX
    │   └── Clear Errors
    ├── Dashboard (protected)
    ├── Assets (protected)
    └── Others...
```

---

## Timeline: Before vs After

### Before Fix
```
0s   - Login → Token A created
10s  - Logout → Token A NOT invalidated ❌
20s  - Login → Token B created (A still in storage)
30s  - Request → Backend gets Token A ❌
       "Erreur de connexion" ❌
```

### After Fix
```
0s   - Login → Token A created
       Storage cleared first ✨
10s  - Logout → Token A blacklisted ✨
       Storage cleared ✨
20s  - Login → Token B created (clean state) ✨
       Storage cleared first ✨
30s  - Request → Backend gets Token B ✅
       ✅ Success!
```

---

**These diagrams show the complete architecture and flow of the new authentication system.**
