/**
 * Fix for ensuring all axios instances use the correct base URL
 */

import axios from 'axios';

export function fixAxiosBaseURL() {
  // Set the default base URL for all axios instances
  axios.defaults.baseURL = '';  // Empty so paths like /api/feedback work correctly
  
  // Log the current configuration
  console.log('🔧 Fixed axios defaults:', {
    baseURL: axios.defaults.baseURL || '(empty)',
    headers: axios.defaults.headers.common
  });
  
  // Also fix any hardcoded axios instances that might exist
  if (typeof window !== 'undefined') {
    // Store the correct configuration globally
    (window as any).__AXIOS_BASE_URL__ = '';
    (window as any).__API_PORT__ = 8000;
    
    // Override any attempts to create axios instances with wrong base URL
    const originalCreate = axios.create;
    axios.create = function(config: any = {}) {
      // Force correct base URL if it contains wrong port
      if (config.baseURL && (config.baseURL.includes('8080') || config.baseURL.includes('3000'))) {
        console.warn(`⚠️ Fixing incorrect baseURL: ${config.baseURL} -> (empty)`);
        config.baseURL = '';
      }
      
      // If baseURL is /api, clear it to avoid double /api
      if (config.baseURL === '/api') {
        config.baseURL = '';
      }
      
      return originalCreate.call(axios, config);
    };
    
    // Intercept all axios requests to fix URLs
    axios.interceptors.request.use(
      (config: any) => {
        // Fix the URL if it contains wrong ports
        if (config.url && (config.url.includes(':8080') || config.url.includes(':3000'))) {
          const oldUrl = config.url;
          config.url = config.url.replace(/http:\/\/localhost:(8080|3000)/, '');
          console.warn(`🔧 Fixed request URL: ${oldUrl} -> ${config.url}`);
        }
        
        // Ensure baseURL doesn't have wrong ports
        if (config.baseURL && (config.baseURL.includes(':8080') || config.baseURL.includes(':3000'))) {
          const oldBaseURL = config.baseURL;
          config.baseURL = config.baseURL.replace(/http:\/\/localhost:(8080|3000)/, '');
          console.warn(`🔧 Fixed baseURL: ${oldBaseURL} -> ${config.baseURL}`);
        }
        
        // If baseURL is /api and URL already starts with /api, clear baseURL
        if (config.baseURL === '/api' && config.url && config.url.startsWith('/api')) {
          config.baseURL = '';
        }
        
        return config;
      },
      (error: any) => {
        return Promise.reject(error);
      }
    );
  }
}

// Auto-execute the fix
fixAxiosBaseURL();