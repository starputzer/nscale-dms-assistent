# Admin Components

This directory contains the components for the administration panel.

## Naming Conventions

To maintain consistency across the admin components, the following naming conventions should be followed:

1. **Component Naming:**
   - All component names should be prefixed with `Admin`
   - Follow PascalCase for component names
   - Use descriptive names that clearly indicate the component's purpose
   - Example: `AdminUserList.vue`, `AdminSystemStats.vue`

2. **File Structure:**
   - Tab components should be placed in the `tabs/` directory
   - Shared utilities should be placed in the `utils/` directory
   - Specific functional areas should have their own subdirectories (e.g., `document-converter/`)
   - Modal components should be placed in the `modals/` directory

3. **Version Naming:**
   - Enhanced components should have a new version number (v2, v3) instead of "enhanced" suffix
   - Legacy components should be marked with `legacy` in their name if they need to be kept
   - Redesigns should have a version number, not a -redesigned suffix
   - Example: `AdminFeedback.v2.vue` instead of `AdminFeedback.enhanced.vue`

4. **Component Categories:**
   - **Tab Components:** Main content displayed in the admin panel tabs
   - **UI Components:** Reusable UI elements specific to the admin section
   - **Dialog Components:** Modal dialogs used within admin panels
   - **Form Components:** Form-related components for admin operations

## Component Structure

Each admin component should follow this general structure:

1. **Script Setup:**
   - Use the `<script setup lang="ts">` approach
   - Import required composables and components
   - Define reactive state variables
   - Define computed properties
   - Define methods with clear names

2. **Template Structure:**
   - Include a single root element with a class that matches the component name
   - Use BEM naming convention for CSS classes
   - Include proper aria attributes for accessibility
   - Add i18n support for all user-facing text

3. **CSS Styling:**
   - Use scoped styles
   - Follow BEM naming for CSS classes
   - Implement responsive design with appropriate breakpoints
   - Use CSS variables for theming

## Enhanced Features for Admin Components

Admin panel components should implement these features when appropriate:

1. **Responsive Design:**
   - Mobile-friendly layouts with touch-optimized controls
   - Responsive grids with appropriate breakpoints
   - Mobile tab system for complex forms
   - Touch targets of at least 44x44px

2. **User Experience:**
   - Loading states with proper feedback
   - Error handling with clear messages
   - Confirmation dialogs for destructive actions
   - Preview modes where applicable

3. **Performance:**
   - Lazy loading of complex components
   - Pagination for large datasets
   - Virtual scrolling for long lists
   - Debouncing for frequent events (search, scroll)

4. **Accessibility:**
   - Proper heading hierarchy
   - ARIA attributes for interactive elements
   - Keyboard navigation
   - Color contrast that meets WCAG standards

## Shared Components

Common functionality has been extracted into these shared components:

1. **AdminColorPicker:** Color selection with preview and format options
2. **AdminConfirmDialog:** Standard confirmation dialogs with customizable messages
3. **AdminMarkdownEditor:** Rich text editor with markdown support
4. **AdminDateRangePicker:** Date range selection with presets
5. **AdminVirtualList:** Virtualized list for efficient rendering of large datasets

## Testing

Admin components should include appropriate tests that cover:

1. **Functionality:** Core feature tests
2. **Responsiveness:** Testing at different viewport sizes
3. **Accessibility:** A11y compliance tests
4. **Edge Cases:** Tests for error states and edge conditions

## Documentation

Each component should include:

1. A clear description of its purpose
2. Examples of usage
3. Available props and events
4. Dependencies and requirements