/**
 * Debug script for i18n configuration
 */

import i18n from './i18n';

export function debugI18n() {
  console.group('🌐 i18n Debug Information');
  
  // Check if i18n is properly initialized
  console.log('i18n instance:', i18n);
  console.log('Global i18n:', i18n.global);
  
  // Check available locales
  console.log('Available locales:', i18n.global.availableLocales);
  console.log('Current locale:', i18n.global.locale.valueOf);
  console.log('Fallback locale:', i18n.global.fallbackLocale.valueOf);
  
  // Check if messages are loaded
  console.log('Messages loaded:');
  i18n.global.availableLocales.forEach(locale => {
    const messages = i18n.global.getLocaleMessage(locale);
    console.log(`  ${locale}:`, Object.keys(messages).length, 'keys');
    
    // Sample some keys
    console.log(`    Sample keys:`, Object.keys(messages).slice(0, 5));
  });
  
  // Test translation
  console.log('\nTest translations:');
  console.log('  toast.success (en):', i18n.global.t('toast.success'));
  console.log('  common.refresh (de):', i18n.global.t('common.refresh', {}, { locale: 'de' }));
  
  // Check for errors
  if (i18n.global.missing) {
    console.log('\nMissing translation handler:', typeof i18n.global.missing);
  }
  
  console.groupEnd();
}

// Auto-run in development
if (import.meta.env.DEV) {
  setTimeout(() => {
    debugI18n();
  }, 1000);
}