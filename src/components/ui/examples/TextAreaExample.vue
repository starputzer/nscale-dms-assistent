<template>
  <div class="component-demo">
    <h2>TextArea Component</h2>

    <div class="demo-section">
      <h3>Basic TextArea</h3>
      <TextArea
        v-model="basicText"
        label="Basic TextArea"
        placeholder="Type something here..."
      />
    </div>

    <div class="demo-section">
      <h3>With Character Count</h3>
      <TextArea
        v-model="limitedText"
        label="With Character Limit"
        placeholder="Limited to 100 characters"
        :maxlength="100"
        showCharacterCount
      />
    </div>

    <div class="demo-section">
      <h3>Auto-resize TextArea</h3>
      <TextArea
        v-model="autoResizeText"
        label="Auto-resize TextArea"
        placeholder="Type multiple lines to see the textarea grow..."
        autoResize
        :minRows="2"
        :maxRows="8"
      />
    </div>

    <div class="demo-section">
      <h3>With Validation</h3>
      <TextArea
        v-model="validationText"
        label="Required TextArea"
        placeholder="This field is required"
        required
        :error="validationError"
        helperText="Enter at least 10 characters"
        @blur="validateText"
      />
    </div>

    <div class="demo-section">
      <h3>With Markdown Preview</h3>
      <TextArea
        v-model="markdownText"
        label="Markdown TextArea"
        placeholder="Type markdown here..."
        supportMarkdown
        :rows="5"
      />
    </div>

    <div class="demo-section">
      <h3>Different Sizes</h3>
      <div class="size-examples">
        <TextArea
          v-model="smallText"
          label="Small TextArea"
          size="sm"
          placeholder="Small size"
        />
        <TextArea
          v-model="mediumText"
          label="Medium TextArea"
          size="md"
          placeholder="Medium size (default)"
        />
        <TextArea
          v-model="largeText"
          label="Large TextArea"
          size="lg"
          placeholder="Large size"
        />
      </div>
    </div>

    <div class="demo-section">
      <h3>Disabled State</h3>
      <TextArea
        v-model="disabledText"
        label="Disabled TextArea"
        placeholder="This is disabled"
        disabled
        helperText="This textarea cannot be edited"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { TextArea } from "../base";

const basicText = ref("");
const limitedText = ref("");
const autoResizeText = ref("");
const validationText = ref("");
const markdownText = ref(
  '# Markdown Example\n\n- List item 1\n- List item 2\n\n**Bold text** and *italic text*\n\n```js\nconst code = "example";\n```',
);
const smallText = ref("");
const mediumText = ref("");
const largeText = ref("");
const disabledText = ref("This textarea is disabled and cannot be edited.");

const validationError = ref("");

const validateText = () => {
  if (validationText.value.length < 10) {
    validationError.value = "Please enter at least 10 characters";
  } else {
    validationError.value = "";
  }
};
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

.demo-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background-color: var(--color-background-light);
}

.size-examples {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media (prefers-color-scheme: dark) {
  .demo-section {
    background-color: var(--color-background-dark);
  }
}
</style>
