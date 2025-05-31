import { getCurrentInstance } from 'vue';

export function useGlobalProperties() {
  const instance = getCurrentInstance();
  if (!instance) {
    throw new Error('useGlobalProperties must be called within a Vue component setup function');
  }
  
  const globalProperties = instance.appContext.config.globalProperties;
  
  return {
    $t: globalProperties.$t,
    $i18n: globalProperties.$i18n
  };
}