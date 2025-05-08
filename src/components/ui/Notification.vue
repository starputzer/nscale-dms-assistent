<template>
  <Teleport to="body">
    <div
      v-if="visibleNotifications.length > 0"
      class="n-notification-container"
      :class="[`n-notification-container--${position}`]"
      role="log"
      aria-live="polite"
      :aria-relevant="'additions text'"
    >
      <TransitionGroup 
        name="n-notification"
        tag="div"
        class="n-notification-list"
      >
        <div
          v-for="notification in visibleNotifications"
          :key="notification.id"
          class="n-notification"
          :class="[
            `n-notification--${notification.type}`,
            { 'n-notification--read': notification.read },
            { 'n-notification--has-actions': hasActions(notification) },
            { 'n-notification--persistent': notification.persistent },
            { 'n-notification--closable': notification.closable },
            notification.customClass
          ]"
          :aria-labelledby="`notification-${notification.id}-title`"
          :aria-describedby="`notification-${notification.id}-content`"
          :data-notification-id="notification.id"
          :data-notification-group="notification.group"
          :data-notification-priority="notification.priority"
          role="status"
        >
          <div class="n-notification__icon" v-if="showIcon">
            <component
              :is="getIconComponent(notification.type)"
              class="n-notification__icon-component"
              :aria-hidden="true"
            />
          </div>
          
          <div class="n-notification__content">
            <div 
              v-if="notification.title"
              class="n-notification__title"
              :id="`notification-${notification.id}-title`"
            >
              {{ notification.title }}
            </div>
            <div
              class="n-notification__message"
              :id="`notification-${notification.id}-content`"
              v-html="notification.message"
            ></div>
            
            <div 
              v-if="notification.details"
              class="n-notification__details"
            >
              <button
                type="button"
                class="n-notification__details-toggle"
                @click="toggleDetails(notification)"
                :aria-expanded="notification.showDetails ? 'true' : 'false'"
                :aria-controls="`notification-${notification.id}-details`"
              >
                {{ notification.showDetails ? $t('notification.hideDetails') : $t('notification.showDetails') }}
              </button>
              <div
                v-show="notification.showDetails"
                class="n-notification__details-content"
                :id="`notification-${notification.id}-details`"
              >
                {{ notification.details }}
              </div>
            </div>
            
            <div 
              v-if="hasActions(notification)" 
              class="n-notification__actions"
            >
              <button
                v-for="(action, index) in notification.actions"
                :key="index"
                class="n-notification__action"
                :class="[`n-notification__action--${action.type || 'default'}`]"
                type="button"
                @click="handleAction(notification, action)"
                :disabled="action.disabled"
              >
                {{ action.label }}
              </button>
            </div>
            
            <div v-if="notification.timestamp" class="n-notification__timestamp">
              {{ formatTimestamp(notification.timestamp) }}
            </div>
          </div>
          
          <button
            v-if="notification.closable"
            class="n-notification__close"
            type="button"
            @click="dismiss(notification)"
            :aria-label="$t('notification.dismiss')"
          >
            <CloseIcon :size="16" />
          </button>
        </div>
      </TransitionGroup>
      
      <div 
        v-if="hasMoreNotifications && showMoreButton"
        class="n-notification-more"
      >
        <button
          type="button"
          class="n-notification-more__button"
          @click="viewAllNotifications"
        >
          {{ $t('notification.viewAll', { count: totalNotifications - visibleNotifications.length }) }}
        </button>
      </div>
    </div>
  </Teleport>
  
  <!-- Notification center modal -->
  <Dialog
    v-model="showNotificationCenter"
    :options="{
      title: $t('notification.center'),
      size: 'large',
      closable: true,
      classes: 'n-notification-center-dialog'
    }"
  >
    <template #default>
      <div class="n-notification-center">
        <div class="n-notification-center__header">
          <div class="n-notification-center__tabs">
            <button
              v-for="(tab, index) in tabs"
              :key="index"
              class="n-notification-center__tab"
              :class="{ 'n-notification-center__tab--active': activeTab === tab.id }"
              @click="activeTab = tab.id"
            >
              {{ tab.label }}
              <span 
                v-if="tab.count > 0" 
                class="n-notification-center__tab-count"
              >
                {{ tab.count }}
              </span>
            </button>
          </div>
          
          <div class="n-notification-center__actions">
            <button
              v-if="hasUnreadNotifications"
              class="n-notification-center__action"
              @click="markAllAsRead"
            >
              {{ $t('notification.markAllAsRead') }}
            </button>
            <button
              v-if="filteredNotifications.length > 0"
              class="n-notification-center__action n-notification-center__action--clear"
              @click="clearAllNotifications"
            >
              {{ $t('notification.clearAll') }}
            </button>
          </div>
        </div>
        
        <div class="n-notification-center__filters" v-if="showFilters">
          <select 
            v-model="priorityFilter" 
            class="n-notification-center__filter"
          >
            <option value="all">{{ $t('notification.priorityAll') }}</option>
            <option value="high">{{ $t('notification.priorityHigh') }}</option>
            <option value="medium">{{ $t('notification.priorityMedium') }}</option>
            <option value="low">{{ $t('notification.priorityLow') }}</option>
          </select>
          
          <select 
            v-if="groups.length > 0"
            v-model="groupFilter" 
            class="n-notification-center__filter"
          >
            <option value="all">{{ $t('notification.groupAll') }}</option>
            <option v-for="group in groups" :key="group" :value="group">
              {{ group }}
            </option>
          </select>
        </div>
        
        <div class="n-notification-center__content">
          <div v-if="filteredNotifications.length === 0" class="n-notification-center__empty">
            {{ $t('notification.noNotifications') }}
          </div>
          
          <div
            v-else
            class="n-notification-center__list"
          >
            <div
              v-for="notification in filteredNotifications"
              :key="notification.id"
              class="n-notification-item"
              :class="[
                `n-notification-item--${notification.type}`,
                { 'n-notification-item--read': notification.read },
                { 'n-notification-item--has-actions': hasActions(notification) }
              ]"
            >
              <div class="n-notification-item__icon" v-if="showIcon">
                <component
                  :is="getIconComponent(notification.type)"
                  class="n-notification-item__icon-component"
                  :aria-hidden="true"
                />
              </div>
              
              <div class="n-notification-item__content">
                <div 
                  v-if="notification.title"
                  class="n-notification-item__title"
                >
                  {{ notification.title }}
                  <span 
                    v-if="!notification.read" 
                    class="n-notification-item__badge"
                    :aria-label="$t('notification.unread')"
                  ></span>
                </div>
                
                <div class="n-notification-item__message" v-html="notification.message"></div>
                
                <div 
                  v-if="notification.details"
                  class="n-notification-item__details"
                >
                  <button
                    type="button"
                    class="n-notification-item__details-toggle"
                    @click="toggleDetails(notification)"
                    :aria-expanded="notification.showDetails ? 'true' : 'false'"
                  >
                    {{ notification.showDetails ? $t('notification.hideDetails') : $t('notification.showDetails') }}
                  </button>
                  <div
                    v-show="notification.showDetails"
                    class="n-notification-item__details-content"
                  >
                    {{ notification.details }}
                  </div>
                </div>
                
                <div 
                  v-if="hasActions(notification)" 
                  class="n-notification-item__actions"
                >
                  <button
                    v-for="(action, index) in notification.actions"
                    :key="index"
                    class="n-notification-item__action"
                    :class="[`n-notification-item__action--${action.type || 'default'}`]"
                    type="button"
                    @click="handleAction(notification, action)"
                    :disabled="action.disabled"
                  >
                    {{ action.label }}
                  </button>
                </div>
                
                <div class="n-notification-item__meta">
                  <span v-if="notification.group" class="n-notification-item__group">
                    {{ notification.group }}
                  </span>
                  <span v-if="notification.timestamp" class="n-notification-item__timestamp">
                    {{ formatTimestamp(notification.timestamp) }}
                  </span>
                </div>
              </div>
              
              <div class="n-notification-item__actions-secondary">
                <button
                  v-if="!notification.read"
                  class="n-notification-item__mark-read"
                  @click="markAsRead(notification)"
                  :aria-label="$t('notification.markAsRead')"
                >
                  {{ $t('notification.markAsRead') }}
                </button>
                <button
                  class="n-notification-item__dismiss"
                  @click="dismiss(notification)"
                  :aria-label="$t('notification.dismiss')"
                >
                  <CloseIcon :size="16" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Dialog from './Dialog.vue';
import CloseIcon from '../icons/CloseIcon.vue';
import SuccessIcon from '../icons/SuccessIcon.vue';
import ErrorIcon from '../icons/ErrorIcon.vue';
import WarningIcon from '../icons/WarningIcon.vue';
import InfoIcon from '../icons/InfoIcon.vue';
import { notificationService, type Notification, type NotificationAction } from '../../services/ui/NotificationService';

const { t: $t } = useI18n();

const props = withDefaults(defineProps<{
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxVisible?: number;
  groupSimilar?: boolean;
  showIcon?: boolean;
  showMoreButton?: boolean;
  showFilters?: boolean;
}>(), {
  position: 'top-right',
  maxVisible: 5,
  groupSimilar: true,
  showIcon: true,
  showMoreButton: true,
  showFilters: true
});

// Notification center state
const showNotificationCenter = ref(false);
const activeTab = ref('all');
const priorityFilter = ref('all');
const groupFilter = ref('all');

// Tabs for notification center
const tabs = computed(() => [
  { 
    id: 'all', 
    label: $t('notification.tabAll'), 
    count: notificationService.notifications.length 
  },
  { 
    id: 'unread', 
    label: $t('notification.tabUnread'), 
    count: notificationService.notifications.filter(n => !n.read).length 
  }
]);

// Computed properties for notification display
const visibleNotifications = computed(() => {
  let notifications = [...notificationService.notifications];
  
  // Apply grouping if enabled
  if (props.groupSimilar) {
    // Group similar notifications by groupId or message content
    const groups = new Map<string, Notification[]>();
    
    notifications.forEach(notification => {
      const groupKey = notification.group || notification.message;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(notification);
    });
    
    // For groups with more than one notification, create summary notifications
    notifications = [];
    groups.forEach((groupNotifications, groupKey) => {
      if (groupNotifications.length === 1) {
        notifications.push(groupNotifications[0]);
      } else {
        // Get the most recent notification from the group
        const primary = groupNotifications.reduce((prev, current) => 
          (current.timestamp && prev.timestamp && current.timestamp > prev.timestamp) ? current : prev
        );
        
        // Create a group summary notification
        const groupNotification: Notification = {
          ...primary,
          id: `group-${groupNotifications[0].id}`,
          title: primary.title || $t('notification.groupedNotification', { count: groupNotifications.length }),
          message: primary.message,
          groupedCount: groupNotifications.length,
          details: groupNotifications.map(n => n.message).join('\n'),
          actions: primary.actions,
          customClass: 'n-notification--grouped'
        };
        
        notifications.push(groupNotification);
      }
    });
  }
  
  // Sort by priority and timestamp
  notifications.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1;
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    // Sort by timestamp (most recent first)
    if (a.timestamp && b.timestamp) {
      return b.timestamp - a.timestamp;
    }
    
    return 0;
  });
  
  // Limit to maxVisible
  return notifications.slice(0, props.maxVisible);
});

// Computed properties for notification center
const totalNotifications = computed(() => notificationService.notifications.length);

const hasMoreNotifications = computed(() => 
  notificationService.notifications.length > visibleNotifications.value.length
);

const hasUnreadNotifications = computed(() => 
  notificationService.notifications.some(n => !n.read)
);

const groups = computed(() => {
  const uniqueGroups = new Set<string>();
  notificationService.notifications.forEach(n => {
    if (n.group) uniqueGroups.add(n.group);
  });
  return Array.from(uniqueGroups);
});

const filteredNotifications = computed(() => {
  let filtered = [...notificationService.notifications];
  
  // Filter by tab
  if (activeTab.value === 'unread') {
    filtered = filtered.filter(n => !n.read);
  }
  
  // Filter by priority
  if (priorityFilter.value !== 'all') {
    filtered = filtered.filter(n => n.priority === priorityFilter.value);
  }
  
  // Filter by group
  if (groupFilter.value !== 'all') {
    filtered = filtered.filter(n => n.group === groupFilter.value);
  }
  
  // Sort by priority and timestamp
  filtered.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1;
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    // Sort by timestamp (most recent first)
    if (a.timestamp && b.timestamp) {
      return b.timestamp - a.timestamp;
    }
    
    return 0;
  });
  
  return filtered;
});

// Methods
function getIconComponent(type: string) {
  switch (type) {
    case 'success': return SuccessIcon;
    case 'error': return ErrorIcon;
    case 'warning': return WarningIcon;
    case 'info': 
    case 'system':
    default: return InfoIcon;
  }
}

function hasActions(notification: Notification): boolean {
  return !!notification.actions && notification.actions.length > 0;
}

function handleAction(notification: Notification, action: NotificationAction) {
  if (action.handler) {
    action.handler(notification);
  }
  
  if (action.closeOnClick) {
    dismiss(notification);
  }
  
  if (action.markAsRead) {
    markAsRead(notification);
  }
}

function toggleDetails(notification: Notification) {
  notification.showDetails = !notification.showDetails;
}

function dismiss(notification: Notification) {
  notificationService.remove(notification.id);
}

function markAsRead(notification: Notification) {
  notificationService.markAsRead(notification.id);
}

function markAllAsRead() {
  notificationService.markAllAsRead();
}

function clearAllNotifications() {
  notificationService.clear();
  showNotificationCenter.value = false;
}

function viewAllNotifications() {
  showNotificationCenter.value = true;
}

function formatTimestamp(timestamp: number): string {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSec < 60) {
    return $t('notification.timeJustNow');
  } else if (diffMin < 60) {
    return $t('notification.timeMinutesAgo', { count: diffMin });
  } else if (diffHours < 24) {
    return $t('notification.timeHoursAgo', { count: diffHours });
  } else if (diffDays < 7) {
    return $t('notification.timeDaysAgo', { count: diffDays });
  } else {
    return new Intl.DateTimeFormat().format(date);
  }
}

// Keyboard navigation
function setupKeyboardNavigation() {
  window.addEventListener('keydown', handleKeyDown);
}

function handleKeyDown(event: KeyboardEvent) {
  // Ctrl+N to open notification center
  if (event.ctrlKey && event.key === 'n') {
    event.preventDefault();
    showNotificationCenter.value = !showNotificationCenter.value;
  }
}

// Lifecycle hooks
onMounted(() => {
  setupKeyboardNavigation();
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<style>
.n-notification-container {
  position: fixed;
  z-index: var(--n-z-index-notification, 9000);
  display: flex;
  flex-direction: column;
  padding: 1rem;
  pointer-events: none;
  max-width: 100%;
}

.n-notification-container--top-right {
  top: 0;
  right: 0;
  align-items: flex-end;
}

.n-notification-container--top-left {
  top: 0;
  left: 0;
  align-items: flex-start;
}

.n-notification-container--bottom-right {
  bottom: 0;
  right: 0;
  align-items: flex-end;
}

.n-notification-container--bottom-left {
  bottom: 0;
  left: 0;
  align-items: flex-start;
}

.n-notification-container--top-center {
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  align-items: center;
}

.n-notification-container--bottom-center {
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  align-items: center;
}

.n-notification-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
}

.n-notification {
  display: flex;
  padding: 1rem;
  background-color: var(--n-color-background, #ffffff);
  border-radius: var(--n-border-radius, 0.25rem);
  box-shadow: var(--n-shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));
  max-width: 32rem;
  pointer-events: auto;
  position: relative;
  overflow: hidden;
  margin: 0 auto;
  width: 100%;
  border-left: 4px solid transparent;
  animation: notification-enter 0.3s ease-out;
}

.n-notification--info {
  border-left-color: var(--n-color-info, #3498db);
}

.n-notification--success {
  border-left-color: var(--n-color-success, #2ecc71);
}

.n-notification--warning {
  border-left-color: var(--n-color-warning, #f39c12);
}

.n-notification--error {
  border-left-color: var(--n-color-error, #e74c3c);
}

.n-notification--system {
  border-left-color: var(--n-color-system, #9b59b6);
}

.n-notification--read {
  opacity: 0.7;
}

.n-notification__icon {
  flex-shrink: 0;
  margin-right: 0.75rem;
  display: flex;
  align-items: flex-start;
}

.n-notification__icon-component {
  width: 1.5rem;
  height: 1.5rem;
}

.n-notification__content {
  flex: 1;
  min-width: 0;
}

.n-notification__title {
  font-weight: 600;
  margin-bottom: 0.25rem;
  font-size: 1rem;
  color: var(--n-color-text-primary, #333333);
}

.n-notification__message {
  color: var(--n-color-text-secondary, #666666);
  font-size: 0.875rem;
  line-height: 1.5;
  overflow-wrap: break-word;
  word-break: break-word;
}

.n-notification__details {
  margin-top: 0.5rem;
}

.n-notification__details-toggle {
  background: none;
  border: none;
  padding: 0;
  font-size: 0.75rem;
  color: var(--n-color-primary, #3498db);
  cursor: pointer;
  text-decoration: underline;
}

.n-notification__details-content {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: var(--n-color-background-alt, #f5f5f5);
  border-radius: var(--n-border-radius-sm, 0.125rem);
  font-size: 0.75rem;
  max-height: 10rem;
  overflow-y: auto;
  white-space: pre-wrap;
}

.n-notification__actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
}

.n-notification__action {
  padding: 0.25rem 0.75rem;
  border-radius: var(--n-border-radius-sm, 0.125rem);
  border: 1px solid var(--n-color-border, #e0e0e0);
  background-color: var(--n-color-background, #ffffff);
  color: var(--n-color-text-primary, #333333);
  font-size: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s;
}

.n-notification__action--primary {
  background-color: var(--n-color-primary, #3498db);
  border-color: var(--n-color-primary, #3498db);
  color: var(--n-color-on-primary, #ffffff);
}

.n-notification__action--danger {
  background-color: var(--n-color-error, #e74c3c);
  border-color: var(--n-color-error, #e74c3c);
  color: var(--n-color-on-error, #ffffff);
}

.n-notification__timestamp {
  font-size: 0.75rem;
  color: var(--n-color-text-tertiary, #999999);
  margin-top: 0.5rem;
}

.n-notification__close {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: none;
  border: none;
  color: var(--n-color-text-tertiary, #999999);
  cursor: pointer;
  padding: 0.25rem;
  line-height: 0;
  transition: color 0.2s;
}

.n-notification__close:hover {
  color: var(--n-color-text-primary, #333333);
}

.n-notification-more {
  display: flex;
  justify-content: center;
  margin-top: 0.75rem;
  pointer-events: auto;
}

.n-notification-more__button {
  background-color: var(--n-color-background, #ffffff);
  border: 1px solid var(--n-color-border, #e0e0e0);
  border-radius: var(--n-border-radius, 0.25rem);
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
  box-shadow: var(--n-shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.1));
  transition: background-color 0.2s;
}

.n-notification-more__button:hover {
  background-color: var(--n-color-background-alt, #f5f5f5);
}

/* Notification center styles */
.n-notification-center-dialog {
  width: 100%;
  max-width: 40rem !important;
  max-height: 85vh !important;
}

.n-notification-center {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 70vh;
}

.n-notification-center__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--n-color-border, #e0e0e0);
}

.n-notification-center__tabs {
  display: flex;
  gap: 1rem;
}

.n-notification-center__tab {
  background: none;
  border: none;
  padding: 0.5rem 0;
  font-size: 1rem;
  position: relative;
  cursor: pointer;
  color: var(--n-color-text-secondary, #666666);
}

.n-notification-center__tab--active {
  color: var(--n-color-primary, #3498db);
  font-weight: 600;
}

.n-notification-center__tab--active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: var(--n-color-primary, #3498db);
}

.n-notification-center__tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: var(--n-color-primary, #3498db);
  color: var(--n-color-on-primary, #ffffff);
  border-radius: 999px;
  font-size: 0.75rem;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.25rem;
  margin-left: 0.25rem;
}

.n-notification-center__actions {
  display: flex;
  gap: 0.75rem;
}

.n-notification-center__action {
  background: none;
  border: none;
  font-size: 0.875rem;
  cursor: pointer;
  color: var(--n-color-primary, #3498db);
}

.n-notification-center__action--clear {
  color: var(--n-color-error, #e74c3c);
}

.n-notification-center__filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.n-notification-center__filter {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--n-color-border, #e0e0e0);
  border-radius: var(--n-border-radius, 0.25rem);
  background-color: var(--n-color-background, #ffffff);
  font-size: 0.875rem;
}

.n-notification-center__content {
  flex: 1;
  overflow-y: auto;
}

.n-notification-center__empty {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 10rem;
  color: var(--n-color-text-tertiary, #999999);
  font-style: italic;
}

.n-notification-center__list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.n-notification-item {
  display: flex;
  padding: 1rem;
  background-color: var(--n-color-background, #ffffff);
  border-radius: var(--n-border-radius, 0.25rem);
  border: 1px solid var(--n-color-border, #e0e0e0);
  position: relative;
  border-left: 4px solid transparent;
}

.n-notification-item--info {
  border-left-color: var(--n-color-info, #3498db);
}

.n-notification-item--success {
  border-left-color: var(--n-color-success, #2ecc71);
}

.n-notification-item--warning {
  border-left-color: var(--n-color-warning, #f39c12);
}

.n-notification-item--error {
  border-left-color: var(--n-color-error, #e74c3c);
}

.n-notification-item--system {
  border-left-color: var(--n-color-system, #9b59b6);
}

.n-notification-item--read {
  opacity: 0.7;
}

.n-notification-item__icon {
  flex-shrink: 0;
  margin-right: 0.75rem;
  display: flex;
  align-items: flex-start;
}

.n-notification-item__icon-component {
  width: 1.5rem;
  height: 1.5rem;
}

.n-notification-item__content {
  flex: 1;
  min-width: 0;
}

.n-notification-item__title {
  font-weight: 600;
  margin-bottom: 0.25rem;
  font-size: 1rem;
  color: var(--n-color-text-primary, #333333);
  display: flex;
  align-items: center;
}

.n-notification-item__badge {
  width: 0.5rem;
  height: 0.5rem;
  background-color: var(--n-color-primary, #3498db);
  border-radius: 50%;
  margin-left: 0.5rem;
  display: inline-block;
}

.n-notification-item__message {
  color: var(--n-color-text-secondary, #666666);
  font-size: 0.875rem;
  line-height: 1.5;
  overflow-wrap: break-word;
  word-break: break-word;
}

.n-notification-item__details {
  margin-top: 0.5rem;
}

.n-notification-item__details-toggle {
  background: none;
  border: none;
  padding: 0;
  font-size: 0.75rem;
  color: var(--n-color-primary, #3498db);
  cursor: pointer;
  text-decoration: underline;
}

.n-notification-item__details-content {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: var(--n-color-background-alt, #f5f5f5);
  border-radius: var(--n-border-radius-sm, 0.125rem);
  font-size: 0.75rem;
  max-height: 10rem;
  overflow-y: auto;
  white-space: pre-wrap;
}

.n-notification-item__actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
}

.n-notification-item__action {
  padding: 0.25rem 0.75rem;
  border-radius: var(--n-border-radius-sm, 0.125rem);
  border: 1px solid var(--n-color-border, #e0e0e0);
  background-color: var(--n-color-background, #ffffff);
  color: var(--n-color-text-primary, #333333);
  font-size: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s;
}

.n-notification-item__action--primary {
  background-color: var(--n-color-primary, #3498db);
  border-color: var(--n-color-primary, #3498db);
  color: var(--n-color-on-primary, #ffffff);
}

.n-notification-item__action--danger {
  background-color: var(--n-color-error, #e74c3c);
  border-color: var(--n-color-error, #e74c3c);
  color: var(--n-color-on-error, #ffffff);
}

.n-notification-item__meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--n-color-text-tertiary, #999999);
  margin-top: 0.5rem;
}

.n-notification-item__actions-secondary {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-left: 1rem;
}

.n-notification-item__mark-read {
  background: none;
  border: none;
  font-size: 0.75rem;
  color: var(--n-color-primary, #3498db);
  cursor: pointer;
  padding: 0;
  white-space: nowrap;
}

.n-notification-item__dismiss {
  background: none;
  border: none;
  color: var(--n-color-text-tertiary, #999999);
  cursor: pointer;
  padding: 0;
  line-height: 0;
  transition: color 0.2s;
}

.n-notification-item__dismiss:hover {
  color: var(--n-color-text-primary, #333333);
}

/* Animation classes */
.n-notification-enter-active,
.n-notification-leave-active {
  transition: all 0.3s ease;
}

.n-notification-enter-from,
.n-notification-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

@keyframes notification-enter {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Media query for reduced motion */
@media (prefers-reduced-motion: reduce) {
  .n-notification,
  .n-notification-enter-active,
  .n-notification-leave-active {
    transition: opacity 0.1s ease-in-out;
    animation: none !important;
  }
  
  .n-notification-enter-from,
  .n-notification-leave-to {
    transform: none;
  }
}

/* Responsive styles */
@media (max-width: 640px) {
  .n-notification-container {
    left: 0;
    right: 0;
    align-items: center;
    padding: 0.5rem;
  }
  
  .n-notification-container--top-left,
  .n-notification-container--top-right,
  .n-notification-container--top-center {
    top: 0;
  }
  
  .n-notification-container--bottom-left,
  .n-notification-container--bottom-right,
  .n-notification-container--bottom-center {
    bottom: 0;
  }
  
  .n-notification {
    max-width: 100%;
  }
  
  .n-notification-center-dialog {
    max-width: 100% !important;
  }
}
</style>