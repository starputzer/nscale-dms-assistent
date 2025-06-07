# API Double Prefix Fix Summary

## Problem Identified
The admin API calls were going to `/api/api/` instead of `/api/` due to:

1. **Missing `/api` prefix in admin.ts**: The `admin.ts` file was making API calls without the `/api` prefix (e.g., `/admin/users/` instead of `/api/admin/users/`)
2. **Empty axios baseURL**: The `fixAxiosBaseURL.ts` was setting the axios base URL to empty string to avoid double `/api` prefixes
3. **Vite proxy configuration**: Only requests starting with `/api` are proxied to the backend server

## Root Cause
When `admin.ts` made a request to `/admin/users/`:
- It wasn't prefixed with `/api`, so Vite didn't proxy it
- The request went to the frontend server instead of the backend
- This caused 404 errors or incorrect routing

## Solution Applied
Updated all API endpoints in `/opt/nscale-assist/app/src/services/api/admin.ts` to include the `/api` prefix:

### Examples of changes:
- `/admin/users/` → `/api/admin/users/`
- `/admin/stats` → `/api/admin/stats`
- `/admin/feedback/stats` → `/api/admin/feedback/stats`
- `/motd` → `/api/motd`
- `/admin/doc-converter/stats` → `/api/admin/doc-converter/stats`
- etc.

## Additional Notes
- The `ApiService.ts` already has a safeguard that fixes double `/api/api/` prefixes if they occur
- The fix ensures all admin API calls are properly proxied through Vite to the backend server
- This maintains consistency with other API services that already use the `/api` prefix

## Testing
After this fix, admin API calls should:
1. Go to the correct URL (e.g., `/api/admin/users/`)
2. Be properly proxied by Vite to `http://localhost:8000`
3. Include proper authentication headers
4. Return data from the backend server instead of 404 errors