import type { Meta, StoryObj } from "@storybook/vue3";
import { action } from "@storybook/addon-actions";
import EnhancedChatView from "../views/EnhancedChatView.vue";

// Beispiel-Sitzungsdaten
const mockSessions = [
  {
    id: "session-1",
    title: "Implementierung der Indexierung",
    createdAt: new Date(new Date().getTime() - 86400000 * 2).toISOString(),
    updatedAt: new Date(new Date().getTime() - 3600000).toISOString(),
    userId: "user-1",
    isPinned: true,
  },
  {
    id: "session-2",
    title: "Dokumentenverwaltung und Speicherung",
    createdAt: new Date(new Date().getTime() - 86400000 * 3).toISOString(),
    updatedAt: new Date(new Date().getTime() - 86400000).toISOString(),
    userId: "user-1",
  },
  {
    id: "session-3",
    title: "Benutzerberechtigungen in nscale",
    createdAt: new Date(new Date().getTime() - 86400000 * 5).toISOString(),
    updatedAt: new Date(new Date().getTime() - 86400000 * 2).toISOString(),
    userId: "user-1",
  },
];

// Beispiel-Nachrichtendaten
const mockMessages = [
  {
    id: "1",
    content: "Hallo, wie kann ich dir helfen?",
    role: "assistant",
    timestamp: new Date(new Date().getTime() - 3600000).toISOString(),
    sessionId: "session-1",
    status: "sent",
  },
  {
    id: "2",
    content: "Ich habe eine Frage zur Dokumentenindexierung in nscale.",
    role: "user",
    timestamp: new Date(new Date().getTime() - 3500000).toISOString(),
    sessionId: "session-1",
    status: "sent",
  },
  {
    id: "3",
    content:
      "Natürlich! Die Indexierung in nscale DMS ermöglicht die schnelle Suche und das Auffinden von Dokumenten. Was genau möchtest du darüber wissen?",
    role: "assistant",
    timestamp: new Date(new Date().getTime() - 3400000).toISOString(),
    sessionId: "session-1",
    status: "sent",
  },
];

// Mocks für Pinia Stores und Vue Router
// Hinweis: Dies ist eine vereinfachte Implementierung für Storybook
const createMockStores = () => {
  return {
    // Mock für den Sessions Store
    useSessionsStore: () => ({
      sessions: mockSessions,
      activeSession: { id: "session-1" },
      setActiveSession: action("setActiveSession"),
      fetchSessions: action("fetchSessions"),
      createSession: action("createSession"),
      deleteSession: action("deleteSession"),
      renameSession: action("renameSession"),
      updateSession: action("updateSession"),
      archiveSession: action("archiveSession"),
      togglePinSession: action("togglePinSession"),
    }),

    // Mock für den Chat Store
    useChat: () => ({
      messages: mockMessages,
      isLoading: false,
      isSending: false,
      streamingMessage: null,
      sendMessage: action("sendMessage"),
      loadMessages: action("loadMessages"),
      editMessage: action("editMessage"),
      retryMessage: action("retryMessage"),
      stopGeneration: action("stopGeneration"),
    }),

    // Mock für Feature Toggles
    useFeatureToggles: () => ({
      isFeatureEnabled: () => true,
    }),

    // Mock für Bridge
    useBridge: () => ({
      on: (event: string, callback: EventCallback | UnsubscribeFn) => action(`bridge.on(${event})`),
      off: (event: string, callback: EventCallback | UnsubscribeFn) =>
        action(`bridge.off(${event})`),
      emit: (event: string, data: any) => action(`bridge.emit(${event})`)(data),
      setState: (path: string, value: any) =>
        action(`bridge.setState(${path})`)(value),
      getState: (path: string) => null,
    }),
  };
};

// Mock für Vue Router
const createMockRouter = () => ({
  push: action("router.push"),
  currentRoute: {
    value: {
      params: {
        id: "session-1",
      },
    },
  },
});

// Meta-Daten für die Storybook-Komponente
const meta = {
  title: "Chat/EnhancedChatView",
  component: EnhancedChatView,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "#f8fafc" },
        { name: "dark", value: "#1a202c" },
      ],
    },
    docs: {
      description: {
        component:
          "Die Hauptkomponente für die verbesserte Chat-Benutzeroberfläche mit Bridge-Integration.",
      },
    },
  },
  decorators: [
    (story) => ({
      components: { story },
      template: '<div style="height: 100vh;"><story /></div>',
      setup() {
        // Globale Mocks für Storybook
        const { useSessionsStore, useChat, useFeatureToggles, useBridge } =
          createMockStores();
        const router = createMockRouter();

        // Pinia und Vue Router Mocks für Storybook bereitstellen
        window.piniaMock = {
          useSessionsStore,
          useChat,
          useFeatureToggles,
        };

        window.routerMock = router;
        window.bridgeMock = useBridge;

        return {};
      },
    }),
  ],
} satisfies Meta<typeof EnhancedChatView>;

export default meta;
type Story = StoryObj<typeof meta>;

// Vollständige Chat-Ansicht
export const Default: Story = {};

// Anpassen dieser Storybook-Stories würde eine umfangreichere Anpassung der Komponente für Testzwecke erfordern,
// was den Rahmen dieser Implementierung überschreitet. Die Hauptkomponente benötigt Pinia Stores und Vue Router,
// die in einer echten Anwendung vorhanden wären.
