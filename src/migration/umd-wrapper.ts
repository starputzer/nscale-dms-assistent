/**
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
