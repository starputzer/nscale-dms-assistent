
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
