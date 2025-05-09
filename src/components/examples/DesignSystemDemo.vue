<template>
  <div class="design-system-demo">
    <h1 class="demo-title">nscale DMS Assistent Design System</h1>
    
    <section class="demo-section">
      <h2 class="section-title">Theme Switcher</h2>
      <div class="component-demo">
        <ThemeSwitcher />
      </div>
    </section>
    
    <section class="demo-section">
      <h2 class="section-title">Farben</h2>
      <div class="component-demo">
        <h3>Primärfarben</h3>
        <div class="color-grid">
          <div class="color-box" style="background-color: var(--nscale-primary)">
            <span>Primary</span>
          </div>
          <div class="color-box" style="background-color: var(--nscale-primary-dark)">
            <span>Primary Dark</span>
          </div>
          <div class="color-box" style="background-color: var(--nscale-primary-light)">
            <span>Primary Light</span>
          </div>
          <div class="color-box" style="background-color: var(--nscale-primary-ultra-light)">
            <span>Primary Ultra Light</span>
          </div>
        </div>
        
        <h3>Interface-Farben</h3>
        <div class="color-grid">
          <div class="color-box" style="background-color: var(--nscale-background);">
            <span>Background</span>
          </div>
          <div class="color-box" style="background-color: var(--nscale-foreground); color: white;">
            <span>Foreground</span>
          </div>
          <div class="color-box" style="background-color: var(--nscale-muted); color: white;">
            <span>Muted</span>
          </div>
          <div class="color-box" style="background-color: var(--nscale-border)">
            <span>Border</span>
          </div>
        </div>
        
        <h3>Feedback-Farben</h3>
        <div class="color-grid">
          <div class="color-box" style="background-color: var(--nscale-success); color: white;">
            <span>Success</span>
          </div>
          <div class="color-box" style="background-color: var(--nscale-info); color: white;">
            <span>Info</span>
          </div>
          <div class="color-box" style="background-color: var(--nscale-warning);">
            <span>Warning</span>
          </div>
          <div class="color-box" style="background-color: var(--nscale-error); color: white;">
            <span>Error</span>
          </div>
        </div>
      </div>
    </section>
    
    <section class="demo-section">
      <h2 class="section-title">Typografie</h2>
      <div class="component-demo">
        <p style="font-size: var(--nscale-font-size-4xl); font-weight: var(--nscale-font-weight-bold);">
          Headline 1 (4xl - Bold)
        </p>
        <p style="font-size: var(--nscale-font-size-3xl); font-weight: var(--nscale-font-weight-bold);">
          Headline 2 (3xl - Bold)
        </p>
        <p style="font-size: var(--nscale-font-size-2xl); font-weight: var(--nscale-font-weight-semibold);">
          Headline 3 (2xl - Semibold)
        </p>
        <p style="font-size: var(--nscale-font-size-xl); font-weight: var(--nscale-font-weight-semibold);">
          Headline 4 (xl - Semibold)
        </p>
        <p style="font-size: var(--nscale-font-size-lg); font-weight: var(--nscale-font-weight-medium);">
          Headline 5 (lg - Medium)
        </p>
        <p style="font-size: var(--nscale-font-size-base); font-weight: var(--nscale-font-weight-normal);">
          Standardtext (base - Normal) - Dies ist ein Beispiel für normalen Text im nscale DMS Assistenten.
          Der Text nutzt die Standard-Schriftgröße und -gewicht für optimale Lesbarkeit.
        </p>
        <p style="font-size: var(--nscale-font-size-sm); font-weight: var(--nscale-font-weight-normal);">
          Kleinerer Text (sm - Normal) - Dies ist ein Beispiel für kleineren Text, der für weniger wichtige Informationen verwendet wird.
        </p>
        <p style="font-size: var(--nscale-font-size-xs); font-weight: var(--nscale-font-weight-normal);">
          Extrakleiner Text (xs - Normal) - Dieser Text wird für Fußnoten, Bildunterschriften und ähnliche Elemente verwendet.
        </p>
      </div>
    </section>
    
    <section class="demo-section">
      <h2 class="section-title">Abstandssystem</h2>
      <div class="component-demo">
        <div class="spacing-grid">
          <div class="spacing-box" style="width: var(--nscale-space-1); height: var(--nscale-space-10);">
            <span>1</span>
          </div>
          <div class="spacing-box" style="width: var(--nscale-space-2); height: var(--nscale-space-10);">
            <span>2</span>
          </div>
          <div class="spacing-box" style="width: var(--nscale-space-3); height: var(--nscale-space-10);">
            <span>3</span>
          </div>
          <div class="spacing-box" style="width: var(--nscale-space-4); height: var(--nscale-space-10);">
            <span>4</span>
          </div>
          <div class="spacing-box" style="width: var(--nscale-space-6); height: var(--nscale-space-10);">
            <span>6</span>
          </div>
          <div class="spacing-box" style="width: var(--nscale-space-8); height: var(--nscale-space-10);">
            <span>8</span>
          </div>
          <div class="spacing-box" style="width: var(--nscale-space-10); height: var(--nscale-space-10);">
            <span>10</span>
          </div>
        </div>
      </div>
    </section>
    
    <section class="demo-section">
      <h2 class="section-title">UI-Komponenten</h2>
      <div class="component-demo">
        <h3>Buttons</h3>
        <div class="demo-row">
          <button class="nscale-btn-primary">Primär Button</button>
          <button class="nscale-btn-secondary">Sekundär Button</button>
          <button disabled class="nscale-btn-primary">Deaktiviert</button>
        </div>
        
        <h3>Formular-Elemente</h3>
        <div class="form-demo">
          <label for="demo-input">Text Input</label>
          <input id="demo-input" class="nscale-input" placeholder="Bitte Text eingeben..." />
          
          <label for="demo-select">Select</label>
          <select id="demo-select" class="nscale-input">
            <option>Option 1</option>
            <option>Option 2</option>
            <option>Option 3</option>
          </select>
          
          <div class="checkbox-demo">
            <input type="checkbox" id="demo-checkbox" />
            <label for="demo-checkbox">Checkbox Option</label>
          </div>
        </div>
        
        <h3>Card</h3>
        <div class="nscale-card card-demo">
          <h4>Card Beispiel</h4>
          <p>Dies ist ein Beispiel für eine Card-Komponente, die das Design-System verwendet.</p>
          <button class="nscale-btn-primary">Aktion</button>
        </div>
        
        <h3>Alerts</h3>
        <div class="alert-demo">
          <div class="nscale-alert-info">
            Dies ist eine Info-Meldung.
          </div>
          <div class="nscale-alert-success">
            Dies ist eine Erfolgs-Meldung.
          </div>
          <div class="nscale-alert-warning">
            Dies ist eine Warnungs-Meldung.
          </div>
          <div class="nscale-alert-error">
            Dies ist eine Fehler-Meldung.
          </div>
        </div>
      </div>
    </section>

    <section class="demo-section">
      <h2 class="section-title">Responsive Design</h2>
      <div class="component-demo">
        <div class="responsive-box">
          Dieses Element passt sich an verschiedene Bildschirmgrößen an.
          Ändern Sie die Fenstergröße, um die Anpassungen zu sehen.
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import ThemeSwitcher from '@/components/ui/ThemeSwitcher.vue';
</script>

<style scoped>
.design-system-demo {
  padding: var(--nscale-space-8);
  max-width: var(--nscale-content-max-width);
  margin: 0 auto;
  font-family: var(--nscale-font-family-base);
  color: var(--nscale-foreground);
}

.demo-title {
  font-size: var(--nscale-font-size-3xl);
  font-weight: var(--nscale-font-weight-bold);
  margin-bottom: var(--nscale-space-8);
  color: var(--nscale-primary);
}

.demo-section {
  margin-bottom: var(--nscale-space-12);
}

.section-title {
  font-size: var(--nscale-font-size-xl);
  font-weight: var(--nscale-font-weight-semibold);
  margin-bottom: var(--nscale-space-4);
  padding-bottom: var(--nscale-space-2);
  border-bottom: 1px solid var(--nscale-border);
}

.component-demo {
  background-color: var(--nscale-card-bg);
  border-radius: var(--nscale-border-radius-lg);
  padding: var(--nscale-space-6);
  border: 1px solid var(--nscale-border);
  box-shadow: var(--nscale-shadow-md);
}

.component-demo h3 {
  font-size: var(--nscale-font-size-lg);
  font-weight: var(--nscale-font-weight-medium);
  margin-top: var(--nscale-space-6);
  margin-bottom: var(--nscale-space-4);
}

.component-demo h3:first-child {
  margin-top: 0;
}

/* Farb-Demonstration */
.color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--nscale-space-4);
  margin-bottom: var(--nscale-space-6);
}

.color-box {
  height: 80px;
  border-radius: var(--nscale-border-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border: 1px solid var(--nscale-border);
  transition: transform var(--nscale-transition-quick) ease;
}

.color-box:hover {
  transform: translateY(-2px);
}

.color-box span {
  font-size: var(--nscale-font-size-sm);
  font-weight: var(--nscale-font-weight-medium);
}

/* Abstands-Demonstration */
.spacing-grid {
  display: flex;
  align-items: flex-end;
  gap: var(--nscale-space-3);
  padding: var(--nscale-space-4);
  background-color: var(--nscale-muted-light);
  border-radius: var(--nscale-border-radius-md);
  overflow-x: auto;
}

.spacing-box {
  background-color: var(--nscale-primary);
  color: white;
  font-size: var(--nscale-font-size-xs);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border-radius: var(--nscale-border-radius-sm);
}

.spacing-box span {
  position: absolute;
  bottom: -20px;
  white-space: nowrap;
  color: var(--nscale-foreground);
}

/* UI-Komponenten Demonstration */
.demo-row {
  display: flex;
  gap: var(--nscale-space-4);
  flex-wrap: wrap;
  margin-bottom: var(--nscale-space-6);
}

.form-demo {
  display: flex;
  flex-direction: column;
  gap: var(--nscale-space-3);
  margin-bottom: var(--nscale-space-6);
  max-width: 400px;
}

.checkbox-demo {
  display: flex;
  align-items: center;
  gap: var(--nscale-space-2);
  margin-top: var(--nscale-space-2);
}

.card-demo {
  max-width: 400px;
  padding: var(--nscale-space-6);
}

.card-demo h4 {
  margin-bottom: var(--nscale-space-2);
  font-weight: var(--nscale-font-weight-semibold);
}

.card-demo p {
  margin-bottom: var(--nscale-space-4);
  color: var(--nscale-muted);
}

.alert-demo {
  display: flex;
  flex-direction: column;
  gap: var(--nscale-space-3);
}

.nscale-alert-info, 
.nscale-alert-success, 
.nscale-alert-warning, 
.nscale-alert-error {
  padding: var(--nscale-space-3) var(--nscale-space-4);
  border-radius: var(--nscale-border-radius-md);
  border-left: 4px solid;
}

.nscale-alert-info {
  background-color: var(--nscale-alert-info-bg);
  color: var(--nscale-alert-info-text);
  border-left-color: var(--nscale-alert-info-border);
}

.nscale-alert-success {
  background-color: var(--nscale-alert-success-bg);
  color: var(--nscale-alert-success-text);
  border-left-color: var(--nscale-alert-success-border);
}

.nscale-alert-warning {
  background-color: var(--nscale-alert-warning-bg);
  color: var(--nscale-alert-warning-text);
  border-left-color: var(--nscale-alert-warning-border);
}

.nscale-alert-error {
  background-color: var(--nscale-alert-error-bg);
  color: var(--nscale-alert-error-text);
  border-left-color: var(--nscale-alert-error-border);
}

/* Responsive Demo */
.responsive-box {
  padding: var(--nscale-space-4);
  background-color: var(--nscale-primary-light);
  border-radius: var(--nscale-border-radius-md);
  text-align: center;
  transition: all var(--nscale-transition-normal) ease;
}

/* Media Query Demonstration */
@media (max-width: 768px) {
  .design-system-demo {
    padding: var(--nscale-space-4);
  }
  
  .responsive-box {
    background-color: var(--nscale-warning-light);
    font-size: var(--nscale-font-size-sm);
  }
  
  .color-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .responsive-box {
    background-color: var(--nscale-error-light);
    font-size: var(--nscale-font-size-xs);
  }
  
  .color-grid {
    grid-template-columns: 1fr;
  }
}
</style>