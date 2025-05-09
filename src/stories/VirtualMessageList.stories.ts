import type { Meta, StoryObj } from '@storybook/vue3';
import VirtualMessageList from '../components/chat/enhanced/VirtualMessageList.vue';

// Diese Mocks repräsentieren beispielhafte Nachrichtendaten
const mockMessages = [
  {
    id: '1',
    content: 'Hallo, wie kann ich dir helfen?',
    role: 'assistant',
    timestamp: new Date(new Date().getTime() - 3600000).toISOString(),
    sessionId: 'session-1',
    status: 'sent'
  },
  {
    id: '2',
    content: 'Ich habe eine Frage zu nscale DMS.',
    role: 'user',
    timestamp: new Date(new Date().getTime() - 3500000).toISOString(),
    sessionId: 'session-1',
    status: 'sent'
  },
  {
    id: '3',
    content: 'Natürlich! Was möchtest du über nscale DMS wissen?',
    role: 'assistant',
    timestamp: new Date(new Date().getTime() - 3400000).toISOString(),
    sessionId: 'session-1',
    status: 'sent'
  },
  {
    id: '4',
    content: 'Wie kann ich Dokumente indexieren?',
    role: 'user',
    timestamp: new Date(new Date().getTime() - 3300000).toISOString(),
    sessionId: 'session-1',
    status: 'sent'
  },
  {
    id: '5',
    content: 'Die Indexierung von Dokumenten in nscale DMS erfolgt über den Indexierungsdienst. Du kannst dies über die Verwaltungsoberfläche konfigurieren oder automatische Indexierung einrichten. Möchtest du dazu mehr Details erfahren?',
    role: 'assistant',
    timestamp: new Date(new Date().getTime() - 3200000).toISOString(),
    sessionId: 'session-1',
    status: 'sent'
  }
];

// Ein längerer Nachrichtenverlauf für Tests mit vielen Nachrichten
const longMessageList = Array.from({ length: 50 }, (_, i) => ({
  id: `msg-${i + 6}`,
  content: `Dies ist eine Test-Nachricht #${i + 6} für die Virtualisierung.`,
  role: i % 2 === 0 ? 'user' : 'assistant',
  timestamp: new Date(new Date().getTime() - (3100000 - i * 10000)).toISOString(),
  sessionId: 'session-1',
  status: 'sent'
}));

// Meta-Daten für die Storybook-Komponente
const meta = {
  title: 'Chat/VirtualMessageList',
  component: VirtualMessageList,
  tags: ['autodocs'],
  argTypes: {
    messages: { control: 'object' },
    isLoading: { control: 'boolean' },
    isStreaming: { control: 'boolean' },
    welcomeTitle: { control: 'text' },
    welcomeMessage: { control: 'text' },
    showMessageActions: { control: 'boolean' },
    virtualized: { control: 'boolean' },
    autoScrollThreshold: { control: { type: 'range', min: 0, max: 1, step: 0.1 } },
  },
  args: {
    messages: mockMessages,
    isLoading: false,
    isStreaming: false,
    welcomeTitle: 'Willkommen beim nscale DMS Assistenten',
    welcomeMessage: 'Wie kann ich Ihnen heute mit nscale helfen?',
    showMessageActions: true,
    virtualized: true,
    autoScrollThreshold: 0.8
  },
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#1a202c' }
      ]
    },
    docs: {
      description: {
        component: 'Eine virtualisierte Chat-Nachrichtenliste mit optimierter Performance für große Nachrichtenverläufe.'
      }
    }
  }
} satisfies Meta<typeof VirtualMessageList>;

export default meta;
type Story = StoryObj<typeof meta>;

// Standardansicht mit mehreren Nachrichten
export const Default: Story = {
  args: {
    messages: mockMessages
  }
};

// Leere Nachrichtenliste (Willkommens-Screen)
export const Empty: Story = {
  args: {
    messages: []
  }
};

// Ladezustand
export const Loading: Story = {
  args: {
    messages: [],
    isLoading: true
  }
};

// Streaming-Zustand (letzte Nachricht wird gestreamt)
export const Streaming: Story = {
  args: {
    messages: [
      ...mockMessages,
      {
        id: 'streaming',
        content: 'Ich bereite weitere Informationen zur Indexierung von Dokumenten vor...',
        role: 'assistant',
        timestamp: new Date().toISOString(),
        sessionId: 'session-1',
        status: 'pending',
        isStreaming: true
      }
    ],
    isStreaming: true
  }
};

// Viele Nachrichten für Virtualisierungstest
export const ManyMessages: Story = {
  args: {
    messages: [...mockMessages, ...longMessageList]
  }
};

// Nicht-virtualisierte Version (für Vergleich)
export const NonVirtualized: Story = {
  args: {
    messages: [...mockMessages, ...longMessageList.slice(0, 20)],
    virtualized: false
  }
};

// Barrierefreiheitstest
export const Accessibility: Story = {
  args: {
    messages: mockMessages,
    showMessageActions: true
  },
  parameters: {
    a11y: { disable: false }
  }
};