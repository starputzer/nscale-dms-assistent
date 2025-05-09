import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MessageList from '@/components/chat/MessageList.vue';
import { useSessionsStore } from '@/stores/sessions';
import { flushPromises, mockUtils } from '../../setup';
import { render, screen, fireEvent } from '@testing-library/vue';

// Mock für den SessionsStore
vi.mock('@/stores/sessions', () => ({
  useSessionsStore: vi.fn(() => ({
    currentSessionId: 'session-1',
    currentSession: {
      id: 'session-1',
      title: 'Test Session',
      messages: [
        mockUtils.createMessage({ id: 'msg-1', role: 'user', content: 'Hello' }),
        mockUtils.createMessage({ id: 'msg-2', role: 'assistant', content: 'Hi there!' }),
        mockUtils.createMessage({ id: 'msg-3', role: 'user', content: 'How are you?' }),
      ],
    },
    isLoading: false,
    error: null,
    loadMessages: vi.fn(),
  })),
}));

// Mock für die MessageItem-Komponente
vi.mock('@/components/chat/MessageItem.vue', () => ({
  default: {
    name: 'MessageItem',
    props: ['message'],
    template: '<div class="message-item" :data-role="message.role">{{ message.content }}</div>',
  },
}));

describe('MessageList.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('Vue Test Utils Tests', () => {
    it('rendert die Liste der Nachrichten korrekt', async () => {
      // Arrange
      const wrapper = mount(MessageList);
      await flushPromises();
  
      // Assert
      const messageItems = wrapper.findAll('.message-item');
      expect(messageItems.length).toBe(3);
      
      expect(messageItems[0].text()).toBe('Hello');
      expect(messageItems[0].attributes('data-role')).toBe('user');
      
      expect(messageItems[1].text()).toBe('Hi there!');
      expect(messageItems[1].attributes('data-role')).toBe('assistant');
      
      expect(messageItems[2].text()).toBe('How are you?');
      expect(messageItems[2].attributes('data-role')).toBe('user');
    });
  
    it('zeigt eine Ladeanzeige an, wenn Nachrichten geladen werden', async () => {
      // Arrange - Store mit Loading-Status
      vi.mocked(useSessionsStore).mockImplementationOnce(() => ({
        currentSessionId: 'session-1',
        currentSession: {
          id: 'session-1',
          title: 'Test Session',
          messages: [],
        },
        isLoading: true,
        error: null,
        loadMessages: vi.fn(),
      }));
      
      // Act
      const wrapper = mount(MessageList);
      
      // Assert
      expect(wrapper.find('.loading-indicator').exists()).toBe(true);
    });
  
    it('zeigt eine Meldung an, wenn keine Nachrichten vorhanden sind', async () => {
      // Arrange - Store mit leerer Nachrichtenliste
      vi.mocked(useSessionsStore).mockImplementationOnce(() => ({
        currentSessionId: 'session-1',
        currentSession: {
          id: 'session-1',
          title: 'Test Session',
          messages: [],
        },
        isLoading: false,
        error: null,
        loadMessages: vi.fn(),
      }));
      
      // Act
      const wrapper = mount(MessageList);
      
      // Assert
      expect(wrapper.find('.empty-message').exists()).toBe(true);
      expect(wrapper.find('.empty-message').text()).toContain('Keine Nachrichten');
    });
  
    it('scrollt zum Ende der Liste beim Hinzufügen neuer Nachrichten', async () => {
      // Arrange
      // Mock für scrollIntoView
      Element.prototype.scrollIntoView = vi.fn();
      
      const wrapper = mount(MessageList);
      await flushPromises();
      
      const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView');
      
      // Act - Simuliere Hinzufügen neuer Nachricht durch Ändern der Messages
      await wrapper.setProps({ autoScroll: true });
      
      // Trigger prop watcher
      const store = useSessionsStore();
      store.currentSession.messages = [
        ...store.currentSession.messages,
        mockUtils.createMessage({ id: 'msg-4', role: 'assistant', content: 'I am fine!' }),
      ];
      
      await flushPromises();
      
      // Assert
      expect(scrollSpy).toHaveBeenCalled();
    });
  });

  describe('Testing Library Tests', () => {
    it('rendert die Liste der Nachrichten korrekt mit Testing Library', async () => {
      // Arrange & Act
      render(MessageList);
      
      // Assert
      const messages = await screen.findAllByText(/Hello|Hi there!|How are you\?/);
      expect(messages).toHaveLength(3);
      
      expect(screen.getByText('Hello')).toBeInTheDocument();
      expect(screen.getByText('Hi there!')).toBeInTheDocument();
      expect(screen.getByText('How are you?')).toBeInTheDocument();
    });
    
    it('zeigt eine Fehlermeldung an, wenn ein Fehler auftritt', async () => {
      // Arrange - Store mit Fehler
      vi.mocked(useSessionsStore).mockImplementationOnce(() => ({
        currentSessionId: 'session-1',
        currentSession: {
          id: 'session-1',
          title: 'Test Session',
          messages: [],
        },
        isLoading: false,
        error: 'Failed to load messages',
        loadMessages: vi.fn(),
      }));
      
      // Act
      render(MessageList);
      
      // Assert
      expect(await screen.findByText(/Failed to load messages/)).toBeInTheDocument();
    });
    
    it('lädt Nachrichten erneut, wenn die Retry-Schaltfläche geklickt wird', async () => {
      // Arrange - Store mit Fehler
      const loadMessages = vi.fn();
      vi.mocked(useSessionsStore).mockImplementationOnce(() => ({
        currentSessionId: 'session-1',
        currentSession: {
          id: 'session-1',
          title: 'Test Session',
          messages: [],
        },
        isLoading: false,
        error: 'Failed to load messages',
        loadMessages,
      }));
      
      // Act
      render(MessageList);
      const retryButton = await screen.findByRole('button', { name: /retry/i });
      await fireEvent.click(retryButton);
      
      // Assert
      expect(loadMessages).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility Tests', () => {
    it('hat eine semantisch korrekte Struktur für Screenreader', async () => {
      // Arrange & Act
      const { container } = render(MessageList);
      
      // Assert - Prüfe, ob eine semantische Liste verwendet wird
      expect(container.querySelector('ul, ol')).not.toBeNull();
      
      // Jedes Listenelement sollte für Screenreader zugänglich sein
      expect(container.querySelectorAll('li')).toHaveLength(3);
    });
    
    it('hat angemessene ARIA-Attribute für Barrierefreiheit', async () => {
      // Arrange & Act
      render(MessageList);
      
      // Assert
      // Prüfe, ob die Nachrichtenliste als Chat markiert ist
      const list = await screen.findByRole('list');
      expect(list).toHaveAttribute('aria-live', 'polite');
      expect(list).toHaveAttribute('aria-label', expect.stringContaining('chat'));
    });
  });
});