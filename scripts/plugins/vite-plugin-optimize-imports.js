/**
 * Vite plugin to optimize imports and reduce bundle size
 */

export function optimizeImports() {
  return {
    name: 'optimize-imports',
    enforce: 'pre',
    resolveId(source, importer) {
      // Redirect imports to optimized versions
      if (source === '@/utils/messageFormatter' || source.endsWith('/messageFormatter')) {
        return source.replace('messageFormatter', 'messageFormatterOptimized');
      }
      if (source === '@/components/chat/MessageItem.vue' || source.endsWith('/MessageItem.vue')) {
        return source.replace('MessageItem.vue', 'MessageItemOptimized.vue');
      }
      return null;
    },
    transform(code, id) {
      let transformed = false;
      let newCode = code;
      
      // Replace messageFormatter imports
      if (id.endsWith('.ts') || id.endsWith('.vue')) {
        if (code.includes('messageFormatter') && !code.includes('messageFormatterOptimized')) {
          newCode = newCode.replace(/messageFormatter/g, 'messageFormatterOptimized');
          transformed = true;
        }
        
        // Replace MessageItem imports
        if (code.includes('MessageItem.vue') && !code.includes('MessageItemOptimized.vue')) {
          newCode = newCode.replace(/MessageItem\.vue/g, 'MessageItemOptimized.vue');
          transformed = true;
        }
        
        // Remove direct imports of heavy libraries in components
        if (code.includes('import hljs from') || code.includes('import * as hljs from')) {
          newCode = newCode.replace(/import\s+(?:\*\s+as\s+)?hljs\s+from\s+['"]highlight\.js['"];?/g, '');
          transformed = true;
        }
        
        if (code.includes('from "marked"') || code.includes('from \'marked\'')) {
          newCode = newCode.replace(/import\s+{\s*marked\s*}\s+from\s+['"]marked['"];?/g, '');
          transformed = true;
        }
      }
      
      return transformed ? newCode : null;
    }
  };
}