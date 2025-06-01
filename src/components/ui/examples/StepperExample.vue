<template>
  <div class="component-demo">
    <h2>Stepper Component</h2>

    <div class="demo-section">
      <h3>Basic Stepper</h3>
      <Stepper :steps="basicSteps" v-model="activeBasicStep" />

      <div class="stepper-content">
        <template v-if="activeBasicStep === 0">
          <h4>Step 1 Content</h4>
          <p>
            This is the content for Step 1. Steppers are great for multi-step
            processes.
          </p>
        </template>

        <template v-else-if="activeBasicStep === 1">
          <h4>Step 2 Content</h4>
          <p>This is the content for Step 2. Now you're making progress!</p>
        </template>

        <template v-else-if="activeBasicStep === 2">
          <h4>Step 3 Content</h4>
          <p>This is the content for Step 3. You're almost done!</p>
        </template>
      </div>
    </div>

    <div class="demo-section">
      <h3>Stepper Variants</h3>

      <div class="stepper-group">
        <h4>Filled Variant (Default)</h4>
        <Stepper :steps="variantSteps" variant="filled" />
      </div>

      <div class="stepper-group">
        <h4>Outlined Variant</h4>
        <Stepper :steps="variantSteps" variant="outlined" />
      </div>

      <div class="stepper-group">
        <h4>Minimal Variant</h4>
        <Stepper :steps="variantSteps" variant="minimal" />
      </div>
    </div>

    <div class="demo-section">
      <h3>Stepper Sizes</h3>

      <div class="stepper-group">
        <h4>Small</h4>
        <Stepper :steps="sizeSteps" size="small" />
      </div>

      <div class="stepper-group">
        <h4>Medium (Default)</h4>
        <Stepper :steps="sizeSteps" size="medium" />
      </div>

      <div class="stepper-group">
        <h4>Large</h4>
        <Stepper :steps="sizeSteps" size="large" />
      </div>
    </div>

    <div class="demo-section">
      <h3>Vertical Stepper</h3>
      <Stepper :steps="verticalSteps" vertical v-model="activeVerticalStep">
        <template #step-0>
          <div class="step-content">
            <p>Enter your personal information to get started.</p>
            <div class="form-group">
              <label>Full Name</label>
              <input type="text" placeholder="John Doe" />
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" placeholder="john@example.com" />
            </div>
          </div>
        </template>

        <template #step-1>
          <div class="step-content">
            <p>Create your account credentials.</p>
            <div class="form-group">
              <label>Username</label>
              <input type="text" placeholder="johndoe" />
            </div>
            <div class="form-group">
              <label>Password</label>
              <input type="password" placeholder="••••••••" />
            </div>
            <div class="form-group">
              <label>Confirm Password</label>
              <input type="password" placeholder="••••••••" />
            </div>
          </div>
        </template>

        <template #step-2>
          <div class="step-content">
            <p>Review your information before submitting.</p>
            <div class="review-info">
              <div class="review-row"><strong>Name:</strong> John Doe</div>
              <div class="review-row">
                <strong>Email:</strong> john@example.com
              </div>
              <div class="review-row"><strong>Username:</strong> johndoe</div>
            </div>
          </div>
        </template>
      </Stepper>
    </div>

    <div class="demo-section">
      <h3>Stepper with Navigation</h3>
      <Stepper
        :steps="wizardSteps"
        v-model="activeWizardStep"
        showNavigation
        prevButtonText="Previous Step"
        nextButtonText="Continue"
      >
        <template
          v-for="(step, index) in wizardSteps"
          :key="index"
          :slot="`step-${index}`"
        >
          <div class="step-content">
            <p>{{ step.description }}</p>

            <div v-if="index === 0" class="form-group">
              <label>Project Name</label>
              <input
                type="text"
                v-model="projectName"
                placeholder="My Awesome Project"
              />
            </div>

            <div v-if="index === 1" class="form-options">
              <div
                v-for="option in projectTypes"
                :key="option.id"
                :class="[
                  'option-card',
                  { selected: selectedProjectType === option.id },
                ]"
                @click="selectedProjectType = option.id"
              >
                <h5>{{ option.name }}</h5>
                <p>{{ option.description }}</p>
              </div>
            </div>

            <div v-if="index === 2" class="form-options checkbox-group">
              <label
                v-for="feature in projectFeatures"
                :key="feature.id"
                class="checkbox-label"
              >
                <input
                  type="checkbox"
                  :value="feature.id"
                  v-model="selectedFeatures"
                />
                <span>{{ feature.name }}</span>
              </label>
            </div>

            <div v-if="index === 3" class="summary-container">
              <h4>Project Summary</h4>
              <div class="summary-item">
                <strong>Project Name:</strong>
                {{ projectName || "Not specified" }}
              </div>
              <div class="summary-item">
                <strong>Project Type:</strong> {{ getProjectTypeName() }}
              </div>
              <div class="summary-item">
                <strong>Selected Features:</strong>
                <ul v-if="selectedFeatures.length > 0">
                  <li v-for="featureId in selectedFeatures" :key="featureId">
                    {{ getFeatureName(featureId) }}
                  </li>
                </ul>
                <span v-else>None selected</span>
              </div>
            </div>
          </div>
        </template>
      </Stepper>
    </div>

    <div class="demo-section">
      <h3>Linear vs. Non-Linear Steppers</h3>

      <div class="stepper-group">
        <h4>Linear Stepper (can't skip steps)</h4>
        <Stepper
          :steps="linearSteps"
          v-model="activeLinearStep"
          :interactive="false"
        />
      </div>

      <div class="stepper-group">
        <h4>Non-Linear Stepper (can skip to any step)</h4>
        <Stepper
          :steps="linearSteps"
          v-model="activeNonLinearStep"
          :interactive="true"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Stepper } from "../base";

// Basic stepper example
const basicSteps = [
  { title: "Step 1", description: "First step description" },
  { title: "Step 2", description: "Second step description" },
  { title: "Step 3", description: "Third step description" },
];
const activeBasicStep = ref(0);

// Variants example
const variantSteps = [
  { title: "Information", description: "Personal details" },
  { title: "Payment", description: "Payment method" },
  { title: "Confirmation", description: "Review order" },
  { title: "Complete", description: "Order placed" },
];

// Size example
const sizeSteps = [{ title: "First" }, { title: "Second" }, { title: "Third" }];

// Vertical stepper
const verticalSteps = [
  { title: "Personal Information", description: "Your details" },
  { title: "Account Setup", description: "Create credentials" },
  { title: "Confirmation", description: "Review information" },
];
const activeVerticalStep = ref(0);

// Wizard example
const wizardSteps = [
  { title: "Project Info", description: "Enter basic project details" },
  { title: "Project Type", description: "Select the type of project" },
  { title: "Features", description: "Choose project features" },
  { title: "Summary", description: "Review project configuration" },
];
const activeWizardStep = ref(0);

// Wizard form data
const projectName = ref("");
const selectedProjectType = ref("web");
const selectedFeatures = ref(["responsive", "analytics"]);

// Project types for wizard
const projectTypes = [
  {
    id: "web",
    name: "Web Application",
    description: "Full-featured web application with UI",
  },
  {
    id: "mobile",
    name: "Mobile App",
    description: "Native mobile application",
  },
  { id: "api", name: "API Service", description: "Backend API without UI" },
];

// Features for wizard
const projectFeatures = [
  { id: "responsive", name: "Responsive Design" },
  { id: "analytics", name: "Analytics Integration" },
  { id: "auth", name: "Authentication & Authorization" },
  { id: "payments", name: "Payment Processing" },
  { id: "notifications", name: "Notification System" },
];

// Helper functions
function getProjectTypeName() {
  const projectType = projectTypes.find(
    (type) => type.id === selectedProjectType.value,
  );
  return projectType ? projectType.name : "Not selected";
}

function getFeatureName(featureId: string) {
  const feature = projectFeatures.find((feature) => feature.id === featureId);
  return feature ? feature.name : featureId;
}

// Linear vs non-linear stepper
const linearSteps = [
  { title: "First Step" },
  { title: "Second Step" },
  { title: "Third Step" },
  { title: "Fourth Step" },
];
const activeLinearStep = ref(0);
const activeNonLinearStep = ref(0);
</script>

<style scoped>
.component-demo {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

h2 {
  margin-bottom: 20px;
  color: var(--color-primary);
}

h3 {
  margin: 15px 0;
  color: var(--color-text-secondary);
}

h4 {
  margin: 15px 0 10px;
  color: var(--color-text-primary);
}

h5 {
  margin: 0 0 8px;
  color: var(--color-text-primary);
}

.demo-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background-color: var(--color-background-light);
}

.stepper-content,
.step-content {
  margin-top: 20px;
  padding: 20px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background-color: var(--color-background-secondary);
}

.stepper-group {
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-background-primary);
}

.review-info {
  background-color: var(--color-background-primary);
  padding: 15px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
}

.review-row {
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
}

.review-row:last-child {
  border-bottom: none;
}

.form-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 15px 0;
}

.option-card {
  padding: 15px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.option-card:hover {
  border-color: var(--color-primary-light);
  background-color: var(--color-primary-light);
}

.option-card.selected {
  border-color: var(--color-primary);
  background-color: var(--color-primary-light);
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.checkbox-label input {
  margin-right: 8px;
}

.summary-container {
  background-color: var(--color-background-primary);
  padding: 15px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
}

.summary-item {
  margin-bottom: 12px;
}

.summary-item ul {
  margin: 8px 0 0 20px;
  padding: 0;
}

.summary-item li {
  margin-bottom: 4px;
}

@media (prefers-color-scheme: dark) {
  .demo-section {
    background-color: var(--color-background-dark);
  }

  .stepper-content,
  .step-content {
    background-color: var(--color-gray-800);
  }

  .form-group input {
    background-color: var(--color-gray-700);
    color: var(--color-text-primary-dark);
    border-color: var(--color-gray-600);
  }

  .review-info,
  .summary-container {
    background-color: var(--color-gray-700);
    border-color: var(--color-gray-600);
  }

  .review-row {
    border-color: var(--color-gray-600);
  }

  .option-card {
    border-color: var(--color-gray-600);
  }

  .option-card:hover {
    background-color: rgba(0, 100, 176, 0.2);
    border-color: var(--color-primary-light);
  }

  .option-card.selected {
    background-color: rgba(0, 100, 176, 0.3);
    border-color: var(--color-primary-light);
  }
}
</style>
