<template>
  <div class="accessibility-test">
    <h1>Theme Accessibility Test</h1>

    <!-- Color Contrast Test -->
    <section class="test-section">
      <h2>Color Contrast Tests</h2>

      <div class="contrast-grid">
        <div class="contrast-item">
          <div
            class="contrast-sample"
            :style="{
              background: 'var(--nscale-bg-primary)',
              color: 'var(--nscale-text-primary)',
            }"
          >
            <h3>Primary Text on Background</h3>
            <p>
              This text should be clearly readable with a contrast ratio of at
              least 4.5:1
            </p>
            <small>Small text requires 4.5:1 contrast ratio (WCAG AA)</small>
          </div>
        </div>

        <div class="contrast-item">
          <div
            class="contrast-sample"
            :style="{
              background: 'var(--nscale-bg-surface)',
              color: 'var(--nscale-text-secondary)',
            }"
          >
            <h3>Secondary Text on Surface</h3>
            <p>Secondary text should also meet accessibility standards</p>
            <small>Small secondary text sample</small>
          </div>
        </div>

        <div class="contrast-item">
          <div
            class="contrast-sample"
            :style="{
              background: 'var(--nscale-primary)',
              color: 'var(--nscale-text-inverse)',
            }"
          >
            <h3>Text on Primary Color</h3>
            <p>White text on brand colors must have sufficient contrast</p>
            <small>Button text example</small>
          </div>
        </div>

        <div class="contrast-item">
          <div
            class="contrast-sample"
            :style="{
              background: 'var(--nscale-state-error)',
              color: '#ffffff',
            }"
          >
            <h3>Error State</h3>
            <p>Error messages must be clearly visible</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Interactive Elements Test -->
    <section class="test-section">
      <h2>Interactive Elements</h2>

      <div class="interactive-grid">
        <div class="interactive-item">
          <h3>Buttons</h3>
          <button class="btn btn-primary">Primary Button</button>
          <button class="btn btn-secondary">Secondary Button</button>
          <button class="btn btn-primary" disabled>Disabled Button</button>
        </div>

        <div class="interactive-item">
          <h3>Form Controls</h3>
          <input type="text" placeholder="Text input" class="form-input" />
          <input
            type="text"
            placeholder="Disabled input"
            class="form-input"
            disabled
          />
          <div class="checkbox-wrapper">
            <input type="checkbox" id="check1" class="form-checkbox" />
            <label for="check1">Checkbox option</label>
          </div>
        </div>

        <div class="interactive-item">
          <h3>Links</h3>
          <a href="#" class="link">Regular link</a>
          <br />
          <a href="#" class="link link-visited">Visited link</a>
        </div>
      </div>
    </section>

    <!-- Focus Indicators Test -->
    <section class="test-section">
      <h2>Focus Indicators</h2>
      <p>Tab through these elements to test focus visibility:</p>

      <div class="focus-grid">
        <button class="btn btn-primary">Tab to me</button>
        <input type="text" placeholder="Tab to this input" class="form-input" />
        <a href="#" class="link">Tab to this link</a>
        <div tabindex="0" class="focus-div">Tab to this div</div>
      </div>
    </section>

    <!-- High Contrast Mode Specific Tests -->
    <section v-if="isHighContrastMode" class="test-section">
      <h2>High Contrast Mode Tests</h2>

      <div class="high-contrast-tests">
        <div class="hc-test-item">
          <h3>Border Visibility</h3>
          <div class="bordered-box">
            All interactive elements should have visible borders
          </div>
        </div>

        <div class="hc-test-item">
          <h3>No Gradients or Shadows</h3>
          <div class="no-effects-box">
            This box should have no gradients or shadows
          </div>
        </div>
      </div>
    </section>

    <!-- Theme Metrics -->
    <section class="test-section">
      <h2>Current Theme Metrics</h2>
      <dl class="theme-metrics">
        <dt>Current Theme:</dt>
        <dd>{{ currentTheme }}</dd>

        <dt>System Preference:</dt>
        <dd>{{ systemPreference || "Not detected" }}</dd>

        <dt>Auto Mode:</dt>
        <dd>{{ isAutoMode ? "Enabled" : "Disabled" }}</dd>

        <dt>Effective Theme:</dt>
        <dd>{{ effectiveTheme }}</dd>
      </dl>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useThemeStore } from "@/stores/theme";

const themeStore = useThemeStore();

const currentTheme = computed(() => themeStore.currentTheme);
const systemPreference = computed(() => themeStore.systemPreference);
const isAutoMode = computed(() => themeStore.isAutoMode);
const effectiveTheme = computed(() => themeStore.effectiveTheme);
const isHighContrastMode = computed(() => themeStore.isHighContrastMode);
</script>

<style scoped>
.accessibility-test {
  padding: var(--nscale-space-6);
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  color: var(--nscale-text-heading);
  margin-bottom: var(--nscale-space-8);
}

.test-section {
  margin-bottom: var(--nscale-space-10);
  padding: var(--nscale-space-6);
  background: var(--nscale-bg-surface);
  border: 1px solid var(--nscale-border-default);
  border-radius: var(--radius-lg);
}

.test-section h2 {
  color: var(--nscale-text-heading);
  margin-bottom: var(--nscale-space-4);
}

/* Contrast Tests */
.contrast-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--nscale-space-4);
}

.contrast-sample {
  padding: var(--nscale-space-4);
  border-radius: var(--radius-md);
  border: 2px solid var(--nscale-border-default);
}

.contrast-sample h3 {
  margin: 0 0 var(--nscale-space-2) 0;
}

.contrast-sample p {
  margin: var(--nscale-space-2) 0;
}

/* Interactive Elements */
.interactive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--nscale-space-6);
}

.interactive-item h3 {
  margin-bottom: var(--nscale-space-3);
}

.btn {
  padding: var(--nscale-space-2) var(--nscale-space-4);
  margin: var(--nscale-space-2);
  border: none;
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--nscale-transition-normal);
}

.btn-primary {
  background: var(--nscale-button-primary-bg);
  color: var(--nscale-button-primary-text);
}

.btn-primary:hover:not(:disabled) {
  background: var(--nscale-button-primary-hover);
}

.btn-secondary {
  background: var(--nscale-button-secondary-bg);
  color: var(--nscale-button-secondary-text);
  border: 1px solid var(--nscale-button-secondary-border);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-input {
  width: 100%;
  padding: var(--nscale-space-2);
  margin: var(--nscale-space-2) 0;
  background: var(--nscale-input-bg);
  border: 1px solid var(--nscale-input-border);
  border-radius: var(--radius-md);
  color: var(--nscale-input-text);
}

.form-input:focus {
  border-color: var(--nscale-input-focus-border);
  outline: var(--nscale-focus-outline);
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: var(--nscale-space-2);
  margin: var(--nscale-space-2) 0;
}

.link {
  color: var(--nscale-text-link);
  text-decoration: underline;
}

.link-visited {
  color: var(--nscale-text-link);
  opacity: 0.8;
}

/* Focus Test */
.focus-grid {
  display: flex;
  gap: var(--nscale-space-4);
  align-items: center;
  flex-wrap: wrap;
}

.focus-div {
  padding: var(--nscale-space-3);
  background: var(--nscale-bg-tertiary);
  border: 1px solid var(--nscale-border-default);
  border-radius: var(--radius-md);
}

.focus-div:focus {
  outline: var(--nscale-focus-outline);
  outline-offset: 2px;
}

/* High Contrast Tests */
.high-contrast-tests {
  display: grid;
  gap: var(--nscale-space-4);
}

.bordered-box,
.no-effects-box {
  padding: var(--nscale-space-4);
  border: 2px solid var(--nscale-border-default);
  border-radius: var(--radius-md);
}

/* Theme Metrics */
.theme-metrics {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--nscale-space-2) var(--nscale-space-4);
  margin: 0;
}

.theme-metrics dt {
  font-weight: var(--font-weight-semibold);
  color: var(--nscale-text-secondary);
}

.theme-metrics dd {
  margin: 0;
  color: var(--nscale-text-primary);
}

/* High contrast specific styles */
[data-theme="high-contrast"] .btn,
[data-theme="high-contrast"] .form-input,
[data-theme="high-contrast"] .focus-div {
  border-width: 2px;
}

[data-theme="high-contrast"] *:focus {
  outline-width: 3px;
}
</style>
