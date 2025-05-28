<template>
  <div
    v-if="showMotd && motd"
    class="motd-container"
    :class="{ 'motd-minimized': isMinimized }"
  >
    <div class="motd-header">
      <h3 class="motd-title">{{ motd.title || "Mitteilung des Tages" }}</h3>
      <div class="motd-actions">
        <button
          v-if="!isMinimized"
          class="motd-button motd-minimize"
          @click="minimize"
          title="Minimieren"
        >
          <span class="icon">−</span>
        </button>
        <button
          v-else
          class="motd-button motd-expand"
          @click="expand"
          title="Maximieren"
        >
          <span class="icon">+</span>
        </button>
        <button
          class="motd-button motd-close"
          @click="closeMotd"
          title="Schließen"
        >
          <span class="icon">×</span>
        </button>
      </div>
    </div>

    <div v-if="!isMinimized" class="motd-content">
      <div v-if="motd.content" v-html="formattedContent"></div>
      <div v-else class="motd-placeholder">Keine Mitteilung verfügbar</div>

      <div v-if="motd.links && motd.links.length > 0" class="motd-links">
        <h4>Weiterführende Links:</h4>
        <ul>
          <li v-for="(link, index) in motd.links" :key="index">
            <a :href="link.url" target="_blank" rel="noopener noreferrer">{{
              link.title
            }}</a>
          </li>
        </ul>
      </div>

      <div class="motd-footer">
        <span v-if="motd.author" class="motd-author">{{ motd.author }}</span>
        <span v-if="motd.date" class="motd-date">{{
          formatDate(motd.date)
        }}</span>
        <div class="motd-controls">
          <label class="motd-checkbox">
            <input
              type="checkbox"
              v-model="dontShowAgain"
              @change="updateDontShowAgain"
            />
            Nicht mehr anzeigen
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useLocalStorage } from "@/composables/useLocalStorage";

// Props
const props = defineProps({
  motd: {
    type: Object,
    default: () => null,
  },
  autoClose: {
    type: Boolean,
    default: false,
  },
  autoCloseDelay: {
    type: Number,
    default: 15000, // 15 Sekunden
  },
});

// Emits
const emit = defineEmits(["close"]);

// State
const showMotd = ref(true);
const isMinimized = ref(false);
const dontShowAgain = ref(false);
const { getItem, setItem } = useLocalStorage();

// Formatierte Inhalte
const formattedContent = computed(() => {
  if (!props.motd || !props.motd.content) return "";

  // Einfache Umwandlung von Zeilenumbrüchen in <br>
  return props.motd.content
    .replace(/\n/g, "<br>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // **fett**
    .replace(/\*(.*?)\*/g, "<em>$1</em>") // *kursiv*
    .replace(/`(.*?)`/g, "<code>$1</code>"); // `code`
});

// Methoden
const closeMotd = () => {
  showMotd.value = false;
  emit("close");

  if (dontShowAgain.value && props.motd && props.motd.id) {
    const dismissedMotds = JSON.parse(getItem("dismissedMotds") || "[]");
    if (!dismissedMotds.includes(props.motd.id)) {
      dismissedMotds.push(props.motd.id);
      setItem("dismissedMotds", JSON.stringify(dismissedMotds));
    }
  }
};

const minimize = () => {
  isMinimized.value = true;
};

const expand = () => {
  isMinimized.value = false;
};

const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch (e) {
    return dateString;
  }
};

const updateDontShowAgain = () => {
  if (dontShowAgain.value && props.motd && props.motd.id) {
    // Speichern der Einstellung, ohne MOTD zu schließen
    const dismissedMotds = JSON.parse(getItem("dismissedMotds") || "[]");
    if (!dismissedMotds.includes(props.motd.id)) {
      dismissedMotds.push(props.motd.id);
      setItem("dismissedMotds", JSON.stringify(dismissedMotds));
    }
  } else if (!dontShowAgain.value && props.motd && props.motd.id) {
    // Einstellung zurücksetzen
    const dismissedMotds = JSON.parse(getItem("dismissedMotds") || "[]");
    const updatedDismissedMotds = dismissedMotds.filter(
      (id) => id !== props.motd.id,
    );
    setItem("dismissedMotds", JSON.stringify(updatedDismissedMotds));
  }
};

// Automatisches Schließen nach Zeitablauf
watch(
  () => props.autoClose,
  (newVal) => {
    if (newVal && props.autoCloseDelay > 0) {
      setTimeout(() => {
        if (showMotd.value) {
          closeMotd();
        }
      }, props.autoCloseDelay);
    }
  },
  { immediate: true },
);

// Prüfen, ob MOTD bereits als "nicht mehr anzeigen" markiert wurde
onMounted(() => {
  if (props.motd && props.motd.id) {
    const dismissedMotds = JSON.parse(getItem("dismissedMotds") || "[]");
    if (dismissedMotds.includes(props.motd.id)) {
      dontShowAgain.value = true;

      // MOTD nur anzeigen, wenn es nicht als "nicht mehr anzeigen" markiert ist
      if (props.motd.forceShow !== true) {
        showMotd.value = false;
      }
    }
  }
});
</script>

<style scoped>
.motd-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 400px;
  max-width: calc(100% - 40px);
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  z-index: 100;
  overflow: hidden;
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}

.motd-container.motd-minimized {
  height: auto;
  width: 300px;
}

.motd-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--primary-color, #1976d2);
  color: white;
}

.motd-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
}

.motd-actions {
  display: flex;
  gap: 8px;
}

.motd-button {
  background: none;
  border: none;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.motd-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.motd-button .icon {
  font-size: 16px;
  line-height: 1;
}

.motd-content {
  padding: 16px;
}

.motd-placeholder {
  font-style: italic;
  color: #777;
}

.motd-links {
  margin-top: 16px;
  border-top: 1px solid #eee;
  padding-top: 12px;
}

.motd-links h4 {
  margin: 0 0 8px;
  font-size: 0.9rem;
  font-weight: 500;
}

.motd-links ul {
  margin: 0;
  padding-left: 20px;
}

.motd-links a {
  color: var(--primary-color, #1976d2);
  text-decoration: none;
}

.motd-links a:hover {
  text-decoration: underline;
}

.motd-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #eee;
  font-size: 0.8rem;
  color: #777;
}

.motd-author {
  margin-right: 16px;
}

.motd-controls {
  margin-left: auto;
  margin-top: 8px;
  width: 100%;
  display: flex;
  justify-content: flex-end;
}

.motd-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  cursor: pointer;
}

/* Responsive Anpassungen */
@media (max-width: 600px) {
  .motd-container {
    bottom: 10px;
    right: 10px;
    max-width: calc(100% - 20px);
  }
}
</style>
