---
title: "Authentication Debugging Guide"
version: "1.0.0"
date: "16.05.2025"
lastUpdate: "16.05.2025"
author: "Claude"
status: "Aktiv"
priority: "Hoch"
category: "Debugging"
tags: ["Authentifizierung", "Debugging", "API", "Token", "Digitale Akte", "Assistent"]
---

# Authentication Debugging Guide

## Overview

This guide provides comprehensive steps for debugging and fixing authentication issues in the Digitale Akte Assistent application.

## Common Authentication Issues

1. **401 Unauthorized errors for batch API requests**
2. **Token not being included in API requests**
3. **Token stored with wrong localStorage key**
4. **Double prefix issues (nscale_nscale_access_token)**
5. **Token expiration not handled properly**

## Debugging Tools

The application includes several debugging tools to help diagnose authentication issues:

### 1. Auth Diagnostics

Enable comprehensive logging of authentication flow:

```javascript
// In browser console (development mode)
window.authDiagnostics.enable();
window.authDiagnostics.report();
```

### 2. Auth Debug Tools

Quick access to common debugging functions:

```javascript
// Basic auth check
window.checkAuth();

// Detailed status
window.authDebug.status();

// Force token refresh
window.authDebug.refresh();

// Clear all auth data
window.authDebug.clear();
```

### 3. Auth Fix Utilities

The authentication fix module provides automatic fixes for common issues:

- Token storage migration
- Interceptor configuration
- Error recovery
- Token validation

## Step-by-Step Debugging Process

### 1. Check Current Authentication Status

```javascript
// Run in browser console
window.checkAuth();
```

This will show:
- LocalStorage tokens
- Expected token keys
- Auth store status
- Axios headers
- API service configuration

### 2. Verify Token Storage

Check if tokens are stored with the correct keys:

```javascript
// Should have tokens with these keys:
localStorage.getItem('nscale_access_token');
localStorage.getItem('nscale_refresh_token');
```

### 3. Check Auth Store State

```javascript
// Access Pinia auth store directly
const authStore = window.__PINIA__.state.value.auth;
console.log({
  token: authStore?.token,
  refreshToken: authStore?.refreshToken,
  isAuthenticated: authStore?.isAuthenticated,
  user: authStore?.user
});
```

### 4. Verify API Interceptors

```javascript
// Check if interceptors are properly configured
window.authDiagnostics.report();
```

Look for:
- Request interceptor logs
- Response interceptor logs
- Token addition to requests
- 401 error handling

### 5. Test API Requests

```javascript
// Test a simple API request
fetch('/api/sessions/stats', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('nscale_access_token')}`
  }
}).then(res => console.log(res.status));
```

## Common Fixes

### Fix 1: Token Migration

If tokens are stored with wrong keys:

```javascript
// The auth fix will automatically migrate tokens
// You can force it manually:
window.authFix.validateAndMigrateTokens();
```

### Fix 2: Force Interceptor Setup

If interceptors aren't working:

```javascript
// Re-initialize auth fix
window.authFix.initialize();
```

### Fix 3: Manual Token Refresh

If token is expired:

```javascript
// Force token refresh
window.authDebug.refresh();
```

### Fix 4: Clear and Re-authenticate

If all else fails:

```javascript
// Clear all auth data
window.authDebug.clear();

// Then login again through the UI
```

## Server-Side Debugging

### 1. Check Server Logs

Look for authentication errors in:
- `/opt/nscale-assist/app/logs/app.log`
- `/opt/nscale-assist/app/logs/errors/frontend_errors_*.json`

### 2. Verify JWT Token

```python
# In Python
import jwt
token = "your_token_here"
decoded = jwt.decode(token, options={"verify_signature": False})
print(decoded)
```

### 3. Test Authentication Endpoint

```bash
# Test login endpoint
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}'
```

## Preventive Measures

1. **Always use the auth store methods** for login/logout/token management
2. **Never manually set tokens** in localStorage without using the proper methods
3. **Always check isAuthenticated** before making authenticated requests
4. **Handle 401 errors** properly with automatic retry after token refresh
5. **Monitor token expiration** and refresh tokens proactively

## Troubleshooting Checklist

- [ ] Token stored with correct key (`nscale_access_token`)
- [ ] Auth store has token value
- [ ] Interceptors are configured for both axios and ApiService
- [ ] Token is valid JWT format (3 parts separated by dots)
- [ ] Token is not expired
- [ ] Server is configured to accept JWT tokens
- [ ] CORS headers are properly configured
- [ ] Token prefix is correct (`Bearer`)

## Getting Help

If you continue to experience issues:

1. Generate a full diagnostic report:
   ```javascript
   window.authDiagnostics.report();
   ```

2. Check server logs for authentication errors

3. Enable verbose logging:
   ```javascript
   localStorage.setItem('DEBUG', 'auth:*');
   ```

4. Report the issue at: https://github.com/anthropics/claude-code/issues