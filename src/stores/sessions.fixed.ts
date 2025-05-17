// Verbesserter Code für die Streaming-Anfrage

// In der sendMessage Funktion, ersetze den Streaming-Teil mit:

// URL-Parameter für Streaming
const params = new URLSearchParams();
params.append('question', content); // URLSearchParams encodiert automatisch
params.append('session_id', sessionId);

// Token sollte besser im Header sein, aber wenn in URL:
const authStore = useAuthStore();
const authToken = authStore.token;

// Option 1: Token im Header (empfohlen)
const headers = new Headers({
  'Authorization': `Bearer ${authToken}`
});

const url = `/api/question/stream?${params.toString()}`;
console.log('Streaming URL:', url);
console.log('URL params:', params.toString());

// Option 2: Wenn Token in URL bleiben muss, kürzen oder hashen
// params.append('token', authToken.substring(0, 100)); // Nur als Beispiel

// Für EventSource mit Headers (erfordert evtl. Polyfill)
const eventSource = new EventSource(url, {
  headers: {
    'Authorization': `Bearer ${authToken}`
  }
});

// Alternative: Verwende fetch() mit ReadableStream für mehr Kontrolle
async function streamWithFetch() {
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Accept': 'text/event-stream'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      // Verarbeite den Chunk...
    }
  } catch (error) {
    console.error('Streaming error:', error);
    // Fallback zur non-streaming API
  }
}