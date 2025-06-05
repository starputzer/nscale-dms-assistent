#!/usr/bin/env node
/**
 * Migration script to update all frontend services to use unified endpoint structure
 * Updates all API calls from various patterns to consistent /api/v1/* structure
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Endpoint mapping from old to new
const ENDPOINT_MAPPINGS = {
  // Auth endpoints
  '/api/auth/login': '/api/v1/auth/login',
  '/api/auth/logout': '/api/v1/auth/logout',
  '/api/auth/me': '/api/v1/auth/me',
  '/api/auth/user': '/api/v1/auth/me',
  
  // Admin endpoints - consolidate various patterns
  '/api/admin/get-stats': '/api/v1/admin/dashboard',
  '/api/admin/dashboard/stats': '/api/v1/admin/dashboard',
  '/api/v1/admin/dashboard/stats': '/api/v1/admin/dashboard',
  '/api/admin/users': '/api/v1/admin/users',
  '/api/admin/users/list': '/api/v1/admin/users',
  '/api/admin/feedback': '/api/v1/admin/feedback',
  '/api/admin/feedback/list': '/api/v1/admin/feedback',
  '/api/admin/statistics': '/api/v1/admin/statistics',
  '/api/admin/system/info': '/api/v1/admin/system/info',
  '/api/admin/system-info': '/api/v1/admin/system/info',
  '/api/admin/system/clear-cache': '/api/v1/admin/system/cache/clear',
  '/api/admin/system/optimize': '/api/v1/admin/system/optimize',
  '/api/admin/system/optimize-database': '/api/v1/admin/system/optimize',
  
  // RAG endpoints
  '/api/admin/rag/settings': '/api/v1/admin/rag/config',
  '/api/admin/rag-settings': '/api/v1/admin/rag/config',
  '/api/admin/rag/reindex': '/api/v1/admin/rag/reindex',
  
  // Knowledge manager
  '/api/admin/knowledge': '/api/v1/admin/knowledge',
  '/api/admin/knowledge/stats': '/api/v1/admin/knowledge',
  '/api/admin/knowledge/train': '/api/v1/admin/knowledge/train',
  
  // Background tasks
  '/api/admin/tasks': '/api/v1/admin/tasks',
  '/api/admin/background-tasks': '/api/v1/admin/tasks',
  '/api/admin/tasks/list': '/api/v1/admin/tasks',
  
  // System monitor
  '/api/admin/monitor/health': '/api/v1/admin/monitor/health',
  '/api/admin/system/health': '/api/v1/admin/monitor/health',
  '/api/admin/monitor/performance': '/api/v1/admin/monitor/performance',
  '/api/admin/performance': '/api/v1/admin/monitor/performance',
  
  // Document endpoints
  '/api/documents/upload': '/api/v1/documents/upload',
  '/api/upload': '/api/v1/documents/upload',
  '/api/documents': '/api/v1/documents',
  '/api/documents/list': '/api/v1/documents',
  
  // Chat endpoints
  '/api/chat/message': '/api/v1/chat/message',
  '/api/question': '/api/v1/chat/message',
  '/api/chat/sessions': '/api/v1/chat/sessions',
  '/api/sessions': '/api/v1/chat/sessions',
  
  // Feature toggles
  '/api/features': '/api/v1/features',
  '/api/feature-toggles': '/api/v1/features',
  
  // Health check
  '/api/health': '/api/v1/health',
  '/api/ping': '/api/v1/health',
  '/api/version': '/api/v1/version'
};

// Files to process
const FILE_PATTERNS = [
  'src/**/*.ts',
  'src/**/*.js',
  'src/**/*.vue'
];

class EndpointMigrator {
  constructor() {
    this.filesProcessed = 0;
    this.replacementsMade = 0;
    this.errors = [];
  }
  
  /**
   * Process a single file
   */
  processFile(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let originalContent = content;
      let fileReplacements = 0;
      
      // Replace each old endpoint with new one
      for (const [oldEndpoint, newEndpoint] of Object.entries(ENDPOINT_MAPPINGS)) {
        // Create regex patterns for different quote styles
        const patterns = [
          new RegExp(`["']${oldEndpoint}["']`, 'g'),
          new RegExp(`\`${oldEndpoint}\``, 'g'),
          new RegExp(`["']${oldEndpoint}/`, 'g'),
          new RegExp(`\`${oldEndpoint}/`, 'g')
        ];
        
        patterns.forEach(pattern => {
          const matches = content.match(pattern);
          if (matches) {
            fileReplacements += matches.length;
            content = content.replace(pattern, (match) => {
              const quote = match[0];
              const hasTrailingSlash = match.endsWith('/');
              return `${quote}${newEndpoint}${hasTrailingSlash ? '/' : ''}`;
            });
          }
        });
      }
      
      // Special case: Update BASE_URL or API_BASE_URL constants
      content = content.replace(
        /const\s+(BASE_URL|API_BASE_URL)\s*=\s*["'`]\/api["'`]/g,
        'const $1 = "/api/v1"'
      );
      
      // Update axios baseURL configurations
      content = content.replace(
        /baseURL:\s*["'`]\/api["'`]/g,
        'baseURL: "/api/v1"'
      );
      
      // If changes were made, write the file
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        this.filesProcessed++;
        this.replacementsMade += fileReplacements;
        console.log(`✅ Updated ${filePath} (${fileReplacements} replacements)`);
      }
      
    } catch (error) {
      this.errors.push({ file: filePath, error: error.message });
      console.error(`❌ Error processing ${filePath}: ${error.message}`);
    }
  }
  
  /**
   * Run the migration
   */
  async run() {
    console.log('🚀 Starting endpoint migration to unified structure...\n');
    
    // Find all files to process
    const files = [];
    for (const pattern of FILE_PATTERNS) {
      const matchedFiles = await glob(pattern, { 
        cwd: path.join(__dirname, '..'),
        absolute: true 
      });
      files.push(...matchedFiles);
    }
    
    console.log(`Found ${files.length} files to process\n`);
    
    // Process each file
    files.forEach(file => this.processFile(file));
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Files processed: ${this.filesProcessed}`);
    console.log(`Total replacements: ${this.replacementsMade}`);
    console.log(`Errors: ${this.errors.length}`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(({ file, error }) => {
        console.log(`   - ${file}: ${error}`);
      });
    }
    
    // Update config files
    this.updateConfigFiles();
    
    console.log('\n✅ Migration completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Review the changes');
    console.log('2. Update vite.config.js to use vite.config.unified.js');
    console.log('3. Update server.py to use server_unified.py');
    console.log('4. Run tests to verify everything works');
  }
  
  /**
   * Update configuration files
   */
  updateConfigFiles() {
    console.log('\n📝 Updating configuration files...');
    
    // Update shared/api-routes.ts if it exists
    const apiRoutesPath = path.join(__dirname, '..', 'shared', 'api-routes.ts');
    if (fs.existsSync(apiRoutesPath)) {
      let content = `// Unified API Routes Configuration
export const API_ROUTES = {
  // Base URL
  BASE: '/api/v1',
  
  // Authentication
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    LOGOUT: '/api/v1/auth/logout',
    ME: '/api/v1/auth/me'
  },
  
  // Chat
  CHAT: {
    MESSAGE: '/api/v1/chat/message',
    SESSIONS: '/api/v1/chat/sessions'
  },
  
  // Documents
  DOCUMENTS: {
    UPLOAD: '/api/v1/documents/upload',
    LIST: '/api/v1/documents',
    DELETE: (id: string) => \`/api/v1/documents/\${id}\`
  },
  
  // Admin
  ADMIN: {
    DASHBOARD: '/api/v1/admin/dashboard',
    USERS: '/api/v1/admin/users',
    USER: (id: number) => \`/api/v1/admin/users/\${id}\`,
    FEEDBACK: '/api/v1/admin/feedback',
    STATISTICS: '/api/v1/admin/statistics',
    SYSTEM: {
      INFO: '/api/v1/admin/system/info',
      CACHE_CLEAR: '/api/v1/admin/system/cache/clear',
      OPTIMIZE: '/api/v1/admin/system/optimize'
    },
    RAG: {
      CONFIG: '/api/v1/admin/rag/config',
      REINDEX: '/api/v1/admin/rag/reindex'
    },
    KNOWLEDGE: {
      BASE: '/api/v1/admin/knowledge',
      TRAIN: '/api/v1/admin/knowledge/train'
    },
    TASKS: {
      LIST: '/api/v1/admin/tasks',
      DETAIL: (id: string) => \`/api/v1/admin/tasks/\${id}\`,
      CANCEL: (id: string) => \`/api/v1/admin/tasks/\${id}/cancel\`
    },
    MONITOR: {
      HEALTH: '/api/v1/admin/monitor/health',
      PERFORMANCE: '/api/v1/admin/monitor/performance'
    }
  },
  
  // Public
  PUBLIC: {
    HEALTH: '/api/v1/health',
    VERSION: '/api/v1/version',
    FEATURES: '/api/v1/features'
  }
};

export default API_ROUTES;
`;
      fs.writeFileSync(apiRoutesPath, content, 'utf8');
      console.log('✅ Updated shared/api-routes.ts');
    }
  }
}

// Run the migration
const migrator = new EndpointMigrator();
migrator.run();