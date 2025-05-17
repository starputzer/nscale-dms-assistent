&lt;!-- BridgeDemo.vue Diese Komponente demonstriert die Verwendung der
verbesserten Bridge zur Kommunikation zwischen Vue 3 und Legacy-JavaScript. -->
&lt;template> &lt;div class="bridge-demo"> &lt;h1>Enhanced Bridge Demo&lt;/h1>
&lt;div class="demo-section"> &lt;h2>Bridge Status&lt;/h2> &lt;div
class="status-indicator" :class="statusClassName" >
{{ statusMessage }}
&lt;/div> &lt;div class="stats"> &lt;strong>Performance:&lt;/strong>
{{ serializerStats.ratio.toFixed(2) * 100 }}% Cache-Effizienz &lt;/div>
&lt;/div> &lt;div class="demo-section"> &lt;h2>Zustandssynchronisation&lt;/h2>
&lt;div class="state-section"> &lt;div class="vue-state"> &lt;h3>Vue
Store&lt;/h3> &lt;div class="form-group"> &lt;label for="darkMode">Dark
Mode:&lt;/label> &lt;input type="checkbox" id="darkMode"
v-model="uiStore.darkMode" /> &lt;/div> &lt;div class="form-group"> &lt;label
for="username">Username:&lt;/label> &lt;input type="text" id="username"
v-model="authStore.user.name" /> &lt;/div> &lt;/div> &lt;div
class="sync-arrow">⟷&lt;/div> &lt;div class="legacy-state"> &lt;h3>Legacy
State&lt;/h3> &lt;div class="form-group"> &lt;label for="legacyDarkMode">Dark
Mode:&lt;/label> &lt;input type="checkbox" id="legacyDarkMode"
:checked="legacyDarkMode" @change="updateLegacyDarkMode" /> &lt;/div> &lt;div
class="form-group"> &lt;label for="legacyUsername">Username:&lt;/label>
&lt;input type="text" id="legacyUsername" :value="legacyUsername"
@input="updateLegacyUsername" /> &lt;/div> &lt;/div> &lt;/div> &lt;/div> &lt;div
class="demo-section"> &lt;h2>Event-Kommunikation&lt;/h2> &lt;div
class="event-section"> &lt;div class="vue-events"> &lt;h3>Vue Events&lt;/h3>
&lt;button @click="sendVueEvent">Event senden&lt;/button> &lt;div
class="event-count"> Empfangene Events: {{ vueEventCount }} &lt;/div> &lt;/div>
&lt;div class="event-arrow">⟷&lt;/div> &lt;div class="legacy-events">
&lt;h3>Legacy Events&lt;/h3> &lt;button @click="sendLegacyEvent">Event
senden&lt;/button> &lt;div class="event-count"> Empfangene Events:
{{ legacyEventCount }} &lt;/div> &lt;/div> &lt;/div> &lt;div class="event-log">
&lt;h3>Event Log&lt;/h3> &lt;div class="log-controls"> &lt;button
@click="clearLog">Log löschen&lt;/button> &lt;/div> &lt;ul class="events-list">
&lt;li v-for="(event, index) in eventLog" :key="index" :class="event.source">
&lt;span class="event-time">{{ event.time }}&lt;/span> &lt;span
class="event-name">{{ event.name }}&lt;/span> &lt;span class="event-data">{{
  JSON.stringify(event.data)
}}&lt;/span> &lt;/li> &lt;/ul> &lt;/div> &lt;/div> &lt;div class="demo-section">
&lt;h2>Fehlerbehandlung&lt;/h2> &lt;div class="error-controls"> &lt;button
@click="simulateStateError">State-Fehler simulieren&lt;/button> &lt;button
@click="simulateEventError">Event-Fehler simulieren&lt;/button> &lt;button
@click="triggerSelfHealing">Selbstheilung starten&lt;/button> &lt;/div> &lt;div
class="error-log"> &lt;h3>Error Log&lt;/h3> &lt;ul class="errors-list"> &lt;li
v-for="(error, index) in errorLog" :key="index"> &lt;span class="error-time">{{
  error.time
}}&lt;/span> &lt;span class="error-message">{{ error.message }}&lt;/span>
&lt;/li> &lt;/ul> &lt;/div> &lt;/div> &lt;/div> &lt;/template> &lt;script setup
lang="ts"> import { ref, computed, onMounted, onBeforeUnmount, watch } from
'vue'; import { useAuthStore } from '@/stores/auth'; import { useUIStore } from
'@/stores/ui'; import { useBridge } from '../bridgeCore'; import {
BridgeErrorState } from '../types'; // Stores const authStore = useAuthStore();
const uiStore = useUIStore(); // Bridge initialisieren const bridge =
useBridge(); // Lokaler State const legacyDarkMode = ref(false); const
legacyUsername = ref(''); const vueEventCount = ref(0); const legacyEventCount =
ref(0); const serializerStats = ref({ hits: 0, misses: 0, ratio: 0 }); const
eventLog = ref<{ time: string; name: string; data: any; source: 'vue' | 'legacy'
}[]>([]); const errorLog = ref<{ time: string; message: string }[]>([]); //
Berechnete Eigenschaften const statusClassName = computed(() => { const status =
bridge.getStatus().state; switch (status) { case BridgeErrorState.HEALTHY:
return 'status-healthy'; case BridgeErrorState.DEGRADED_PERFORMANCE: return
'status-degraded'; case BridgeErrorState.SYNC_ERROR: case
BridgeErrorState.COMMUNICATION_ERROR: return 'status-error'; case
BridgeErrorState.CRITICAL_FAILURE: return 'status-critical'; default: return '';
} }); const statusMessage = computed(() => { const status = bridge.getStatus();
return `${BridgeErrorState[status.state]}: ${status.message}`; }); //
Legacy-State-Aktualisierer function updateLegacyDarkMode(event: Event) { const
checked = (event.target as HTMLInputElement).checked; legacyDarkMode.value =
checked; // Bridge verwenden, um den Vue-Store zu aktualisieren
bridge.setState('ui.darkMode', checked); // Event-Log-Eintrag hinzufügen
addEventToLog('ui:darkModeChanged', { isDark: checked }, 'legacy'); } function
updateLegacyUsername(event: Event) { const value = (event.target as
HTMLInputElement).value; legacyUsername.value = value; // Bridge verwenden, um
den Vue-Store zu aktualisieren bridge.setState('auth.user.name', value); //
Event-Log-Eintrag hinzufügen addEventToLog('auth:userUpdated', { name: value },
'legacy'); } // Event-Handler function sendVueEvent() { const eventData = {
source: 'vue', timestamp: new Date().toISOString(), count: vueEventCount.value +
1 }; // Event über die Bridge senden bridge.emit('demo:vueEvent', eventData); //
Event-Log-Eintrag hinzufügen addEventToLog('demo:vueEvent', eventData, 'vue');
// Zähler erhöhen vueEventCount.value++; } function sendLegacyEvent() { const
eventData = { source: 'legacy', timestamp: new Date().toISOString(), count:
legacyEventCount.value + 1 }; // Legacy-Event simulieren if
(window.dispatchEvent) { window.dispatchEvent(new
CustomEvent('nscale:demo:legacyEvent', { detail: eventData })); } //
Event-Log-Eintrag hinzufügen addEventToLog('demo:legacyEvent', eventData,
'legacy'); // Zähler erhöhen legacyEventCount.value++; } function
addEventToLog(name: string, data: any, source: 'vue' | 'legacy') { const time =
new Date().toLocaleTimeString(); eventLog.value.unshift({ time, name, data,
source }); // Log auf 20 Einträge begrenzen if (eventLog.value.length > 20) {
eventLog.value.pop(); } } function clearLog() { eventLog.value = []; } //
Fehlerbehandlungs-Funktionen function simulateStateError() { try { //
Absichtlich einen Fehler bei der Zustandssynchronisation auslösen (bridge as
any).stateManager.healthStatus = false; bridge.setState('nonexistent.path',
'this will fail'); } catch (error) { // Fehler zum Log hinzufügen const time =
new Date().toLocaleTimeString(); errorLog.value.unshift({ time, message:
`State-Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
}); } } function simulateEventError() { try { // Absichtlich einen Fehler bei
der Event-Verarbeitung auslösen const badCallback = () => { throw new
Error('Simulierter Event-Callback-Fehler'); }; // Event mit fehlerhaftem
Callback registrieren bridge.on('test:errorEvent', badCallback); // Event
auslösen bridge.emit('test:errorEvent', { test: true }); } catch (error) { //
Fehler zum Log hinzufügen const time = new Date().toLocaleTimeString();
errorLog.value.unshift({ time, message: `Event-Fehler: ${error instanceof Error
? error.message : 'Unbekannter Fehler'}` }); } } function triggerSelfHealing() {
// Gesundheitsprüfung manuell auslösen (bridge as
any).selfHealing.performHealthCheck().then((result: boolean) => { const time =
new Date().toLocaleTimeString(); errorLog.value.unshift({ time, message:
`Selbstheilung ${result ? 'erfolgreich' : 'fehlgeschlagen'}` }); }); } //
Watcher für Vue-Store-Änderungen watch(() => uiStore.darkMode, (newValue) => {
legacyDarkMode.value = newValue; }); watch(() => authStore.user?.name,
(newValue) => { if (newValue) { legacyUsername.value = newValue; } }); //
Bridge-Status-Updates überwachen const unsubscribeStatus = (bridge as
any).statusManager.onStatusChanged((status: any) => { const time = new
Date().toLocaleTimeString(); errorLog.value.unshift({ time, message: `Status
geändert: ${BridgeErrorState[status.state]} - ${status.message}` }); }); //
Event-Listener für Legacy-Events function setupLegacyEventListener() { const
legacyEventHandler = (event: CustomEvent) => { legacyEventCount.value++;
addEventToLog('demo:legacyEvent', event.detail, 'legacy'); };
window.addEventListener('nscale:demo:legacyEvent', legacyEventHandler as
EventListener); return () => {
window.removeEventListener('nscale:demo:legacyEvent', legacyEventHandler as
EventListener); }; } // Bridge-Events abonnieren const bridgeEventSubscription =
bridge.on('demo:vueEvent', (data: any) => { vueEventCount.value++;
addEventToLog('demo:vueEvent', data, 'vue'); }); // Regelmäßige
Statistik-Updates let statsInterval: number | null = null; onMounted(() => { //
Legacy-Events einrichten const removeLegacyEventListener =
setupLegacyEventListener(); // Bridge-Fehler abonnieren const bridgeErrorHandler
= (event: CustomEvent) => { const time = new Date().toLocaleTimeString();
errorLog.value.unshift({ time, message: `Bridge-Fehler: ${event.detail.message}`
}); }; window.addEventListener('bridge:error', bridgeErrorHandler as
EventListener); // Regelmäßige Statistik-Updates statsInterval =
window.setInterval(() => { serializerStats.value = (bridge as
any).serializer.getStats(); }, 2000); // Initialen Zustand setzen
legacyDarkMode.value = uiStore.darkMode; legacyUsername.value =
authStore.user?.name || ''; // Aufräumen onBeforeUnmount(() => {
removeLegacyEventListener(); window.removeEventListener('bridge:error',
bridgeErrorHandler as EventListener); unsubscribeStatus();
bridgeEventSubscription.unsubscribe(); if (statsInterval !== null) {
clearInterval(statsInterval); } }); }); &lt;/script> &lt;style scoped>
.bridge-demo { max-width: 900px; margin: 0 auto; padding: 20px; font-family:
Arial, sans-serif; } h1 { text-align: center; margin-bottom: 30px; }
.demo-section { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd;
border-radius: 5px; background-color: #f9f9f9; } h2 { margin-top: 0; color:
#333; border-bottom: 1px solid #ddd; padding-bottom: 10px; } .status-indicator {
display: inline-block; padding: 8px 15px; border-radius: 4px; font-weight: bold;
margin-bottom: 10px; } .status-healthy { background-color: #d4edda; color:
#155724; } .status-degraded { background-color: #fff3cd; color: #856404; }
.status-error { background-color: #f8d7da; color: #721c24; } .status-critical {
background-color: #dc3545; color: white; } .stats { margin-top: 10px; font-size:
0.9em; } .state-section, .event-section { display: flex; justify-content:
space-between; align-items: center; } .vue-state, .legacy-state, .vue-events,
.legacy-events { flex: 1; padding: 15px; background-color: white; border-radius:
4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); } .sync-arrow, .event-arrow {
padding: 0 20px; font-size: 24px; color: #555; } .form-group { margin-bottom:
15px; } label { display: block; margin-bottom: 5px; font-weight: bold; }
input[type="text"] { width: 100%; padding: 8px; border: 1px solid #ddd;
border-radius: 4px; } button { background-color: #007bff; color: white; border:
none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 14px; }
button:hover { background-color: #0069d9; } .event-count { margin-top: 10px;
font-weight: bold; } .event-log, .error-log { margin-top: 20px;
background-color: white; padding: 15px; border-radius: 4px; box-shadow: 0 1px
3px rgba(0,0,0,0.1); } .log-controls { margin-bottom: 10px; text-align: right; }
.events-list, .errors-list { list-style: none; padding: 0; margin: 0;
max-height: 200px; overflow-y: auto; font-family: monospace; font-size: 12px; }
.events-list li, .errors-list li { padding: 5px; border-bottom: 1px solid #eee;
} .events-list li:last-child, .errors-list li:last-child { border-bottom: none;
} .events-list li.vue { background-color: rgba(0, 123, 255, 0.05); }
.events-list li.legacy { background-color: rgba(108, 117, 125, 0.05); }
.event-time, .error-time { display: inline-block; width: 100px; color: #6c757d;
} .event-name { display: inline-block; width: 150px; font-weight: bold; color:
#007bff; } .error-message { color: #dc3545; } .error-controls { display: flex;
gap: 10px; margin-bottom: 15px; } .error-controls button { background-color:
#dc3545; } .error-controls button:hover { background-color: #c82333; }
.error-controls button:last-child { background-color: #28a745; } .error-controls
button:last-child:hover { background-color: #218838; } &lt;/style>
