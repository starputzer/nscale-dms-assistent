<template>
  <div class="optimized-bridge-demo">
    <h2>Optimized Bridge Demo</h2>
    
    <div class="stats-panel">
      <h3>Performance Metrics</h3>
      <div v-if="metrics" class="metrics-grid">
        <div v-for="(stat, key) in metrics" :key="key" class="metric-item">
          <div class="metric-label">{{ formatMetricName(key) }}</div>
          <div class="metric-value">{{ formatMetricValue(stat) }}</div>
        </div>
      </div>
      <div v-else class="loading">Loading metrics...</div>
    </div>
    
    <div class="message-panel">
      <h3>Chat Messages</h3>
      <div class="message-list" ref="messageList">
        <div v-for="(message, index) in messages" :key="index" class="message-item">
          <div class="message-author">{{ message.author }}</div>
          <div class="message-content">{{ message.content }}</div>
          <div class="message-time">{{ formatTime(message.timestamp) }}</div>
        </div>
      </div>
      
      <div class="message-input">
        <input 
          type="text" 
          v-model="newMessage" 
          @keyup.enter="sendMessage"
          placeholder="Type a message..."
        />
        <button @click="sendMessage" :disabled="isLoading">Send</button>
      </div>
    </div>
    
    <div class="controls">
      <button @click="toggleDiagnostics">
        {{ showDiagnostics ? 'Hide' : 'Show' }} Diagnostics
      </button>
      <button @click="runBenchmark">Run Performance Benchmark</button>
      <button @click="triggerSelfHealing">Trigger Self-Healing</button>
    </div>
    
    <div v-if="showDiagnostics" class="diagnostics-panel">
      <h3>Bridge Diagnostics</h3>
      <pre>{{ JSON.stringify(diagnostics, null, 2) }}</pre>
    </div>
    
    <div v-if="benchmarkResults" class="benchmark-results">
      <h3>Benchmark Results</h3>
      <table>
        <thead>
          <tr>
            <th>Operation</th>
            <th>Duration</th>
            <th>Memory Impact</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(result, index) in benchmarkResults" :key="index">
            <td>{{ result.name }}</td>
            <td>{{ result.duration.toFixed(2) }}ms</td>
            <td>{{ result.memory }}KB</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { getOptimizedBridge } from '@/bridge/enhanced/optimized';

export default {
  name: 'OptimizedBridgeExample',
  
  setup() {
    // State
    const messages = ref<Array<{author: string; content: string; timestamp: number}>>([]);
    const newMessage = ref('');
    const isLoading = ref(false);
    const showDiagnostics = ref(false);
    const diagnostics = ref(null);
    const metrics = ref(null);
    const benchmarkResults = ref(null);
    const messageList = ref(null);
    
    // Bridge instance
    let bridge: any = null;
    let metricsInterval: number | null = null;
    
    // Cleanup functions for event listeners
    const cleanup: (() => void)[] = [];
    
    onMounted(async () => {
      try {
        // Initialize optimized bridge with all optimizations enabled
        bridge = await getOptimizedBridge({
          enablePerformanceMonitoring: true,
          enableMemoryManagement: true,
          enableEventBatching: true,
          enableSelectiveSync: true,
          enableSelfHealing: true,
          enableDiagnostics: true,
          enableDeveloperTools: true,
        });
        
        // Subscribe to message updates with automatic cleanup
        const messageSubscription = bridge.on('vanillaChat:messagesUpdated', (data: any) => {
          messages.value = data.messages || [];
          scrollToBottom();
        }, 'OptimizedBridgeExample');
        
        cleanup.push(messageSubscription.unsubscribe);
        
        // Subscribe to status updates
        const statusSubscription = bridge.on('vanillaChat:status', (data: any) => {
          isLoading.value = data.loading || false;
        }, 'OptimizedBridgeExample');
        
        cleanup.push(statusSubscription.unsubscribe);
        
        // Send ready event to legacy code
        bridge.emit('vueChat:ready', { 
          component: 'OptimizedBridgeExample',
          timestamp: Date.now()
        });
        
        // Load initial messages
        const initialMessages = bridge.getSessionMessages('current') || [];
        if (initialMessages.length) {
          messages.value = initialMessages;
          scrollToBottom();
        }
        
        // Setup metrics refresh
        metricsInterval = window.setInterval(async () => {
          updateMetrics();
        }, 2000);
        
        // Initial metrics update
        updateMetrics();
        
      } catch (error) {
        console.error('Failed to initialize bridge:', error);
      }
    });
    
    onUnmounted(() => {
      // Clean up all subscriptions
      cleanup.forEach(fn => fn());
      
      // Clear metrics interval
      if (metricsInterval !== null) {
        clearInterval(metricsInterval);
      }
    });
    
    // Methods
    const sendMessage = async () => {
      if (!newMessage.value.trim() || isLoading.value || !bridge) return;
      
      isLoading.value = true;
      
      try {
        await bridge.sendMessage(newMessage.value, 'current');
        newMessage.value = '';
      } catch (error) {
        console.error('Failed to send message:', error);
      } finally {
        isLoading.value = false;
      }
    };
    
    const updateMetrics = async () => {
      if (!bridge) return;
      
      try {
        const status = await bridge.getStatus();
        diagnostics.value = status;
        
        // Extract performance metrics if available
        if (status?.diagnostics?.performanceMetrics) {
          metrics.value = status.diagnostics.performanceMetrics;
        }
      } catch (error) {
        console.error('Failed to update metrics:', error);
      }
    };
    
    const toggleDiagnostics = () => {
      showDiagnostics.value = !showDiagnostics.value;
      
      if (showDiagnostics.value && bridge) {
        updateMetrics();
        bridge.showDiagnostics();
      }
    };
    
    const formatMetricName = (name: string) => {
      return name
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };
    
    const formatMetricValue = (stat: any) => {
      if (typeof stat === 'object') {
        if ('avg' in stat) {
          return `${stat.avg.toFixed(2)}ms (${stat.count} samples)`;
        }
        return JSON.stringify(stat);
      }
      return stat;
    };
    
    const formatTime = (timestamp: number) => {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    };
    
    const scrollToBottom = () => {
      nextTick(() => {
        if (messageList.value) {
          messageList.value.scrollTop = messageList.value.scrollHeight;
        }
      });
    };
    
    const runBenchmark = async () => {
      if (!bridge) return;
      
      const results = [];
      const initialMemory = window.performance && (window.performance as any).memory 
        ? (window.performance as any).memory.usedJSHeapSize / 1024 
        : 0;
      
      // 1. Test message batching
      let startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        bridge.emit('vueChat:benchmark', { index: i, value: `Test message ${i}` });
      }
      let endTime = performance.now();
      let currentMemory = window.performance && (window.performance as any).memory 
        ? (window.performance as any).memory.usedJSHeapSize / 1024 
        : 0;
      
      results.push({
        name: 'Emit 100 events (batched)',
        duration: endTime - startTime,
        memory: Math.round(currentMemory - initialMemory)
      });
      
      // 2. Test state synchronization
      const testMessages = Array.from({ length: 1000 }, (_, i) => ({
        id: `msg-${i}`,
        author: 'Benchmark',
        content: `Test message ${i}`,
        timestamp: Date.now() + i
      }));
      
      startTime = performance.now();
      bridge.syncState('benchmarkMessages', testMessages);
      endTime = performance.now();
      currentMemory = window.performance && (window.performance as any).memory 
        ? (window.performance as any).memory.usedJSHeapSize / 1024 
        : 0;
      
      results.push({
        name: 'Sync 1000 messages',
        duration: endTime - startTime,
        memory: Math.round(currentMemory - initialMemory)
      });
      
      // 3. Test deep diffing
      const updatedMessages = [...testMessages];
      // Modify 10% of messages
      for (let i = 0; i < 100; i++) {
        const index = Math.floor(Math.random() * 1000);
        updatedMessages[index] = {
          ...updatedMessages[index],
          content: `Updated message ${index}`,
          timestamp: Date.now()
        };
      }
      
      startTime = performance.now();
      bridge.syncState('benchmarkMessages', updatedMessages);
      endTime = performance.now();
      currentMemory = window.performance && (window.performance as any).memory 
        ? (window.performance as any).memory.usedJSHeapSize / 1024 
        : 0;
      
      results.push({
        name: 'Update 10% of 1000 messages (selective sync)',
        duration: endTime - startTime,
        memory: Math.round(currentMemory - initialMemory)
      });
      
      benchmarkResults.value = results;
    };
    
    const triggerSelfHealing = async () => {
      if (!bridge) return;
      
      try {
        const result = await bridge.triggerHealing();
        console.log('Self-healing result:', result);
        updateMetrics();
      } catch (error) {
        console.error('Failed to trigger self-healing:', error);
      }
    };
    
    return {
      messages,
      newMessage,
      isLoading,
      showDiagnostics,
      diagnostics,
      metrics,
      benchmarkResults,
      messageList,
      sendMessage,
      toggleDiagnostics,
      formatMetricName,
      formatMetricValue,
      formatTime,
      runBenchmark,
      triggerSelfHealing
    };
  }
};
</script>

<style scoped>
.optimized-bridge-demo {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

h2 {
  text-align: center;
  margin-bottom: 20px;
}

h3 {
  margin-top: 0;
  margin-bottom: 15px;
  border-bottom: 1px solid #ddd;
  padding-bottom: 8px;
}

.stats-panel {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 20px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.metric-item {
  background-color: white;
  padding: 10px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.metric-label {
  font-weight: bold;
  font-size: 12px;
  color: #555;
  margin-bottom: 5px;
}

.metric-value {
  font-size: 14px;
}

.message-panel {
  background-color: white;
  border-radius: 5px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  padding: 15px;
  margin-bottom: 20px;
}

.message-list {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 15px;
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 4px;
}

.message-item {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.message-item:last-child {
  border-bottom: none;
}

.message-author {
  font-weight: bold;
  margin-bottom: 3px;
}

.message-content {
  margin-bottom: 5px;
}

.message-time {
  font-size: 11px;
  color: #999;
  text-align: right;
}

.message-input {
  display: flex;
  gap: 10px;
}

.message-input input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.message-input button {
  padding: 8px 15px;
  background-color: #4c84ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.message-input button:disabled {
  background-color: #a0b9ff;
  cursor: not-allowed;
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.controls button {
  flex: 1;
  padding: 10px;
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.controls button:hover {
  background-color: #e4e4e4;
}

.diagnostics-panel {
  background-color: #1e1e1e;
  color: #d4d4d4;
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 20px;
  overflow-x: auto;
}

.diagnostics-panel pre {
  margin: 0;
  font-family: monospace;
  font-size: 12px;
}

.benchmark-results {
  background-color: #fff;
  padding: 15px;
  border-radius: 5px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.benchmark-results table {
  width: 100%;
  border-collapse: collapse;
}

.benchmark-results th, 
.benchmark-results td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.benchmark-results th {
  background-color: #f5f5f5;
  font-weight: bold;
}

.loading {
  text-align: center;
  font-style: italic;
  color: #999;
}
</style>