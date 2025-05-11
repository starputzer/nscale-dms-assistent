/**
 * Create Shared Utilities Script
 * 
 * This script creates a new shared utilities module that consolidates common functionality
 * from both Vanilla JS and Vue 3 implementations. It extracts shared business logic,
 * validation functions, and formatting utilities into a common set of files that can
 * be imported by both implementations.
 */

const fs = require('fs');
const path = require('path');

// Paths
const SHARED_DIR = path.resolve(__dirname, '../src/utils/shared');
const MIGRATION_DIR = path.resolve(__dirname, '../src/migration');

/**
 * Creates the shared utilities directory structure
 */
function createDirectoryStructure() {
  console.log('Creating shared utilities directory structure...');
  
  // Create main shared directory if it doesn't exist
  if (!fs.existsSync(SHARED_DIR)) {
    fs.mkdirSync(SHARED_DIR, { recursive: true });
    console.log(`Created shared utilities directory: ${SHARED_DIR}`);
  }
  
  // Create migration directory if it doesn't exist
  if (!fs.existsSync(MIGRATION_DIR)) {
    fs.mkdirSync(MIGRATION_DIR, { recursive: true });
    console.log(`Created migration directory: ${MIGRATION_DIR}`);
  }
  
  // Create subdirectories for different utility types
  const subDirs = [
    path.join(SHARED_DIR, 'validation'),
    path.join(SHARED_DIR, 'formatting'),
    path.join(SHARED_DIR, 'api'),
    path.join(SHARED_DIR, 'auth'),
    path.join(SHARED_DIR, 'error')
  ];
  
  for (const dir of subDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  }
}

/**
 * Creates the index.ts file for the shared utilities module
 */
function createIndexFile() {
  const indexPath = path.join(SHARED_DIR, 'index.ts');
  const indexContent = `/**
 * Shared Utilities
 * 
 * This module exports utilities that are shared between Vue 3 SFC and Vanilla JS implementations.
 * These utilities are designed to be framework-agnostic and can be used in both environments.
 */

// Re-export all utilities
export * from './validation';
export * from './formatting';
export * from './api';
export * from './auth';
export * from './error';

/**
 * Module version and metadata
 */
export const SHARED_UTILS_VERSION = '1.0.0';
export const SHARED_UTILS_BUILD_DATE = '${new Date().toISOString()}';
`;

  fs.writeFileSync(indexPath, indexContent);
  console.log(`Created index file: ${indexPath}`);
}

/**
 * Creates subdirectory index files
 */
function createSubdirectoryIndexFiles() {
  const dirs = ['validation', 'formatting', 'api', 'auth', 'error'];
  
  for (const dir of dirs) {
    const indexPath = path.join(SHARED_DIR, dir, 'index.ts');
    const indexContent = `/**
 * Shared ${dir.charAt(0).toUpperCase() + dir.slice(1)} Utilities
 * 
 * This module exports ${dir} utilities that are shared between Vue 3 SFC and Vanilla JS implementations.
 */

// Import and re-export all files in this directory
`;

    fs.writeFileSync(indexPath, indexContent);
    console.log(`Created index file for ${dir}: ${indexPath}`);
  }
}

/**
 * Creates the UUID utility module which is shared between implementations
 */
function createUuidUtility() {
  const uuidPath = path.join(SHARED_DIR, 'uuid-util.ts');
  const uuidContent = `/**
 * UUID Utility
 * 
 * This module provides functions for generating UUIDs that are used in both
 * Vue 3 SFC and Vanilla JS implementations.
 */

/**
 * Generates a v4 UUID
 * @returns {string} A randomly generated UUID
 */
export function v4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Creates a UUID for a specific namespace to ensure consistency
 * @param {string} namespace - The namespace to create a UUID for
 * @param {string} [name] - Optional name within the namespace
 * @returns {string} A deterministic UUID based on the inputs
 */
export function namespaced(namespace: string, name?: string): string {
  // Simple hash function for demonstration purposes
  // In production, use a more robust hashing algorithm
  const str = \`\${namespace}:\${name || ''}\`;
  let hash = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert hash to hex string with UUID format
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return \`\${hex.slice(0, 8)}-\${hex.slice(0, 4)}-4\${hex.slice(0, 3)}-\${
    (parseInt(hex.slice(0, 1), 16) & 0x3 | 0x8).toString(16)}\${hex.slice(1, 4)}-\${hex.slice(0, 12)}\`;
}

/**
 * Validates if a string is a valid UUID
 * @param {string} uuid - The string to validate
 * @returns {boolean} True if the string is a valid UUID
 */
export function isValid(uuid: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

// Backwards compatibility with the legacy API
export default {
  v4,
  namespaced,
  isValid
};
`;

  fs.writeFileSync(uuidPath, uuidContent);
  console.log(`Created UUID utility: ${uuidPath}`);
}

/**
 * Creates the validation utilities module
 */
function createValidationUtilities() {
  const validationPath = path.join(SHARED_DIR, 'validation', 'form-validation.ts');
  const validationContent = `/**
 * Form Validation Utilities
 * 
 * This module provides validation functions for forms that are used in both
 * Vue 3 SFC and Vanilla JS implementations.
 */

/**
 * Validates an email address
 * @param {string} email - The email address to validate
 * @returns {boolean} True if the email address is valid
 */
export function validateEmail(email: string): boolean {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;
  return regex.test(email);
}

/**
 * Validates a password
 * @param {string} password - The password to validate
 * @param {Object} options - Validation options
 * @returns {boolean} True if the password is valid
 */
export function validatePassword(
  password: string, 
  options: { 
    minLength?: number, 
    requireUppercase?: boolean,
    requireLowercase?: boolean,
    requireNumbers?: boolean,
    requireSpecial?: boolean
  } = {}
): boolean {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecial = false
  } = options;
  
  if (password.length < minLength) {
    return false;
  }
  
  if (requireUppercase && !/[A-Z]/.test(password)) {
    return false;
  }
  
  if (requireLowercase && !/[a-z]/.test(password)) {
    return false;
  }
  
  if (requireNumbers && !/[0-9]/.test(password)) {
    return false;
  }
  
  if (requireSpecial && !/[!@#$%^&*()_+\\-=\\[\\]{};':"\\\\|,.<>\\/?]/.test(password)) {
    return false;
  }
  
  return true;
}

/**
 * Validates that a value is not empty
 * @param {any} value - The value to validate
 * @returns {boolean} True if the value is not empty
 */
export function validateRequired(value: any): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  
  return true;
}

/**
 * Validates a URL
 * @param {string} url - The URL to validate
 * @returns {boolean} True if the URL is valid
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Bundle all validation functions into a single object for backwards compatibility
 */
export const FormValidation = {
  validateEmail,
  validatePassword,
  validateRequired,
  validateUrl
};

export default FormValidation;
`;

  fs.writeFileSync(validationPath, validationContent);
  console.log(`Created form validation utilities: ${validationPath}`);
}

/**
 * Creates the formatting utilities module
 */
function createFormattingUtilities() {
  const formattingPath = path.join(SHARED_DIR, 'formatting', 'date-formatter.ts');
  const formattingContent = `/**
 * Date Formatting Utilities
 * 
 * This module provides date formatting functions that are used in both
 * Vue 3 SFC and Vanilla JS implementations.
 */

/**
 * Supported date format options
 */
export type DateFormatOptions = {
  timeZone?: string;
  includeTime?: boolean;
  locale?: string;
};

/**
 * Formats a date using the specified format
 * @param {Date|string|number} date - The date to format
 * @param {string} format - The format to use
 * @param {DateFormatOptions} options - Formatting options
 * @returns {string} The formatted date
 */
export function formatDate(
  date: Date | string | number, 
  format: string = 'yyyy-MM-dd',
  options: DateFormatOptions = {}
): string {
  const {
    timeZone = 'UTC',
    includeTime = false,
    locale = 'de-DE'
  } = options;
  
  // Convert to Date object if necessary
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date)
    : date;
  
  // Basic formatting using Intl.DateTimeFormat
  const dateTimeFormat = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: includeTime ? '2-digit' : undefined,
    minute: includeTime ? '2-digit' : undefined,
    second: includeTime ? '2-digit' : undefined,
    timeZone
  });
  
  const formattedDate = dateTimeFormat.format(dateObj);
  
  // Handle custom format
  if (format === 'iso') {
    return dateObj.toISOString();
  }
  
  if (format === 'localized') {
    return formattedDate;
  }
  
  // Basic custom format parsing
  let result = format;
  
  // Extract date parts
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  const hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  const seconds = dateObj.getSeconds();
  
  // Replace format tokens
  result = result.replace(/yyyy/g, year.toString());
  result = result.replace(/MM/g, month.toString().padStart(2, '0'));
  result = result.replace(/dd/g, day.toString().padStart(2, '0'));
  
  if (includeTime) {
    result = result.replace(/HH/g, hours.toString().padStart(2, '0'));
    result = result.replace(/mm/g, minutes.toString().padStart(2, '0'));
    result = result.replace(/ss/g, seconds.toString().padStart(2, '0'));
  }
  
  return result;
}

/**
 * Formats a relative time (e.g., "2 hours ago")
 * @param {Date|string|number} date - The date to format
 * @param {string} locale - The locale to use
 * @returns {string} The formatted relative time
 */
export function formatRelativeTime(
  date: Date | string | number,
  locale: string = 'de-DE'
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date)
    : date;
  
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  
  // Convert to seconds
  const diffSec = Math.floor(diffMs / 1000);
  
  if (diffSec < 60) {
    return 'Gerade eben';
  }
  
  // Convert to minutes
  const diffMin = Math.floor(diffSec / 60);
  
  if (diffMin < 60) {
    return \`Vor \${diffMin} Minute\${diffMin === 1 ? '' : 'n'}\`;
  }
  
  // Convert to hours
  const diffHour = Math.floor(diffMin / 60);
  
  if (diffHour < 24) {
    return \`Vor \${diffHour} Stunde\${diffHour === 1 ? '' : 'n'}\`;
  }
  
  // Convert to days
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffDay < 7) {
    return \`Vor \${diffDay} Tag\${diffDay === 1 ? '' : 'en'}\`;
  }
  
  // Format the date for older dates
  return formatDate(dateObj, 'localized', { locale });
}

/**
 * Bundle all formatting functions into a single object for backwards compatibility
 */
export const DateFormatter = {
  formatDate,
  formatRelativeTime
};

export default DateFormatter;
`;

  fs.writeFileSync(formattingPath, formattingContent);
  console.log(`Created date formatting utilities: ${formattingPath}`);
}

/**
 * Creates the error handling utilities module
 */
function createErrorUtilities() {
  const errorPath = path.join(SHARED_DIR, 'error', 'error-classifier.ts');
  const errorContent = `/**
 * Error Classification Utilities
 * 
 * This module provides error handling utilities that are used in both
 * Vue 3 SFC and Vanilla JS implementations.
 */

/**
 * Error types for classification
 */
export enum ErrorType {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  SERVER = 'server',
  CLIENT = 'client',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  CRITICAL = 'critical',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

/**
 * Error details interface
 */
export interface ErrorDetails {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  originalError?: any;
  code?: string;
  details?: any;
  timestamp: number;
}

/**
 * Classifies an error based on its properties
 * @param {any} error - The error to classify
 * @returns {ErrorDetails} The classified error details
 */
export function classifyError(error: any): ErrorDetails {
  // Default error details
  const errorDetails: ErrorDetails = {
    type: ErrorType.UNKNOWN,
    severity: ErrorSeverity.ERROR,
    message: 'An unknown error occurred',
    originalError: error,
    timestamp: Date.now()
  };
  
  // No error provided
  if (!error) {
    return errorDetails;
  }
  
  // Extract message
  errorDetails.message = error.message || errorDetails.message;
  
  // Axios error
  if (error.isAxiosError) {
    // Network error
    if (error.code === 'ECONNABORTED' || !error.response) {
      errorDetails.type = ErrorType.NETWORK;
      errorDetails.severity = ErrorSeverity.ERROR;
      errorDetails.message = 'Network error: Could not connect to the server';
      return errorDetails;
    }
    
    // Extract status code and error details
    const status = error.response?.status;
    errorDetails.code = status?.toString();
    errorDetails.details = error.response?.data;
    
    // Classify based on status code
    if (status === 401) {
      errorDetails.type = ErrorType.AUTHENTICATION;
      errorDetails.severity = ErrorSeverity.ERROR;
      errorDetails.message = 'Authentication error: Please log in again';
    } else if (status === 403) {
      errorDetails.type = ErrorType.AUTHORIZATION;
      errorDetails.severity = ErrorSeverity.ERROR;
      errorDetails.message = 'Authorization error: You do not have permission to perform this action';
    } else if (status === 400 || status === 422) {
      errorDetails.type = ErrorType.VALIDATION;
      errorDetails.severity = ErrorSeverity.WARNING;
      errorDetails.message = error.response?.data?.message || 'Validation error: Please check your input';
    } else if (status >= 500) {
      errorDetails.type = ErrorType.SERVER;
      errorDetails.severity = ErrorSeverity.CRITICAL;
      errorDetails.message = 'Server error: Please try again later';
    } else {
      errorDetails.type = ErrorType.CLIENT;
      errorDetails.severity = ErrorSeverity.ERROR;
      errorDetails.message = error.response?.data?.message || 'Client error: An unexpected error occurred';
    }
    
    return errorDetails;
  }
  
  // Timeout error
  if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
    errorDetails.type = ErrorType.TIMEOUT;
    errorDetails.severity = ErrorSeverity.ERROR;
    errorDetails.message = 'Request timed out: The server took too long to respond';
    return errorDetails;
  }
  
  // Auth-related errors
  if (error.name === 'AuthError' || error.message?.includes('auth')) {
    errorDetails.type = ErrorType.AUTHENTICATION;
    errorDetails.severity = ErrorSeverity.ERROR;
    return errorDetails;
  }
  
  // Return the classified error
  return errorDetails;
}

/**
 * Gets a user-friendly error message based on the error details
 * @param {ErrorDetails} errorDetails - The classified error details
 * @returns {string} A user-friendly error message
 */
export function getUserFriendlyMessage(errorDetails: ErrorDetails): string {
  switch (errorDetails.type) {
    case ErrorType.NETWORK:
      return 'Es konnte keine Verbindung zum Server hergestellt werden. Bitte überprüfen Sie Ihre Internetverbindung.';
    
    case ErrorType.AUTHENTICATION:
      return 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.';
    
    case ErrorType.AUTHORIZATION:
      return 'Sie haben keine Berechtigung, diese Aktion durchzuführen.';
    
    case ErrorType.VALIDATION:
      return 'Die eingegebenen Daten sind ungültig. Bitte überprüfen Sie Ihre Eingaben.';
    
    case ErrorType.SERVER:
      return 'Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
    
    case ErrorType.TIMEOUT:
      return 'Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es später erneut.';
    
    case ErrorType.CLIENT:
      return 'Ein Fehler ist aufgetreten. Bitte laden Sie die Seite neu.';
    
    default:
      return 'Ein unbekannter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
  }
}

/**
 * Bundle all error utilities into a single object for backwards compatibility
 */
export const ErrorClassifier = {
  classifyError,
  getUserFriendlyMessage,
  ErrorType,
  ErrorSeverity
};

export default ErrorClassifier;
`;

  fs.writeFileSync(errorPath, errorContent);
  console.log(`Created error classification utilities: ${errorPath}`);
}

/**
 * Creates a UMD wrapper for the shared utilities
 */
function createUmdWrapper() {
  const umdWrapperPath = path.join(MIGRATION_DIR, 'umd-wrapper.ts');
  const umdWrapperContent = `/**
 * UMD Wrapper for Shared Utilities
 * 
 * This module wraps the shared utilities in a UMD (Universal Module Definition) format
 * so they can be used in both module and non-module environments.
 */

import * as SharedUtils from '../utils/shared';

/**
 * Creates a UMD wrapper for the shared utilities
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    // Browser globals (root is window)
    root.SharedUtils = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  return SharedUtils;
}));

// Also export directly for TypeScript imports
export default SharedUtils;
`;

  fs.writeFileSync(umdWrapperPath, umdWrapperContent);
  console.log(`Created UMD wrapper: ${umdWrapperPath}`);
}

/**
 * Creates a migration guide for using the shared utilities
 */
function createMigrationGuide() {
  const guidePath = path.join(MIGRATION_DIR, 'SHARED_UTILS_MIGRATION.md');
  const guideContent = `# Migration Guide: Shared Utilities

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

\`\`\`
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
\`\`\`

## Migration Steps

### 1. Update Imports in Vue 3 SFC Components

Replace imports from local utility files with imports from the shared module:

\`\`\`typescript
// Before
import { v4 as uuidv4 } from '@/utils/uuidUtil';
import { validateEmail } from '@/utils/validation';

// After
import { v4 as uuidv4, validateEmail } from '@/utils/shared';
\`\`\`

### 2. Update Vanilla JS Code

Replace imports and function calls in Vanilla JS code:

\`\`\`javascript
// Before
import { v4 as uuidv4 } from './utils/uuid-util.js';

// After
import { v4 as uuidv4 } from '../src/utils/shared';
// OR use the UMD wrapper
const { v4: uuidv4 } = window.SharedUtils;
\`\`\`

### 3. Add UMD Wrapper to HTML Files

For HTML files that use Vanilla JS, include the UMD wrapper script:

\`\`\`html
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
\`\`\`

## Function Mapping

Here's a mapping of old functions to their shared equivalents:

### UUID Utilities

| Old Function | Shared Equivalent |
|--------------|-------------------|
| \`uuid-util.js:v4\` | \`SharedUtils.v4\` |
| \`uuidUtil.ts:v4\` | \`SharedUtils.v4\` |

### Validation Utilities

| Old Function | Shared Equivalent |
|--------------|-------------------|
| \`validation.js:validateEmail\` | \`SharedUtils.validateEmail\` |
| \`validate.ts:validateEmail\` | \`SharedUtils.validateEmail\` |
| \`validation.js:validatePassword\` | \`SharedUtils.validatePassword\` |
| \`validate.ts:validatePassword\` | \`SharedUtils.validatePassword\` |

### Formatting Utilities

| Old Function | Shared Equivalent |
|--------------|-------------------|
| \`date-utils.js:formatDate\` | \`SharedUtils.formatDate\` |
| \`dateUtil.ts:formatDate\` | \`SharedUtils.formatDate\` |
| \`time-utils.js:formatRelativeTime\` | \`SharedUtils.formatRelativeTime\` |
| \`timeUtil.ts:formatRelativeTime\` | \`SharedUtils.formatRelativeTime\` |

### Error Handling Utilities

| Old Function | Shared Equivalent |
|--------------|-------------------|
| \`error-handler.js:classifyError\` | \`SharedUtils.classifyError\` |
| \`ErrorClassifier.ts:classifyError\` | \`SharedUtils.classifyError\` |
| \`error-handler.js:getFriendlyMessage\` | \`SharedUtils.getUserFriendlyMessage\` |
| \`ErrorClassifier.ts:getUserFriendlyMessage\` | \`SharedUtils.getUserFriendlyMessage\` |

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

\`\`\`bash
npm run test
\`\`\`

## Need Help?

If you need help migrating to the shared utilities, please refer to the examples or contact the development team.
`;

  fs.writeFileSync(guidePath, guideContent);
  console.log(`Created migration guide: ${guidePath}`);
}

/**
 * Creates a webpack/rollup configuration for bundling shared utilities
 */
function createBundleConfig() {
  const webpackConfigPath = path.join(MIGRATION_DIR, 'shared-utils-webpack.config.js');
  const webpackConfigContent = `/**
 * Webpack configuration for bundling shared utilities
 */
const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/migration/umd-wrapper.ts',
  module: {
    rules: [
      {
        test: /\\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, '../src'),
    },
  },
  output: {
    filename: 'shared-utils.js',
    path: path.resolve(__dirname, '../frontend/js'),
    library: 'SharedUtils',
    libraryTarget: 'umd',
    globalObject: 'this',
  },
};
`;

  const rollupConfigPath = path.join(MIGRATION_DIR, 'shared-utils-rollup.config.js');
  const rollupConfigContent = `/**
 * Rollup configuration for bundling shared utilities
 */
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import path from 'path';

export default {
  input: 'src/migration/umd-wrapper.ts',
  output: {
    file: 'frontend/js/shared-utils.js',
    format: 'umd',
    name: 'SharedUtils',
    sourcemap: true,
  },
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
    }),
    resolve(),
    commonjs(),
    terser(),
  ],
};
`;

  fs.writeFileSync(webpackConfigPath, webpackConfigContent);
  console.log(`Created Webpack config: ${webpackConfigPath}`);
  
  fs.writeFileSync(rollupConfigPath, rollupConfigContent);
  console.log(`Created Rollup config: ${rollupConfigPath}`);
}

/**
 * Main function to create all shared utilities
 */
function main() {
  console.log('Creating shared utilities...');
  
  // Create directory structure
  createDirectoryStructure();
  
  // Create index files
  createIndexFile();
  createSubdirectoryIndexFiles();
  
  // Create utility modules
  createUuidUtility();
  createValidationUtilities();
  createFormattingUtilities();
  createErrorUtilities();
  
  // Create UMD wrapper
  createUmdWrapper();
  
  // Create migration guide
  createMigrationGuide();
  
  // Create bundle configuration
  createBundleConfig();
  
  console.log('Shared utilities created successfully!');
}

// Run the main function
main();