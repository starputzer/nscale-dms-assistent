# Theme System Documentation - Digitale Akte Assistent

## Overview

The Digitale Akte Assistent theme system provides a comprehensive theming solution that preserves the nscale green brand identity while offering accessibility options including dark mode and high contrast mode. The system is built using modern Vue 3 architecture with Pinia state management and CSS custom properties.

## Core Features

- **Three Theme Modes**: Light (default), Dark, and High Contrast
- **nscale Green Brand Identity**: Primary color #00a550 preserved across all themes
- **Automatic Theme Detection**: Follows system preferences when enabled
- **Persistent Settings**: Theme preferences saved to localStorage
- **Accessibility Compliance**: Meets WCAG 2.1 AA standards (AAA for high contrast)
- **Smooth Transitions**: Visual feedback during theme switching
- **Component-wide Support**: All UI components adapt to theme changes

## Architecture

### Theme Store (Pinia)

Location: `/src/stores/theme.ts`

The theme store manages:
- Current theme state
- System preference detection
- Auto-mode functionality
- Theme persistence
- Theme metadata

#### Key Methods:

```typescript
// Set theme manually
themeStore.setTheme('dark')

// Toggle auto mode
themeStore.toggleAutoMode()

// Get current effective theme
const theme = themeStore.effectiveTheme

// Check theme modes
const isDark = themeStore.isDarkMode
const isHighContrast = themeStore.isHighContrastMode
```

### CSS Variables System

Location: `/src/assets/themes.scss`

The theme system uses CSS custom properties organized into:

1. **Core Brand Colors**
   - `--nscale-primary`: Brand green (#00a550)
   - `--nscale-primary-hover`: Darker green for interactions
   - `--nscale-primary-light`: Light green for backgrounds

2. **Theme-specific Variables**
   - Background colors
   - Text colors
   - Border colors
   - State colors (success, warning, error, info)
   - Component-specific colors

3. **Layout and Spacing**
   - Consistent spacing scale
   - Border radius values
   - Shadow definitions
   - Transition timings

### Theme Selector Component

Location: `/src/components/settings/ThemeSelector.vue`

Features:
- Visual preview of each theme
- Auto-mode toggle
- System preference detection
- Accessible keyboard navigation
- Responsive design

## Theme Definitions

### Light Theme (Default)

Preserves the original nscale green branding:
- Primary: #00a550 (nscale green)
- Background: #ffffff
- Text: #333333
- Optimized for standard lighting conditions

### Dark Theme

Adapted for low-light environments:
- Primary: #00c060 (brighter green for dark backgrounds)
- Background: #121212
- Text: #f0f0f0
- Reduced blue light emission

### High Contrast Theme

Maximum accessibility for users with visual impairments:
- Primary: #ffeb3b (high-contrast yellow)
- Background: #000000
- Text: #ffffff
- No gradients or subtle shadows
- Bold borders on all interactive elements
- Meets WCAG 2.1 AAA contrast requirements

## Implementation Guide

### 1. Basic Setup

```typescript
// Import theme store
import { useThemeStore } from '@/stores/theme'

// In your component
const themeStore = useThemeStore()

// Apply theme to root element
<div :data-theme="themeStore.effectiveTheme">
  <!-- Your app content -->
</div>
```

### 2. Using Theme Variables

```scss
// In your component styles
.my-component {
  background: var(--nscale-bg-surface);
  color: var(--nscale-text-primary);
  border: 1px solid var(--nscale-border-default);
}

.my-button {
  background: var(--nscale-button-primary-bg);
  color: var(--nscale-button-primary-text);
  
  &:hover {
    background: var(--nscale-button-primary-hover);
  }
}
```

### 3. Theme-specific Styles

```scss
// Light theme specific
[data-theme="light"] .my-component {
  box-shadow: var(--nscale-shadow-md);
}

// Dark theme specific
[data-theme="dark"] .my-component {
  border-color: var(--nscale-border-strong);
}

// High contrast specific
[data-theme="high-contrast"] .my-component {
  border-width: 2px;
  font-weight: bold;
}
```

### 4. Respecting User Preferences

```typescript
// Check for reduced motion preference
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Accessibility Guidelines

### Color Contrast

All theme combinations meet WCAG 2.1 standards:
- Normal text: 4.5:1 contrast ratio (AA)
- Large text: 3:1 contrast ratio (AA)
- High contrast mode: 7:1+ contrast ratio (AAA)

### Focus Indicators

- Visible focus outlines on all interactive elements
- 2px outline for standard themes
- 3px outline for high contrast mode
- Focus trap management for modals

### Keyboard Navigation

- All theme controls keyboard accessible
- Tab order follows logical flow
- Arrow keys for option selection
- Enter/Space for activation

## Testing

### Accessibility Test Component

Location: `/src/components/theme/ThemeAccessibilityTest.vue`

Use this component to verify:
- Color contrast ratios
- Focus indicator visibility
- Interactive element styling
- High contrast mode compliance

### Manual Testing Checklist

1. **Color Contrast**
   - [ ] Text readable in all themes
   - [ ] Buttons have sufficient contrast
   - [ ] Error states clearly visible
   - [ ] Links distinguishable from text

2. **Keyboard Navigation**
   - [ ] All controls reachable via Tab
   - [ ] Focus indicators visible
   - [ ] No keyboard traps
   - [ ] Logical tab order

3. **Screen Reader**
   - [ ] Theme changes announced
   - [ ] Settings properly labeled
   - [ ] State changes communicated

4. **Visual Consistency**
   - [ ] No layout shifts on theme change
   - [ ] Icons visible in all themes
   - [ ] Images have appropriate contrast
   - [ ] Animations respect prefers-reduced-motion

## Performance Considerations

- Theme changes apply instantly without page reload
- CSS variables minimize style recalculation
- localStorage used for persistence (minimal overhead)
- System preference detection uses native APIs
- Smooth transitions using CSS (GPU accelerated)

## Browser Support

The theme system supports:
- Chrome/Edge 88+
- Firefox 78+
- Safari 14+
- All modern mobile browsers

Fallbacks provided for:
- CSS custom properties
- prefers-color-scheme media query
- localStorage availability

## Future Enhancements

Planned improvements:
1. Custom theme creation
2. Color blindness modes
3. Font size preferences
4. Contrast fine-tuning
5. Theme import/export

## Migration from Legacy System

The new theme system replaces the previous implementation while maintaining backward compatibility:

1. Legacy class names mapped to new variables
2. Old theme preferences migrated automatically
3. Gradual component updates supported
4. No breaking changes for existing code

## Troubleshooting

### Common Issues

1. **Theme not persisting**
   - Check localStorage permissions
   - Verify theme store initialization
   - Ensure proper component lifecycle

2. **System preference not detected**
   - Verify browser support
   - Check OS theme settings
   - Test auto-mode toggle

3. **Contrast issues**
   - Use accessibility test component
   - Verify color variable usage
   - Check theme-specific overrides

### Debug Mode

Enable debug logging:

```typescript
// In browser console
window.THEME_DEBUG = true

// Logs theme changes and transitions
```

## Contributing

When adding new components:

1. Use theme variables exclusively
2. Test in all three themes
3. Verify accessibility compliance
4. Document theme-specific behavior
5. Update test coverage

## API Reference

### ThemeStore API

```typescript
interface ThemeStore {
  // State
  currentTheme: 'light' | 'dark' | 'high-contrast'
  systemPreference: 'light' | 'dark' | null
  isAutoMode: boolean
  
  // Getters
  effectiveTheme: 'light' | 'dark' | 'high-contrast'
  isDarkMode: boolean
  isHighContrastMode: boolean
  isLightMode: boolean
  themeOptions: ThemeOption[]
  
  // Actions
  setTheme(theme: ThemeMode): void
  toggleAutoMode(): void
  loadSavedTheme(): void
  resetTheme(): void
}
```

### CSS Variable Reference

See `/src/assets/themes.scss` for complete list of available variables.

## Support

For theme-related issues:
1. Check this documentation
2. Review the accessibility test component
3. Consult the development team
4. File an issue with theme-specific details