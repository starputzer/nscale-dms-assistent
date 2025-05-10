<template>
  <div 
    class="n-session-manager"
    :class="{ 
      'n-session-manager--loading': loading, 
      'n-session-manager--collapsed': collapsed
    }"
    role="navigation"
    aria-label="Chat-Sitzungen"
  >
    <!-- Header mit Titel und Aktionen -->
    <div class="n-session-manager__header">
      <h2 
        class="n-session-manager__title"
        :id="headerId"
      >
        {{ title }}
      </h2>
      
      <div class="n-session-manager__header-actions">
        <!-- Suchfeld-Toggle -->
        <button 
          v-if="searchEnabled" 
          class="n-session-manager__action-btn"
          :class="{ 'n-session-manager__action-btn--active': isSearchVisible }"
          @click="toggleSearch"
          :aria-label="isSearchVisible ? 'Suche ausblenden' : 'Suche anzeigen'"
          :aria-expanded="isSearchVisible"
        >
          <span class="n-session-manager__icon n-session-manager__icon--search"></span>
        </button>
        
        <!-- Collapse-Button -->
        <button 
          class="n-session-manager__action-btn"
          @click="$emit('toggle-collapse')"
          :aria-label="collapsed ? 'Seitenleiste erweitern' : 'Seitenleiste einklappen'"
          :aria-expanded="!collapsed"
        >
          <span 
            class="n-session-manager__icon"
            :class="collapsed ? 'n-session-manager__icon--expand' : 'n-session-manager__icon--collapse'"
          ></span>
        </button>
      </div>
    </div>
    
    <!-- Suchfeld (wenn sichtbar) -->
    <div
      v-if="searchEnabled && isSearchVisible"
      class="n-session-manager__search"
    >
      <div class="n-session-manager__search-input-container">
        <input
          ref="searchInput"
          v-model="searchQuery"
          class="n-session-manager__search-input"
          type="text"
          placeholder="Sitzungen durchsuchen..."
          aria-label="Sitzungen durchsuchen"
        />
        <button
          v-if="searchQuery"
          class="n-session-manager__search-clear"
          @click="clearSearch"
          aria-label="Suche zurücksetzen"
        >
          <span class="n-session-manager__icon n-session-manager__icon--clear"></span>
        </button>
      </div>
    </div>

    <!-- Filter-Bereich -->
    <div class="n-session-manager__filters" v-if="categoriesEnabled || tagsEnabled">
      <div class="n-session-manager__filter-group">
        <!-- Aktiver Filter -->
        <div class="n-session-manager__active-filter" v-if="activeFilter !== 'all'">
          <span class="n-session-manager__filter-label">{{ getFilterLabel() }}</span>
          <button
            class="n-session-manager__filter-clear"
            @click="clearFilter"
            aria-label="Filter zurücksetzen"
          >
            <span class="n-session-manager__icon n-session-manager__icon--clear"></span>
          </button>
        </div>

        <!-- Filter-Button -->
        <button
          class="n-session-manager__filter-btn"
          @click="toggleFilterMenu"
          :class="{ 'n-session-manager__filter-btn--active': filterMenuOpen }"
          aria-label="Sitzungen filtern"
          :aria-expanded="filterMenuOpen"
        >
          <span class="n-session-manager__icon n-session-manager__icon--filter"></span>
          <span class="n-session-manager__btn-text">Filtern</span>
        </button>

        <!-- Filter-Dropdown -->
        <div
          v-if="filterMenuOpen"
          class="n-session-manager__filter-menu"
          role="menu"
        >
          <button
            class="n-session-manager__filter-item"
            @click="applyFilter('all')"
            :class="{ 'n-session-manager__filter-item--active': activeFilter === 'all' }"
            role="menuitem"
          >
            <span>Alle Sitzungen</span>
          </button>

          <button
            class="n-session-manager__filter-item"
            @click="applyFilter('pinned')"
            :class="{ 'n-session-manager__filter-item--active': activeFilter === 'pinned' }"
            role="menuitem"
          >
            <span class="n-session-manager__icon n-session-manager__icon--pin"></span>
            <span>Angeheftete</span>
          </button>

          <button
            class="n-session-manager__filter-item"
            @click="applyFilter('archived')"
            :class="{ 'n-session-manager__filter-item--active': activeFilter === 'archived' }"
            role="menuitem"
          >
            <span class="n-session-manager__icon n-session-manager__icon--archive"></span>
            <span>Archivierte</span>
          </button>

          <!-- Kategoriefilter-Abschnitt -->
          <div v-if="categoriesEnabled && props.availableCategories.length > 0" class="n-session-manager__filter-section">
            <div class="n-session-manager__filter-section-title">Nach Kategorie</div>
            <button
              v-for="category in props.availableCategories"
              :key="category.id"
              class="n-session-manager__filter-item"
              @click="applyFilter(`category:${category.id}`)"
              :class="{ 'n-session-manager__filter-item--active': activeFilter === `category:${category.id}` }"
              role="menuitem"
            >
              <span
                class="n-session-manager__category-badge"
                :style="{ backgroundColor: category.color || '#e2e8f0' }"
              ></span>
              <span>{{ category.name }}</span>
            </button>
          </div>

          <!-- Tagfilter-Abschnitt -->
          <div v-if="tagsEnabled && props.availableTags.length > 0" class="n-session-manager__filter-section">
            <div class="n-session-manager__filter-section-title">Nach Tag</div>
            <button
              v-for="tag in props.availableTags"
              :key="tag.id"
              class="n-session-manager__filter-item"
              @click="applyFilter(`tag:${tag.id}`)"
              :class="{ 'n-session-manager__filter-item--active': activeFilter === `tag:${tag.id}` }"
              role="menuitem"
            >
              <span
                class="n-session-manager__tag-badge"
                :style="{ backgroundColor: tag.color || '#e2e8f0' }"
              ></span>
              <span>{{ tag.name }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Multi-Select-Button -->
      <div class="n-session-manager__multi-select-group" v-if="multiSelectEnabled">
        <button
          class="n-session-manager__multi-select-btn"
          @click="toggleMultiSelectMode"
          :class="{ 'n-session-manager__multi-select-btn--active': isMultiSelectModeActive }"
          aria-label="Mehrfachauswahl aktivieren"
          :aria-pressed="isMultiSelectModeActive"
        >
          <span class="n-session-manager__icon n-session-manager__icon--checkbox"></span>
          <span class="n-session-manager__btn-text">Multi-Select</span>
        </button>

        <!-- Multi-Select-Aktionsmenü (wenn aktiv und Auswahl vorhanden) -->
        <div v-if="isMultiSelectModeActive && selectedCount > 0" class="n-session-manager__selection-info">
          <button
            class="n-session-manager__multi-actions-btn"
            @click="toggleMultiSelectMenu"
            :aria-expanded="multiSelectMenuOpen"
          >
            <span>{{ selectedCount }} ausgewählt</span>
            <span class="n-session-manager__icon n-session-manager__icon--chevron-down"></span>
          </button>

          <!-- Multi-Select-Aktionsmenü -->
          <div
            v-if="multiSelectMenuOpen"
            class="n-session-manager__multi-menu"
            role="menu"
          >
            <button
              class="n-session-manager__multi-menu-item"
              @click="showMultiSelectActionDialog('archive')"
              role="menuitem"
            >
              <span class="n-session-manager__icon n-session-manager__icon--archive"></span>
              <span>Archivieren</span>
            </button>

            <button
              class="n-session-manager__multi-menu-item"
              @click="showMultiSelectActionDialog('tag')"
              role="menuitem"
            >
              <span class="n-session-manager__icon n-session-manager__icon--tag"></span>
              <span>Tag zuweisen</span>
            </button>

            <button
              class="n-session-manager__multi-menu-item"
              @click="showMultiSelectActionDialog('category')"
              role="menuitem"
            >
              <span class="n-session-manager__icon n-session-manager__icon--category"></span>
              <span>Kategorisieren</span>
            </button>

            <button
              class="n-session-manager__multi-menu-item n-session-manager__multi-menu-item--danger"
              @click="showMultiSelectActionDialog('delete')"
              role="menuitem"
            >
              <span class="n-session-manager__icon n-session-manager__icon--delete"></span>
              <span>Löschen</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Aktionsbereich (neue Sitzung erstellen) -->
    <div class="n-session-manager__actions">
      <button
        class="n-session-manager__new-session-btn"
        @click="createNewSession"
        :disabled="loading || maxSessionsReached"
        aria-label="Neue Unterhaltung starten"
      >
        <span class="n-session-manager__icon n-session-manager__icon--plus"></span>
        <span class="n-session-manager__btn-text">Neue Unterhaltung</span>
      </button>
    </div>
    
    <!-- Sitzungsliste mit Virtualisierung und Drag & Drop -->
    <div
      v-if="loading"
      class="n-session-manager__loading"
      aria-live="polite"
    >
      <div class="n-session-manager__spinner" aria-hidden="true"></div>
      <span>Lade Sitzungen...</span>
    </div>
    
    <div
      v-else
      ref="sessionListContainer"
      class="n-session-manager__session-list"
      :aria-labelledby="headerId"
    >
      <transition-group
        name="session-list"
        tag="ul"
        class="n-session-manager__list"
        role="listbox"
        :aria-activedescendant="currentSessionId ? `session-${currentSessionId}` : undefined"
      >
        <!-- Meldung, wenn keine Sitzungen gefunden wurden -->
        <li 
          v-if="filteredSessions.length === 0" 
          key="empty"
          class="n-session-manager__empty"
          role="option"
          aria-selected="false"
        >
          <p v-if="searchQuery">Keine Sitzungen gefunden für "<strong>{{ searchQuery }}</strong>"</p>
          <p v-else>Keine Sitzungen vorhanden</p>
        </li>
        
        <!-- Sortierbare Sitzungsliste -->
        <VueDraggable
          v-else
          v-model="draggedSessions"
          v-bind="dragOptions"
          item-key="id"
          handle=".n-session-manager__drag-handle"
          tag="div"
          :disabled="!sortable || !!searchQuery"
          @end="onDragEnd"
        >
          <template #item="{element}">
            <li
              :key="element.id"
              :id="`session-${element.id}`"
              class="n-session-manager__session"
              :class="{
                'n-session-manager__session--active': element.id === currentSessionId,
                'n-session-manager__session--pinned': element.isPinned,
                'n-session-manager__session--archived': element.isArchived,
                'n-session-manager__session--selected': isMultiSelectModeActive && isSelected(element.id)
              }"
              :aria-selected="element.id === currentSessionId || (isMultiSelectModeActive && isSelected(element.id))"
              role="option"
              @click="isMultiSelectModeActive ? toggleSessionSelection(element.id) : selectSession(element.id)"
              @keydown="handleSessionKeydown($event, element.id)"
              tabindex="0"
            >
              <!-- Multi-Select Checkbox -->
              <div
                v-if="isMultiSelectModeActive && multiSelectEnabled"
                class="n-session-manager__checkbox"
                :class="{ 'n-session-manager__checkbox--checked': isSelected(element.id) }"
                aria-hidden="true"
                @click.stop="toggleSessionSelection(element.id)"
              >
                <span
                  class="n-session-manager__icon"
                  :class="isSelected(element.id) ? 'n-session-manager__icon--check' : ''"
                ></span>
              </div>

              <!-- Drag-Handle (wenn sortierbar) -->
              <div
                v-if="sortable && !searchQuery && !isMultiSelectModeActive"
                class="n-session-manager__drag-handle"
                aria-hidden="true"
              >
                <span class="n-session-manager__icon n-session-manager__icon--drag"></span>
              </div>

              <!-- Pin-Icon (wenn angeheftet) -->
              <div
                v-if="element.isPinned"
                class="n-session-manager__pin-indicator"
                aria-hidden="true"
              >
                <span class="n-session-manager__icon n-session-manager__icon--pin"></span>
              </div>

              <!-- Archiv-Icon (wenn archiviert) -->
              <div
                v-if="element.isArchived"
                class="n-session-manager__archive-indicator"
                aria-hidden="true"
              >
                <span class="n-session-manager__icon n-session-manager__icon--archive"></span>
              </div>

              <!-- Sitzungsinhalt -->
              <div class="n-session-manager__session-content">
                <!-- Sitzungstitel -->
                <div class="n-session-manager__session-title">
                  <span>{{ element.title }}</span>
                </div>

                <!-- Kategorie (falls vorhanden) -->
                <div
                  v-if="categoriesEnabled && element.category"
                  class="n-session-manager__category"
                >
                  <span
                    class="n-session-manager__category-indicator"
                    :style="{ backgroundColor: element.category.color }"
                  ></span>
                  <span class="n-session-manager__category-name">{{ element.category.name }}</span>
                </div>

                <!-- Tags (falls vorhanden) -->
                <div
                  v-if="tagsEnabled && element.tags && element.tags.length > 0"
                  class="n-session-manager__tags"
                >
                  <span
                    v-for="tag in element.tags.slice(0, 2)"
                    :key="tag.id"
                    class="n-session-manager__tag"
                    :style="{ backgroundColor: tag.color }"
                  >
                    {{ tag.name }}
                  </span>
                  <span
                    v-if="element.tags.length > 2"
                    class="n-session-manager__tag n-session-manager__tag--more"
                  >
                    +{{ element.tags.length - 2 }}
                  </span>
                </div>

                <!-- Preview (falls vorhanden) -->
                <div
                  v-if="element.preview"
                  class="n-session-manager__preview"
                >
                  {{ element.preview }}
                </div>
              </div>

              <!-- Sitzungsdatum -->
              <div class="n-session-manager__session-date">
                <span>{{ formatDate(element.updatedAt) }}</span>
              </div>

              <!-- Aktionsmenü -->
              <div class="n-session-manager__session-actions" v-if="!isMultiSelectModeActive">
                <button
                  class="n-session-manager__session-action-btn"
                  @click.stop="toggleSessionMenu(element.id)"
                  aria-label="Sitzungsaktionen"
                  :aria-expanded="openMenuId === element.id"
                  :aria-controls="openMenuId === element.id ? `menu-${element.id}` : undefined"
                >
                  <span class="n-session-manager__icon n-session-manager__icon--menu"></span>
                </button>

                <!-- Dropdown-Menü -->
                <div
                  v-if="openMenuId === element.id"
                  :id="`menu-${element.id}`"
                  class="n-session-manager__menu"
                  role="menu"
                >
                  <button
                    class="n-session-manager__menu-item"
                    @click.stop="renameSession(element.id, element.title)"
                    role="menuitem"
                  >
                    <span class="n-session-manager__icon n-session-manager__icon--edit"></span>
                    <span>Umbenennen</span>
                  </button>

                  <button
                    class="n-session-manager__menu-item"
                    @click.stop="togglePinSession(element.id, !element.isPinned)"
                    role="menuitem"
                  >
                    <span
                      class="n-session-manager__icon"
                      :class="element.isPinned ? 'n-session-manager__icon--unpin' : 'n-session-manager__icon--pin'"
                    ></span>
                    <span>{{ element.isPinned ? 'Loslösen' : 'Anheften' }}</span>
                  </button>

                  <!-- Kategorie-Menüpunkt -->
                  <button
                    v-if="categoriesEnabled"
                    class="n-session-manager__menu-item"
                    @click.stop="showCategoryDialog(element.id)"
                    role="menuitem"
                  >
                    <span class="n-session-manager__icon n-session-manager__icon--category"></span>
                    <span>Kategorisieren</span>
                  </button>

                  <!-- Tag-Menüpunkt -->
                  <button
                    v-if="tagsEnabled"
                    class="n-session-manager__menu-item"
                    @click.stop="showTagDialog(element.id)"
                    role="menuitem"
                  >
                    <span class="n-session-manager__icon n-session-manager__icon--tag"></span>
                    <span>Tags verwalten</span>
                  </button>

                  <!-- Archivieren-Menüpunkt -->
                  <button
                    class="n-session-manager__menu-item"
                    @click.stop="toggleArchiveSession(element.id, !element.isArchived)"
                    role="menuitem"
                  >
                    <span
                      class="n-session-manager__icon"
                      :class="element.isArchived ? 'n-session-manager__icon--unarchive' : 'n-session-manager__icon--archive'"
                    ></span>
                    <span>{{ element.isArchived ? 'Wiederherstellen' : 'Archivieren' }}</span>
                  </button>

                  <button
                    class="n-session-manager__menu-item n-session-manager__menu-item--danger"
                    @click.stop="confirmDeleteSession(element.id)"
                    role="menuitem"
                  >
                    <span class="n-session-manager__icon n-session-manager__icon--delete"></span>
                    <span>Löschen</span>
                  </button>
                </div>
              </div>
            </li>
          </template>
        </VueDraggable>
      </transition-group>
    </div>
    
    <!-- Rename Dialog -->
    <div 
      v-if="renameDialogVisible"
      class="n-session-manager__dialog-backdrop"
      @click="cancelRename"
      aria-hidden="true"
    ></div>
    
    <div 
      v-if="renameDialogVisible"
      class="n-session-manager__dialog"
      role="dialog"
      aria-labelledby="rename-dialog-title"
      aria-describedby="rename-dialog-description"
    >
      <h3 id="rename-dialog-title" class="n-session-manager__dialog-title">
        Sitzung umbenennen
      </h3>
      <p id="rename-dialog-description" class="n-session-manager__dialog-description">
        Geben Sie einen neuen Namen für die Sitzung ein.
      </p>
      
      <div class="n-session-manager__dialog-content">
        <input 
          ref="renameInput"
          v-model="newSessionTitle" 
          class="n-session-manager__dialog-input"
          type="text"
          @keydown.enter="confirmRename"
          @keydown.esc="cancelRename"
          aria-label="Neuer Sitzungsname"
        />
      </div>
      
      <div class="n-session-manager__dialog-actions">
        <button 
          class="n-session-manager__dialog-btn n-session-manager__dialog-btn--secondary"
          @click="cancelRename"
        >
          Abbrechen
        </button>
        <button 
          class="n-session-manager__dialog-btn n-session-manager__dialog-btn--primary"
          @click="confirmRename"
          :disabled="!newSessionTitle.trim()"
        >
          Speichern
        </button>
      </div>
    </div>
    
    <!-- Delete Confirmation Dialog -->
    <div
      v-if="deleteDialogVisible"
      class="n-session-manager__dialog-backdrop"
      @click="cancelDelete"
      aria-hidden="true"
    ></div>

    <div
      v-if="deleteDialogVisible"
      class="n-session-manager__dialog"
      role="dialog"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description"
    >
      <h3 id="delete-dialog-title" class="n-session-manager__dialog-title">
        Sitzung löschen
      </h3>
      <p id="delete-dialog-description" class="n-session-manager__dialog-description">
        Möchten Sie diese Sitzung wirklich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.
      </p>

      <div class="n-session-manager__dialog-actions">
        <button
          class="n-session-manager__dialog-btn n-session-manager__dialog-btn--secondary"
          @click="cancelDelete"
        >
          Abbrechen
        </button>
        <button
          class="n-session-manager__dialog-btn n-session-manager__dialog-btn--danger"
          @click="confirmDelete"
        >
          Löschen
        </button>
      </div>
    </div>

    <!-- Kategorie-Dialog -->
    <div
      v-if="categoryDialogVisible"
      class="n-session-manager__dialog-backdrop"
      @click="cancelCategoryDialog"
      aria-hidden="true"
    ></div>

    <div
      v-if="categoryDialogVisible"
      class="n-session-manager__dialog"
      role="dialog"
      aria-labelledby="category-dialog-title"
      aria-describedby="category-dialog-description"
    >
      <h3 id="category-dialog-title" class="n-session-manager__dialog-title">
        {{ multiSelectDialogVisible ? 'Sitzungen kategorisieren' : 'Sitzung kategorisieren' }}
      </h3>
      <p id="category-dialog-description" class="n-session-manager__dialog-description">
        {{ multiSelectDialogVisible ? 'Wählen Sie eine Kategorie für die ausgewählten Sitzungen.' : 'Wählen Sie eine Kategorie für diese Sitzung.' }}
      </p>

      <div class="n-session-manager__dialog-content">
        <div class="n-session-manager__category-grid">
          <button
            v-for="category in props.availableCategories"
            :key="category.id"
            class="n-session-manager__category-option"
            :class="{ 'n-session-manager__category-option--selected': selectedCategoryId === category.id }"
            @click="selectedCategoryId = category.id"
          >
            <span
              class="n-session-manager__category-color"
              :style="{ backgroundColor: category.color || '#e2e8f0' }"
            ></span>
            <span class="n-session-manager__category-label">{{ category.name }}</span>
          </button>
        </div>
      </div>

      <div class="n-session-manager__dialog-actions">
        <button
          class="n-session-manager__dialog-btn n-session-manager__dialog-btn--secondary"
          @click="cancelCategoryDialog"
        >
          Abbrechen
        </button>
        <button
          class="n-session-manager__dialog-btn n-session-manager__dialog-btn--primary"
          @click="multiSelectDialogVisible ? confirmMultiSelectAction('category') : applyCategoryToSession()"
          :disabled="!selectedCategoryId"
        >
          Anwenden
        </button>
      </div>
    </div>

    <!-- Tag-Dialog -->
    <div
      v-if="tagDialogVisible"
      class="n-session-manager__dialog-backdrop"
      @click="cancelTagDialog"
      aria-hidden="true"
    ></div>

    <div
      v-if="tagDialogVisible"
      class="n-session-manager__dialog"
      role="dialog"
      aria-labelledby="tag-dialog-title"
      aria-describedby="tag-dialog-description"
    >
      <h3 id="tag-dialog-title" class="n-session-manager__dialog-title">
        {{ multiSelectDialogVisible ? 'Tag zu Sitzungen hinzufügen' : 'Tags verwalten' }}
      </h3>
      <p id="tag-dialog-description" class="n-session-manager__dialog-description">
        {{ multiSelectDialogVisible ? 'Wählen Sie einen Tag für die ausgewählten Sitzungen.' : 'Wählen Sie Tags für diese Sitzung.' }}
      </p>

      <div class="n-session-manager__dialog-content">
        <div class="n-session-manager__tag-grid">
          <button
            v-for="tag in props.availableTags"
            :key="tag.id"
            class="n-session-manager__tag-option"
            :class="{ 'n-session-manager__tag-option--selected': selectedTagId === tag.id }"
            @click="selectedTagId = tag.id"
          >
            <span
              class="n-session-manager__tag-color"
              :style="{ backgroundColor: tag.color || '#e2e8f0' }"
            ></span>
            <span class="n-session-manager__tag-label">{{ tag.name }}</span>
          </button>
        </div>
      </div>

      <div class="n-session-manager__dialog-actions">
        <button
          class="n-session-manager__dialog-btn n-session-manager__dialog-btn--secondary"
          @click="cancelTagDialog"
        >
          Abbrechen
        </button>
        <button
          class="n-session-manager__dialog-btn n-session-manager__dialog-btn--primary"
          @click="multiSelectDialogVisible ? confirmMultiSelectAction('tag') : applyTagToSession()"
          :disabled="!selectedTagId"
        >
          Anwenden
        </button>
      </div>
    </div>

    <!-- Multi-Select-Löschdialog -->
    <div
      v-if="multiSelectDialogVisible"
      class="n-session-manager__dialog-backdrop"
      @click="cancelMultiSelectDialog"
      aria-hidden="true"
    ></div>

    <div
      v-if="multiSelectDialogVisible"
      class="n-session-manager__dialog"
      role="dialog"
      aria-labelledby="multi-delete-dialog-title"
      aria-describedby="multi-delete-dialog-description"
    >
      <h3 id="multi-delete-dialog-title" class="n-session-manager__dialog-title">
        Mehrere Sitzungen löschen
      </h3>
      <p id="multi-delete-dialog-description" class="n-session-manager__dialog-description">
        Möchten Sie {{ selectedCount }} Sitzung{{ selectedCount !== 1 ? 'en' : '' }} wirklich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.
      </p>

      <div class="n-session-manager__dialog-actions">
        <button
          class="n-session-manager__dialog-btn n-session-manager__dialog-btn--secondary"
          @click="cancelMultiSelectDialog"
        >
          Abbrechen
        </button>
        <button
          class="n-session-manager__dialog-btn n-session-manager__dialog-btn--danger"
          @click="confirmMultiSelectAction('delete')"
        >
          Alle löschen
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, onBeforeUnmount } from 'vue';
import { format, isToday, isYesterday, isThisWeek, isThisYear } from 'date-fns';
import { de } from 'date-fns/locale';
import { v4 as uuidv4 } from 'uuid';
import VueDraggable from 'vuedraggable';
import type { ChatSession } from '@/types/session';

// Eindeutige ID für ARIA-Zwecke
const headerId = `session-manager-heading-${uuidv4().slice(0, 8)}`;

// Props Definition
interface Props {
  /**
   * Liste der verfügbaren Sitzungen
   */
  sessions: ChatSession[];

  /**
   * ID der aktuell ausgewählten Sitzung
   */
  currentSessionId?: string | null;

  /**
   * Titel der Komponente
   */
  title?: string;

  /**
   * Ladezustand
   */
  loading?: boolean;

  /**
   * Ob die Suchfunktionalität aktiviert ist
   */
  searchEnabled?: boolean;

  /**
   * Ob Sitzungen per Drag & Drop neu angeordnet werden können
   */
  sortable?: boolean;

  /**
   * Ob die Seitenleiste eingeklappt ist
   */
  collapsed?: boolean;

  /**
   * Maximal anzuzeigende Sitzungen (0 = unbegrenzt)
   */
  maxSessions?: number;

  /**
   * Verfügbare Kategorien für Sitzungen
   */
  availableCategories?: SessionCategory[];

  /**
   * Verfügbare Tags für Sitzungen
   */
  availableTags?: SessionTag[];

  /**
   * Ob Kategorisierungsfunktionen aktiviert sind
   */
  categoriesEnabled?: boolean;

  /**
   * Ob Tag-Funktionen aktiviert sind
   */
  tagsEnabled?: boolean;

  /**
   * Ob Mehrfachauswahl aktiviert ist
   */
  multiSelectEnabled?: boolean;

  /**
   * Liste der aktuell ausgewählten Session-IDs (für Multi-Select)
   */
  selectedSessionIds?: string[];
}

// Default-Werte für Props
const props = withDefaults(defineProps<Props>(), {
  currentSessionId: null,
  title: 'Unterhaltungen',
  loading: false,
  searchEnabled: true,
  sortable: true,
  collapsed: false,
  maxSessions: 0,
  availableCategories: () => [],
  availableTags: () => [],
  categoriesEnabled: true,
  tagsEnabled: true,
  multiSelectEnabled: true,
  selectedSessionIds: () => []
});

// Emit Definition
const emit = defineEmits<{
  /**
   * Wird ausgelöst, wenn eine Sitzung ausgewählt wird
   */
  (e: 'session-selected', sessionId: string): void;

  /**
   * Wird ausgelöst, wenn eine neue Sitzung erstellt werden soll
   */
  (e: 'session-created', title?: string): void;

  /**
   * Wird ausgelöst, wenn eine Sitzung gelöscht werden soll
   */
  (e: 'session-deleted', sessionId: string): void;

  /**
   * Wird ausgelöst, wenn eine Sitzung umbenannt werden soll
   */
  (e: 'session-updated', payload: { id: string, title: string }): void;

  /**
   * Wird ausgelöst, wenn der Pin-Status einer Sitzung geändert werden soll
   */
  (e: 'session-pinned', payload: { id: string, isPinned: boolean }): void;

  /**
   * Wird ausgelöst, wenn die Reihenfolge der Sitzungen geändert wird
   */
  (e: 'sessions-reordered', sessionIds: string[]): void;

  /**
   * Wird ausgelöst, wenn die Seitenleiste ein-/ausgeklappt werden soll
   */
  (e: 'toggle-collapse'): void;

  /**
   * Wird ausgelöst, wenn eine Kategorie zu einer Sitzung hinzugefügt werden soll
   */
  (e: 'session-categorized', payload: { id: string, categoryId: string }): void;

  /**
   * Wird ausgelöst, wenn die Kategorie einer Sitzung entfernt werden soll
   */
  (e: 'session-uncategorized', sessionId: string): void;

  /**
   * Wird ausgelöst, wenn ein Tag zu einer Sitzung hinzugefügt werden soll
   */
  (e: 'session-tagged', payload: { id: string, tagId: string }): void;

  /**
   * Wird ausgelöst, wenn ein Tag von einer Sitzung entfernt werden soll
   */
  (e: 'session-untagged', payload: { id: string, tagId: string }): void;

  /**
   * Wird ausgelöst, wenn eine Sitzung zur Mehrfachauswahl hinzugefügt wird
   */
  (e: 'session-selected-multi', sessionId: string): void;

  /**
   * Wird ausgelöst, wenn der Mehrfachauswahlstatus einer Sitzung umgeschaltet wird
   */
  (e: 'session-toggle-select', sessionId: string): void;

  /**
   * Wird ausgelöst, wenn mehrere Sitzungen archiviert werden sollen
   */
  (e: 'sessions-archive-multi', sessionIds: string[]): void;

  /**
   * Wird ausgelöst, wenn mehrere Sitzungen gelöscht werden sollen
   */
  (e: 'sessions-delete-multi', sessionIds: string[]): void;

  /**
   * Wird ausgelöst, wenn mehreren Sitzungen ein Tag hinzugefügt werden soll
   */
  (e: 'sessions-tag-multi', payload: { ids: string[], tagId: string }): void;

  /**
   * Wird ausgelöst, wenn mehreren Sitzungen eine Kategorie zugewiesen werden soll
   */
  (e: 'sessions-categorize-multi', payload: { ids: string[], categoryId: string }): void;
}>();

// Lokale Zustände
const searchQuery = ref('');
const isSearchVisible = ref(false);
const openMenuId = ref<string | null>(null);
const draggedSessions = ref<ChatSession[]>([...props.sessions]);
const activeFilter = ref<string>('all'); // Filter: 'all', 'pinned', 'archived', 'category:id', 'tag:id'
const showCategoryMenu = ref(false);
const showTagMenu = ref(false);
const isMultiSelectActive = ref(false);
const selectedIds = ref<string[]>([...props.selectedSessionIds]);
const filterMenuOpen = ref(false);
const multiSelectMenuOpen = ref(false);

// Dialog-Zustände
const renameDialogVisible = ref(false);
const deleteDialogVisible = ref(false);
const categoryDialogVisible = ref(false);
const tagDialogVisible = ref(false);
const multiSelectDialogVisible = ref(false);
const sessionToRenameId = ref<string | null>(null);
const sessionToDeleteId = ref<string | null>(null);
const sessionToCategoryId = ref<string | null>(null);
const sessionToTagId = ref<string | null>(null);
const selectedCategoryId = ref<string | null>(null);
const selectedTagId = ref<string | null>(null);
const newSessionTitle = ref('');

// Element-Referenzen
const sessionListContainer = ref<HTMLElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);
const renameInput = ref<HTMLInputElement | null>(null);

// Computed Properties
const filteredSessions = computed(() => {
  // Start with all sessions
  let filtered = [...draggedSessions.value];

  // Apply active filter
  if (activeFilter.value !== 'all') {
    if (activeFilter.value === 'pinned') {
      filtered = filtered.filter(session => session.isPinned);
    } else if (activeFilter.value === 'archived') {
      filtered = filtered.filter(session => session.isArchived);
    } else if (activeFilter.value.startsWith('category:')) {
      const categoryId = activeFilter.value.replace('category:', '');
      filtered = filtered.filter(session => session.category?.id === categoryId);
    } else if (activeFilter.value.startsWith('tag:')) {
      const tagId = activeFilter.value.replace('tag:', '');
      filtered = filtered.filter(session =>
        session.tags?.some(tag => tag.id === tagId)
      );
    }
  }

  // Apply text search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(session =>
      session.title.toLowerCase().includes(query)
    );
  }

  return filtered;
});

const maxSessionsReached = computed(() => {
  return props.maxSessions > 0 && props.sessions.length >= props.maxSessions;
});

// Ob aktuell der Mehrfachauswahlmodus aktiv ist
const isMultiSelectModeActive = computed(() => {
  return isMultiSelectActive.value && props.multiSelectEnabled;
});

// Anzahl der ausgewählten Sitzungen
const selectedCount = computed(() => {
  return selectedIds.value.length;
});

// Ob eine Sitzung aktuell ausgewählt ist (für Multi-Select)
const isSelected = computed(() => (sessionId: string) => {
  return selectedIds.value.includes(sessionId);
});

// Gruppierte Kategorien für die Anzeige
const groupedCategories = computed(() => {
  // Group by first letter
  const groups: Record<string, SessionCategory[]> = {};

  props.availableCategories.forEach(category => {
    const firstLetter = category.name.charAt(0).toUpperCase();
    if (!groups[firstLetter]) {
      groups[firstLetter] = [];
    }
    groups[firstLetter].push(category);
  });

  // Sort each group alphabetically
  Object.keys(groups).forEach(key => {
    groups[key].sort((a, b) => a.name.localeCompare(b.name));
  });

  // Return sorted keys and groups
  return {
    keys: Object.keys(groups).sort(),
    groups
  };
});

// Gruppierte Tags für die Anzeige
const groupedTags = computed(() => {
  // Group by first letter
  const groups: Record<string, SessionTag[]> = {};

  props.availableTags.forEach(tag => {
    const firstLetter = tag.name.charAt(0).toUpperCase();
    if (!groups[firstLetter]) {
      groups[firstLetter] = [];
    }
    groups[firstLetter].push(tag);
  });

  // Sort each group alphabetically
  Object.keys(groups).forEach(key => {
    groups[key].sort((a, b) => a.name.localeCompare(b.name));
  });

  // Return sorted keys and groups
  return {
    keys: Object.keys(groups).sort(),
    groups
  };
});

// Drag & Drop Konfiguration
const dragOptions = computed(() => ({
  animation: 150,
  ghostClass: 'n-session-manager__session--ghost',
  chosenClass: 'n-session-manager__session--chosen',
  dragClass: 'n-session-manager__session--drag',
  group: 'sessions',
  disabled: !props.sortable || !!searchQuery.value
}));

// Methoden
function selectSession(sessionId: string): void {
  if (sessionId !== props.currentSessionId) {
    emit('session-selected', sessionId);
  }
}

function createNewSession(): void {
  if (props.loading || maxSessionsReached.value) return;
  
  emit('session-created', 'Neue Unterhaltung');
}

function renameSession(sessionId: string, currentTitle: string): void {
  sessionToRenameId.value = sessionId;
  newSessionTitle.value = currentTitle;
  renameDialogVisible.value = true;
  openMenuId.value = null;
  
  // Fokus auf Eingabefeld setzen
  nextTick(() => {
    if (renameInput.value) {
      renameInput.value.focus();
      renameInput.value.select();
    }
  });
}

function confirmRename(): void {
  if (sessionToRenameId.value && newSessionTitle.value.trim()) {
    emit('session-updated', {
      id: sessionToRenameId.value,
      title: newSessionTitle.value.trim()
    });
    
    renameDialogVisible.value = false;
    sessionToRenameId.value = null;
    newSessionTitle.value = '';
  }
}

function cancelRename(): void {
  renameDialogVisible.value = false;
  sessionToRenameId.value = null;
  newSessionTitle.value = '';
}

function confirmDeleteSession(sessionId: string): void {
  sessionToDeleteId.value = sessionId;
  deleteDialogVisible.value = true;
  openMenuId.value = null;
}

function confirmDelete(): void {
  if (sessionToDeleteId.value) {
    emit('session-deleted', sessionToDeleteId.value);
    deleteDialogVisible.value = false;
    sessionToDeleteId.value = null;
  }
}

function cancelDelete(): void {
  deleteDialogVisible.value = false;
  sessionToDeleteId.value = null;
}

function togglePinSession(sessionId: string, isPinned: boolean): void {
  emit('session-pinned', { id: sessionId, isPinned });
  openMenuId.value = null;
}

function toggleSessionMenu(sessionId: string): void {
  openMenuId.value = openMenuId.value === sessionId ? null : sessionId;
}

function toggleSearch(): void {
  isSearchVisible.value = !isSearchVisible.value;

  if (isSearchVisible.value) {
    // Fokus auf Suchfeld setzen
    nextTick(() => {
      if (searchInput.value) {
        searchInput.value.focus();
      }
    });
  } else {
    clearSearch();
  }
}

function clearSearch(): void {
  searchQuery.value = '';
}

// Filter-Funktionen
function toggleFilterMenu(): void {
  filterMenuOpen.value = !filterMenuOpen.value;

  // Andere Menüs schließen
  if (filterMenuOpen.value) {
    multiSelectMenuOpen.value = false;
    showCategoryMenu.value = false;
    showTagMenu.value = false;
  }
}

function applyFilter(filter: string): void {
  activeFilter.value = filter;
  filterMenuOpen.value = false;
}

function clearFilter(): void {
  activeFilter.value = 'all';
}

function getFilterLabel(): string {
  switch (activeFilter.value) {
    case 'all':
      return 'Alle Sitzungen';
    case 'pinned':
      return 'Angeheftete';
    case 'archived':
      return 'Archivierte';
    default:
      if (activeFilter.value.startsWith('category:')) {
        const categoryId = activeFilter.value.replace('category:', '');
        const category = props.availableCategories.find(c => c.id === categoryId);
        return category ? `Kategorie: ${category.name}` : 'Filtern';
      }
      if (activeFilter.value.startsWith('tag:')) {
        const tagId = activeFilter.value.replace('tag:', '');
        const tag = props.availableTags.find(t => t.id === tagId);
        return tag ? `Tag: ${tag.name}` : 'Filtern';
      }
      return 'Filtern';
  }
}

// Kategorie-Funktionen
function toggleCategoryMenu(): void {
  showCategoryMenu.value = !showCategoryMenu.value;

  if (showCategoryMenu.value) {
    showTagMenu.value = false;
    filterMenuOpen.value = false;
    multiSelectMenuOpen.value = false;
  }
}

function showCategoryDialog(sessionId: string): void {
  sessionToCategoryId.value = sessionId;
  categoryDialogVisible.value = true;
  openMenuId.value = null;
}

function applyCategoryToSession(): void {
  if (sessionToCategoryId.value && selectedCategoryId.value) {
    emit('session-categorized', {
      id: sessionToCategoryId.value,
      categoryId: selectedCategoryId.value
    });

    categoryDialogVisible.value = false;
    sessionToCategoryId.value = null;
    selectedCategoryId.value = null;
  }
}

function removeCategoryFromSession(sessionId: string): void {
  emit('session-uncategorized', sessionId);
  openMenuId.value = null;
}

function cancelCategoryDialog(): void {
  categoryDialogVisible.value = false;
  sessionToCategoryId.value = null;
  selectedCategoryId.value = null;
}

// Tag-Funktionen
function toggleTagMenu(): void {
  showTagMenu.value = !showTagMenu.value;

  if (showTagMenu.value) {
    showCategoryMenu.value = false;
    filterMenuOpen.value = false;
    multiSelectMenuOpen.value = false;
  }
}

function showTagDialog(sessionId: string): void {
  sessionToTagId.value = sessionId;
  tagDialogVisible.value = true;
  openMenuId.value = null;
}

function applyTagToSession(): void {
  if (sessionToTagId.value && selectedTagId.value) {
    emit('session-tagged', {
      id: sessionToTagId.value,
      tagId: selectedTagId.value
    });

    tagDialogVisible.value = false;
    sessionToTagId.value = null;
    selectedTagId.value = null;
  }
}

function removeTagFromSession(sessionId: string, tagId: string): void {
  emit('session-untagged', {
    id: sessionId,
    tagId
  });
}

function cancelTagDialog(): void {
  tagDialogVisible.value = false;
  sessionToTagId.value = null;
  selectedTagId.value = null;
}

// Mehrfachauswahl-Funktionen
function toggleMultiSelectMode(): void {
  if (!props.multiSelectEnabled) return;

  isMultiSelectActive.value = !isMultiSelectActive.value;

  // Auswahl zurücksetzen, wenn der Modus deaktiviert wird
  if (!isMultiSelectActive.value) {
    selectedIds.value = [];
  }
}

function toggleMultiSelectMenu(): void {
  if (selectedCount.value === 0) return;

  multiSelectMenuOpen.value = !multiSelectMenuOpen.value;

  if (multiSelectMenuOpen.value) {
    showCategoryMenu.value = false;
    showTagMenu.value = false;
    filterMenuOpen.value = false;
  }
}

function toggleSessionSelection(sessionId: string): void {
  const index = selectedIds.value.indexOf(sessionId);

  if (index === -1) {
    selectedIds.value.push(sessionId);
  } else {
    selectedIds.value.splice(index, 1);
  }

  emit('session-toggle-select', sessionId);
}

function clearSessionSelection(): void {
  selectedIds.value = [];
}

function showMultiSelectActionDialog(action: 'delete' | 'archive' | 'tag' | 'category'): void {
  if (selectedIds.value.length === 0) return;

  // Entsprechendes Dialog anzeigen
  switch (action) {
    case 'delete':
      multiSelectDialogVisible.value = true;
      break;
    case 'tag':
      tagDialogVisible.value = true;
      break;
    case 'category':
      categoryDialogVisible.value = true;
      break;
    case 'archive':
      // Direkt archivieren ohne Bestätigung
      emit('sessions-archive-multi', selectedIds.value);
      clearSessionSelection();
      isMultiSelectActive.value = false;
      break;
  }

  multiSelectMenuOpen.value = false;
}

function confirmMultiSelectAction(action: 'delete' | 'tag' | 'category'): void {
  if (selectedIds.value.length === 0) return;

  switch (action) {
    case 'delete':
      emit('sessions-delete-multi', selectedIds.value);
      multiSelectDialogVisible.value = false;
      break;
    case 'tag':
      if (selectedTagId.value) {
        emit('sessions-tag-multi', {
          ids: selectedIds.value,
          tagId: selectedTagId.value
        });
        tagDialogVisible.value = false;
        selectedTagId.value = null;
      }
      break;
    case 'category':
      if (selectedCategoryId.value) {
        emit('sessions-categorize-multi', {
          ids: selectedIds.value,
          categoryId: selectedCategoryId.value
        });
        categoryDialogVisible.value = false;
        selectedCategoryId.value = null;
      }
      break;
  }

  clearSessionSelection();
  isMultiSelectActive.value = false;
}

function cancelMultiSelectDialog(): void {
  multiSelectDialogVisible.value = false;
}

function onDragEnd(): void {
  if (searchQuery.value) return;
  
  const sessionIds = draggedSessions.value.map(session => session.id);
  emit('sessions-reordered', sessionIds);
}

function handleSessionKeydown(event: KeyboardEvent, sessionId: string): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    selectSession(sessionId);
  }
  
  // Tastaturnavigation durch die Sitzungsliste
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    
    const sessions = filteredSessions.value;
    const currentIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (currentIndex === -1) return;
    
    let nextIndex;
    if (event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % sessions.length;
    } else {
      nextIndex = (currentIndex - 1 + sessions.length) % sessions.length;
    }
    
    // Nächste Sitzung finden und fokussieren
    const nextSessionId = sessions[nextIndex].id;
    const nextElement = document.getElementById(`session-${nextSessionId}`);
    
    if (nextElement) {
      nextElement.focus();
    }
  }
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return format(date, 'HH:mm', { locale: de });
    } else if (isYesterday(date)) {
      return 'Gestern';
    } else if (isThisWeek(date)) {
      return format(date, 'EEEE', { locale: de });
    } else if (isThisYear(date)) {
      return format(date, 'd. MMM', { locale: de });
    } else {
      return format(date, 'd. MMM yyyy', { locale: de });
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

// Außerhalb-Klick-Handler für Menüs
function handleOutsideClick(event: MouseEvent): void {
  if (openMenuId.value) {
    const clickedElement = event.target as HTMLElement;
    const menuElement = document.getElementById(`menu-${openMenuId.value}`);
    
    if (menuElement && !menuElement.contains(clickedElement)) {
      // Prüfen, ob auf einen Menü-Button geklickt wurde
      const isMenuButton = clickedElement.classList.contains('n-session-manager__session-action-btn') ||
                           clickedElement.closest('.n-session-manager__session-action-btn');
      
      if (!isMenuButton) {
        openMenuId.value = null;
      }
    }
  }
}

// Zuhörer für Escape-Taste zum Schließen von Dialogen
function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    if (renameDialogVisible.value) {
      cancelRename();
    } else if (deleteDialogVisible.value) {
      cancelDelete();
    } else if (categoryDialogVisible.value) {
      cancelCategoryDialog();
    } else if (tagDialogVisible.value) {
      cancelTagDialog();
    } else if (multiSelectDialogVisible.value) {
      cancelMultiSelectDialog();
    } else if (openMenuId.value) {
      openMenuId.value = null;
    } else if (filterMenuOpen.value) {
      filterMenuOpen.value = false;
    } else if (multiSelectMenuOpen.value) {
      multiSelectMenuOpen.value = false;
    } else if (showCategoryMenu.value) {
      showCategoryMenu.value = false;
    } else if (showTagMenu.value) {
      showTagMenu.value = false;
    } else if (isSearchVisible.value) {
      toggleSearch();
    } else if (isMultiSelectModeActive.value) {
      isMultiSelectModeActive.value = false;
      selectedIds.value = [];
    }
  }
}

// Archivierung einer Session
function toggleArchiveSession(sessionId: string, archive: boolean): void {
  const sessionIndex = props.sessions.findIndex(s => s.id === sessionId);
  if (sessionIndex === -1) return;

  // Event auslösen
  emit('session-archived', {
    id: sessionId,
    isArchived: archive
  });

  openMenuId.value = null;
}

// Lifecycle Hooks
onMounted(() => {
  // Event-Listener hinzufügen
  document.addEventListener('click', handleOutsideClick);
  document.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  // Event-Listener entfernen
  document.removeEventListener('click', handleOutsideClick);
  document.removeEventListener('keydown', handleKeydown);
});

// Watches
watch(() => props.sessions, (newSessions) => {
  // Nur aktualisieren, wenn nicht im Drag-Modus
  if (!openMenuId.value) {
    draggedSessions.value = [...newSessions];
  }
}, { deep: true });

// Stellt sicher, dass die aktuelle Sitzung im sichtbaren Bereich ist
watch(() => props.currentSessionId, (newId) => {
  if (newId) {
    nextTick(() => {
      const currentElement = document.getElementById(`session-${newId}`);
      if (currentElement && sessionListContainer.value) {
        currentElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }
});

// Synchronisiert die ausgewählten IDs mit den props
watch(() => props.selectedSessionIds, (newIds) => {
  selectedIds.value = [...newIds];
}, { deep: true });

// Reset filter menu wenn sich der aktive Filter ändert
watch(() => activeFilter.value, () => {
  filterMenuOpen.value = false;
});
</script>

<style scoped>
.n-session-manager {
  display: flex;
  flex-direction: column;
  width: var(--nscale-sidebar-width, 300px);
  height: 100%;
  background-color: var(--nscale-surface-color, #f8fafc);
  border-right: 1px solid var(--nscale-border-color, #e2e8f0);
  transition: width 0.2s ease;
  position: relative;
  overflow: hidden;
}

/* Eingeklappter Zustand */
.n-session-manager--collapsed {
  width: var(--nscale-sidebar-collapsed-width, 60px);
}

/* Header-Bereich */
.n-session-manager__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--nscale-space-4, 1rem);
  border-bottom: 1px solid var(--nscale-border-color, #e2e8f0);
}

.n-session-manager__title {
  font-size: var(--nscale-font-size-lg, 1.125rem);
  font-weight: var(--nscale-font-weight-semibold, 600);
  color: var(--nscale-text, #1a202c);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.n-session-manager__header-actions {
  display: flex;
  gap: var(--nscale-space-1, 0.25rem);
}

.n-session-manager__action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background-color: transparent;
  border-radius: var(--nscale-border-radius-md, 0.5rem);
  cursor: pointer;
  color: var(--nscale-text-secondary, #64748b);
  transition: all 0.2s ease;
}

.n-session-manager__action-btn:hover {
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.05));
  color: var(--nscale-text, #1a202c);
}

.n-session-manager__action-btn--active {
  background-color: var(--nscale-primary-ultra-light, #f0faf5);
  color: var(--nscale-primary, #00a550);
}

/* Suchfeld */
.n-session-manager__search {
  padding: var(--nscale-space-2, 0.5rem) var(--nscale-space-4, 1rem);
  border-bottom: 1px solid var(--nscale-border-color, #e2e8f0);
}

.n-session-manager__search-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.n-session-manager__search-input {
  width: 100%;
  padding: var(--nscale-space-2, 0.5rem) var(--nscale-space-3, 0.75rem);
  padding-right: var(--nscale-space-8, 2rem);
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  border-radius: var(--nscale-border-radius-md, 0.5rem);
  font-size: var(--nscale-font-size-sm, 0.875rem);
  background-color: var(--nscale-input-bg, #ffffff);
  color: var(--nscale-text, #1a202c);
}

.n-session-manager__search-input:focus {
  outline: none;
  border-color: var(--nscale-primary, #00a550);
  box-shadow: 0 0 0 2px var(--nscale-primary-light, #e0f5ea);
}

.n-session-manager__search-clear {
  position: absolute;
  right: var(--nscale-space-2, 0.5rem);
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background-color: transparent;
  border-radius: 50%;
  cursor: pointer;
  color: var(--nscale-text-tertiary, #94a3b8);
}

.n-session-manager__search-clear:hover {
  color: var(--nscale-text-secondary, #64748b);
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.05));
}

/* Aktionsbereich */
.n-session-manager__actions {
  padding: var(--nscale-space-4, 1rem);
  border-bottom: 1px solid var(--nscale-border-color, #e2e8f0);
}

.n-session-manager__new-session-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: var(--nscale-space-2, 0.5rem) var(--nscale-space-4, 1rem);
  border: 1px solid var(--nscale-primary, #00a550);
  border-radius: var(--nscale-border-radius-md, 0.5rem);
  background-color: var(--nscale-primary, #00a550);
  color: white;
  font-size: var(--nscale-font-size-sm, 0.875rem);
  font-weight: var(--nscale-font-weight-medium, 500);
  cursor: pointer;
  transition: all 0.2s ease;
}

.n-session-manager__new-session-btn:hover:not(:disabled) {
  background-color: var(--nscale-primary-dark, #009046);
}

.n-session-manager__new-session-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.n-session-manager__btn-text {
  margin-left: var(--nscale-space-2, 0.5rem);
}

/* Sitzungsliste */
.n-session-manager__session-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--nscale-space-2, 0.5rem) 0;
}

.n-session-manager__list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.n-session-manager__session {
  display: flex;
  align-items: center;
  padding: var(--nscale-space-2, 0.5rem) var(--nscale-space-4, 1rem);
  border-radius: var(--nscale-border-radius-md, 0.5rem);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  z-index: 1;
}

.n-session-manager__session:hover {
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.05));
}

.n-session-manager__session:focus {
  outline: 2px solid var(--nscale-primary, #00a550);
  outline-offset: -2px;
}

.n-session-manager__session--active {
  background-color: var(--nscale-primary-ultra-light, #f0faf5);
}

.n-session-manager__session--pinned {
  border-left: 3px solid var(--nscale-primary, #00a550);
}

/* Drag & Drop Styling */
.n-session-manager__session--ghost {
  opacity: 0.5;
  background-color: var(--nscale-primary-ultra-light, #f0faf5);
}

.n-session-manager__session--chosen {
  background-color: var(--nscale-primary-light, #e0f5ea);
}

.n-session-manager__session--drag {
  background-color: var(--nscale-primary-ultra-light, #f0faf5);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.n-session-manager__drag-handle {
  margin-right: var(--nscale-space-2, 0.5rem);
  cursor: grab;
  opacity: 0.5;
  transition: opacity 0.2s ease;
}

.n-session-manager__session:hover .n-session-manager__drag-handle {
  opacity: 1;
}

.n-session-manager__pin-indicator {
  margin-right: var(--nscale-space-2, 0.5rem);
  color: var(--nscale-primary, #00a550);
}

.n-session-manager__session-title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--nscale-font-size-sm, 0.875rem);
  color: var(--nscale-text, #1a202c);
}

.n-session-manager__session-date {
  margin-left: var(--nscale-space-2, 0.5rem);
  font-size: var(--nscale-font-size-xs, 0.75rem);
  color: var(--nscale-text-tertiary, #94a3b8);
  white-space: nowrap;
}

.n-session-manager__session-actions {
  margin-left: var(--nscale-space-2, 0.5rem);
  position: relative;
}

.n-session-manager__session-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background-color: transparent;
  border-radius: 50%;
  cursor: pointer;
  color: var(--nscale-text-tertiary, #94a3b8);
  opacity: 0;
  transition: all 0.2s ease;
}

.n-session-manager__session:hover .n-session-manager__session-action-btn,
.n-session-manager__session:focus .n-session-manager__session-action-btn,
.n-session-manager__session--active .n-session-manager__session-action-btn {
  opacity: 1;
}

.n-session-manager__session-action-btn:hover {
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.1));
  color: var(--nscale-text-secondary, #64748b);
}

/* Sitzungsmenü */
.n-session-manager__menu {
  position: absolute;
  top: 100%;
  right: 0;
  width: 150px;
  background-color: white;
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  border-radius: var(--nscale-border-radius-md, 0.5rem);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
  padding: var(--nscale-space-1, 0.25rem);
}

.n-session-manager__menu-item {
  display: flex;
  align-items: center;
  padding: var(--nscale-space-2, 0.5rem);
  border: none;
  background-color: transparent;
  width: 100%;
  text-align: left;
  font-size: var(--nscale-font-size-sm, 0.875rem);
  color: var(--nscale-text, #1a202c);
  cursor: pointer;
  border-radius: var(--nscale-border-radius-sm, 0.25rem);
}

.n-session-manager__menu-item:hover {
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.05));
}

.n-session-manager__menu-item--danger {
  color: var(--nscale-error, #dc2626);
}

.n-session-manager__menu-item--danger:hover {
  background-color: var(--nscale-error-light, #fee2e2);
}

.n-session-manager__menu-item .n-session-manager__icon {
  margin-right: var(--nscale-space-2, 0.5rem);
}

/* Leere/Lademeldung */
.n-session-manager__empty,
.n-session-manager__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--nscale-space-6, 1.5rem);
  color: var(--nscale-text-secondary, #64748b);
  text-align: center;
  font-size: var(--nscale-font-size-sm, 0.875rem);
}

.n-session-manager__spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--nscale-border-color, #e2e8f0);
  border-top-color: var(--nscale-primary, #00a550);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: var(--nscale-space-4, 1rem);
}

/* Dialog */
.n-session-manager__dialog-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.n-session-manager__dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: white;
  border-radius: var(--nscale-border-radius-lg, 0.75rem);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  width: 400px;
  max-width: 90vw;
  z-index: 101;
  overflow: hidden;
  padding: var(--nscale-space-6, 1.5rem);
}

.n-session-manager__dialog-title {
  font-size: var(--nscale-font-size-lg, 1.125rem);
  font-weight: var(--nscale-font-weight-semibold, 600);
  color: var(--nscale-text, #1a202c);
  margin: 0 0 var(--nscale-space-2, 0.5rem);
}

.n-session-manager__dialog-description {
  font-size: var(--nscale-font-size-sm, 0.875rem);
  color: var(--nscale-text-secondary, #64748b);
  margin: 0 0 var(--nscale-space-4, 1rem);
}

.n-session-manager__dialog-content {
  margin-bottom: var(--nscale-space-6, 1.5rem);
}

.n-session-manager__dialog-input {
  width: 100%;
  padding: var(--nscale-space-3, 0.75rem);
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  border-radius: var(--nscale-border-radius-md, 0.5rem);
  font-size: var(--nscale-font-size-md, 1rem);
  color: var(--nscale-text, #1a202c);
}

.n-session-manager__dialog-input:focus {
  outline: none;
  border-color: var(--nscale-primary, #00a550);
  box-shadow: 0 0 0 2px var(--nscale-primary-light, #e0f5ea);
}

.n-session-manager__dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--nscale-space-3, 0.75rem);
}

.n-session-manager__dialog-btn {
  padding: var(--nscale-space-2, 0.5rem) var(--nscale-space-4, 1rem);
  border-radius: var(--nscale-border-radius-md, 0.5rem);
  font-size: var(--nscale-font-size-sm, 0.875rem);
  font-weight: var(--nscale-font-weight-medium, 500);
  cursor: pointer;
  transition: all 0.2s ease;
}

.n-session-manager__dialog-btn--secondary {
  background-color: transparent;
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  color: var(--nscale-text, #1a202c);
}

.n-session-manager__dialog-btn--secondary:hover {
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.05));
}

.n-session-manager__dialog-btn--primary {
  background-color: var(--nscale-primary, #00a550);
  color: white;
  border: 1px solid var(--nscale-primary, #00a550);
}

.n-session-manager__dialog-btn--primary:hover:not(:disabled) {
  background-color: var(--nscale-primary-dark, #009046);
}

.n-session-manager__dialog-btn--primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.n-session-manager__dialog-btn--danger {
  background-color: var(--nscale-error, #dc2626);
  color: white;
  border: 1px solid var(--nscale-error, #dc2626);
}

.n-session-manager__dialog-btn--danger:hover {
  background-color: var(--nscale-error-dark, #b91c1c);
}

/* Icons */
.n-session-manager__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  position: relative;
}

.n-session-manager__icon--plus::before,
.n-session-manager__icon--plus::after {
  content: '';
  position: absolute;
  background-color: currentColor;
}

.n-session-manager__icon--plus::before {
  width: 12px;
  height: 2px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.n-session-manager__icon--plus::after {
  width: 2px;
  height: 12px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.n-session-manager__icon--search::before {
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
  border: 2px solid currentColor;
  border-radius: 50%;
  top: 3px;
  left: 3px;
}

.n-session-manager__icon--search::after {
  content: '';
  position: absolute;
  width: 2px;
  height: 6px;
  background-color: currentColor;
  transform: rotate(45deg);
  bottom: 3px;
  right: 5px;
}

.n-session-manager__icon--clear::before,
.n-session-manager__icon--clear::after {
  content: '';
  position: absolute;
  width: 2px;
  height: 12px;
  background-color: currentColor;
  top: 50%;
  left: 50%;
}

.n-session-manager__icon--clear::before {
  transform: translate(-50%, -50%) rotate(45deg);
}

.n-session-manager__icon--clear::after {
  transform: translate(-50%, -50%) rotate(-45deg);
}

.n-session-manager__icon--collapse::before {
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
  border-left: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: translate(-2px, 0) rotate(45deg);
}

.n-session-manager__icon--expand::before {
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
  border-right: 2px solid currentColor;
  border-top: 2px solid currentColor;
  transform: translate(0, 0) rotate(45deg);
}

.n-session-manager__icon--drag::before {
  content: '';
  position: absolute;
  width: 10px;
  height: 2px;
  background-color: currentColor;
  box-shadow: 0 4px 0 currentColor, 0 8px 0 currentColor;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
}

.n-session-manager__icon--pin::before {
  content: '';
  position: absolute;
  width: 5px;
  height: 5px;
  border: 2px solid currentColor;
  border-radius: 50%;
  top: 2px;
  left: 50%;
  transform: translateX(-50%);
}

.n-session-manager__icon--pin::after {
  content: '';
  position: absolute;
  width: 2px;
  height: 10px;
  background-color: currentColor;
  top: 7px;
  left: 50%;
  transform: translateX(-50%);
}

.n-session-manager__icon--unpin::before {
  content: '';
  position: absolute;
  width: 5px;
  height: 5px;
  border: 2px solid currentColor;
  border-radius: 50%;
  top: 2px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
}

.n-session-manager__icon--unpin::after {
  content: '';
  position: absolute;
  width: 2px;
  height: 10px;
  background-color: currentColor;
  top: 7px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
}

.n-session-manager__icon--menu::before {
  content: '';
  position: absolute;
  width: 12px;
  height: 2px;
  background-color: currentColor;
  box-shadow: 0 4px 0 currentColor, 0 8px 0 currentColor;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
}

.n-session-manager__icon--edit::before {
  content: '';
  position: absolute;
  width: 12px;
  height: 2px;
  background-color: currentColor;
  transform: rotate(45deg);
  top: 14px;
  left: 6px;
}

.n-session-manager__icon--delete::before {
  content: '';
  position: absolute;
  width: 12px;
  height: 14px;
  border: 2px solid currentColor;
  border-top: none;
  border-radius: 0 0 2px 2px;
  top: 6px;
  left: 4px;
}

.n-session-manager__icon--delete::after {
  content: '';
  position: absolute;
  width: 8px;
  height: 2px;
  background-color: currentColor;
  top: 4px;
  left: 6px;
  box-shadow: -3px 0 0 currentColor, 3px 0 0 currentColor;
}

/* Transition-Animationen */
.session-list-enter-active,
.session-list-leave-active {
  transition: all 0.3s ease;
}

.session-list-enter-from,
.session-list-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Animationen */
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Eingeklappte Ansicht */
.n-session-manager--collapsed .n-session-manager__btn-text,
.n-session-manager--collapsed .n-session-manager__session-title,
.n-session-manager--collapsed .n-session-manager__session-date,
.n-session-manager--collapsed .n-session-manager__title,
.n-session-manager--collapsed .n-session-manager__search,
.n-session-manager--collapsed .n-session-manager__pin-indicator,
.n-session-manager--collapsed .n-session-manager__drag-handle,
.n-session-manager--collapsed .n-session-manager__session-actions {
  display: none;
}

.n-session-manager--collapsed .n-session-manager__new-session-btn {
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 50%;
  margin: 0 auto;
}

.n-session-manager--collapsed .n-session-manager__session {
  padding: var(--nscale-space-2, 0.5rem);
  justify-content: center;
}

/* Responsive Design (für kleinere Bildschirme) */
@media (max-width: 768px) {
  .n-session-manager {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--nscale-border-color, #e2e8f0);
  }
  
  .n-session-manager--collapsed {
    width: var(--nscale-sidebar-collapsed-width, 60px);
  }
}

/* Reduktion von Animationen für Benutzer, die das bevorzugen */
@media (prefers-reduced-motion: reduce) {
  .n-session-manager__spinner {
    animation: none;
  }
  
  .session-list-enter-active,
  .session-list-leave-active {
    transition: none;
  }
}
</style>