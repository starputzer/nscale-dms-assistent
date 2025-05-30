// This is the improved streaming implementation for sessions.ts
// Copy this into the sendMessage function in sessions.ts

import { parseSSEStream } from '@/utils/sse-parser';

// Inside the streaming block of sendMessage function:
if (streamingEnabled) {
  console.log("=== STREAMING DEBUG START ===");
  console.log("Using streaming endpoint for message:", content);

  // Create initial assistant message
  const assistantTempId = `temp-response-${uuidv4()}`;
  const streamingMessage: ChatMessage = {
    id: assistantTempId,
    sessionId,
    content: "",
    role: "assistant",
    timestamp: new Date().toISOString(),
    isStreaming: true,
    status: "pending" as const,
  };
  messages.value[sessionId].push(streamingMessage);

  const finishStreaming = () => {
    const finalMsgIndex = messages.value[sessionId].findIndex(
      (msg) => msg.id === assistantTempId,
    );
    if (finalMsgIndex !== -1) {
      const updatedMessages = [...messages.value[sessionId]];
      updatedMessages[finalMsgIndex] = {
        ...updatedMessages[finalMsgIndex],
        isStreaming: false,
        status: "sent",
      };
      messages.value = {
        ...messages.value,
        [sessionId]: updatedMessages,
      };
    }

    streaming.value = {
      isActive: false,
      progress: 100,
      currentSessionId: null,
    };
  };

  // URL parameters for streaming
  const params = new URLSearchParams();
  params.append("question", content);
  params.append("session_id", sessionId || "new");

  const url = `/api/question/stream?${params.toString()}`;
  console.log("Streaming URL:", url);
  console.log("Auth token present:", !!authToken);

  let responseContent = "";
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: "text/event-stream",
      },
    });

    console.log("Streaming response status:", response.status);
    console.log("Streaming response headers:", {
      contentType: response.headers.get('content-type'),
      cacheControl: response.headers.get('cache-control'),
      xAccelBuffering: response.headers.get('x-accel-buffering')
    });

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    // Use the SSE parser for proper message handling
    for await (const message of parseSSEStream(response)) {
      console.log("SSE Message:", message);
      
      // Handle done event
      if (message.event === 'done') {
        console.log("Received done event");
        finishStreaming();
        return;
      }
      
      // Handle data messages
      if (message.data) {
        try {
          const parsed = JSON.parse(message.data);
          
          if (parsed.response) {
            responseContent += parsed.response;
            console.log("Streamed token:", parsed.response);
            
            // Update the message
            const msgIndex = messages.value[sessionId].findIndex(
              (msg) => msg.id === assistantTempId,
            );
            if (msgIndex !== -1) {
              const updatedMessages = [...messages.value[sessionId]];
              updatedMessages[msgIndex] = {
                ...updatedMessages[msgIndex],
                content: responseContent,
                isStreaming: true,
                status: "pending",
              };
              messages.value = {
                ...messages.value,
                [sessionId]: updatedMessages,
              };
            }
          } else if (parsed.error) {
            console.error("Streaming error from backend:", parsed.error);
            throw new Error(parsed.error);
          }
        } catch (e) {
          // If not JSON, check for special messages
          if (message.data === '[DONE]') {
            console.log("Received [DONE] signal");
            finishStreaming();
            return;
          }
          console.warn("Could not parse SSE data as JSON:", message.data);
        }
      }
    }
    
    // Stream ended normally
    finishStreaming();
    
  } catch (error) {
    console.error("Streaming error:", error);
    
    // Fallback to non-streaming API
    console.log("Falling back to non-streaming API");
    
    // If no content received, try the non-streaming API
    if (!responseContent) {
      const requestData: any = {
        question: content,
      };

      if (/^\d+$/.test(sessionId)) {
        requestData.session_id = parseInt(sessionId);
      }

      const fallbackResponse = await axios.post(
        "/api/question",
        requestData,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      const assistantMessage: ChatMessage = {
        id: assistantTempId,
        sessionId,
        content:
          fallbackResponse.data.response ||
          fallbackResponse.data.message ||
          fallbackResponse.data.answer ||
          "Keine Antwort vom Server",
        role: "assistant",
        timestamp: new Date().toISOString(),
        status: "sent",
      };

      // Update message
      const msgIndex = messages.value[sessionId].findIndex(
        (msg) => msg.id === assistantTempId,
      );
      if (msgIndex !== -1) {
        const updatedMessages = [...messages.value[sessionId]];
        updatedMessages[msgIndex] = assistantMessage;
        messages.value = {
          ...messages.value,
          [sessionId]: updatedMessages,
        };
      }
    }
    
    finishStreaming();
  }
}