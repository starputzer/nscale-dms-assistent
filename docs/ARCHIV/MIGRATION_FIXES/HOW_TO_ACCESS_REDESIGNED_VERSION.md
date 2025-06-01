# How to Access the Redesigned Version with Theme System

The theme system has been implemented in the redesigned version of the Digitale Akte Assistent. To see the changes, you need to access the redesigned version:

## Option 1: Using the Development Server

1. Start the redesigned version:
   ```bash
   cd /opt/nscale-assist/app
   ./start-redesigned.sh
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000/index-redesigned.html
   ```

## Option 2: Build and Serve

1. Build the application:
   ```bash
   cd /opt/nscale-assist/app
   npm run build
   ```

2. The built files will include both versions. Access the redesigned version at:
   ```
   http://your-server/index-redesigned.html
   ```

## What's Different in the Redesigned Version?

1. **New Theme System**:
   - Light mode (default) with nscale green (#00a550)
   - Dark mode with adapted colors
   - High contrast mode for accessibility

2. **Theme Selector**:
   - Access through Settings modal
   - Visual preview of each theme
   - Auto-mode to follow system preferences

3. **Updated Design**:
   - Claude-inspired clean interface
   - New "Digitale Akte Assistent" branding
   - Responsive design with theme support

## Verification

Once you access the redesigned version, you can:

1. Click the settings button in the sidebar
2. In the settings modal, you'll see the new theme selector
3. Try switching between Light, Dark, and High Contrast themes
4. Enable auto-mode to follow your system preferences

The theme changes will apply instantly without page reload, and your preference will be saved for future visits.