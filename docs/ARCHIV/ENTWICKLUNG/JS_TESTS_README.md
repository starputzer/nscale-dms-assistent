# JavaScript Tests for nScale DMS Assistant

This document provides an overview of the JavaScript test suite created for the critical vanilla JavaScript components of the nScale DMS Assistant.

## Overview

The test suite focuses on three critical areas:

1. **Chat Functionality** - Testing message sending, receiving, and streaming
2. **Session Management** - Testing session creation, switching, and persistence
3. **Document Converter** - Testing document upload, conversion, and downloading

## Test Structure

The tests are organized in a modular structure:

```
test/vanilla/
  ├── setup.js              # Common test setup and mocks
  ├── chat/                 # Chat functionality tests
  │   └── chat.spec.js      
  ├── app/                  # App/Session management tests
  │   └── session.spec.js   
  └── document-converter/   # Document converter tests
      └── document-converter.spec.js
```

## Running Tests

The test suite uses Vitest for running tests. New npm scripts have been added to package.json:

```bash
# Run all vanilla JS tests
npm run test:vanilla

# Run tests in watch mode during development
npm run test:vanilla:watch
```

## Chat Functionality Tests

The chat functionality tests (`chat.spec.js`) cover:

- **Streaming Communication**
  - Sending questions with streaming (EventSource) responses
  - Handling different event types (message, done, error)
  - Stream retry and timeout handling
  - Fallback to non-streaming mode
  
- **Message Management**
  - Adding user messages
  - Receiving and displaying assistant messages
  - Handling empty messages and errors
  
- **Event Handling**
  - Connection open and error events
  - Message parsing and token processing
  - Cleanup and state management

- **Error Scenarios**
  - Network errors
  - Stream errors and timeouts
  - API errors
  - Invalid JSON responses

## Session Management Tests

The session tests (`session.spec.js`) cover:

- **Session Operations**
  - Creating new sessions
  - Loading existing sessions
  - Switching between sessions
  - Deleting sessions
  
- **Persistence**
  - Saving session state to localStorage
  - Restoring session from localStorage
  - Handling missing or invalid saved sessions
  
- **UI State**
  - Message of the day (MOTD) handling
  - Loading states
  - Error handling and recovery

- **API Interactions**
  - Loading session data
  - Updating session titles
  - Handling API failures

## Document Converter Tests

The document converter tests (`document-converter.spec.js`) cover:

- **Upload Functionality**
  - File upload process
  - Progress tracking
  - Error handling
  
- **Conversion Process**
  - Starting conversions with settings
  - Tracking conversion progress
  - Monitoring step-by-step status
  
- **Document Management**
  - Listing documents
  - Retrieving specific documents
  - Deleting documents
  
- **End-to-End Flow**
  - Full document workflow
  - Error cases at each stage
  - Progress monitoring

## Test Mocking Strategy

Tests use a combination of:

- **Function Mocks** - For individual functions
- **API Mocks** - For axios and fetch calls
- **Browser API Mocks** - For EventSource, localStorage, etc.
- **Time/Timer Mocks** - For setTimeout and interval handling

## Coverage Areas

The test suite covers:

- **Happy Paths** - Normal execution flows
- **Sad Paths** - Error handling and recovery
- **Edge Cases** - Empty inputs, missing data, race conditions
- **Async Behavior** - Promise handling, event streams

## Integration with Existing Tests

These tests complement the existing Vue component tests in the codebase. The vanilla JS tests focus specifically on the core JavaScript functionality separate from the Vue framework.

## Future Enhancements

Potential areas for extending the test suite:

1. Add tests for other vanilla JS modules (app-extensions.js, settings.js)
2. Add end-to-end integration tests combining multiple modules
3. Add performance tests for streaming functionality
4. Create snapshot tests for message formatting functions