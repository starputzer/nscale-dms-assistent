TypeScript fixes summary
------------------------

## Completed Fixes

1. Fixed utility types in typeUtils.ts:
   - Resolved re-export conflicts and ambiguity
   - Used proper export syntax with isolatedModules
   - Fixed type naming and imports

2. Fixed store helpers in storeHelper.ts:
   - Implemented proper interface implementations with typecast
   - Added missing interface methods for compatibility
   - Ensured proper type casting for store access

3. Fixed bridge components:
   - Corrected import declarations
   - Improved store interface compatibility
   - Used proper typecast techniques

4. Added missing types:
   - Added updateStreamedMessage to ISessionsStore interface
   - Fixed SupportedFormat imports
   - Ensured API and service type compatibility

## Remaining Issues

Several issues remain to be fixed:

1. Unused variable warnings
2. Module import errors (particularly in optimized bridge components)
3. Duplicate exports in index.ts files
4. File casing issues (such as BatchedEventEmitter vs batchedEventEmitter)
5. Possible undefined memory access warnings

These issues mostly affect specific components rather than the central store and utility implementations, which have been successfully fixed.
