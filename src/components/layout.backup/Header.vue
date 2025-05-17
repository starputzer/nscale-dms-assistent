<template>
  <div
    ref="headerRef"
    class="n-header"
    :class="{
      'n-header--fixed': fixed,
      'n-header--bordered': bordered,
      'n-header--elevated': elevated,
      [`n-header--${size}`]: true,
      'n-header--has-navigation': showNavigation,
      'n-header--search-active': isSearchActive,
      'n-header--notification-active': isNotificationActive,
      'n-header--mobile': isMobile,
    }"
    :style="{ height: `${computedHeight}px`, ...customStyles }"
  >
    <div class="n-header__left">
      <button
        v-if="showToggleButton"
        class="n-header__toggle-btn"
        @click="handleToggleClick"
        aria-label="Seitenleiste umschalten"
        type="button"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          width="24"
          height="24"
        >
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      <div class="n-header__logo">
        <slot name="logo">
          <div v-if="logo" class="n-header__logo-image">
            <img :src="logo" :alt="logoAlt || title" />
          </div>
        </slot>
      </div>

      <h1 v-if="title && showTitle" class="n-header__title">
        <slot name="title">{{ title }}</slot>
      </h1>
    </div>

    <div class="n-header__center">
      <slot name="center">
        <!-- Dynamische Navigation -->
        <nav
          v-if="showNavigation && navigationItems.length > 0"
          class="n-header__navigation"
        >
          <ul class="n-header__nav-list">
            <li
              v-for="item in visibleNavigationItems"
              :key="item.id"
              class="n-header__nav-item"
              :class="{
                'n-header__nav-item--active': isActiveNavigationItem(item),
              }"
            >
              <a
                v-if="item.href"
                :href="item.href"
                class="n-header__nav-link"
                :class="{
                  'n-header__nav-link--active': isActiveNavigationItem(item),
                }"
                :aria-current="
                  isActiveNavigationItem(item) ? 'page' : undefined
                "
                :title="item.tooltip"
              >
                <span v-if="item.icon" class="n-header__nav-icon">
                  <component
                    :is="item.icon"
                    v-if="typeof item.icon === 'object'"
                  />
                  <i v-else :class="item.icon"></i>
                </span>
                <span class="n-header__nav-label">{{ item.label }}</span>
                <span
                  v-if="item.badge"
                  class="n-header__nav-badge"
                  :class="`n-header__nav-badge--${item.badgeType || 'default'}`"
                >
                  {{ item.badge }}
                </span>
              </a>
              <button
                v-else
                class="n-header__nav-button"
                :class="{
                  'n-header__nav-button--active': isActiveNavigationItem(item),
                }"
                @click="handleNavigationItemClick(item)"
                :aria-current="
                  isActiveNavigationItem(item) ? 'page' : undefined
                "
                :title="item.tooltip"
                type="button"
              >
                <span v-if="item.icon" class="n-header__nav-icon">
                  <component
                    :is="item.icon"
                    v-if="typeof item.icon === 'object'"
                  />
                  <i v-else :class="item.icon"></i>
                </span>
                <span class="n-header__nav-label">{{ item.label }}</span>
                <span
                  v-if="item.badge"
                  class="n-header__nav-badge"
                  :class="`n-header__nav-badge--${item.badgeType || 'default'}`"
                >
                  {{ item.badge }}
                </span>
              </button>
            </li>

            <!-- More Dropdown für überlaufende Elemente -->
            <li
              v-if="hasOverflowingItems"
              class="n-header__nav-item n-header__nav-item--more"
            >
              <button
                class="n-header__nav-button n-header__nav-button--more"
                @click="toggleMoreMenu"
                aria-haspopup="true"
                :aria-expanded="isMoreMenuOpen"
                type="button"
              >
                <span class="n-header__nav-label">Mehr</span>
                <svg
                  class="n-header__nav-arrow"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  stroke="currentColor"
                  stroke-width="2"
                  fill="none"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              <!-- Dropdown-Menü für überlaufende Elemente -->
              <div v-if="isMoreMenuOpen" class="n-header__more-menu">
                <ul class="n-header__more-list">
                  <li
                    v-for="item in overflowingNavigationItems"
                    :key="item.id"
                    class="n-header__more-item"
                    :class="{
                      'n-header__more-item--active':
                        isActiveNavigationItem(item),
                    }"
                  >
                    <a
                      v-if="item.href"
                      :href="item.href"
                      class="n-header__more-link"
                      :aria-current="
                        isActiveNavigationItem(item) ? 'page' : undefined
                      "
                    >
                      <span v-if="item.icon" class="n-header__more-icon">
                        <component
                          :is="item.icon"
                          v-if="typeof item.icon === 'object'"
                        />
                        <i v-else :class="item.icon"></i>
                      </span>
                      <span class="n-header__more-label">{{ item.label }}</span>
                      <span
                        v-if="item.badge"
                        class="n-header__more-badge"
                        :class="`n-header__more-badge--${item.badgeType || 'default'}`"
                      >
                        {{ item.badge }}
                      </span>
                    </a>
                    <button
                      v-else
                      class="n-header__more-button"
                      @click="handleNavigationItemClick(item)"
                      :aria-current="
                        isActiveNavigationItem(item) ? 'page' : undefined
                      "
                      type="button"
                    >
                      <span v-if="item.icon" class="n-header__more-icon">
                        <component
                          :is="item.icon"
                          v-if="typeof item.icon === 'object'"
                        />
                        <i v-else :class="item.icon"></i>
                      </span>
                      <span class="n-header__more-label">{{ item.label }}</span>
                      <span
                        v-if="item.badge"
                        class="n-header__more-badge"
                        :class="`n-header__more-badge--${item.badgeType || 'default'}`"
                      >
                        {{ item.badge }}
                      </span>
                    </button>
                  </li>
                </ul>
              </div>
            </li>
          </ul>
        </nav>

        <!-- Searchbar -->
        <div
          v-if="showSearch"
          class="n-header__search"
          :class="{ 'n-header__search--active': isSearchActive }"
        >
          <button
            v-if="!isSearchActive && !isMobile"
            class="n-header__search-toggle"
            @click="toggleSearch"
            aria-label="Suche öffnen"
            type="button"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span class="n-header__search-label">Suchen</span>
          </button>

          <div
            v-show="isSearchActive || isMobile"
            class="n-header__search-form"
          >
            <div class="n-header__search-input-wrapper">
              <svg
                class="n-header__search-icon"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                ref="searchInput"
                type="text"
                class="n-header__search-input"
                :placeholder="searchPlaceholder"
                v-model="searchQuery"
                @input="handleSearchInput"
                @keydown.esc="closeSearch"
                @focus="isSearchActive = true"
              />
              <button
                v-if="searchQuery"
                class="n-header__search-clear"
                @click="clearSearch"
                aria-label="Suche löschen"
                type="button"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              <button
                v-if="isSearchActive"
                class="n-header__search-close"
                @click="closeSearch"
                aria-label="Suche schließen"
                type="button"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <!-- Autovervollständigung -->
            <div
              v-if="isSearchActive && searchResults.length > 0"
              class="n-header__search-autocomplete"
            >
              <ul class="n-header__search-results">
                <li
                  v-for="(result, index) in searchResults"
                  :key="index"
                  class="n-header__search-result"
                  :class="{
                    'n-header__search-result--active':
                      index === activeSearchResult,
                  }"
                >
                  <button
                    class="n-header__search-result-button"
                    @click="selectSearchResult(result)"
                    @mouseover="activeSearchResult = index"
                    type="button"
                  >
                    <span
                      v-if="result.icon"
                      class="n-header__search-result-icon"
                    >
                      <component
                        :is="result.icon"
                        v-if="typeof result.icon === 'object'"
                      />
                      <i v-else :class="result.icon"></i>
                    </span>
                    <div class="n-header__search-result-content">
                      <div
                        class="n-header__search-result-title"
                        v-html="highlightSearchMatch(result.title)"
                      ></div>
                      <div
                        v-if="result.description"
                        class="n-header__search-result-description"
                        v-html="highlightSearchMatch(result.description)"
                      ></div>
                    </div>
                    <span
                      v-if="result.category"
                      class="n-header__search-result-category"
                      >{{ result.category }}</span
                    >
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </slot>
    </div>

    <div class="n-header__right">
      <slot name="right">
        <div class="n-header__actions">
          <!-- Suchknopf für mobile Ansicht -->
          <button
            v-if="showSearch && isMobile && !isSearchActive"
            class="n-header__action-button n-header__action-button--search"
            @click="toggleSearch"
            aria-label="Suche"
            type="button"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>

          <!-- Benachrichtigungen -->
          <div v-if="$slots.notifications" class="n-header__notifications">
            <slot name="notifications"></slot>
          </div>
          <div
            v-else-if="showNotifications"
            class="n-header__notification-center"
          >
            <button
              class="n-header__action-button n-header__action-button--notification"
              @click="toggleNotifications"
              :aria-expanded="isNotificationActive ? 'true' : 'false'"
              aria-label="Benachrichtigungen"
              type="button"
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span
                v-if="notificationCount > 0"
                class="n-header__notification-badge"
                >{{ formattedNotificationCount }}</span
              >
            </button>

            <!-- Notification Dropdown -->
            <div
              v-if="isNotificationActive"
              class="n-header__notification-dropdown"
              ref="notificationDropdown"
            >
              <div class="n-header__notification-header">
                <h3 class="n-header__notification-title">Benachrichtigungen</h3>
                <button
                  v-if="notifications.length > 0"
                  class="n-header__notification-clear-all"
                  @click="handleClearAllNotifications"
                  type="button"
                >
                  Alle löschen
                </button>
              </div>

              <div
                v-if="notifications.length === 0"
                class="n-header__notification-empty"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="40"
                  height="40"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <p>Keine neuen Benachrichtigungen</p>
              </div>

              <ul v-else class="n-header__notification-list">
                <li
                  v-for="notification in notifications"
                  :key="notification.id"
                  class="n-header__notification-item"
                  :class="{
                    'n-header__notification-item--unread': !notification.read,
                    [`n-header__notification-item--${notification.type || 'default'}`]: true,
                  }"
                >
                  <div class="n-header__notification-item-content">
                    <div
                      v-if="notification.icon"
                      class="n-header__notification-item-icon"
                    >
                      <component
                        :is="notification.icon"
                        v-if="typeof notification.icon === 'object'"
                      />
                      <i v-else :class="notification.icon"></i>
                    </div>
                    <div class="n-header__notification-item-text">
                      <div class="n-header__notification-item-title">
                        {{ notification.title }}
                      </div>
                      <div
                        v-if="notification.message"
                        class="n-header__notification-item-message"
                      >
                        {{ notification.message }}
                      </div>
                      <div
                        v-if="notification.time"
                        class="n-header__notification-item-time"
                      >
                        {{ formatNotificationTime(notification.time) }}
                      </div>
                    </div>
                  </div>
                  <div class="n-header__notification-item-actions">
                    <button
                      v-if="notification.action"
                      class="n-header__notification-item-action"
                      @click="handleNotificationAction(notification)"
                      type="button"
                    >
                      {{ notification.actionLabel || "Anzeigen" }}
                    </button>
                    <button
                      class="n-header__notification-item-dismiss"
                      @click="dismissNotification(notification.id)"
                      aria-label="Benachrichtigung entfernen"
                      type="button"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                </li>
              </ul>

              <div class="n-header__notification-footer">
                <a
                  v-if="notificationSettingsLink"
                  :href="notificationSettingsLink"
                  class="n-header__notification-settings"
                >
                  Einstellungen
                </a>
                <button
                  v-else-if="showNotificationSettings"
                  class="n-header__notification-settings"
                  @click="openNotificationSettings"
                  type="button"
                >
                  Einstellungen
                </button>
              </div>
            </div>
          </div>

          <!-- Benutzermenü -->
          <div v-if="$slots.user" class="n-header__user">
            <slot name="user"></slot>
          </div>
          <div v-else-if="user" class="n-header__user-menu">
            <button
              class="n-header__user-button"
              @click="toggleUserMenu"
              type="button"
              :aria-expanded="isUserMenuOpen ? 'true' : 'false'"
              aria-haspopup="true"
            >
              <div v-if="user.avatar" class="n-header__user-avatar">
                <img :src="user.avatar" :alt="user.name || 'Benutzer'" />
              </div>
              <div
                v-else
                class="n-header__user-avatar n-header__user-avatar--placeholder"
              >
                {{ getUserInitials(user.name) }}
              </div>
              <span
                v-if="size !== 'small' && !isMobile"
                class="n-header__user-name"
                >{{ user.name }}</span
              >
              <svg
                class="n-header__user-arrow"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                stroke="currentColor"
                stroke-width="2"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            <!-- Benutzermenü Dropdown -->
            <div
              v-if="isUserMenuOpen"
              class="n-header__user-dropdown"
              ref="userDropdown"
            >
              <div v-if="user" class="n-header__user-dropdown-header">
                <div v-if="user.avatar" class="n-header__user-dropdown-avatar">
                  <img :src="user.avatar" :alt="user.name || 'Benutzer'" />
                </div>
                <div
                  v-else
                  class="n-header__user-dropdown-avatar n-header__user-dropdown-avatar--placeholder"
                >
                  {{ getUserInitials(user.name) }}
                </div>
                <div class="n-header__user-dropdown-info">
                  <div class="n-header__user-dropdown-name">
                    {{ user.name }}
                  </div>
                  <div v-if="user.email" class="n-header__user-dropdown-email">
                    {{ user.email }}
                  </div>
                  <div v-if="user.role" class="n-header__user-dropdown-role">
                    {{ user.role }}
                  </div>
                </div>
              </div>

              <ul class="n-header__user-dropdown-menu">
                <li
                  v-for="(item, index) in userMenuItems"
                  :key="index"
                  class="n-header__user-dropdown-item"
                >
                  <a
                    v-if="item.href"
                    :href="item.href"
                    class="n-header__user-dropdown-link"
                    :target="item.external ? '_blank' : undefined"
                    rel="noopener noreferrer"
                  >
                    <span v-if="item.icon" class="n-header__user-dropdown-icon">
                      <component
                        :is="item.icon"
                        v-if="typeof item.icon === 'object'"
                      />
                      <i v-else :class="item.icon"></i>
                    </span>
                    <span class="n-header__user-dropdown-label">{{
                      item.label
                    }}</span>
                  </a>
                  <button
                    v-else
                    class="n-header__user-dropdown-button"
                    @click="handleUserMenuItemClick(item)"
                    type="button"
                  >
                    <span v-if="item.icon" class="n-header__user-dropdown-icon">
                      <component
                        :is="item.icon"
                        v-if="typeof item.icon === 'object'"
                      />
                      <i v-else :class="item.icon"></i>
                    </span>
                    <span class="n-header__user-dropdown-label">{{
                      item.label
                    }}</span>
                  </button>
                </li>
              </ul>

              <div v-if="showLogout" class="n-header__user-dropdown-footer">
                <button
                  class="n-header__user-dropdown-logout"
                  @click="handleLogout"
                  type="button"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>Abmelden</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  inject,
  onMounted,
  onBeforeUnmount,
  nextTick,
  watch,
} from "vue";
import { useUIStore } from "../../stores/ui";

export interface NavigationItem {
  /** Eindeutige ID des Navigationspunkts */
  id: string;
  /** Anzeigetext des Navigationspunkts */
  label: string;
  /** Icon des Navigationspunkts (als String oder Component) */
  icon?: string | object;
  /** URL des Navigationspunkts */
  href?: string;
  /** Ob der Navigationspunkt aktiv ist */
  active?: boolean;
  /** Badge-Text oder -Zahl */
  badge?: string | number;
  /** Typ des Badges */
  badgeType?: "default" | "primary" | "success" | "warning" | "error";
  /** Tooltip für den Navigationspunkt */
  tooltip?: string;
  /** Berechtigungen, die für diesen Navigationspunkt benötigt werden */
  permissions?: string[];
  /** Callback-Funktion, wenn auf den Navigationspunkt geklickt wird */
  onClick?: () => void;
}

export interface SearchResult {
  /** ID des Suchergebnisses */
  id: string;
  /** Titel des Suchergebnisses */
  title: string;
  /** Beschreibung des Suchergebnisses */
  description?: string;
  /** Icon des Suchergebnisses */
  icon?: string | object;
  /** Kategorie des Suchergebnisses */
  category?: string;
  /** URL für das Suchergebnis */
  url?: string;
  /** Callback-Funktion für das Auswählen des Suchergebnisses */
  onSelect?: (result: SearchResult) => void;
}

export interface Notification {
  /** ID der Benachrichtigung */
  id: string;
  /** Titel der Benachrichtigung */
  title: string;
  /** Nachricht der Benachrichtigung */
  message?: string;
  /** Typ der Benachrichtigung */
  type?: "default" | "info" | "success" | "warning" | "error";
  /** Icon der Benachrichtigung */
  icon?: string | object;
  /** Ob die Benachrichtigung gelesen wurde */
  read?: boolean;
  /** Zeitpunkt der Benachrichtigung */
  time?: Date | number | string;
  /** Aktion, die ausgeführt werden soll, wenn auf die Benachrichtigung geklickt wird */
  action?: string | (() => void);
  /** Label für die Aktionsschaltfläche */
  actionLabel?: string;
}

export interface UserMenuItem {
  /** Label des Menüpunkts */
  label: string;
  /** Icon des Menüpunkts */
  icon?: string | object;
  /** URL des Menüpunkts */
  href?: string;
  /** Ob der Menüpunkt einen externen Link öffnet */
  external?: boolean;
  /** Callback-Funktion für den Menüpunkt */
  onClick?: () => void;
  /** Berechtigungen, die für diesen Menüpunkt benötigt werden */
  permissions?: string[];
}

/**
 * Header-Komponente für den nscale DMS Assistenten
 * Bietet einen flexiblen Header mit Logo, Titel, Navigation, Suche, Benachrichtigungen und Benutzermenu.
 * @displayName Header
 */
export interface HeaderProps {
  /** Titel des Headers */
  title?: string;
  /** Logo-URL */
  logo?: string;
  /** Alt-Text für das Logo */
  logoAlt?: string;
  /** Ob der Header fixiert sein soll */
  fixed?: boolean;
  /** Ob der Header einen Rahmen haben soll */
  bordered?: boolean;
  /** Ob der Header erhöht (mit Schatten) sein soll */
  elevated?: boolean;
  /** Größe des Headers */
  size?: "small" | "medium" | "large";
  /** Benutzerdefinierte Höhe des Headers in Pixeln */
  height?: number;
  /** Ob der Titel angezeigt werden soll */
  showTitle?: boolean;
  /** Ob der Toggle-Button für die Sidebar angezeigt werden soll */
  showToggleButton?: boolean;
  /** Ob die Navigation angezeigt werden soll */
  showNavigation?: boolean;
  /** Die Navigationselemente */
  navigationItems?: NavigationItem[];
  /** ID des aktiven Navigationselements */
  activeNavigationId?: string;
  /** Maximale Anzahl der sichtbaren Navigationspunkte */
  maxVisibleNavigationItems?: number;
  /** Ob die Suche angezeigt werden soll */
  showSearch?: boolean;
  /** Platzhaltertext für die Suche */
  searchPlaceholder?: string;
  /** Minimale Anzahl an Zeichen für die Suche */
  searchMinLength?: number;
  /** Verzögerung für die Suche in Millisekunden */
  searchDebounce?: number;
  /** Ob Benachrichtigungen angezeigt werden sollen */
  showNotifications?: boolean;
  /** Benachrichtigungen */
  notifications?: Notification[];
  /** Link zu den Benachrichtigungseinstellungen */
  notificationSettingsLink?: string;
  /** Ob die Benachrichtigungseinstellungen angezeigt werden sollen */
  showNotificationSettings?: boolean;
  /** Benutzerinformationen */
  user?: {
    name?: string;
    avatar?: string;
    email?: string;
    role?: string;
  };
  /** Elemente für das Benutzermenü */
  userMenuItems?: UserMenuItem[];
  /** Ob der Abmelden-Button angezeigt werden soll */
  showLogout?: boolean;
  /** Benutzerdefinierte CSS-Variablen für den Header */
  customStyles?: Record<string, string>;
}

const props = withDefaults(defineProps<HeaderProps>(), {
  title: "nscale DMS Assistent",
  fixed: false,
  bordered: true,
  elevated: false,
  size: "medium",
  showTitle: true,
  showToggleButton: true,
  showNavigation: false,
  navigationItems: () => [],
  maxVisibleNavigationItems: 5,
  showSearch: false,
  searchPlaceholder: "Suchen...",
  searchMinLength: 2,
  searchDebounce: 300,
  showNotifications: false,
  notifications: () => [],
  showNotificationSettings: false,
  userMenuItems: () => [],
  showLogout: true,
});

const emit = defineEmits<{
  /** Wird ausgelöst, wenn auf den Toggle-Button geklickt wird */
  (e: "toggle-sidebar"): void;
  /** Wird ausgelöst, wenn auf das Benutzermenü geklickt wird */
  (e: "toggle-user-menu"): void;
  /** Wird ausgelöst, wenn ein Navigationspunkt ausgewählt wird */
  (e: "navigation-select", item: NavigationItem): void;
  /** Wird ausgelöst, wenn eine Suche ausgeführt wird */
  (e: "search", query: string): void;
  /** Wird ausgelöst, wenn ein Suchergebnis ausgewählt wird */
  (e: "search-result-select", result: SearchResult): void;
  /** Wird ausgelöst, wenn eine Benachrichtigung ausgewählt wird */
  (e: "notification-select", notification: Notification): void;
  /** Wird ausgelöst, wenn eine Benachrichtigung entfernt wird */
  (e: "notification-dismiss", id: string): void;
  /** Wird ausgelöst, wenn alle Benachrichtigungen entfernt werden */
  (e: "notification-clear-all"): void;
  /** Wird ausgelöst, wenn auf die Benachrichtigungseinstellungen geklickt wird */
  (e: "notification-settings"): void;
  /** Wird ausgelöst, wenn ein Benutzermenu-Punkt ausgewählt wird */
  (e: "user-menu-select", item: UserMenuItem): void;
  /** Wird ausgelöst, wenn auf Abmelden geklickt wird */
  (e: "logout"): void;
  /** Wird ausgelöst, wenn sich der Header-Status ändert (z.B. Suche aktiv) */
  (
    e: "header-state-change",
    state: {
      isSearchActive: boolean;
      isNotificationActive: boolean;
      isUserMenuOpen: boolean;
    },
  ): void;
}>();

// UI-Store für globale UI-Zustände
const uiStore = useUIStore();

// Layout-Kontext von der übergeordneten Komponente (falls vorhanden)
const layoutContext = inject<any>("layout", null);

// DOM-Referenzen
const headerRef = ref<HTMLElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);
const userDropdown = ref<HTMLElement | null>(null);
const notificationDropdown = ref<HTMLElement | null>(null);

// Reaktive Zustände
const isMobile = ref(false);
const isSearchActive = ref(false);
const isNotificationActive = ref(false);
const isUserMenuOpen = ref(false);
const isMoreMenuOpen = ref(false);
const searchQuery = ref("");
const searchResults = ref<SearchResult[]>([]);
const activeSearchResult = ref(-1);
const searchTimeout = ref<number | null>(null);
const visibleNavigationItems = ref<NavigationItem[]>([]);
const overflowingNavigationItems = ref<NavigationItem[]>([]);

// Berechnete Werte
const computedHeight = computed(() => {
  if (props.height) return props.height;

  switch (props.size) {
    case "small":
      return 48;
    case "large":
      return 72;
    default:
      return 64;
  }
});

const hasOverflowingItems = computed(() => {
  return overflowingNavigationItems.value.length > 0;
});

const notificationCount = computed(() => {
  return props.notifications.filter((n) => !n.read).length;
});

const formattedNotificationCount = computed(() => {
  const count = notificationCount.value;
  return count > 99 ? "99+" : count.toString();
});

// Überwache den Mobile-Zustand des Layout-Kontext
watch(
  () => layoutContext?.isMobile?.value,
  (newValue) => {
    if (newValue !== undefined) {
      isMobile.value = newValue;
    }
  },
  { immediate: true },
);

// Überwache Änderungen an den Navigationselementen
watch(
  () => props.navigationItems,
  () => {
    updateNavigationItems();
  },
  { deep: true },
);

// Schließe Dropdowns, wenn sich der mobile Status ändert
watch(isMobile, () => {
  closeAllDropdowns();
  updateNavigationItems();
});

// Methoden
/**
 * Behandelt Klicks auf den Toggle-Button
 */
function handleToggleClick() {
  emit("toggle-sidebar");

  // Falls layoutContext vorhanden ist, aktualisiere den Zustand dort
  if (layoutContext && typeof layoutContext.toggleSidebar === "function") {
    layoutContext.toggleSidebar();
  }
}

/**
 * Gibt die Initialen eines Benutzernamens zurück
 * @param name Der Benutzername
 */
function getUserInitials(name?: string): string {
  if (!name) return "U";

  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

/**
 * Prüft, ob ein Navigationselement aktiv ist
 * @param item Das zu prüfende Navigationselement
 */
function isActiveNavigationItem(item: NavigationItem): boolean {
  return item.active || item.id === props.activeNavigationId;
}

/**
 * Behandelt Klicks auf Navigationselemente
 * @param item Das angeklickte Navigationselement
 */
function handleNavigationItemClick(item: NavigationItem) {
  emit("navigation-select", item);

  if (item.onClick && typeof item.onClick === "function") {
    item.onClick();
  }

  // "Mehr"-Menü schließen
  isMoreMenuOpen.value = false;
}

/**
 * Aktualisiert die Navigation und teilt sie in sichtbare und überlaufende Elemente auf
 */
function updateNavigationItems() {
  const maxVisible = isMobile.value
    ? Math.min(3, props.maxVisibleNavigationItems)
    : props.maxVisibleNavigationItems;

  // Sortieren, damit aktive Elemente vorne erscheinen
  const sortedItems = [...props.navigationItems].sort((a, b) => {
    if (isActiveNavigationItem(a) && !isActiveNavigationItem(b)) return -1;
    if (!isActiveNavigationItem(a) && isActiveNavigationItem(b)) return 1;
    return 0;
  });

  visibleNavigationItems.value = sortedItems.slice(0, maxVisible);
  overflowingNavigationItems.value = sortedItems.slice(maxVisible);
}

/**
 * Öffnet/schließt das "Mehr"-Menü
 */
function toggleMoreMenu() {
  isMoreMenuOpen.value = !isMoreMenuOpen.value;

  if (isMoreMenuOpen.value) {
    // Andere Dropdowns schließen
    isNotificationActive.value = false;
    isUserMenuOpen.value = false;

    // Event-Listener für Klicks außerhalb des Menüs
    nextTick(() => {
      document.addEventListener("click", handleClickOutsideMoreMenu);
    });
  } else {
    document.removeEventListener("click", handleClickOutsideMoreMenu);
  }
}

/**
 * Behandelt Klicks außerhalb des "Mehr"-Menüs
 */
function handleClickOutsideMoreMenu(event: MouseEvent) {
  const target = event.target as HTMLElement;

  if (!target.closest(".n-header__nav-item--more")) {
    isMoreMenuOpen.value = false;
    document.removeEventListener("click", handleClickOutsideMoreMenu);
  }
}

/**
 * Aktiviert die Suche
 */
function toggleSearch() {
  isSearchActive.value = !isSearchActive.value;

  if (isSearchActive.value) {
    nextTick(() => {
      searchInput.value?.focus();
    });

    // Andere Dropdowns schließen
    isNotificationActive.value = false;
    isUserMenuOpen.value = false;
    isMoreMenuOpen.value = false;
  } else {
    // Suche zurücksetzen
    searchQuery.value = "";
    searchResults.value = [];
  }

  emitHeaderStateChange();
}

/**
 * Behandelt die Sucheingabe
 */
function handleSearchInput() {
  // Timeout löschen, wenn bereits einer gesetzt ist
  if (searchTimeout.value !== null) {
    clearTimeout(searchTimeout.value);
  }

  // Mindestlänge prüfen
  if (searchQuery.value.length < props.searchMinLength) {
    searchResults.value = [];
    return;
  }

  // Neuen Timeout setzen
  searchTimeout.value = setTimeout(() => {
    performSearch();
  }, props.searchDebounce) as unknown as number;
}

/**
 * Führt eine Suche durch
 */
function performSearch() {
  emit("search", searchQuery.value);

  // Hier würden echte Suchergebnisse geliefert werden,
  // für dieses Beispiel erstellen wir Dummy-Daten
  searchResults.value = [
    {
      id: "1",
      title: `Ergebnis für "${searchQuery.value}" 1`,
      description: "Beschreibung des ersten Suchergebnisses",
      category: "Dokumente",
    },
    {
      id: "2",
      title: `Ergebnis für "${searchQuery.value}" 2`,
      description: "Beschreibung des zweiten Suchergebnisses",
      category: "Chat",
    },
    {
      id: "3",
      title: `Ergebnis für "${searchQuery.value}" 3`,
      category: "Einstellungen",
    },
  ];

  // Ersten Eintrag als aktiv markieren
  activeSearchResult.value = 0;
}

/**
 * Schließt die Suche
 */
function closeSearch() {
  isSearchActive.value = false;
  searchQuery.value = "";
  searchResults.value = [];
  emitHeaderStateChange();
}

/**
 * Löscht die Suchanfrage
 */
function clearSearch() {
  searchQuery.value = "";
  searchResults.value = [];
  nextTick(() => {
    searchInput.value?.focus();
  });
}

/**
 * Wählt ein Suchergebnis aus
 * @param result Das ausgewählte Suchergebnis
 */
function selectSearchResult(result: SearchResult) {
  emit("search-result-select", result);

  if (result.onSelect && typeof result.onSelect === "function") {
    result.onSelect(result);
  }

  closeSearch();
}

/**
 * Hebt Suchbegriffe im Text hervor
 * @param text Der Text, in dem die Suchbegriffe hervorgehoben werden sollen
 */
function highlightSearchMatch(text: string): string {
  if (!searchQuery.value || searchQuery.value.length < 2) {
    return text;
  }

  const regex = new RegExp(`(${searchQuery.value})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
}

/**
 * Öffnet/schließt das Benachrichtigungscenter
 */
function toggleNotifications() {
  isNotificationActive.value = !isNotificationActive.value;

  if (isNotificationActive.value) {
    // Andere Dropdowns schließen
    isSearchActive.value = false;
    isUserMenuOpen.value = false;
    isMoreMenuOpen.value = false;

    // Event-Listener für Klicks außerhalb des Dropdown
    nextTick(() => {
      document.addEventListener("click", handleClickOutsideNotifications);
    });
  } else {
    document.removeEventListener("click", handleClickOutsideNotifications);
  }

  emitHeaderStateChange();
}

/**
 * Behandelt Klicks außerhalb des Benachrichtigungscenters
 */
function handleClickOutsideNotifications(event: MouseEvent) {
  const target = event.target as HTMLElement;

  if (
    notificationDropdown.value &&
    !notificationDropdown.value.contains(target) &&
    !target.closest(".n-header__action-button--notification")
  ) {
    isNotificationActive.value = false;
    document.removeEventListener("click", handleClickOutsideNotifications);
    emitHeaderStateChange();
  }
}

/**
 * Formatiert den Zeitstempel einer Benachrichtigung
 * @param time Der Zeitstempel
 */
function formatNotificationTime(time: Date | number | string): string {
  const date = new Date(time);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) {
    return "gerade eben";
  } else if (diffMin < 60) {
    return `${diffMin} ${diffMin === 1 ? "Minute" : "Minuten"} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? "Stunde" : "Stunden"} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? "Tag" : "Tage"} ago`;
  } else {
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
}

/**
 * Schließt eine Benachrichtigung
 * @param id Die ID der Benachrichtigung
 */
function dismissNotification(id: string) {
  emit("notification-dismiss", id);
}

/**
 * Führt die Aktion einer Benachrichtigung aus
 * @param notification Die Benachrichtigung
 */
function handleNotificationAction(notification: Notification) {
  emit("notification-select", notification);

  if (typeof notification.action === "function") {
    notification.action();
  }
}

/**
 * Löscht alle Benachrichtigungen
 */
function handleClearAllNotifications() {
  emit("notification-clear-all");
}

/**
 * Öffnet die Benachrichtigungseinstellungen
 */
function openNotificationSettings() {
  emit("notification-settings");
  isNotificationActive.value = false;
}

/**
 * Öffnet/schließt das Benutzermenü
 */
function toggleUserMenu() {
  isUserMenuOpen.value = !isUserMenuOpen.value;

  if (isUserMenuOpen.value) {
    // Andere Dropdowns schließen
    isSearchActive.value = false;
    isNotificationActive.value = false;
    isMoreMenuOpen.value = false;

    // Event-Listener für Klicks außerhalb des Dropdown
    nextTick(() => {
      document.addEventListener("click", handleClickOutsideUserMenu);
    });
  } else {
    document.removeEventListener("click", handleClickOutsideUserMenu);
  }

  emit("toggle-user-menu");
  emitHeaderStateChange();
}

/**
 * Behandelt Klicks außerhalb des Benutzermenüs
 */
function handleClickOutsideUserMenu(event: MouseEvent) {
  const target = event.target as HTMLElement;

  if (
    userDropdown.value &&
    !userDropdown.value.contains(target) &&
    !target.closest(".n-header__user-button")
  ) {
    isUserMenuOpen.value = false;
    document.removeEventListener("click", handleClickOutsideUserMenu);
    emitHeaderStateChange();
  }
}

/**
 * Führt die Aktion eines Benutzermenu-Punkts aus
 * @param item Der Menüpunkt
 */
function handleUserMenuItemClick(item: UserMenuItem) {
  emit("user-menu-select", item);

  if (item.onClick && typeof item.onClick === "function") {
    item.onClick();
  }

  isUserMenuOpen.value = false;
}

/**
 * Führt die Abmeldung aus
 */
function handleLogout() {
  emit("logout");
  isUserMenuOpen.value = false;
}

/**
 * Schließt alle Dropdowns
 */
function closeAllDropdowns() {
  isSearchActive.value = false;
  isNotificationActive.value = false;
  isUserMenuOpen.value = false;
  isMoreMenuOpen.value = false;

  document.removeEventListener("click", handleClickOutsideNotifications);
  document.removeEventListener("click", handleClickOutsideUserMenu);
  document.removeEventListener("click", handleClickOutsideMoreMenu);

  emitHeaderStateChange();
}

/**
 * Sendet den aktuellen Zustand des Headers
 */
function emitHeaderStateChange() {
  emit("header-state-change", {
    isSearchActive: isSearchActive.value,
    isNotificationActive: isNotificationActive.value,
    isUserMenuOpen: isUserMenuOpen.value,
  });
}

/**
 * Prüft den Mobile-Status
 */
function checkMobileStatus() {
  // Wenn wir keine Information vom Layout-Kontext haben,
  // prüfen wir selbst den Viewport
  if (layoutContext?.isMobile === undefined) {
    isMobile.value = window.innerWidth < 768;
  }
}

/**
 * Event-Handler für Tastaturevents
 */
function handleKeyDown(event: KeyboardEvent) {
  // ESC-Taste zum Schließen aller Dropdowns
  if (event.key === "Escape") {
    closeAllDropdowns();
  }

  // Pfeiltasten für Navigation in Suchergebnissen
  if (isSearchActive.value && searchResults.value.length > 0) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      activeSearchResult.value = Math.min(
        activeSearchResult.value + 1,
        searchResults.value.length - 1,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      activeSearchResult.value = Math.max(activeSearchResult.value - 1, 0);
    } else if (event.key === "Enter" && activeSearchResult.value >= 0) {
      event.preventDefault();
      selectSearchResult(searchResults.value[activeSearchResult.value]);
    }
  }
}

// Lifecycle-Hooks
onMounted(() => {
  checkMobileStatus();
  updateNavigationItems();

  // Event-Listener für den Viewport
  window.addEventListener("resize", checkMobileStatus);

  // Event-Listener für Tastaturevents
  document.addEventListener("keydown", handleKeyDown);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", checkMobileStatus);
  document.removeEventListener("keydown", handleKeyDown);
  document.removeEventListener("click", handleClickOutsideNotifications);
  document.removeEventListener("click", handleClickOutsideUserMenu);
  document.removeEventListener("click", handleClickOutsideMoreMenu);

  // Timeout löschen, falls einer gesetzt ist
  if (searchTimeout.value !== null) {
    clearTimeout(searchTimeout.value);
  }
});
</script>

<style scoped>
.n-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background-color: var(
    --n-header-background-color,
    var(--n-background-color, #f5f7fa)
  );
  color: var(--n-header-text-color, var(--n-text-color, #2d3748));
  padding: 0 16px;
  transition:
    box-shadow 0.3s ease,
    background-color 0.3s ease,
    color 0.3s ease;
  z-index: var(--n-header-z-index, 10);
}

.n-header--fixed {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
}

.n-header--bordered {
  border-bottom: 1px solid var(--n-border-color, #e2e8f0);
}

.n-header--elevated {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.n-header--small {
  min-height: 48px;
}

.n-header--medium {
  min-height: 64px;
}

.n-header--large {
  min-height: 72px;
}

.n-header__left,
.n-header__center,
.n-header__right {
  display: flex;
  align-items: center;
}

.n-header__left {
  flex: 1;
  min-width: 0;
}

.n-header__center {
  flex: 2;
  justify-content: center;
}

.n-header__right {
  flex: 1;
  justify-content: flex-end;
}

.n-header__toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: var(--n-border-radius, 4px);
  cursor: pointer;
  margin-right: 16px;
  transition: background-color 0.2s ease;
  color: var(--n-header-icon-color, var(--n-text-color, #2d3748));
}

.n-header__toggle-btn:hover {
  background-color: var(--n-header-hover-color, rgba(0, 0, 0, 0.05));
}

.n-header__toggle-btn:focus-visible {
  outline: 2px solid var(--n-focus-color, #3182ce);
  outline-offset: 1px;
}

.n-header__logo {
  display: flex;
  align-items: center;
  margin-right: 16px;
}

.n-header__logo-image {
  height: 32px;
  width: auto;
  max-width: 120px;
}

.n-header__logo-image img {
  height: 100%;
  width: auto;
  object-fit: contain;
}

.n-header__title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  padding: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.n-header--small .n-header__title {
  font-size: 1.125rem;
}

.n-header--large .n-header__title {
  font-size: 1.375rem;
}

.n-header__actions {
  display: flex;
  align-items: center;
}

.n-header__notifications {
  margin-right: 16px;
}

.n-header__user,
.n-header__user-menu {
  position: relative;
}

.n-header__user-button {
  display: flex;
  align-items: center;
  background: transparent;
  border: none;
  padding: 8px;
  border-radius: var(--n-border-radius, 4px);
  cursor: pointer;
  color: var(--n-header-text-color, var(--n-text-color, #2d3748));
  transition: background-color 0.2s ease;
}

.n-header__user-button:hover {
  background-color: var(--n-header-hover-color, rgba(0, 0, 0, 0.05));
}

.n-header__user-button:focus-visible {
  outline: 2px solid var(--n-focus-color, #3182ce);
  outline-offset: 1px;
}

.n-header__user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 8px;
}

.n-header__user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.n-header__user-avatar--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--n-primary-color, #3182ce);
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.n-header__user-name {
  margin-right: 4px;
  font-weight: 500;
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.n-header__user-arrow {
  margin-left: 4px;
  flex-shrink: 0;
}

/* Responsive styles */
@media (max-width: 768px) {
  .n-header {
    padding: 0 12px;
  }

  .n-header__center {
    display: none;
  }

  .n-header__title {
    font-size: 1.125rem;
    max-width: 140px;
  }

  .n-header__logo-image {
    height: 28px;
    max-width: 80px;
  }

  .n-header__user-name {
    display: none;
  }

  .n-header__toggle-btn {
    margin-right: 12px;
    width: 36px;
    height: 36px;
  }
}

@media (max-width: 480px) {
  .n-header__title {
    max-width: 100px;
  }
}
</style>
