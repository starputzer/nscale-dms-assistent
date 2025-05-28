# Admin API Endpoints Fix

## Problem
The admin services were referencing endpoint constants that weren't defined in the config.ts file, specifically:
- `ENDPOINTS.USERS.*` 
- `ENDPOINTS.FEATURE_TOGGLES.*`

## Solution
Added the missing endpoint definitions to `/src/services/api/config.ts`:

### Added USERS endpoints:
```typescript
USERS: {
  LIST: "/api/admin/users",
  COUNT: "/api/admin/users/count",
  DETAIL: "/api/admin/users",
  CREATE: "/api/admin/users",
  UPDATE_ROLE: "/api/admin/users",
  DELETE: "/api/admin/users",
  STATS: "/api/admin/users/stats",
  ACTIVE: "/api/admin/users/active",
  LOCK: "/api/admin/users",
  UNLOCK: "/api/admin/users",
},
```

### Added FEATURE_TOGGLES endpoints:
```typescript
FEATURE_TOGGLES: {
  LIST: "/api/admin/feature-toggles",
  STATS: "/api/admin/feature-toggles/stats",
  UPDATE: "/api/admin/feature-toggles",
  CREATE: "/api/admin/feature-toggles",
  DELETE: "/api/admin/feature-toggles",
},
```

## Services Affected
- AdminUsersService.ts - Now has proper endpoint references for all user management operations
- AdminFeatureTogglesService.ts - Now has proper endpoint references for feature toggle operations
- AdminFeedbackService.ts - Already using ADMIN_FEEDBACK endpoints correctly
- AdminMotdService.ts - Already using MOTD endpoints correctly  
- AdminSystemService.ts - Already using SYSTEM endpoints correctly
- AdminDocConverterService.ts - Uses hardcoded endpoints, no changes needed

## Benefits
- Centralized endpoint management
- Type safety for endpoint references
- Easier to update API paths in one location
- Consistent with the existing pattern used by other services