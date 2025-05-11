/**
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
export const SHARED_UTILS_BUILD_DATE = '2025-05-11T11:23:06.132Z';
