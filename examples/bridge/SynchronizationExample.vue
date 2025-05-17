<template>
  <div class="sync-example">
    <h2>Bridge-Synchronisations-Demo</h2>
    
    <div class="section">
      <h3>1. Transaktionsbasierte Updates</h3>
      <div class="demo-box">
        <div class="controls">
          <div class="input-group">
            <label>Vorname:</label>
            <input v-model="user.firstName" type="text" />
          </div>
          <div class="input-group">
            <label>Nachname:</label>
            <input v-model="user.lastName" type="text" />
          </div>
          <div class="input-group">
            <label>E-Mail:</label>
            <input v-model="user.email" type="email" />
          </div>
          <div class="buttons">
            <button @click="updateUserWithTransaction" class="primary">Mit Transaktion speichern</button>
            <button @click="updateUserWithoutTransaction">Ohne Transaktion speichern</button>
            <button @click="simulateError" class="danger">Fehler simulieren</button>
          </div>
        </div>
        <div class="results">
          <h4>Transaktions-Log:</h4>
          <div class="log-container">
            <div v-for="(entry, index) in transactionLog" :key="index"
                :class="{ 'log-entry': true, 'error': entry.type === 'error', 'success': entry.type === 'success', 'info': entry.type === 'info' }">
              <div class="log-time">{{ formatTime(entry.timestamp) }}</div>
              <div class="log-message">{{ entry.message }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <h3>2. Event-Queuing-System</h3>
      <div class="demo-box">
        <div class="controls">
          <div class="input-group">
            <label>Event-Typ:</label>
            <select v-model="newEvent.type">
              <option value="data">Daten-Event</option>
              <option value="ui">UI-Event</option>
              <option value="system">System-Event</option>
            </select>
          </div>
          <div class="input-group">
            <label>Priorität:</label>
            <select v-model="newEvent.priority">
              <option :value="0">Niedrig</option>
              <option :value="1">Normal</option>
              <option :value="2">Hoch</option>
              <option :value="3">Kritisch</option>
            </select>
          </div>
          <div class="input-group">
            <label>Payload:</label>
            <input v-model="newEvent.payload" type="text" placeholder="Event-Daten" />
          </div>
          <div class="buttons">
            <button @click="addEvent" class="primary">Event hinzufügen</button>
            <button @click="addMultipleEvents">10 Events hinzufügen</button>
            <button @click="clearEvents">Events löschen</button>
          </div>
        </div>
        <div class="results">
          <h4>Event-Queue:</h4>
          <div class="stats">
            <div class="stat">
              <div class="stat-value">{{ eventStats.queued }}</div>
              <div class="stat-label">In Queue</div>
            </div>
            <div class="stat">
              <div class="stat-value">{{ eventStats.processing }}</div>
              <div class="stat-label">In Verarbeitung</div>
            </div>
            <div class="stat">
              <div class="stat-value">{{ eventStats.completed }}</div>
              <div class="stat-label">Abgeschlossen</div>
            </div>
            <div class="stat">
              <div class="stat-value">{{ eventStats.failed }}</div>
              <div class="stat-label">Fehlgeschlagen</div>
            </div>
          </div>
          <div class="log-container">
            <div v-for="(entry, index) in eventLog" :key="index"
                :class="{ 'log-entry': true, 'error': entry.status === 'FAILED', 'success': entry.status === 'COMPLETED', 'info': entry.status === 'PROCESSING', 'pending': entry.status === 'QUEUED' }">
              <div class="log-time">{{ formatTime(entry.timestamp) }}</div>
              <div class="log-message">
                <strong>[{{ getPriorityName(entry.priority) }}]</strong> 
                {{ entry.type }} - {{ entry.payload }}
              </div>
              <div class="log-status">{{ entry.status }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <h3>3. Timeout-und-Retry-Mechanismus</h3>
      <div class="demo-box">
        <div class="controls">
          <div class="input-group">
            <label>Operation:</label>
            <select v-model="operation.type">
              <option value="fast">Schnelle Operation (50ms)</option>
              <option value="slow">Langsame Operation (2s)</option>
              <option value="flaky">Unzuverlässige Operation (50% Fehlerrate)</option>
              <option value="timeout">Timeout-Operation (6s)</option>
            </select>
          </div>
          <div class="input-group">
            <label>Timeout (ms):</label>
            <input v-model.number="operation.timeout" type="number" min="100" step="100" />
          </div>
          <div class="input-group">
            <label>Max. Wiederholungen:</label>
            <input v-model.number="operation.maxRetries" type="number" min="0" max="10" />
          </div>
          <div class="buttons">
            <button @click="executeOperation" class="primary" :disabled="operationRunning">
              Operation ausführen
            </button>
            <button @click="abortOperation" class="danger" :disabled="!operationRunning">
              Operation abbrechen
            </button>
          </div>
        </div>
        <div class="results">
          <h4>Operation-Status:</h4>
          <div class="operation-status" v-if="operationStatus">
            <div class="progress-container" v-if="operationRunning">
              <div class="progress-bar" :style="{ width: `${operationProgress}%` }"></div>
            </div>
            <div class="status-text" :class="operationStatus.success ? 'success' : 'error'">
              Status: {{ operationStatus.success ? 'Erfolgreich' : 'Fehlgeschlagen' }}
            </div>
            <div class="attempts">Versuche: {{ operationStatus.attempts || 0 }}</div>
            <div class="duration">Dauer: {{ operationStatus.totalTimeMs || 0 }}ms</div>
            <div class="result" v-if="operationStatus.success">
              Ergebnis: {{ operationStatus.result }}
            </div>
            <div class="error" v-if="!operationStatus.success && operationStatus.error">
              Fehler: {{ operationStatus.error.message || JSON.stringify(operationStatus.error) }}
            </div>
          </div>
          <div class="log-container">
            <div v-for="(entry, index) in operationLog" :key="index"
                :class="{ 'log-entry': true, 'error': entry.type === 'error', 'success': entry.type === 'success', 'info': entry.type === 'info', 'warning': entry.type === 'retry' }">
              <div class="log-time">{{ formatTime(entry.timestamp) }}</div>
              <div class="log-message">{{ entry.message }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import transactionManager from '../../src/bridge/enhanced/sync/TransactionManager';
import eventQueue, { EventPriority } from '../../src/bridge/enhanced/sync/EventQueue';
import { TimeoutRetry } from '../../src/bridge/enhanced/sync/TimeoutRetry';

export default {
  name: 'SynchronizationExample',
  
  setup() {
    // ==================== Transaction Demo ====================
    const user = reactive({
      firstName: 'Max',
      lastName: 'Mustermann',
      email: 'max@example.com'
    });
    
    const transactionLog = ref([]);
    
    const addLogEntry = (message, type = 'info') => {
      transactionLog.value.push({
        message,
        type,
        timestamp: new Date()
      });
    };
    
    const updateUserWithTransaction = async () => {
      addLogEntry('Starte Transaktion für User-Update...');
      
      // Transaktion starten
      const txId = transactionManager.beginTransaction({
        name: 'Update User Profile',
        autoCommit: false
      });
      
      addLogEntry(`Transaktion ${txId} gestartet`);
      
      // Original-Werte für Snapshots speichern
      const originalUser = {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      };
      
      // Snapshots für alle Felder erfassen
      transactionManager.captureSnapshot(
        txId, 
        ['user', 'firstName'], 
        originalUser.firstName
      );
      
      transactionManager.captureSnapshot(
        txId, 
        ['user', 'lastName'], 
        originalUser.lastName
      );
      
      transactionManager.captureSnapshot(
        txId, 
        ['user', 'email'], 
        originalUser.email
      );
      
      addLogEntry('Snapshots für User-Daten erfasst');
      
      try {
        // Simuliere asynchrone Operation
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Update in einer anderen Funktion durchführen
        simulateExternalUpdate(user);
        
        addLogEntry('Externe Aktualisierung durchgeführt');
        
        // Transaktion abschließen
        transactionManager.commitTransaction(txId);
        
        addLogEntry(`Transaktion ${txId} erfolgreich abgeschlossen`, 'success');
      } catch (error) {
        // Bei Fehler Transaktion zurückrollen
        const originalValues = transactionManager.rollbackTransaction(txId);
        
        // Original-Werte wiederherstellen
        user.firstName = originalValues['user.firstName']?.value || user.firstName;
        user.lastName = originalValues['user.lastName']?.value || user.lastName;
        user.email = originalValues['user.email']?.value || user.email;
        
        addLogEntry(`Fehler: ${error.message}. Transaktion zurückgerollt.`, 'error');
      }
    };
    
    const updateUserWithoutTransaction = async () => {
      addLogEntry('Führe Update ohne Transaktion durch...');
      
      try {
        // Simuliere asynchrone Operation
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Update in einer anderen Funktion durchführen
        simulateExternalUpdate(user);
        
        addLogEntry('Aktualisierung abgeschlossen', 'success');
      } catch (error) {
        addLogEntry(`Fehler: ${error.message}`, 'error');
      }
    };
    
    const simulateExternalUpdate = (userData) => {
      // Simuliere externe Aktualisierung
      userData.firstName = userData.firstName.toUpperCase();
      userData.lastName = userData.lastName.toUpperCase();
      userData.email = userData.email.toLowerCase();
    };
    
    const simulateError = () => {
      addLogEntry('Simuliere Fehler während der Aktualisierung...');
      
      try {
        throw new Error('Simulierter Fehler während des User-Updates');
      } catch (error) {
        addLogEntry(error.message, 'error');
      }
    };
    
    // ==================== Event Queue Demo ====================
    const newEvent = reactive({
      type: 'data',
      priority: 1,
      payload: 'Test-Event'
    });
    
    const eventLog = ref([]);
    const eventStats = reactive({
      queued: 0,
      processing: 0,
      completed: 0,
      failed: 0
    });
    
    const getPriorityName = (priority) => {
      switch (priority) {
        case 0: return 'Niedrig';
        case 1: return 'Normal';
        case 2: return 'Hoch';
        case 3: return 'Kritisch';
        default: return 'Unbekannt';
      }
    };
    
    const eventHandlers = {};
    
    const addEvent = () => {
      const priority = parseInt(newEvent.priority);
      const eventId = eventQueue.enqueue(
        newEvent.type,
        { message: newEvent.payload },
        {
          priority,
          category: newEvent.type,
          source: 'vue'
        }
      );
      
      if (eventId) {
        eventLog.value.push({
          id: eventId,
          type: newEvent.type,
          priority,
          payload: newEvent.payload,
          status: 'QUEUED',
          timestamp: new Date()
        });
        
        eventStats.queued++;
        
        // Event-Handler registrieren, falls noch nicht vorhanden
        if (!eventHandlers[newEvent.type]) {
          eventHandlers[newEvent.type] = eventQueue.on(newEvent.type, async (event) => {
            // Event als "in Verarbeitung" markieren
            const logEntry = eventLog.value.find(e => e.id === event.id);
            if (logEntry) {
              logEntry.status = 'PROCESSING';
              logEntry.timestamp = new Date();
              eventStats.queued--;
              eventStats.processing++;
            }
            
            // Verzögerung simulieren basierend auf Priorität
            const delay = 3000 - (event.priority * 500);
            await new Promise(resolve => setTimeout(resolve, Math.max(500, delay)));
            
            // Zufälligen Fehler simulieren (10% Chance)
            const shouldFail = Math.random() < 0.1;
            
            if (shouldFail) {
              throw new Error('Simulierter Event-Verarbeitungsfehler');
            }
            
            // Event als abgeschlossen markieren
            if (logEntry) {
              logEntry.status = 'COMPLETED';
              logEntry.timestamp = new Date();
              eventStats.processing--;
              eventStats.completed++;
            }
          });
        }
      }
    };
    
    const addMultipleEvents = () => {
      for (let i = 0; i < 10; i++) {
        newEvent.payload = `Bulk-Event #${i+1}`;
        newEvent.priority = Math.floor(Math.random() * 4); // Zufällige Priorität
        addEvent();
      }
    };
    
    const clearEvents = () => {
      eventLog.value = [];
      eventStats.queued = 0;
      eventStats.processing = 0;
      eventStats.completed = 0;
      eventStats.failed = 0;
      
      // Event-Queue leeren
      eventQueue.clearQueue();
    };
    
    // Event-Fehlerbehandlung
    eventQueue.onAny(async (event) => {
      try {
        // Normales Event-Handling wird vom spezifischen Handler durchgeführt
      } catch (error) {
        // Bei Fehler das Event als fehlgeschlagen markieren
        const logEntry = eventLog.value.find(e => e.id === event.id);
        if (logEntry) {
          logEntry.status = 'FAILED';
          logEntry.timestamp = new Date();
          logEntry.error = error.message;
          eventStats.processing--;
          eventStats.failed++;
        }
      }
    });
    
    // ==================== Timeout-Retry Demo ====================
    const operation = reactive({
      type: 'fast',
      timeout: 3000,
      maxRetries: 3
    });
    
    const operationStatus = ref(null);
    const operationRunning = ref(false);
    const operationProgress = ref(0);
    const operationLog = ref([]);
    let operationAbortController = null;
    
    const addOperationLog = (message, type = 'info') => {
      operationLog.value.push({
        message,
        type,
        timestamp: new Date()
      });
    };
    
    const executeOperation = async () => {
      // Operation vorbereiten
      operationRunning.value = true;
      operationProgress.value = 0;
      operationStatus.value = null;
      operationAbortController = new AbortController();
      
      addOperationLog(`Führe ${operation.type} Operation aus...`);
      
      // Progress-Simulation
      const progressInterval = setInterval(() => {
        if (operationRunning.value) {
          operationProgress.value = Math.min(99, operationProgress.value + 5);
        } else {
          clearInterval(progressInterval);
        }
      }, 100);
      
      // TimeoutRetry mit benutzerdefinierten Optionen erstellen
      const timeoutRetry = new TimeoutRetry({
        maxRetries: operation.maxRetries,
        timeout: operation.timeout,
        retryDelay: 500,
        exponentialBackoff: true,
        onRetry: (attempt, delay, error) => {
          addOperationLog(`Wiederhole Operation (Versuch ${attempt}/${operation.maxRetries}) in ${delay}ms. Fehler: ${error?.message || 'Timeout'}`, 'retry');
        },
        onTimeout: (attempt, elapsed) => {
          addOperationLog(`Operation-Timeout nach ${elapsed}ms (Versuch ${attempt})`, 'error');
        }
      });
      
      try {
        // Operation ausführen
        const result = await timeoutRetry.executeWithRetry(
          () => performOperation(operation.type, operationAbortController.signal),
          `${operation.type} Operation`
        );
        
        operationStatus.value = result;
        
        if (result.success) {
          addOperationLog(`Operation erfolgreich abgeschlossen nach ${result.attempts} Versuch(en)`, 'success');
        } else {
          addOperationLog(`Operation fehlgeschlagen nach ${result.attempts} Versuch(en): ${result.error?.message || 'Unbekannter Fehler'}`, 'error');
        }
      } catch (error) {
        addOperationLog(`Unerwarteter Fehler: ${error.message}`, 'error');
      } finally {
        operationRunning.value = false;
        operationProgress.value = 100;
        clearInterval(progressInterval);
      }
    };
    
    const abortOperation = () => {
      if (operationAbortController && operationRunning.value) {
        operationAbortController.abort();
        addOperationLog('Operation abgebrochen', 'warning');
      }
    };
    
    // Simulierte asynchrone Operation
    const performOperation = async (type, abortSignal) => {
      // Abbruch-Signal prüfen
      if (abortSignal && abortSignal.aborted) {
        throw new Error('Operation abgebrochen');
      }
      
      // Registriere Abbruch-Listener
      return new Promise((resolve, reject) => {
        // Abbruch-Listener
        const abortHandler = () => {
          reject(new Error('Operation abgebrochen'));
        };
        
        if (abortSignal) {
          abortSignal.addEventListener('abort', abortHandler);
        }
        
        let timeoutId;
        
        try {
          switch (type) {
            case 'fast':
              // Schnelle Operation (50ms)
              timeoutId = setTimeout(() => {
                resolve('Schnelle Operation abgeschlossen');
              }, 50);
              break;
              
            case 'slow':
              // Langsame Operation (2s)
              timeoutId = setTimeout(() => {
                resolve('Langsame Operation abgeschlossen');
              }, 2000);
              break;
              
            case 'flaky':
              // Unzuverlässige Operation (50% Fehlerrate)
              timeoutId = setTimeout(() => {
                if (Math.random() < 0.5) {
                  resolve('Unzuverlässige Operation erfolgreich');
                } else {
                  reject(new Error('Simulierter Fehler in unzuverlässiger Operation'));
                }
              }, 500);
              break;
              
            case 'timeout':
              // Timeout-Operation (6s)
              timeoutId = setTimeout(() => {
                resolve('Timeout-Operation abgeschlossen');
              }, 6000);
              break;
              
            default:
              reject(new Error('Unbekannter Operationstyp'));
          }
          
          // Abbruch-Cleanup
          if (abortSignal) {
            abortSignal.addEventListener('abort', () => {
              clearTimeout(timeoutId);
            }, { once: true });
          }
        } catch (error) {
          if (abortSignal) {
            abortSignal.removeEventListener('abort', abortHandler);
          }
          
          reject(error);
        }
      });
    };
    
    // Gemeinsame Hilfsfunktionen
    const formatTime = (date) => {
      return date.toLocaleTimeString('de-DE', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        fractionalSecondDigits: 3
      });
    };
    
    return {
      // Transaction Demo
      user,
      transactionLog,
      updateUserWithTransaction,
      updateUserWithoutTransaction,
      simulateError,
      
      // Event Queue Demo
      newEvent,
      eventLog,
      eventStats,
      getPriorityName,
      addEvent,
      addMultipleEvents,
      clearEvents,
      
      // Timeout-Retry Demo
      operation,
      operationStatus,
      operationRunning,
      operationProgress,
      operationLog,
      executeOperation,
      abortOperation,
      
      // Gemeinsame Hilfsfunktionen
      formatTime
    };
  }
};
</script>

<style scoped>
.sync-example {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

h2 {
  margin-bottom: 20px;
  color: #333;
  text-align: center;
}

.section {
  margin-bottom: 30px;
}

h3 {
  margin-bottom: 15px;
  padding-bottom: 5px;
  border-bottom: 1px solid #eee;
  color: #444;
}

.demo-box {
  display: flex;
  gap: 20px;
  background: #f9f9f9;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.controls {
  flex: 1;
  padding: 15px;
  background: white;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.results {
  flex: 2;
  padding: 15px;
  background: white;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.input-group {
  margin-bottom: 15px;
}

.input-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #555;
}

.input-group input,
.input-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

button {
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  background: #f0f0f0;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

button:hover {
  background: #e0e0e0;
}

button.primary {
  background: #4c84ff;
  color: white;
}

button.primary:hover {
  background: #3a70e0;
}

button.danger {
  background: #ff4c4c;
  color: white;
}

button.danger:hover {
  background: #e03a3a;
}

button:disabled {
  background: #cccccc;
  cursor: not-allowed;
}

h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #555;
}

.log-container {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
}

.log-entry {
  padding: 6px 10px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
}

.log-entry:last-child {
  border-bottom: none;
}

.log-time {
  min-width: 140px;
  color: #999;
}

.log-message {
  flex: 1;
}

.log-status {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  margin-left: 8px;
}

.log-entry.error {
  background-color: rgba(255, 76, 76, 0.1);
}

.log-entry.success {
  background-color: rgba(76, 175, 80, 0.1);
}

.log-entry.info {
  background-color: rgba(33, 150, 243, 0.1);
}

.log-entry.warning,
.log-entry.retry {
  background-color: rgba(255, 193, 7, 0.1);
}

.log-entry.pending {
  background-color: rgba(179, 179, 179, 0.1);
}

.stats {
  display: flex;
  gap: 15px;
  margin-bottom: 10px;
}

.stat {
  flex: 1;
  text-align: center;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

.operation-status {
  margin-bottom: 15px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
}

.progress-container {
  height: 10px;
  background: #e0e0e0;
  border-radius: 5px;
  margin-bottom: 10px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: #4c84ff;
  width: 0;
  transition: width 0.3s;
}

.status-text {
  font-weight: bold;
  margin-bottom: 5px;
}

.status-text.success {
  color: #4caf50;
}

.status-text.error {
  color: #ff4c4c;
}

.attempts, .duration {
  font-size: 14px;
  margin-bottom: 5px;
}

.result {
  background: #e6f7ff;
  padding: 6px;
  border-radius: 4px;
  margin-top: 5px;
}

.error {
  background: #fff1f0;
  padding: 6px;
  border-radius: 4px;
  margin-top: 5px;
  color: #ff4c4c;
}
</style>