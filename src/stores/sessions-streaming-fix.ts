// Fix for streaming reactivity in sessions store
// This file contains the corrected update pattern for streaming messages

export const STREAMING_UPDATE_FIX = `
// BEFORE (problematic code around line 1058):
if (msgIndex !== -1) {
  const updatedMessages = [...messages.value[sessionId]];
  // Safeguard: Never show raw SSE data
  const sanitizedContent = responseContent.includes("data:") ? "" : responseContent;
  updatedMessages[msgIndex] = {
    ...updatedMessages[msgIndex],
    content: sanitizedContent,
    isStreaming: true,
    status: "pending",
  };
  messages.value = {
    ...messages.value,
    [sessionId]: updatedMessages,
  };
}

// AFTER (fixed code with proper reactivity):
if (msgIndex !== -1) {
  // Create a completely new message object
  const sanitizedContent = responseContent.includes("data:") ? "" : responseContent;
  const updatedMessage = {
    ...messages.value[sessionId][msgIndex],
    content: sanitizedContent,
    isStreaming: true,
    status: "pending",
  };
  
  // Create new array with the updated message
  const newMessages = [...messages.value[sessionId]];
  newMessages[msgIndex] = updatedMessage;
  
  // Force Vue to detect the change by creating a completely new object
  // This ensures the computed properties depending on messages will update
  messages.value = Object.assign({}, messages.value, {
    [sessionId]: newMessages
  });
  
  // Alternative: Force a reactive update
  // messages.value = JSON.parse(JSON.stringify({
  //   ...messages.value,
  //   [sessionId]: newMessages
  // }));
}
`;

export const FINAL_MESSAGE_UPDATE_FIX = `
// BEFORE (around line 910):
const finishStreaming = async () => {
  const finalMsgIndex = messages.value[sessionId].findIndex(
    (msg) => msg.id === assistantTempId,
  );
  if (finalMsgIndex !== -1) {
    const updatedMessages = [...messages.value[sessionId]];
    // Safeguard: Never show raw SSE data in final content
    const sanitizedContent = responseContent.includes("data:") ? "Fehler beim Verarbeiten der Antwort" : responseContent;
    updatedMessages[finalMsgIndex] = {
      ...updatedMessages[finalMsgIndex],
      content: sanitizedContent, // Ensure final content is set
      isStreaming: false,
      status: "sent",
    };
    messages.value = {
      ...messages.value,
      [sessionId]: updatedMessages,
    };
  }

// AFTER (fixed):
const finishStreaming = async () => {
  const finalMsgIndex = messages.value[sessionId].findIndex(
    (msg) => msg.id === assistantTempId,
  );
  if (finalMsgIndex !== -1) {
    const sanitizedContent = responseContent.includes("data:") ? "Fehler beim Verarbeiten der Antwort" : responseContent;
    const updatedMessage = {
      ...messages.value[sessionId][finalMsgIndex],
      content: sanitizedContent,
      isStreaming: false,
      status: "sent",
    };
    
    const newMessages = [...messages.value[sessionId]];
    newMessages[finalMsgIndex] = updatedMessage;
    
    // Force complete reactivity update
    messages.value = Object.assign({}, messages.value, {
      [sessionId]: newMessages
    });
  }
`;

// Also need to check the allCurrentMessages computed property
export const COMPUTED_MESSAGES_CHECK = `
// In sessions store, check the allCurrentMessages computed:
const allCurrentMessages = computed(() => {
  if (!currentSessionId.value) return [];
  const sessionMessages = messages.value[currentSessionId.value] || [];
  const pendingSessionMessages =
    pendingMessages.value[currentSessionId.value] || [];

  return [...sessionMessages, ...pendingSessionMessages].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
});

// Make sure this computed is properly reactive by adding console.log:
const allCurrentMessages = computed(() => {
  console.log('[SessionsStore] Computing allCurrentMessages for session:', currentSessionId.value);
  if (!currentSessionId.value) return [];
  const sessionMessages = messages.value[currentSessionId.value] || [];
  console.log('[SessionsStore] Session messages count:', sessionMessages.length);
  const pendingSessionMessages =
    pendingMessages.value[currentSessionId.value] || [];

  const result = [...sessionMessages, ...pendingSessionMessages].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  console.log('[SessionsStore] Total messages after merge:', result.length);
  return result;
});
`;