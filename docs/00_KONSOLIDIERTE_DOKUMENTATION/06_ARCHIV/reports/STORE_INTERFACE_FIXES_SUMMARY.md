# Store Interface Mismatch Fixes Summary

## Issues Fixed

### 1. Auth Store Interface Issues
**Problem:** The auth store implementation had many properties and methods (like `user`, `isAdmin`, `hasRole`, etc.) but a simplified type declaration in `/src/types/stores/index.d.ts` was overriding these with a minimal interface.

**Solution:** 
- Removed the conflicting type declaration file that was providing simplified interfaces
- Updated the `IAuthStore` interface in `/src/types/store-types.ts` to include all missing properties:
  - Added `user`, `isAdmin`, `permissions` properties
  - Added methods: `hasRole`, `hasPermission`, `createAuthHeaders`, `setToken`, `setError`, etc.
  - Fixed method signatures to match implementation

### 2. Sessions Store Interface Issues
**Problem:** The sessions store was missing the `deleteSession` method in the interface, and components were using old Vuex syntax.

**Solution:**
- Added `deleteSession` and `clearCurrentSession` methods to the `ISessionsStore` interface
- Updated components to use Pinia stores instead of Vuex:
  - `SidebarComponent.vue`: Changed from `useStore()` to `useSessionsStore()`
  - `HeaderComponent.vue`: Changed from Vuex getters to direct Pinia store access
  - Replaced `store.dispatch()` calls with direct store method calls

### 3. Store Adapter Issues
**Problem:** The store adapters were trying to spread Pinia stores, which doesn't work properly due to reactivity.

**Solution:**
- Fixed `authStoreAdapter.ts` to explicitly expose all properties and methods using getters
- Fixed `sessionStoreAdapter.ts` similarly
- Removed duplicate method definitions

## Files Modified

1. `/src/types/store-types.ts` - Updated auth and sessions store interfaces
2. `/src/components/SidebarComponent.vue` - Migrated from Vuex to Pinia
3. `/src/components/HeaderComponent.vue` - Migrated from Vuex to Pinia
4. `/src/stores/adapters/authStoreAdapter.ts` - Fixed store property exposure
5. `/src/stores/adapters/sessionStoreAdapter.ts` - Fixed store property exposure
6. `/src/types/stores/index.d.ts` - Removed (was causing type conflicts)

## Remaining Issues

While the store interface mismatches have been fixed, there are still other TypeScript errors in the codebase related to:
- API type mismatches
- Missing properties in various interfaces
- Type compatibility issues between different modules

These would need to be addressed separately.