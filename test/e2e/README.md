# E2E Tests

This directory contains end-to-end tests for the application using Playwright.

## Test Structure

- `specs/auth.spec.ts` - Authentication flow tests
- `specs/chat.spec.ts` - Chat functionality tests  
- `specs/document-converter.spec.ts` - Document converter tests
- `specs/settings.spec.ts` - Settings and preferences tests

## Running Tests

```bash
# Run all tests
npm run test:e2e

# Run tests in headed mode
npm run test:e2e -- --headed

# Run specific test file
npm run test:e2e -- specs/auth.spec.ts

# Run tests in specific browser
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
npm run test:e2e -- --project=webkit

# Run tests with UI mode
npm run test:e2e -- --ui

# Generate HTML report
npm run test:e2e -- --reporter=html
```

## Environment Variables

Set these environment variables for testing:

```bash
TEST_USERNAME=test_user
TEST_PASSWORD=test_password
BASE_URL=http://localhost:5173
```

## Writing Tests

1. Use data-testid attributes for reliable element selection
2. Include proper waits for async operations
3. Test both happy paths and error scenarios
4. Keep tests isolated and independent
5. Use descriptive test names

## Test Data

Place test fixtures in `/test/fixtures/`:
- `test-document.pdf` - Sample PDF for document converter tests
- `document1.pdf`, `document2.docx`, `document3.txt` - For batch upload tests
- `invalid-file.xyz` - For error handling tests

## Debugging

```bash
# Debug mode
npm run test:e2e -- --debug

# Generate trace on failure
npm run test:e2e -- --trace on

# Take screenshots on failure
npm run test:e2e -- --screenshot only-on-failure
```

## CI/CD Integration

Tests are automatically run in CI pipeline with:
- Multiple browser engines
- Parallel execution
- Automatic retries on failure
- Test artifacts collection