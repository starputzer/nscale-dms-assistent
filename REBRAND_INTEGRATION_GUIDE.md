# Digitale Akte Assistent - Rebrand Integration Guide

This guide explains how to integrate the new "Digitale Akte Assistent" rebranded components into your Vue 3 application.

## Quick Start

To view the redesigned application immediately:

```bash
# Make the script executable (first time only)
chmod +x start-redesigned.sh

# Start the redesigned version
./start-redesigned.sh

# Open in browser
# Navigate to: http://localhost:3000/index-redesigned.html
```

The redesigned version runs alongside the existing application, allowing for a gradual migration.

## Overview

The rebrand consists of several new components that implement a clean, Claude-inspired design:

- `App-redesigned.vue` - Main application component
- `Header-redesigned.vue` - Clean header with user menu
- `MainLayout-redesigned.vue` - Two-column layout structure  
- `ChatView-redesigned.vue` - Simplified chat interface
- `SessionList-redesigned.vue` - Clean session list
- `AdminPanel-redesigned.vue` - Simple admin panel
- `SettingsModal.vue` - Settings modal
- `design-system-rebrand.scss` - New design system variables

## Key Changes

1. **Rebranding**: All instances of "nscale DMS Assistent" are replaced with "Digitale Akte Assistent"
2. **Simplified UI**: Removed unnecessary features like filters and "last updated" functionality
3. **Clean Design**: Claude-inspired interface with better spacing and typography
4. **Accessibility**: Focus on keyboard navigation and ARIA labels
5. **Dark Mode**: Support for light and dark themes

## Integration Steps

### 1. Update Design System

Replace the current design system with the new one:

```scss
// In your main.scss or main.ts
@import '@/assets/design-system-rebrand.scss';
```

### 2. Replace App Component

Replace `App.vue` with the new redesigned version:

```typescript
// Rename current App.vue to App-old.vue as backup
mv src/App.vue src/App-old.vue

// Rename new component
mv src/App-redesigned.vue src/App.vue
```

### 3. Update Component Imports

Update imports in the new App.vue to use the redesigned components:

```typescript
import Header from '@/components/layout/Header-redesigned.vue'
import MainLayout from '@/components/layout/MainLayout-redesigned.vue'
import SessionList from '@/components/session/SessionList-redesigned.vue'
import AdminPanel from '@/components/admin/AdminPanel-redesigned.vue'
```

### 4. Update Routes

Update router configuration to use the new ChatView:

```typescript
{
  path: '/chat/:sessionId?',
  name: 'chat',
  component: () => import('@/views/ChatView-redesigned.vue')
}
```

### 5. Update Store References

Ensure stores are compatible with the new components. The redesigned components expect:

- `useAuthStore` - User authentication
- `useSessionsStore` - Chat sessions
- `useUIStore` - UI state (sidebar collapse)
- `useSettingsStore` - Application settings

### 6. Remove Old Features

Remove or update references to removed features:
- Filter functionality
- "Last updated" display
- Complex navigation items
- Unnecessary feature toggles

## Customization

### Theme Variables

The new design system uses CSS variables that can be customized:

```css
:root {
  --primary: #0066cc;
  --background: #ffffff;
  --text: #111111;
  /* ... see design-system-rebrand.scss for all variables */
}
```

### Component Props

Most components accept props for customization:

```vue
<Header 
  title="Digitale Akte Assistent"
  :showToggleButton="true"
  :user="currentUser"
/>
```

## Migration Checklist

- [ ] Backup current components
- [ ] Install new design system
- [ ] Replace App.vue
- [ ] Update component imports
- [ ] Update router configuration
- [ ] Test user authentication flow
- [ ] Test chat functionality
- [ ] Test admin panel access
- [ ] Test settings modal
- [ ] Test responsive behavior
- [ ] Test dark mode
- [ ] Remove deprecated features

## Browser Support

The redesigned components support:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility

All components include:
- Proper ARIA labels
- Keyboard navigation
- Focus indicators
- Screen reader support
- Reduced motion support

## Performance

The redesigned components are optimized for:
- Minimal re-renders
- Efficient list rendering
- Lazy loading of modals
- Responsive images

## Troubleshooting

If you encounter issues:

1. Check console for errors
2. Verify all components are imported correctly
3. Ensure stores are initialized
4. Check CSS variable compatibility
5. Test in different browsers

For support, please refer to the component documentation or create an issue in the repository.