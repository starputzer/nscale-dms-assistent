# Migration Guide: Shared Utilities

This document describes how to migrate from duplicate implementations to the new shared utilities.

## Overview

The shared utilities module provides a set of functions that work across both Vue 3 SFC and Vanilla JS implementations.
By using these shared utilities, we can:

1. Eliminate duplicate code
2. Ensure consistent behavior across implementations
3. Make future updates easier
4. Reduce the overall bundle size

## Directory Structure

The shared utilities are organized as follows:

```
src/utils/shared/
├── index.ts               # Main entry point
├── uuid-util.ts           # UUID generation utilities
├── validation/            # Form validation utilities
│   ├── index.ts
│   └── form-validation.ts
├── formatting/            # Formatting utilities
│   ├── index.ts
│   └── date-formatter.ts
├── api/                   # API utilities
│   └── index.ts
├── auth/                  # Authentication utilities
│   └── index.ts
└── error/                 # Error handling utilities
    ├── index.ts
    └── error-classifier.ts
```

## Migration Steps

### 1. Update Imports in Vue 3 SFC Components

Replace imports from local utility files with imports from the shared module:

```typescript
// Before
import { v4 as uuidv4 } from '@/utils/uuidUtil';
import { validateEmail } from '@/utils/validation';

// After
import { v4 as uuidv4, validateEmail } from '@/utils/shared';
```

### 2. Update Vanilla JS Code

Replace imports and function calls in Vanilla JS code:

```javascript
// Before
import { v4 as uuidv4 } from './utils/uuid-util.js';

// After
import { v4 as uuidv4 } from '../src/utils/shared';
// OR use the UMD wrapper
const { v4: uuidv4 } = window.SharedUtils;
```

### 3. Add UMD Wrapper to HTML Files

For HTML files that use Vanilla JS, include the UMD wrapper script:

```html
<!-- Before -->
<script src="js/utils/uuid-util.js"></script>
<script src="js/utils/validation.js"></script>

<!-- After -->
<script src="js/shared-utils.js"></script>
<script>
  // Access utilities via global SharedUtils object
  const { v4: uuidv4 } = SharedUtils;
  const { validateEmail } = SharedUtils;
</script>
```

## Function Mapping

Here's a mapping of old functions to their shared equivalents:

### UUID Utilities

| Old Function | Shared Equivalent |
|--------------|-------------------|
| `uuid-util.js:v4` | `SharedUtils.v4` |
| `uuidUtil.ts:v4` | `SharedUtils.v4` |

### Validation Utilities

| Old Function | Shared Equivalent |
|--------------|-------------------|
| `validation.js:validateEmail` | `SharedUtils.validateEmail` |
| `validate.ts:validateEmail` | `SharedUtils.validateEmail` |
| `validation.js:validatePassword` | `SharedUtils.validatePassword` |
| `validate.ts:validatePassword` | `SharedUtils.validatePassword` |

### Formatting Utilities

| Old Function | Shared Equivalent |
|--------------|-------------------|
| `date-utils.js:formatDate` | `SharedUtils.formatDate` |
| `dateUtil.ts:formatDate` | `SharedUtils.formatDate` |
| `time-utils.js:formatRelativeTime` | `SharedUtils.formatRelativeTime` |
| `timeUtil.ts:formatRelativeTime` | `SharedUtils.formatRelativeTime` |

### Error Handling Utilities

| Old Function | Shared Equivalent |
|--------------|-------------------|
| `error-handler.js:classifyError` | `SharedUtils.classifyError` |
| `ErrorClassifier.ts:classifyError` | `SharedUtils.classifyError` |
| `error-handler.js:getFriendlyMessage` | `SharedUtils.getUserFriendlyMessage` |
| `ErrorClassifier.ts:getUserFriendlyMessage` | `SharedUtils.getUserFriendlyMessage` |

## Getting Started

1. Replace imports as described above
2. Update function calls as needed (most functions have the same signature)
3. Test your changes thoroughly
4. Remove the old utility files once migration is complete

## Backward Compatibility

The shared utilities are designed to be backward compatible with the existing implementations.
If you find any inconsistencies or issues, please report them.

## Testing

After migrating to the shared utilities, run the test suite to ensure everything works as expected:

```bash
npm run test
```

## Need Help?

If you need help migrating to the shared utilities, please refer to the examples or contact the development team.
