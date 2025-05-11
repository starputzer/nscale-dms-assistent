# Vanilla JavaScript Tests

This directory contains tests for the vanilla JavaScript components of the nScale DMS Assistant application. The tests are organized by component area and focus on ensuring proper behavior and error handling.

## Test Structure

```
test/vanilla/
  ├── setup.js              # Common setup for all vanilla JS tests
  ├── chat/                 # Tests for chat functionality
  │   └── chat.spec.js      # Chat message streaming, sending, event handling
  ├── app/                  # Tests for main app functionality
  │   └── session.spec.js   # Session management, creation, loading, deletion
  └── document-converter/   # Tests for document converter
      └── document-converter.spec.js  # Document upload, conversion, status
```

## Running Tests

```bash
# Run all vanilla JS tests
npm run test:vanilla

# Run tests in watch mode during development
npm run test:vanilla:watch
```

## Test Coverage

### Chat Functionality

- Sending questions with streaming responses
- Sending questions without streaming (fallback)
- Handling EventSource events (message, done, error)
- Stream cleanup and error handling
- Edge cases (empty messages, errors, retries)

### Session Management

- Loading/switching sessions
- Creating new sessions
- Deleting sessions
- Session persistence via localStorage
- Error handling

### Document Converter

- File upload with progress tracking
- Document conversion with settings
- Progress monitoring
- Document listing and management
- Content download
- Error handling

## Adding New Tests

1. Create a new `.spec.js` file in the appropriate subdirectory
2. Import the necessary testing utilities and modules
3. Use the following pattern for organizing tests:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Component Name', () => {
  // Setup
  beforeEach(() => {
    // Test setup
  });

  // Test groups
  describe('Feature 1', () => {
    it('should do something specific', () => {
      // Test case
    });
    
    it('should handle errors', () => {
      // Error case
    });
  });
});
```

## Mocking

The tests use mocks for:
- EventSource (for SSE streaming)
- axios (for API calls)
- localStorage (for persistence)
- FormData (for file uploads)
- window global objects

These mocks are set up in the `setup.js` file and can be further customized in individual test files.