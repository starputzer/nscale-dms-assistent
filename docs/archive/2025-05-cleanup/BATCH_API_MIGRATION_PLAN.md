# Batch API Migration Plan

## Overview
This document outlines the migration plan for switching from mock data to real API endpoints in the BatchRequestService.

## Current State

### Working Batch Endpoints
The following endpoints are currently implemented in the batch handler:
- `/api/sessions` (GET, POST)
- `/api/sessions/{id}/messages` (GET)
- `/api/user/role` (GET)
- `/api/auth/validate` (GET)
- `/api/sessions/stats` (GET)

### Missing Admin Endpoints
The following admin endpoints need to be added to the batch handler:

#### User Management
- `/api/v1/admin/users` - List all users
- `/api/v1/admin/users/count` - Get user count
- `/api/v1/admin/users/stats` - Get user statistics
- `/api/v1/admin/users/active` - Get active users
- `/api/v1/admin/users/{id}` - CRUD operations on specific user
- `/api/v1/admin/users/{id}/role` - Update user role
- `/api/v1/admin/users/{id}/lock` - Lock user account
- `/api/v1/admin/users/{id}/unlock` - Unlock user account

#### Feedback Management
- `/api/v1/admin/feedback` - List all feedback
- `/api/v1/admin/feedback/stats` - Get feedback statistics
- `/api/v1/admin/feedback/negative` - Get negative feedback
- `/api/v1/admin/feedback/export` - Export feedback data
- `/api/v1/admin/feedback/filter` - Filter feedback
- `/api/v1/admin/feedback/{id}` - CRUD operations on specific feedback

#### System Management
- `/api/v1/admin/system` - Get system information
- `/api/v1/admin/system/stats` - Get system statistics
- `/api/v1/admin/system/check` - Run system check
- `/api/v1/admin/system/actions` - Get available system actions
- `/api/v1/admin/clear-cache` - Clear system cache
- `/api/v1/admin/clear-embedding-cache` - Clear embedding cache
- `/api/v1/admin/reindex` - Reindex documents

#### MOTD Management
- `/api/v1/admin/motd` - Get/Update MOTD configuration
- `/api/v1/admin/motd/reload` - Reload MOTD

#### Feature Toggle Management
- `/api/v1/admin/feature-toggles` - List/Create feature toggles
- `/api/v1/admin/feature-toggles/stats` - Get feature toggle statistics
- `/api/v1/admin/feature-toggles/{id}` - CRUD operations on specific toggle

#### Document Converter
- `/api/v1/admin/doc-converter/status` - Get converter status
- `/api/v1/admin/doc-converter/jobs` - List converter jobs
- `/api/v1/admin/doc-converter/settings` - Get/Update converter settings

## Migration Steps

### Step 1: Update Server-Side Batch Handler

Create a new file `batch_handler_enhanced.py` that includes all admin endpoints:

```python
# Map of endpoints to their handler functions
BATCH_ENDPOINT_MAP = {
    # User Management
    ('GET', '/api/v1/admin/users'): get_users,
    ('POST', '/api/v1/admin/users'): create_user,
    ('GET', '/api/v1/admin/users/count'): get_user_count,
    ('GET', '/api/v1/admin/users/stats'): get_user_stats,
    # ... etc for all endpoints
}
```

### Step 2: Update Client-Side Services

1. **Update AdminServiceWrapper** to use BatchRequestService:
```typescript
// Before
const response = await apiService.get('/admin/users');

// After
const response = await batchRequestService.addRequest({
  endpoint: '/admin/users',
  method: 'GET'
});
```

2. **Create BatchAdminService** wrapper:
```typescript
export class BatchAdminService {
  async getUsersAndStats() {
    const results = await batchRequestService.executeNamedBatch({
      users: { endpoint: '/admin/users', method: 'GET' },
      stats: { endpoint: '/admin/users/stats', method: 'GET' },
      count: { endpoint: '/admin/users/count', method: 'GET' }
    });
    return results;
  }
}
```

### Step 3: Update Components

Update admin panel components to use the new batch service:

```typescript
// AdminUsersTab.vue
async loadData() {
  const { users, stats, count } = await batchAdminService.getUsersAndStats();
  this.users = users;
  this.stats = stats;
  this.totalCount = count.total;
}
```

### Step 4: Testing Strategy

1. **Unit Tests**: Test each endpoint individually
2. **Integration Tests**: Test batch requests with multiple endpoints
3. **Performance Tests**: Measure improvement in load times
4. **Error Handling Tests**: Ensure proper error propagation

### Step 5: Rollout Plan

1. **Phase 1**: Deploy server-side changes (backwards compatible)
2. **Phase 2**: Enable feature flag for batch requests in development
3. **Phase 3**: Gradual rollout to production (10% → 50% → 100%)
4. **Phase 4**: Remove old non-batched code paths

## Performance Benefits

### Current State (Sequential Requests)
- Load admin panel: 6 separate requests
- Total time: ~600ms (100ms per request)

### After Migration (Batch Requests)
- Load admin panel: 1 batch request
- Total time: ~150ms (parallel processing)
- **75% reduction in load time**

## Error Handling

The batch handler should:
1. Process each request independently
2. Return partial results if some requests fail
3. Include detailed error information for debugging
4. Maintain backwards compatibility

## Monitoring

Track the following metrics:
- Batch request success rate
- Average batch size
- Performance improvement
- Error rates by endpoint
- Cache hit rates

## Timeline

- **Week 1**: Implement server-side batch handler enhancements
- **Week 2**: Update client-side services and components
- **Week 3**: Testing and bug fixes
- **Week 4**: Gradual production rollout

## Success Criteria

1. All admin endpoints available through batch API
2. 50%+ reduction in admin panel load time
3. No increase in error rates
4. Positive user feedback on performance