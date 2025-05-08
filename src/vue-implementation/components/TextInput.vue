<template>
  <div class="text-input-container">
    <textarea
      ref="inputRef"
      class="text-input"
      :value="modelValue"
      @input="updateValue"
      @keydown.enter.prevent="onEnter"
      :placeholder="placeholder"
      :rows="rows"
      :disabled="disabled"
      :style="{ height: autoResize ? height : undefined }"
    ></textarea>
    <div class="text-input-actions">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    required: true
  },
  placeholder: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  rows: {
    type: Number,
    default: 1
  },
  autoResize: {
    type: Boolean,
    default: true
  },
  minHeight: {
    type: Number,
    default: 40 // px
  },
  maxHeight: {
    type: Number,
    default: 200 // px
  }
});

const emit = defineEmits(['update:modelValue', 'enter']);

const inputRef = ref<HTMLTextAreaElement | null>(null);
const height = ref<string>(`${props.minHeight}px`);

// Autoresize Funktion
const resize = () => {
  if (!inputRef.value || !props.autoResize) return;
  
  // Setze Höhe zurück, um die natürliche Höhe zu messen
  inputRef.value.style.height = 'auto';
  
  // Berechne die neue Höhe innerhalb der Min/Max-Grenzen
  const newHeight = Math.min(
    Math.max(inputRef.value.scrollHeight, props.minHeight),
    props.maxHeight
  );
  
  height.value = `${newHeight}px`;
};

// Value updaten
const updateValue = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  emit('update:modelValue', target.value);
  
  // Resize nach Texteingabe
  if (props.autoResize) {
    resize();
  }
};

// Enter-Taste Event
const onEnter = (event: KeyboardEvent) => {
  // Nur senden, wenn nicht die Shift-Taste gedrückt wird (für Zeilenumbrüche)
  if (!event.shiftKey && props.modelValue.trim()) {
    emit('enter', props.modelValue);
  }
};

// Initialisiere Autoresize
onMounted(() => {
  resize();
});

// Beobachte modelValue für Änderungen
watch(() => props.modelValue, resize);
</script>

<style scoped>
.text-input-container {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.text-input {
  width: 100%;
  resize: none;
  border: 1px solid #e0e0e0;
  border-radius: 0.5rem;
  padding: 0.75rem;
  padding-right: 3rem; /* Platz für Actions */
  font-size: 0.875rem;
  line-height: 1.5;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: border-color 0.2s, box-shadow 0.2s;
  overflow-y: auto;
}

.text-input:focus {
  outline: none;
  border-color: #2e7d32;
  box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.2);
}

.text-input::placeholder {
  color: #9e9e9e;
}

.text-input-actions {
  position: absolute;
  right: 0.5rem;
  bottom: 0.5rem;
  display: flex;
  align-items: center;
}
</style>