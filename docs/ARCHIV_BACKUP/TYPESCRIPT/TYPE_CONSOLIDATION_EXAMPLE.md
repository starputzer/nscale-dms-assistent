# TypeScript Type Consolidation Example

This document provides a practical example of consolidating redundant TypeScript types in the nscale DMS Assistenten project. It follows the principles outlined in the TYPE_REDUNDANCY_MANAGEMENT.md document.

## Table of Contents

1. [Problem Analysis](#problem-analysis)
2. [Current Implementation](#current-implementation)
3. [Consolidation Strategy](#consolidation-strategy)
4. [Consolidated Implementation](#consolidated-implementation)
5. [Migration Approach](#migration-approach)

## Problem Analysis

In our analysis of the codebase, we identified significant redundancy in the user-related type definitions. These types are defined in multiple places with slight variations, leading to confusion, maintenance challenges, and potential inconsistencies.

### Redundancy Assessment

We found user-related types defined in at least three different locations:

1. `src/types/auth.ts`: Core authentication types
2. `src/types/api.ts`: API-related user types
3. `src/types/models.ts`: Domain model user types

Each definition has similar core properties (id, email, displayName) but different additional properties and slightly different naming conventions.

## Current Implementation

Let's review the current implementations:

### 1. User Type in auth.ts

```typescript
// In src/types/auth.ts
export interface User {
  id: string;
  displayName: string;
  email: string;
  roles: string[];
  permissions?: string[];
  avatar?: string;
  lastLogin?: string;
  metadata?: Record<string, any>;
}

export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
}

export type Role = 'admin' | 'user' | 'guest' | string;

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  expiresAt: number | null;
  // ...other auth state properties
}
```

### 2. User Type in api.ts

```typescript
// In src/types/api.ts
export interface User {
  id: string;
  displayName: string;
  email: string;
  avatar?: string;
  roles: string[];
  permissions: string[];
  lastLogin?: string;
  preferences?: UserPreferences;
  metadata?: Record<string, any>;
}

export interface UserPreferences {
  language?: string;
  theme?: string;
  timezone?: string;
  dateFormat?: string;
  notifications?: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  [key: string]: any;
}

// API.Auth namespace with additional redundant types
export namespace API.Auth {
  export interface LoginRequest {
    email: string;
    password: string;
    rememberMe?: boolean;
  }
  
  export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    expiresAt: string;
    user: User;
  }
  
  // ...other API specific types
}
```

### 3. User Type in models.ts

```typescript
// In src/types/models.ts
export interface Entity {
  id: string;
}

export interface UserProfile extends Entity {
  displayName: string;
  email: string;
  avatar?: string;
  roles: string[];
  permissions?: string[];
  preferences?: {
    language: string;
    theme: string;
    notifications: NotificationPreferences;
    [key: string]: any;
  };
  metadata?: Record<string, any>;
  lastLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  frequency?: 'immediate' | 'daily' | 'weekly';
}

// Type aliases for backward compatibility
export type User = UserProfile;
```

## Consolidation Strategy

To address these redundancies, we'll implement a consolidation strategy with these key elements:

1. **Create a Central Types Module**: Establish a dedicated module for user-related types
2. **Apply Type Hierarchy**: Use interface inheritance for specialization
3. **Utilize Composition**: Break complex types into composable parts
4. **Maintain Backward Compatibility**: Provide type aliases for existing code
5. **Document Clearly**: Add comprehensive documentation for future developers

## Consolidated Implementation

Here's our consolidated approach:

### 1. Create a Dedicated User Types Module

```typescript
// In src/types/entities/user.ts

/**
 * @file User type definitions
 * @description Central type definitions for user-related data structures.
 * 
 * @redundancy-analysis
 * This file consolidates user types previously defined in:
 * - auth.ts (Basic user interface)
 * - api.ts (API-specific user interface)
 * - models.ts (UserProfile interface)
 */

/**
 * Base entity interface with ID
 */
export interface Entity {
  id: string;
}

/**
 * Entity with timestamps for creation and updates
 */
export interface TimestampedEntity extends Entity {
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * Notification preferences for different channels
 */
export interface NotificationPreferences {
  /** Email notifications enabled */
  email: boolean;
  /** Push notifications enabled */
  push: boolean;
  /** In-app notifications enabled */
  inApp: boolean;
  /** Notification frequency setting */
  frequency?: 'immediate' | 'daily' | 'weekly';
}

/**
 * User preferences for application settings
 */
export interface UserPreferences {
  /** Preferred language code (e.g. 'en-US') */
  language?: string;
  /** UI theme preference */
  theme?: string;
  /** User's timezone */
  timezone?: string;
  /** Preferred date format */
  dateFormat?: string;
  /** Notification settings */
  notifications?: NotificationPreferences;
  /** Additional user preferences */
  [key: string]: any;
}

/**
 * Base user interface with core properties
 */
export interface BaseUser extends Entity {
  /** User's display name */
  displayName: string;
  /** User's email address */
  email: string;
  /** Optional profile image URL */
  avatar?: string;
}

/**
 * Complete user model with all properties
 */
export interface User extends BaseUser, Partial<TimestampedEntity> {
  /** User's assigned roles */
  roles: string[];
  /** User's explicit permissions */
  permissions?: string[];
  /** User's preferences */
  preferences?: UserPreferences;
  /** Time of last login */
  lastLogin?: string | Date;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Authentication-specific user model
 */
export interface AuthUser extends BaseUser {
  /** User's roles for permission checks */
  roles: string[];
  /** User's explicit permissions */
  permissions?: string[];
  /** Is the user verified */
  isVerified?: boolean;
}

/**
 * API-specific user model
 */
export interface ApiUser extends User {
  /** Status of the user account */
  status?: 'active' | 'inactive' | 'suspended';
}

/**
 * User role definition
 */
export interface UserRole {
  /** Role identifier */
  id: string;
  /** Role display name */
  name: string;
  /** Permissions granted by this role */
  permissions: string[];
  /** Role description */
  description?: string;
}

/**
 * Common role types shorthand
 */
export type Role = 'admin' | 'user' | 'guest' | string;

/**
 * Login credentials
 */
export interface LoginCredentials {
  /** Username or email */
  username: string;
  /** User password */
  password: string;
  /** Remember login session */
  rememberMe?: boolean;
}

/**
 * @example
 * // Basic usage
 * const user: User = {
 *   id: '123',
 *   displayName: 'John Doe',
 *   email: 'john@example.com',
 *   roles: ['user'],
 *   preferences: {
 *     theme: 'dark',
 *     language: 'en-US'
 *   }
 * };
 * 
 * // Auth-specific usage
 * const authUser: AuthUser = {
 *   id: '123',
 *   displayName: 'John Doe',
 *   email: 'john@example.com',
 *   roles: ['user'],
 *   isVerified: true
 * };
 */
```

### 2. Update the Central Types Index

```typescript
// In src/types/index.ts

// Entity types
export * from './entities/user';
export * from './entities/session';
// ... other entity exports

// Re-export legacy type aliases for backward compatibility
import type { User as NewUser, AuthUser } from './entities/user';

// These type aliases maintain backward compatibility with existing code
// They should be gradually phased out as code is migrated
export type User = NewUser;
```

### 3. Handling API-Specific Types

```typescript
// In src/types/api/auth.ts

import type { User, LoginCredentials } from '../entities/user';

/**
 * Authentication API namespace
 */
export namespace Auth {
  /**
   * Login request payload
   */
  export interface LoginRequest extends LoginCredentials {
    /** Two-factor authentication token if required */
    twoFactorToken?: string;
  }
  
  /**
   * Login response from the API
   */
  export interface LoginResponse {
    /** JWT access token */
    accessToken: string;
    /** JWT refresh token */
    refreshToken: string;
    /** Token expiration time in seconds */
    expiresIn: number;
    /** Token expiration timestamp */
    expiresAt: string;
    /** User information */
    user: User;
  }
  
  // ... other API types
}

// Export for backward compatibility
export type { LoginRequest, LoginResponse } from './Auth';
```

## Migration Approach

To migrate the codebase to use the new consolidated types, we'll follow this approach:

### 1. Direct Path Approach

For simple cases, we'll update import paths to use the new types directly:

```typescript
// Before
import { User } from '@/types/auth';

// After
import { User } from '@/types/entities/user';
```

### 2. Type Alias Approach

For more complex cases where changing imports might cause widespread changes, we'll use the centralized type aliases:

```typescript
// No change needed in import, as types/index.ts re-exports the aliases
import { User } from '@/types';
```

### 3. Progressive Enhancement

For components that actively use the user types, we'll gradually update them to use the more specific interfaces:

```typescript
// Before
import { User } from '@/types';

// After
import { AuthUser } from '@/types/entities/user';
```

### 4. Documentation for Developers

Add clear guidance for developers on which types to use in which scenarios:

```typescript
/**
 * @preferred-usage
 * - Use BaseUser for minimal user information (ID, name, email)
 * - Use User for complete user model
 * - Use AuthUser for authentication-specific scenarios
 * - Use ApiUser for API request/response handling
 */
```

## Benefits of This Approach

1. **Single Source of Truth**: All user-related types are defined in a single module
2. **Type Reuse**: Composition allows reusing common properties
3. **Semantic Clarity**: Type names clearly indicate their purpose
4. **Backward Compatibility**: Existing code continues to work during migration
5. **Developer Guidance**: Documentation helps developers use the right type for each scenario