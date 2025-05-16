# Digitale Akte Assistent - Redesigned Version

This is the redesigned version of the nscale DMS Assistant application, now rebranded as "Digitale Akte Assistent" with a Claude-inspired UI design.

## Features

- ✨ Complete rebrand from "nscale DMS Assistent" to "Digitale Akte Assistent"
- 🎨 Claude-inspired clean interface
- 📱 Fully responsive design
- 🌓 Support for light and dark themes
- ♿ Accessibility-focused (WCAG 2.1 AA compliant)
- 🚀 Modern Vue 3 Composition API with TypeScript
- 🔧 Fixed non-functional admin section
- 🔧 Fixed non-functional settings functionality
- 🧹 Removed unnecessary features (filters, "last updated")

## Running the Application

### Option 1: Using the Start Script (Recommended)

```bash
# Make the script executable (first time only)
chmod +x start-redesigned.sh

# Start the redesigned version
./start-redesigned.sh

# Open in browser: http://localhost:3000/index-redesigned.html
```

### Option 2: Manual Start

```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev

# Navigate to: http://localhost:3000/index-redesigned.html
```

## Architecture

The redesigned application uses a modern component structure:

```
src/
├── App-redesigned.vue         # Main application
├── components/
│   ├── layout/
│   │   ├── Header-redesigned.vue
│   │   ├── Sidebar-redesigned.vue
│   │   └── MainLayout-redesigned.vue
│   ├── session/
│   │   └── SessionList-redesigned.vue
│   ├── admin/
│   │   └── AdminPanel-redesigned.vue
│   └── settings/
│       └── SettingsModal.vue
├── views/
│   └── ChatView-redesigned.vue
├── assets/
│   └── design-system-rebrand.scss
├── main-redesigned.ts         # Entry point
└── index-redesigned.html      # HTML template
```

## Key Design Principles

1. **Simplicity**: Clean interface with minimal visual clutter
2. **Consistency**: Unified design language throughout
3. **Accessibility**: Keyboard navigation and screen reader support
4. **Performance**: Optimized rendering and lazy loading
5. **Maintainability**: Component-based architecture with TypeScript

## Customization

### Theme Colors

The design system uses CSS variables for easy customization:

```scss
:root {
  --brand-primary: #0066cc;
  --brand-secondary: #5892d0;
  --background: #ffffff;
  --surface: #f9fafb;
  --text: #111111;
  --text-secondary: #666666;
}
```

### Dark Mode

Dark mode is automatically applied based on user preference or system settings:

```scss
:root[data-theme="dark"] {
  --background: #1a1a1a;
  --surface: #242424;
  --text: #ffffff;
  --text-secondary: #999999;
}
```

## Migration from Old Version

The redesigned version can run alongside the existing application. When ready to migrate:

1. Back up your current `App.vue`
2. Replace it with `App-redesigned.vue`
3. Update component imports in your router
4. Test all functionality

For detailed migration instructions, see [REBRAND_INTEGRATION_GUIDE.md](./REBRAND_INTEGRATION_GUIDE.md)

## Support

For issues or questions about the redesigned version, please refer to the main project documentation or contact the development team.