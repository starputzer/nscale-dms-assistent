/**
 * Mock-Implementierung des AB-Tests-Stores
 */

import { defineStore } from "pinia";
import { ref, computed } from "vue";

export const useABTestStore = defineStore("abTests", () => {
  // State
  const tests = ref([
    {
      id: 'chat_ui_redesign',
      name: 'Chat UI Redesign',
      description: 'Neues UI-Design für den Chat-Bereich',
      enabled: true,
      variants: ['control', 'variant_a', 'variant_b'],
      assignedVariant: 'variant_a',
      startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 1 Woche zuvor
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()  // 30 Tage später
    },
    {
      id: 'message_streaming',
      name: 'Message Streaming',
      description: 'Streaming-Anzeige von Nachrichten',
      enabled: true,
      variants: ['disabled', 'enabled'],
      assignedVariant: 'enabled',
      startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(), // 2 Wochen zuvor
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString()    // 14 Tage später
    },
    {
      id: 'source_references',
      name: 'Source References',
      description: 'Anzeige von Quellenangaben in Antworten',
      enabled: true,
      variants: ['hidden', 'minimal', 'detailed'],
      assignedVariant: 'detailed',
      startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 Tage zuvor
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()     // 7 Tage später
    }
  ]);
  
  // Computed
  const activeTests = computed(() => {
    const now = new Date().toISOString();
    return tests.value.filter(test => 
      test.enabled && 
      test.startDate <= now && 
      test.endDate >= now
    );
  });
  
  // Actions
  async function loadTests() {
    // Im Mock-Modus verwenden wir die fest definierten Tests
    console.log('Mock AB-Tests geladen');
    return tests.value;
  }
  
  function getTestVariant(testId: string) {
    const test = tests.value.find(t => t.id === testId);
    return test?.assignedVariant || null;
  }
  
  function isInVariant(testId: string, variant: string) {
    return getTestVariant(testId) === variant;
  }
  
  function trackEvent(testId: string, eventName: string, data: any = {}) {
    console.log(`[Mock AB-Test Tracking] Test: ${testId}, Event: ${eventName}`, data);
    // In einer echten Implementierung würden hier Daten an den Server gesendet
  }
  
  return {
    // State
    tests,
    
    // Computed
    activeTests,
    
    // Actions
    loadTests,
    getTestVariant,
    isInVariant,
    trackEvent
  };
});