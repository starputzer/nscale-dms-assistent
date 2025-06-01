# Admin Shared Components

This directory contains shared components specifically designed for the admin interface to ensure consistency across all admin tabs and views.

## Component Overview

### AdminHeader

A standardized header component for admin tab content.

```vue
<AdminHeader title="Feature-Toggles">
  <template #actions>
    <Button @click="saveChanges">Speichern</Button>
    <Button @click="resetChanges">Zurücksetzen</Button>
  </template>
</AdminHeader>
```

**Props:**
- `title`: (String) The main title to display in the header

**Slots:**
- `title`: Custom content for the title section (alternative to using the title prop)
- `subtitle`: Optional subtitle content
- `actions`: Right-aligned action buttons

---

### AdminMetricCard

A card component for displaying metrics and statistics with icon support.

```vue
<AdminMetricCard 
  value="125"
  label="Aktive Benutzer"
  icon="users"
  variant="primary"
/>
```

**Props:**
- `value`: (String|Number) The value/number to display
- `label`: (String) Description of the metric
- `icon`: (String) FontAwesome icon name without the 'fa-' prefix
- `variant`: (String) Visual style - 'default', 'success', 'warning', 'danger', or 'primary'

**Slots:**
- `value`: Custom content for the value section
- `label`: Custom content for the label section
- `trend`: Optional trend content (e.g., a small chart)

---

### AdminFilterBar

A standardized filter bar with search, filtering, and reset capabilities.

```vue
<AdminFilterBar
  v-model:searchQuery="searchQuery"
  @reset="resetFilters"
>
  <BaseSelect 
    v-model="statusFilter" 
    :options="statusOptions" 
  />
  <BaseSelect 
    v-model="categoryFilter" 
    :options="categoryOptions" 
  />
</AdminFilterBar>
```

**Props:**
- `withSearch`: (Boolean) Whether to show the search input
- `searchPlaceholder`: (String) Placeholder text for the search input
- `searchQuery`: (String) The search query value (v-model:searchQuery)
- `debounceDelay`: (Number) Debounce delay in milliseconds
- `showResetButton`: (Boolean) Whether to show the reset button
- `resetLabel`: (String) Label for the reset button

**Events:**
- `update:searchQuery`: Emitted when the search query changes
- `reset`: Emitted when the reset button is clicked

**Slots:**
- Default slot: Place filter controls here

---

### AdminMobileTabBar

A responsive tab bar for mobile navigation, automatically displays on small screens.

```vue
<AdminMobileTabBar
  v-model="activeTabId"
  :tabs="[
    { id: 'content', label: 'Inhalt', icon: 'edit' },
    { id: 'settings', label: 'Einstellungen', icon: 'cog' }
  ]"
/>
```

**Props:**
- `tabs`: (Array) Array of tab objects with id, label, and optional icon
- `modelValue`: (String) ID of the active tab (v-model)
- `forceDisplay`: (Boolean) Show the tab bar regardless of screen size

**Events:**
- `update:modelValue`: Emitted when a tab is selected

---

### AdminFieldGroup

A standardized fieldset component for grouping related form inputs.

```vue
<AdminFieldGroup title="Allgemeine Einstellungen" :columns="2">
  <BaseInput v-model="name" label="Name" />
  <BaseSelect v-model="category" :options="categories" label="Kategorie" />
  <BaseToggle v-model="enabled" label="Aktiviert" />
</AdminFieldGroup>
```

**Props:**
- `title`: (String) The title of the field group
- `columns`: (Number) Number of columns for the layout (1-4)
- `compact`: (Boolean) Use reduced spacing between fields

**Slots:**
- Default slot: Place form fields and controls here
- `description`: Optional description content below the title

---

### AdminColorPicker

A color picker component with hex input and preset colors.

```vue
<AdminColorPicker
  v-model="backgroundColor"
  label="Hintergrundfarbe"
  :showPresets="true"
/>
```

**Props:**
- `modelValue`: (String) The color value in hex format (v-model)
- `label`: (String) Label for the color picker
- `placeholder`: (String) Placeholder text for the hex input
- `required`: (Boolean) Whether the field is required
- `helpText`: (String) Help text to display
- `showPresets`: (Boolean) Show preset color swatches
- `presetColors`: (Array) Custom preset colors

**Events:**
- `update:modelValue`: Emitted when the color value changes

## Usage Guidelines

### Component Import

```javascript
// Import individual components
import { AdminHeader, AdminMetricCard } from '@/components/admin/shared';

// Or import the entire module
import AdminShared from '@/components/admin/shared';
```

### Component Composition

These components are designed to work together to create consistent admin interfaces:

```vue
<template>
  <div>
    <AdminHeader title="Feature-Toggles">
      <template #actions>
        <Button @click="saveChanges">Speichern</Button>
      </template>
    </AdminHeader>
    
    <div class="metrics-row">
      <AdminMetricCard value="125" label="Aktive Features" icon="toggle-on" variant="success" />
      <AdminMetricCard value="14" label="Inaktive Features" icon="toggle-off" variant="warning" />
      <AdminMetricCard value="5" label="Kategorien" icon="folder" />
    </div>
    
    <AdminFilterBar v-model:searchQuery="searchQuery" @reset="resetFilters">
      <BaseSelect v-model="statusFilter" :options="statusOptions" />
      <BaseSelect v-model="categoryFilter" :options="categoryOptions" />
    </AdminFilterBar>
    
    <AdminMobileTabBar v-model="activeTab" :tabs="tabs" />
    
    <div v-show="activeTab === 'general'">
      <AdminFieldGroup title="Allgemeine Einstellungen">
        <BaseInput v-model="name" label="Name" />
        <AdminColorPicker v-model="themeColor" label="Theme-Farbe" />
      </AdminFieldGroup>
    </div>
  </div>
</template>
```

### Responsive Behavior

These components include built-in responsive behavior:

1. `AdminHeader` collapses actions on small screens
2. `AdminMetricCard` adjusts sizing for mobile displays
3. `AdminFilterBar` switches to vertical layout on small screens
4. `AdminMobileTabBar` is only displayed on mobile devices by default
5. `AdminFieldGroup` reduces columns on smaller screens
6. `AdminColorPicker` adapts layout for touch input

### Theming Support

All components inherit theme variables from the parent application, supporting both light and dark modes.

## Best Practices

1. Use `AdminHeader` at the top of each admin tab component
2. Group related metrics using `AdminMetricCard` components
3. Implement filtering with `AdminFilterBar` for data-heavy views
4. Use `AdminMobileTabBar` when tabs contain complex forms
5. Organize form fields with `AdminFieldGroup` and appropriate column counts
6. Group color selection inputs with `AdminColorPicker` for consistent UI