import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import ChatContainer from '@/components/chat/ChatContainer.vue';
import { useSessionsStore } from '@/stores/sessions';
import { useUIStore } from '@/stores/ui';

// Mock-Komponenten
vi.mock('@/components/chat/MessageList.vue', () => ({
  default: {
    name: 'MessageList',
    template: '<div class="message-list-mock"></div>',
    props: [
      'messages', 'isLoading', 'isStreaming', 'welcomeTitle', 'welcomeMessage',
      'logoUrl', 'virtualized', 'showMessageActions'
    ]
  }
}));

vi.mock('@/components/chat/MessageInput.vue', () => ({
  default: {
    name: 'MessageInput',
    template: '<div class="message-input-mock"></div>',
    props: [
      'modelValue', 'disabled', 'isLoading', 'isStreaming', 'isEditing',
      'error', 'placeholder', 'draft', 'showTemplates', 'templates'
    ]
  }
}));

// Mock-Daten
const mockSession = {
  id: 'test-session-id',
  title: 'Test Session',
  updatedAt: '2025-05-10T10:00:00.000Z',
  isArchived: false
};

const mockArchivedSession = {
  id: 'test-session-id',
  title: 'Test Session',
  updatedAt: '2025-05-10T10:00:00.000Z',
  isArchived: true
};

const mockMessages = [
  {
    id: 'msg1',
    sessionId: 'test-session-id',
    content: 'Hello',
    role: 'user',
    timestamp: '2025-05-10T10:00:00.000Z'
  },
  {
    id: 'msg2',
    sessionId: 'test-session-id',
    content: 'Hi there',
    role: 'assistant',
    timestamp: '2025-05-10T10:01:00.000Z'
  }
];

describe('ChatContainer.vue', () => {
  let wrapper;
  let sessionsStore;
  let uiStore;

  beforeEach(() => {
    // Mock für window.confirm
    global.confirm = vi.fn().mockReturnValue(true);
    
    // Pinia-Test-Setup
    wrapper = mount(ChatContainer, {
      props: {
        sessionId: 'test-session-id',
        welcomeTitle: 'Welcome to Chat',
        welcomeMessage: 'How can I help you?',
        showMessageActions: true,
        canRenameSession: true,
        canExportSession: true,
        canArchiveSession: true,
        canClearSession: true
      },
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              sessions: {
                currentSession: mockSession,
                messages: { 'test-session-id': mockMessages },
                isLoading: false,
                isStreaming: false,
                error: null
              }
            }
          })
        ]
      }
    });

    // Stores abrufen
    sessionsStore = useSessionsStore();
    uiStore = useUIStore();

    // Store-Methoden mocken
    sessionsStore.toggleArchiveSession = vi.fn();
    sessionsStore.deleteMessage = vi.fn();
    sessionsStore.refreshSession = vi.fn();
    sessionsStore.updateSessionTitle = vi.fn();
    uiStore.showSuccess = vi.fn();
    uiStore.showError = vi.fn();
  });

  it('renders the component correctly', () => {
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('.n-chat-container').exists()).toBe(true);
  });

  it('displays the session title', () => {
    expect(wrapper.find('.n-chat-container__title').text()).toContain('Test Session');
  });

  it('shows correct action buttons', () => {
    const actionButtons = wrapper.findAll('.n-chat-container__action-btn');
    expect(actionButtons.length).toBe(4); // Rename, Export, Archive, Clear
  });

  it('handles session renaming', async () => {
    // Mock prompt to return new title
    global.prompt = vi.fn().mockReturnValue('New Title');
    
    const renameButton = wrapper.findAll('.n-chat-container__action-btn')[0];
    await renameButton.trigger('click');
    
    expect(sessionsStore.updateSessionTitle).toHaveBeenCalledWith('test-session-id', 'New Title');
    expect(uiStore.showSuccess).toHaveBeenCalledWith('Sitzung wurde umbenannt.');
  });

  it('handles session archiving', async () => {
    const archiveButton = wrapper.findAll('.n-chat-container__action-btn')[2];
    await archiveButton.trigger('click');
    
    expect(sessionsStore.toggleArchiveSession).toHaveBeenCalledWith('test-session-id', true);
    expect(uiStore.showSuccess).toHaveBeenCalledWith('Sitzung wurde archiviert.');
  });

  it('handles session clearing', async () => {
    const clearButton = wrapper.findAll('.n-chat-container__action-btn')[3];
    await clearButton.trigger('click');
    
    // Es sollte deleteMessage für jede Nachricht in der Session aufrufen
    expect(sessionsStore.deleteMessage).toHaveBeenCalledTimes(2);
    expect(sessionsStore.refreshSession).toHaveBeenCalledWith('test-session-id');
  });

  it('shows archive badge when session is archived', async () => {
    // Aktualisieren des Store-States auf eine archivierte Session
    await wrapper.vm.$nextTick();
    sessionsStore.currentSession = mockArchivedSession;
    await wrapper.vm.$nextTick();
    
    // Das Badge für archivierte Sessions sollte sichtbar sein
    expect(wrapper.find('.n-chat-container__archive-badge').exists()).toBe(true);
    
    // Der Archive-Button sollte nun "Sitzung aus Archiv wiederherstellen" als aria-label haben
    const archiveButton = wrapper.findAll('.n-chat-container__action-btn')[2];
    expect(archiveButton.attributes('aria-label')).toBe('Sitzung aus Archiv wiederherstellen');
  });

  it('uses proper ARIA attributes for accessibility', () => {
    // Test for proper ARIA attributes on main container
    expect(wrapper.find('.n-chat-container').attributes('role')).toBe('region');
    expect(wrapper.find('.n-chat-container').attributes('aria-labelledby')).toBe('chat-container-title');
    expect(wrapper.find('.n-chat-container').attributes('aria-live')).toBe('polite');
    
    // Test for proper ARIA attributes on toolbar
    expect(wrapper.find('.n-chat-container__actions').attributes('role')).toBe('toolbar');
    
    // Test for proper ARIA attributes on buttons
    const archiveButton = wrapper.findAll('.n-chat-container__action-btn')[2];
    expect(archiveButton.attributes('aria-label')).toBeTruthy();
  });
});