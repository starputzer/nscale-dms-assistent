import type { Meta, StoryObj } from "@storybook/vue3";
import { action } from "@storybook/addon-actions";
import SessionManager from "../components/chat/enhanced/SessionManager.vue";

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
  {
    id: "session-4",
    title: "Automatisierte Workflows erstellen",
    createdAt: new Date(new Date().getTime() - 86400000 * 7).toISOString(),
    updatedAt: new Date(new Date().getTime() - 86400000 * 3).toISOString(),
    userId: "user-1",
  },
  {
    id: "session-5",
    title: "Integration mit externen Systemen",
    createdAt: new Date(new Date().getTime() - 86400000 * 14).toISOString(),
    updatedAt: new Date(new Date().getTime() - 86400000 * 7).toISOString(),
    userId: "user-1",
    isPinned: true,
  },
];

// Mehr Sessions für Tests mit vielen Sitzungen
const manySessions = Array.from({ length: 20 }, (_, i) => ({
  id: `session-extra-${i + 1}`,
  title: `Test-Sitzung #${i + 1}`,
  createdAt: new Date(new Date().getTime() - 86400000 * (i + 15)).toISOString(),
  updatedAt: new Date(new Date().getTime() - 86400000 * (i + 8)).toISOString(),
  userId: "user-1",
  isPinned: i % 5 === 0,
}));

// Meta-Daten für die Storybook-Komponente
const meta = {
  title: "Chat/SessionManager",
  component: SessionManager,
  tags: ["autodocs"],
  argTypes: {
    sessions: { control: "object" },
    currentSessionId: { control: "text" },
    title: { control: "text" },
    loading: { control: "boolean" },
    searchEnabled: { control: "boolean" },
    sortable: { control: "boolean" },
    collapsed: { control: "boolean" },
    maxSessions: { control: "number" },
    "session-selected": { action: "session-selected" },
    "session-created": { action: "session-created" },
    "session-deleted": { action: "session-deleted" },
    "session-updated": { action: "session-updated" },
    "session-pinned": { action: "session-pinned" },
    "sessions-reordered": { action: "sessions-reordered" },
    "toggle-collapse": { action: "toggle-collapse" },
  },
  args: {
    sessions: mockSessions,
    currentSessionId: "session-1",
    title: "Unterhaltungen",
    loading: false,
    searchEnabled: true,
    sortable: true,
    collapsed: false,
    maxSessions: 0,
  },
  parameters: {
    layout: "centered",
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "#ffffff" },
        { name: "dark", value: "#1a202c" },
      ],
    },
    docs: {
      description: {
        component:
          "Eine Manager-Komponente für Chat-Sitzungen mit Drag & Drop, Suche und Pin-Funktionalität.",
      },
    },
  },
  // Eventhandler für Live-Vorschau
  render: (args: any) => ({
    components: { SessionManager },
    setup() {
      return {
        args,
        onSessionSelected: action("session-selected"),
        onSessionCreated: action("session-created"),
        onSessionDeleted: action("session-deleted"),
        onSessionUpdated: action("session-updated"),
        onSessionPinned: action("session-pinned"),
        onSessionsReordered: action("sessions-reordered"),
        onToggleCollapse: action("toggle-collapse"),
      };
    },
    template: `
      <div style="width: 300px; height: 600px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <SessionManager
          v-bind="args"
          @session-selected="onSessionSelected"
          @session-created="onSessionCreated"
          @session-deleted="onSessionDeleted"
          @session-updated="onSessionUpdated"
          @session-pinned="onSessionPinned"
          @sessions-reordered="onSessionsReordered"
          @toggle-collapse="onToggleCollapse"
        />
      </div>
    `,
  }),
} satisfies Meta<typeof SessionManager>;

export default meta;
type Story = StoryObj<typeof meta>;

// Standardansicht mit mehreren Sitzungen
export const Default: Story = {
  args: {},
};

// Ladezustand
export const Loading: Story = {
  args: {
    loading: true,
  },
};

// Leere Sitzungsliste
export const Empty: Story = {
  args: {
    sessions: [],
  },
};

// Eingeklappte Ansicht
export const Collapsed: Story = {
  args: {
    collapsed: true,
  },
};

// Viele Sitzungen
export const ManySessions: Story = {
  args: {
    sessions: [...mockSessions, ...manySessions],
  },
};

// Nicht sortierbar
export const NotSortable: Story = {
  args: {
    sortable: false,
  },
};

// Ohne Suchfunktion
export const NoSearch: Story = {
  args: {
    searchEnabled: false,
  },
};

// Mit maximalem Sitzungslimit
export const WithSessionLimit: Story = {
  args: {
    maxSessions: 10,
    sessions: [...mockSessions, ...manySessions.slice(0, 5)],
  },
};

// Barrierefreiheitstest
export const Accessibility: Story = {
  args: {},
  parameters: {
    a11y: { disable: false },
  },
};
