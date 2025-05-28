/**
 * EntityStore - Spezialisierter Store für Entitätensammlungen
 *
 * Diese Datei definiert einen generischen Store für Collections von Datenentitäten
 * mit standardisierten CRUD-Operationen. Ideal für die Verwaltung strukturierter
 * Datensätze, die ID-basierte Zugriffsmuster erfordern.
 */

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { v4 as uuidv4 } from "uuid";
import type { DeepPartial } from "@/types/utilities";
import type { AppError, ErrorSeverity } from "@/types/errors";
import {
  createBaseStore,
  BaseStoreOptions,
  BaseStoreReturn,
} from "./BaseStore";

/**
 * Basis-Interface für alle Entitäten mit ID
 */
export interface Entity {
  id: string;
  [key: string]: any;
}

/**
 * Optionen für EntityStore-Konfiguration
 */
export interface EntityStoreOptions<T extends Entity>
  extends BaseStoreOptions<EntityStoreState<T>> {
  /**
   * Optionales Validierungsschema für Entitäten
   */
  validationSchema?: (entity: DeepPartial<T>) => boolean | string;

  /**
   * Optimistische Aktualisierungen aktivieren (UI-Updates vor Server-Bestätigung)
   */
  optimisticUpdates?: boolean;

  /**
   * Eindeutige ID-Generierungsfunktion (Standard: UUID v4)
   */
  idGenerator?: () => string;

  /**
   * Standard-Sortierung der Entitäten
   */
  sorting?: {
    field: keyof T | ((entity: T) => any);
    order: "asc" | "desc";
  };

  /**
   * Maximale Anzahl Entitäten für automatisches Caching
   */
  maxCachedEntities?: number;

  /**
   * Cache-Lebensdauer in Millisekunden
   */
  cacheTtl?: number;
}

/**
 * Zustand für EntityStore mit typisierten Entitäten
 */
export interface EntityStoreState<T extends Entity> {
  /**
   * Map von ID zu Entität für schnellen Zugriff
   */
  entities: Map<string, T>;

  /**
   * Zeitstempel der letzten Aktualisierung jeder Entität
   */
  lastUpdated: Map<string, number>;

  /**
   * Aktiv ausgewählte Entitäts-IDs
   */
  selectedIds: Set<string>;

  /**
   * Letzter Zeitpunkt der Synchronisation mit dem Server
   */
  lastSyncTime: number;

  /**
   * Synchronisierungsstatus
   */
  syncStatus: "idle" | "syncing" | "error" | "success";

  /**
   * Fehlerdetails zur letzten Synchronisation
   */
  syncError: string | null;

  /**
   * Aktuell bearbeitete Entität (für Forms)
   */
  currentEntityId: string | null;

  /**
   * Cache von Filterergebnissen
   */
  filteredEntityCache?: {
    [filterKey: string]: {
      ids: string[];
      timestamp: number;
    };
  };

  /**
   * Benutzerdefinierte Metadaten
   */
  metadata: Record<string, any>;
}

/**
 * Generischer Entity-Store mit typisierten CRUD-Operationen
 *
 * Bietet erweiterte Funktionen für Collections mit:
 * - Einfachem Hinzufügen, Aktualisieren, Löschen von Entitäten
 * - Filterung und Sortierung
 * - Auswahl-Management für Massen-Operationen
 * - Cachingmechanismen für optimale Performance
 * - Optimistische Aktualisierungen mit Rollback
 */
export function createEntityStore<T extends Entity>(
  options: EntityStoreOptions<T>,
) {
  // Basisstore erstellen mit zugeordnetem Zustandstyp
  const baseStore = createBaseStore<EntityStoreState<T>>({
    ...options,
    initialState: {
      entities: new Map<string, T>(),
      lastUpdated: new Map<string, number>(),
      selectedIds: new Set<string>(),
      lastSyncTime: 0,
      syncStatus: "idle",
      syncError: null,
      currentEntityId: null,
      metadata: {},
      ...options.initialState,
    },
  });

  return defineStore(`${options.name}-entity`, () => {
    // Basis-Store-Funktionalität initialisieren
    const base = baseStore();

    // ID-Generator funktion
    const generateId = options.idGenerator || (() => uuidv4());

    // Entities als reactive Referenz aus dem Basiszustand
    const entities = computed(() => base.state.entities);
    const selectedIds = computed(() => base.state.selectedIds);
    const currentEntityId = computed(() => base.state.currentEntityId);

    // Abgeleitete Eigenschaften
    /**
     * Alle Entitäten als Array
     */
    const allEntities = computed((): T[] => {
      return Array.from(entities.value.values());
    });

    /**
     * Sortierte Entitäten basierend auf Sortieroptionen
     */
    const sortedEntities = computed((): T[] => {
      const items = Array.from(entities.value.values());

      if (!options.sorting) return items;

      return items.sort((a, b) => {
        const fieldGetter =
          typeof options.sorting!.field === "function"
            ? options.sorting!.field
            : (entity: T) => entity[options.sorting!.field as keyof T];

        const aValue = fieldGetter(a);
        const bValue = fieldGetter(b);

        const compareResult = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;

        return options.sorting!.order === "asc"
          ? compareResult
          : -compareResult;
      });
    });

    /**
     * Aktuell ausgewählte Entitäten als Array
     */
    const selectedEntities = computed((): T[] => {
      return Array.from(selectedIds.value)
        .map((id) => entities.value.get(id))
        .filter(Boolean) as T[];
    });

    /**
     * Aktuell ausgewählte Entität (für Formulare)
     */
    const currentEntity = computed((): T | null => {
      return currentEntityId.value
        ? entities.value.get(currentEntityId.value) || null
        : null;
    });

    /**
     * Gibt an, ob Entitäten geladen wurden
     */
    const hasEntities = computed((): boolean => {
      return entities.value.size > 0;
    });

    /**
     * Anzahl der Entitäten
     */
    const count = computed((): number => {
      return entities.value.size;
    });

    /**
     * Entität nach ID abrufen
     */
    function getById(id: string): T | undefined {
      return entities.value.get(id);
    }

    /**
     * Entitäten nach IDs abrufen
     */
    function getByIds(ids: string[]): T[] {
      return ids.map((id) => entities.value.get(id)).filter(Boolean) as T[];
    }

    /**
     * Entitäten nach einem Prädikat filtern
     */
    function filter(predicate: (entity: T) => boolean): T[] {
      return Array.from(entities.value.values()).filter(predicate);
    }

    /**
     * Entität zum Store hinzufügen
     */
    function add(entity: Omit<T, "id"> & { id?: string }): T {
      // ID generieren, falls keine vorhanden
      const id = entity.id || generateId();
      const now = Date.now();

      const newEntity = { ...entity, id } as T;

      // Optional validieren, falls Schema vorhanden
      if (options.validationSchema) {
        const validationResult = options.validationSchema(newEntity);
        if (validationResult !== true) {
          const errorMsg =
            typeof validationResult === "string"
              ? validationResult
              : "Validierungsfehler";

          base.setError(`Ungültige Entität: ${errorMsg}`);
          throw new Error(`Ungültige Entität: ${errorMsg}`);
        }
      }

      // Zur Map hinzufügen
      entities.value.set(id, newEntity);
      base.state.lastUpdated.set(id, now);
      base.lastUpdated.value = now;

      return newEntity;
    }

    /**
     * Mehrere Entitäten auf einmal hinzufügen
     */
    function addMany(newEntities: Array<Omit<T, "id"> & { id?: string }>): T[] {
      const added: T[] = [];

      for (const entity of newEntities) {
        try {
          const newEntity = add(entity);
          added.push(newEntity);
        } catch (err) {
          console.error(`Fehler beim Hinzufügen einer Entität:`, err);
        }
      }

      return added;
    }

    /**
     * Entität aktualisieren
     */
    function update(id: string, changes: DeepPartial<T>): T | null {
      const entity = entities.value.get(id);

      if (!entity) {
        base.setError(`Entität mit ID ${id} nicht gefunden`);
        return null;
      }

      const now = Date.now();
      const updatedEntity = { ...entity, ...changes } as T;

      // Optional validieren, falls Schema vorhanden
      if (options.validationSchema) {
        const validationResult = options.validationSchema(updatedEntity);
        if (validationResult !== true) {
          const errorMsg =
            typeof validationResult === "string"
              ? validationResult
              : "Validierungsfehler";

          base.setError(`Ungültige Entität: ${errorMsg}`);
          throw new Error(`Ungültige Entität: ${errorMsg}`);
        }
      }

      // In der Map aktualisieren
      entities.value.set(id, updatedEntity);
      base.state.lastUpdated.set(id, now);
      base.lastUpdated.value = now;

      return updatedEntity;
    }

    /**
     * Mehrere Entitäten auf einmal aktualisieren
     */
    function updateMany(changes: Record<string, DeepPartial<T>>): T[] {
      const updated: T[] = [];

      for (const [id, entityChanges] of Object.entries(changes)) {
        try {
          const updatedEntity = update(id, entityChanges);
          if (updatedEntity) {
            updated.push(updatedEntity);
          }
        } catch (err) {
          console.error(`Fehler beim Aktualisieren einer Entität:`, err);
        }
      }

      return updated;
    }

    /**
     * Entität nach ID entfernen
     */
    function remove(id: string): boolean {
      const entity = entities.value.get(id);

      if (!entity) {
        base.setError(`Entität mit ID ${id} nicht gefunden`);
        return false;
      }

      // Aus Maps entfernen
      entities.value.delete(id);
      base.state.lastUpdated.delete(id);

      // Aus Auswahl entfernen
      if (selectedIds.value.has(id)) {
        selectedIds.value.delete(id);
      }

      // Aktuelle Entität zurücksetzen, falls diese gelöscht wurde
      if (currentEntityId.value === id) {
        base.state.currentEntityId = null;
      }

      base.lastUpdated.value = Date.now();

      return true;
    }

    /**
     * Mehrere Entitäten nach IDs entfernen
     */
    function removeMany(ids: string[]): string[] {
      const removed: string[] = [];

      for (const id of ids) {
        if (remove(id)) {
          removed.push(id);
        }
      }

      return removed;
    }

    /**
     * Alle Entitäten entfernen
     */
    function clear(): void {
      entities.value.clear();
      base.state.lastUpdated.clear();
      selectedIds.value.clear();
      base.state.currentEntityId = null;
      base.lastUpdated.value = Date.now();
    }

    /**
     * Entität als aktuell auswählen (für Formulare)
     */
    function setCurrent(id: string | null): void {
      base.state.currentEntityId = id;
    }

    /**
     * Entität zur Auswahl hinzufügen
     */
    function select(id: string): void {
      if (entities.value.has(id)) {
        selectedIds.value.add(id);
      }
    }

    /**
     * Entität aus der Auswahl entfernen
     */
    function deselect(id: string): void {
      selectedIds.value.delete(id);
    }

    /**
     * Auswahl umschalten (toggle)
     */
    function toggleSelection(id: string): void {
      if (selectedIds.value.has(id)) {
        selectedIds.value.delete(id);
      } else if (entities.value.has(id)) {
        selectedIds.value.add(id);
      }
    }

    /**
     * Alle Entitäten auswählen
     */
    function selectAll(): void {
      entities.value.forEach((_, id) => {
        selectedIds.value.add(id);
      });
    }

    /**
     * Auswahl aufheben
     */
    function clearSelection(): void {
      selectedIds.value.clear();
    }

    /**
     * Entitäten aus einem Backend neu laden
     * (Sollte in abgeleiteten Stores implementiert werden)
     */
    async function loadEntities(): Promise<void> {
      base.setLoading(true);
      base.state.syncStatus = "syncing";

      try {
        // In einem konkreten Store würde hier eine API-Anfrage erfolgen
        base.state.syncStatus = "success";
        base.state.syncError = null;
        base.state.lastSyncTime = Date.now();
      } catch (err) {
        base.setError(err as Error);
        base.state.syncStatus = "error";
        base.state.syncError = (err as Error).message;
      } finally {
        base.setLoading(false);
      }
    }

    /**
     * Lokalen Zustand mit dem Backend synchronisieren
     * (Sollte in abgeleiteten Stores implementiert werden)
     */
    async function synchronize(): Promise<void> {
      base.setLoading(true);
      base.state.syncStatus = "syncing";

      try {
        // In einem konkreten Store würde hier eine Synchronisation erfolgen
        base.state.syncStatus = "success";
        base.state.syncError = null;
        base.state.lastSyncTime = Date.now();
      } catch (err) {
        base.setError(err as Error);
        base.state.syncStatus = "error";
        base.state.syncError = (err as Error).message;
      } finally {
        base.setLoading(false);
      }
    }

    // Alle Funktionen aus Basis-Store und diesem Store zusammenführen
    return {
      ...base,

      // Entitäten-Collections
      entities,
      selectedIds,
      currentEntityId,

      // Abgeleitete Eigenschaften
      allEntities,
      sortedEntities,
      selectedEntities,
      currentEntity,
      hasEntities,
      count,

      // Abfragemethoden
      getById,
      getByIds,
      filter,

      // CRUD-Operationen
      add,
      addMany,
      update,
      updateMany,
      remove,
      removeMany,
      clear,

      // Auswahl-Management
      setCurrent,
      select,
      deselect,
      toggleSelection,
      selectAll,
      clearSelection,

      // Datensynchronisation
      loadEntities,
      synchronize,
    };
  });
}

/**
 * Rückgabetyp eines EntityStore mit typisierten Entitäten
 */
export type EntityStoreReturn<T extends Entity> = BaseStoreReturn<
  EntityStoreState<T>
> & {
  // Entitäten-Collections
  entities: Map<string, T>;
  selectedIds: Set<string>;
  currentEntityId: string | null;

  // Abgeleitete Eigenschaften
  allEntities: T[];
  sortedEntities: T[];
  selectedEntities: T[];
  currentEntity: T | null;
  hasEntities: boolean;
  count: number;

  // Abfragemethoden
  getById: (id: string) => T | undefined;
  getByIds: (ids: string[]) => T[];
  filter: (predicate: (entity: T) => boolean) => T[];

  // CRUD-Operationen
  add: (entity: Omit<T, "id"> & { id?: string }) => T;
  addMany: (entities: Array<Omit<T, "id"> & { id?: string }>) => T[];
  update: (id: string, changes: DeepPartial<T>) => T | null;
  updateMany: (changes: Record<string, DeepPartial<T>>) => T[];
  remove: (id: string) => boolean;
  removeMany: (ids: string[]) => string[];
  clear: () => void;

  // Auswahl-Management
  setCurrent: (id: string | null) => void;
  select: (id: string) => void;
  deselect: (id: string) => void;
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // Datensynchronisation
  loadEntities: () => Promise<void>;
  synchronize: () => Promise<void>;
};
