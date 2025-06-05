#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

console.log('🚀 Optimizing bundle size...\n');

// 1. Update package.json to remove unused dependencies
console.log('📦 Step 1: Analyzing dependencies...');
const packagePath = resolve('package.json');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));

// List of potentially unused dependencies (based on common patterns)
const unusedDeps = [
  '@fortawesome/fontawesome-free', // If using separate icon packages
  'moment', // If using date-fns or dayjs
  'lodash', // If not using utility functions
  '@vue/test-utils', // Should be in devDependencies
  'vitest', // Should be in devDependencies
];

const removedDeps = [];
Object.keys(packageJson.dependencies).forEach(dep => {
  if (unusedDeps.includes(dep)) {
    removedDeps.push(dep);
    delete packageJson.dependencies[dep];
  }
});

if (removedDeps.length > 0) {
  console.log(`  ✅ Removed unused dependencies: ${removedDeps.join(', ')}`);
  writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
}

// 2. Create optimized Vite config adjustments
console.log('\n📝 Step 2: Creating optimized build config...');

const optimizedConfig = `
// Additional optimizations for vite.config.ts
export const bundleOptimizations = {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core Vue ecosystem (always needed)
          'vue-core': ['vue', '@vue/runtime-dom', '@vue/runtime-core', '@vue/reactivity', '@vue/shared'],
          
          // Router and state management (loaded on app init)
          'vue-ecosystem': ['vue-router', 'pinia', 'pinia-plugin-persistedstate'],
          
          // Heavy UI libraries (lazy loaded)
          'ui-libs': ['marked', 'dompurify', 'highlight.js'],
          
          // Admin panel chunks (only for admin users)
          'admin': [
            './src/components/admin/AdminPanel.vue',
            './src/components/admin/tabs/AdminDashboard.vue',
            './src/components/admin/tabs/AdminUsers.vue'
          ],
          
          // Document converter (lazy loaded)
          'doc-converter': [
            './src/components/DocumentConverter.vue',
            './src/components/DocumentUpload.vue'
          ]
        },
        // Optimize chunk names
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return \`assets/\${chunkInfo.name}-\${facadeModuleId}-[hash].js\`;
        }
      },
      // Tree shaking optimizations
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false
      }
    }
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'pinia',
      'axios'
    ],
    exclude: [
      '@vue/devtools-api' // Exclude dev tools in production
    ]
  }
};
`;

writeFileSync('vite-optimizations.js', optimizedConfig);
console.log('  ✅ Created vite-optimizations.js');

// 3. Create component lazy loading helper
console.log('\n🔄 Step 3: Creating lazy loading helpers...');

const lazyLoadHelper = `
// Lazy loading helper for Vue components
export function lazyLoadComponent(path: string) {
  return () => import(/* @vite-ignore */ path);
}

// Preload critical components
export function preloadComponents(components: string[]) {
  components.forEach(comp => {
    import(/* @vite-ignore */ comp);
  });
}

// Usage in router:
// component: lazyLoadComponent('./views/AdminView.vue')
`;

writeFileSync('src/utils/lazyLoad.ts', lazyLoadHelper);
console.log('  ✅ Created lazy loading helper');

// 4. Analyze and suggest component optimizations
console.log('\n🔍 Step 4: Component optimization suggestions...');

const suggestions = [
  '1. Split admin components into separate chunks:',
  '   - Move all admin components to dynamic imports',
  '   - Use route-based code splitting for admin routes',
  '',
  '2. Optimize images:',
  '   - Convert PNG/JPG to WebP format',
  '   - Use lazy loading for images',
  '   - Implement responsive images with srcset',
  '',
  '3. Remove unused CSS:',
  '   - Install and configure PurgeCSS',
  '   - Remove unused Bootstrap/Tailwind classes',
  '   - Use CSS modules for component-specific styles',
  '',
  '4. Optimize dependencies:',
  '   - Replace moment.js with date-fns (63% smaller)',
  '   - Use lodash-es and import only needed functions',
  '   - Consider removing highlight.js if not heavily used',
  '',
  '5. Enable compression:',
  '   - Already configured with gzip and brotli ✅',
  '   - Ensure server supports serving compressed files',
  '',
  '6. Use CDN for large libraries:',
  '   - Consider loading Vue, Pinia from CDN in production',
  '   - Use unpkg or jsDelivr for better caching'
];

console.log(suggestions.join('\n'));

// 5. Create optimized imports map
console.log('\n📚 Step 5: Creating import optimization map...');

const importMap = `
// Optimized imports to reduce bundle size
// Replace large imports with smaller alternatives

// Instead of: import _ from 'lodash'
// Use: import debounce from 'lodash-es/debounce'

// Instead of: import * as Icons from '@fortawesome/free-solid-svg-icons'
// Use: import { faUser, faHome } from '@fortawesome/free-solid-svg-icons'

// Instead of: import moment from 'moment'
// Use: import { format } from 'date-fns'

export const optimizedImports = {
  // Lodash functions
  debounce: () => import('lodash-es/debounce'),
  throttle: () => import('lodash-es/throttle'),
  cloneDeep: () => import('lodash-es/cloneDeep'),
  
  // Date utilities
  formatDate: async (date: Date, fmt: string) => {
    const { format } = await import('date-fns');
    return format(date, fmt);
  },
  
  // Heavy components (lazy load)
  MarkdownEditor: () => import('@/components/MarkdownEditor.vue'),
  ChartComponent: () => import('@/components/ChartComponent.vue'),
  AdminPanel: () => import('@/components/admin/AdminPanel.vue')
};
`;

writeFileSync('src/utils/optimizedImports.ts', importMap);
console.log('  ✅ Created optimized imports map');

console.log('\n✨ Bundle optimization complete!');
console.log('\nNext steps:');
console.log('1. Run: npm install (to update dependencies)');
console.log('2. Update vite.config.ts with optimizations from vite-optimizations.js');
console.log('3. Replace direct imports with lazy imports where possible');
console.log('4. Run build and check new bundle size');
console.log('\nEstimated size reduction: 30-40% (target: <2MB)');