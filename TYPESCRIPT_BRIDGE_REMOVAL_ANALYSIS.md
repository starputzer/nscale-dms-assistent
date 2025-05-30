# TypeScript Errors Analysis After Bridge System Removal

## Summary

After removing the bridge system, there are multiple TypeScript errors that need to be addressed. The main categories of issues are:

1. **Missing Vue 3 Type Exports**
2. **Bridge References Still in Code**
3. **Store Interface Mismatches**
4. **Missing Type Definitions**
5. **Removed Composables**

## 1. Missing Vue 3 Type Exports (Most Critical)

These Vue types are not being properly exported/imported:

### From 'vue' module:
- `WatchOptions`, `WatchSource`, `WatchStopHandle` - Used in `optimizedWatchers.ts`
- `shallowRef` - Used in `useDialog.ts`, `sessions.performance.ts`, `statistics.ts`
- `WritableComputedRef` - Used in `useFeatureToggles.ts`
- `DirectiveBinding`, `App` - Used in directive files
- `createApp` - Used in `main.ts`, `main.update.ts`
- `VNode` - Used in type definitions
- `SetupContext`, `AsyncComponentLoader`, `h` - Used in utils
- `nextTick` - Used in `sessionOptimizer.ts`

### Solution:
These are all valid Vue 3 exports. The issue might be:
1. TypeScript configuration not recognizing Vue module types
2. Missing or incorrect Vue type declarations
3. Need to import from '@vue/runtime-core' or '@vue/reactivity' instead of 'vue'

## 2. Bridge References Still in Code

### Files with bridge usage:
- `/src/views/EnhancedChatView.vue` - Uses `bridge.on()` and `bridge.emit()` without importing bridge
- Multiple files searching for 'bridge' keyword but not importing it

### Solution:
- Remove all bridge event listeners and emitters
- Replace with direct store communication or event bus
- Update components to use stores directly

## 3. Store Interface Mismatches

### Auth Store Issues:
- Property 'user' does not exist on auth store (used in `adminGuard.ts`, `admin/users.ts`, `debugAuth.ts`)
- Auth store interface expects: `isAuthenticated`, `token`, `userRole`, `logout()`, `validateToken()`
- Code trying to access: `user` property

### Sessions Store Issues:
- Property 'deleteSession' missing in store implementation (`storeHelper.ts`)
- Method signature mismatches for store methods

### Solution:
- Update auth store to include user property or update code to use correct properties
- Add missing methods to store implementations
- Ensure store interfaces match implementations

## 4. Missing Type Definitions

### Missing exports:
- `ChatMessage` from '@/types/session' (used in `useChatAdapter.ts`)
- `SourceReference` from '@/types/session' (used in `useSourceReferences.ts`)
- `Ref` type not found (used in `useClipboard.ts`)

### Missing modules:
- `./useEnhancedChat` (referenced in `composables/index.ts`)
- `./useOptimizedChat` (referenced in `composables/index.ts`)

### Solution:
- Add missing type exports to session types
- Import Ref from 'vue' where needed
- Remove or update references to deleted composables

## 5. Other Issues

### Router Service Issues:
- `getCurrentRoute` doesn't exist (should be `currentRoute`)
- `navigateToFallback` doesn't exist on RouterService
- `getState` doesn't exist on RouterService

### Undefined Variables:
- `useBridge` not found (in `useNScale.ts`)
- `sourceIndex` not defined (in `useSourceReferences.ts`)
- `_keydownHandler` not defined (in `useTheme.ts`)
- `_sourceIndex` not defined (in `sourceReferenceAdapter.ts`)

### API Issues:
- `isFeatureEnabled` doesn't exist on feature toggles
- Various service method signature mismatches

## Recommended Fix Order

1. **Fix Vue imports** - Update imports to use correct Vue 3 modules
2. **Remove bridge references** - Clean up EnhancedChatView.vue and other files
3. **Update store interfaces** - Ensure auth and sessions stores have correct properties
4. **Add missing types** - Export ChatMessage, SourceReference, etc.
5. **Fix service methods** - Update router service and other service calls
6. **Clean up undefined variables** - Remove or define missing variables

## Quick Fixes

```typescript
// Fix Vue imports in files like optimizedWatchers.ts
import type { WatchOptions, WatchSource, WatchStopHandle } from '@vue/runtime-core'

// Fix shallowRef imports
import { shallowRef } from '@vue/reactivity'

// Fix auth store usage
// Change from: authStore.user
// To: authStore.userRole or add user property to store

// Remove bridge usage in EnhancedChatView.vue
// Replace bridge.on() with direct store subscriptions or event bus
```

## Statistics

- Total unique error patterns: ~30
- Files affected: ~50+
- Most common issue: Missing Vue type exports
- Critical files: EnhancedChatView.vue, store implementations, composables