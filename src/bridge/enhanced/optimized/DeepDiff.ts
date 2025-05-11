/**
 * DeepDiff - Effizienter Algorithmus für präzise Zustandsvergleiche
 * 
 * Diese Komponente implementiert einen optimierten Deep-Diff-Algorithmus,
 * der effizient Änderungen zwischen zwei komplexen Objektstrukturen erkennt
 * und als strukturierte Änderungsoperationen zurückgibt.
 */

// Diff-Operation-Typen
export enum DiffOperationType {
  ADD = 'add',
  REMOVE = 'remove',
  REPLACE = 'replace',
  ARRAY_MOVE = 'array-move',
  ARRAY_SPLICE = 'array-splice',
}

// Diff-Operation-Interface
export interface DiffOperation {
  type: DiffOperationType;
  path: string[];
  value?: any;
  oldValue?: any;
  index?: number;
  removed?: any[];
  added?: any[];
  from?: number;
  to?: number;
}

/**
 * Berechnet einen Deep-Diff zwischen zwei Objekten
 * @param oldObj Das alte Objekt
 * @param newObj Das neue Objekt
 * @returns Array von Diff-Operationen
 */
export function deepDiff(oldObj: any, newObj: any): DiffOperation[] {
  // Fast-Path: Identität
  if (oldObj === newObj) {
    return [];
  }
  
  // Primitive Typen oder Arrays behandeln
  if (
    typeof oldObj !== 'object' ||
    typeof newObj !== 'object' ||
    oldObj === null ||
    newObj === null ||
    Array.isArray(oldObj) !== Array.isArray(newObj)
  ) {
    return [
      {
        type: DiffOperationType.REPLACE,
        path: [],
        oldValue: oldObj,
        value: newObj,
      },
    ];
  }
  
  // Beide sind Objekte vom gleichen Typ (Objekt oder Array)
  const operations: DiffOperation[] = [];
  
  if (Array.isArray(oldObj)) {
    // Array-spezifischer Diff-Algorithmus mit Optimierung für häufige Änderungen
    const arrayDiffs = diffArrays(oldObj, newObj);
    operations.push(...arrayDiffs);
  } else {
    // Object-Diff
    // Gelöschte oder geänderte Eigenschaften
    for (const key in oldObj) {
      if (!(key in newObj)) {
        // Eigenschaft wurde entfernt
        operations.push({
          type: DiffOperationType.REMOVE,
          path: [key],
          oldValue: oldObj[key],
        });
      } else if (oldObj[key] !== newObj[key]) {
        // Eigenschaft wurde möglicherweise geändert
        const nestedDiffs = deepDiff(oldObj[key], newObj[key]);
        
        // Pfade der verschachtelten Diffs aktualisieren
        operations.push(
          ...nestedDiffs.map((diff) => ({
            ...diff,
            path: [key, ...diff.path],
          }))
        );
      }
    }
    
    // Neue Eigenschaften
    for (const key in newObj) {
      if (!(key in oldObj)) {
        operations.push({
          type: DiffOperationType.ADD,
          path: [key],
          value: newObj[key],
        });
      }
    }
  }
  
  return operations;
}

/**
 * Array-spezifischer Diff-Algorithmus mit Optimierung für häufige Änderungen
 * @param oldArray Das alte Array
 * @param newArray Das neue Array
 * @returns Array von Diff-Operationen
 */
function diffArrays(oldArray: any[], newArray: any[]): DiffOperation[] {
  if (oldArray.length === 0 && newArray.length === 0) {
    return [];
  }
  
  if (oldArray.length === 0) {
    // Altes Array leer, neues Array hinzufügen
    return [
      {
        type: DiffOperationType.ARRAY_SPLICE,
        path: [],
        index: 0,
        removed: [],
        added: [...newArray],
      },
    ];
  }
  
  if (newArray.length === 0) {
    // Neues Array leer, altes Array entfernen
    return [
      {
        type: DiffOperationType.ARRAY_SPLICE,
        path: [],
        index: 0,
        removed: [...oldArray],
        added: [],
      },
    ];
  }
  
  // Optimierung für häufige Änderungsmuster in Arrays
  
  // 1. Element am Ende hinzugefügt (common in chats, logs, etc.)
  if (
    oldArray.length < newArray.length &&
    arraysEqualUpTo(oldArray, newArray, oldArray.length)
  ) {
    return [
      {
        type: DiffOperationType.ARRAY_SPLICE,
        path: [],
        index: oldArray.length,
        removed: [],
        added: newArray.slice(oldArray.length),
      },
    ];
  }
  
  // 2. Element am Anfang hinzugefügt
  if (
    oldArray.length < newArray.length &&
    arraysEqualWithOffset(oldArray, newArray, newArray.length - oldArray.length)
  ) {
    return [
      {
        type: DiffOperationType.ARRAY_SPLICE,
        path: [],
        index: 0,
        removed: [],
        added: newArray.slice(0, newArray.length - oldArray.length),
      },
    ];
  }
  
  // 3. Nur letztes Element geändert (common in streaming scenarios)
  if (
    oldArray.length === newArray.length &&
    arraysEqualUpTo(oldArray, newArray, oldArray.length - 1)
  ) {
    const lastOldItem = oldArray[oldArray.length - 1];
    const lastNewItem = newArray[newArray.length - 1];
    
    if (typeof lastOldItem === 'object' && typeof lastNewItem === 'object' &&
        lastOldItem !== null && lastNewItem !== null &&
        !Array.isArray(lastOldItem) && !Array.isArray(lastNewItem)) {
      // Detaillierteren Diff für das geänderte Element berechnen
      const nestedDiffs = deepDiff(lastOldItem, lastNewItem);
      
      // Wenn es spezifische Änderungen gibt, diese mit korrektem Pfad zurückgeben
      if (nestedDiffs.length > 0) {
        return nestedDiffs.map((diff) => ({
          ...diff,
          path: [oldArray.length - 1, ...diff.path],
        }));
      }
    }
    
    // Fallback zu einfachem Ersetzen des letzten Elements
    return [
      {
        type: DiffOperationType.REPLACE,
        path: [oldArray.length - 1],
        oldValue: lastOldItem,
        value: lastNewItem,
      },
    ];
  }
  
  // 4. Komplexerer LCS-basierter Diff für allgemeine Fälle
  return computeLCSBasedArrayDiff(oldArray, newArray);
}

/**
 * Überprüft, ob zwei Arrays bis zu einem bestimmten Index gleich sind
 */
function arraysEqualUpTo(arr1: any[], arr2: any[], length: number): boolean {
  for (let i = 0; i < length; i++) {
    if (i >= arr1.length || i >= arr2.length || !valueEquals(arr1[i], arr2[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Überprüft, ob zwei Arrays mit Offset gleich sind
 */
function arraysEqualWithOffset(arr1: any[], arr2: any[], offset: number): boolean {
  const minLength = Math.min(arr1.length, arr2.length - offset);
  for (let i = 0; i < minLength; i++) {
    if (!valueEquals(arr1[i], arr2[i + offset])) {
      return false;
    }
  }
  return true;
}

/**
 * Laxes Gleichheitsvergleich für Werte, die auch Objekte oder Arrays sein können
 */
function valueEquals(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }
  
  // ID-basierter Vergleich für Objekte mit IDs (z.B. in Chat-Nachrichten)
  if ('id' in a && 'id' in b && a.id === b.id) {
    return true;
  }
  
  // Weiterer Vergleich für Objekte könnte hier hinzugefügt werden
  
  return false;
}

/**
 * Berechnet einen Diff für Arrays basierend auf dem Longest Common Subsequence (LCS) Algorithmus
 * Optimiert für typische Änderungsmuster in UI-Anwendungen
 */
function computeLCSBasedArrayDiff(oldArray: any[], newArray: any[]): DiffOperation[] {
  // Longest Common Subsequence (LCS) Matrix berechnen
  const matrix = computeLCSMatrix(oldArray, newArray);
  
  // Diff-Operationen aus der Matrix ableiten
  const operations: DiffOperation[] = [];
  let i = oldArray.length;
  let j = newArray.length;
  
  const spliceOperations: { index: number; removed: any[]; added: any[] }[] = [];
  let currentSplice: { index: number; removed: any[]; added: any[] } | null = null;
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && valueEquals(oldArray[i - 1], newArray[j - 1])) {
      // Element ist in beiden Arrays gleich
      if (currentSplice) {
        // Aktuelle Splice-Operation beenden
        spliceOperations.push({
          index: i,
          removed: currentSplice.removed.reverse(),
          added: currentSplice.added.reverse(),
        });
        currentSplice = null;
      }
      i--;
      j--;
    } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
      // Element wurde hinzugefügt
      if (!currentSplice) {
        currentSplice = { index: i, removed: [], added: [] };
      }
      currentSplice.added.push(newArray[j - 1]);
      j--;
    } else if (i > 0 && (j === 0 || matrix[i][j - 1] < matrix[i - 1][j])) {
      // Element wurde entfernt
      if (!currentSplice) {
        currentSplice = { index: i, removed: [], added: [] };
      }
      currentSplice.removed.push(oldArray[i - 1]);
      i--;
    }
  }
  
  // Letzte aktive Splice-Operation hinzufügen
  if (currentSplice) {
    spliceOperations.push({
      index: i,
      removed: currentSplice.removed.reverse(),
      added: currentSplice.added.reverse(),
    });
  }
  
  // Splice-Operationen in Reverse-Reihenfolge in Diff-Operationen umwandeln
  for (const splice of spliceOperations.reverse()) {
    operations.push({
      type: DiffOperationType.ARRAY_SPLICE,
      path: [],
      index: splice.index,
      removed: splice.removed,
      added: splice.added,
    });
  }
  
  return operations;
}

/**
 * Berechnet die Longest Common Subsequence Matrix für zwei Arrays
 */
function computeLCSMatrix(oldArray: any[], newArray: any[]): number[][] {
  const matrix: number[][] = Array(oldArray.length + 1)
    .fill(null)
    .map(() => Array(newArray.length + 1).fill(0));
  
  for (let i = 1; i <= oldArray.length; i++) {
    for (let j = 1; j <= newArray.length; j++) {
      if (valueEquals(oldArray[i - 1], newArray[j - 1])) {
        matrix[i][j] = matrix[i - 1][j - 1] + 1;
      } else {
        matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
      }
    }
  }
  
  return matrix;
}

/**
 * Wendet eine Reihe von Diff-Operationen auf ein Objekt an
 * @param obj Das Objekt, auf das die Operationen angewendet werden sollen
 * @param operations Die anzuwendenden Diff-Operationen
 * @returns Das modifizierte Objekt
 */
export function applyDiff(obj: any, operations: DiffOperation[]): any {
  // Eine Kopie des Objekts erstellen, um Mutationen zu vermeiden
  let result = structuredClone(obj);
  
  for (const operation of operations) {
    switch (operation.type) {
      case DiffOperationType.ADD:
      case DiffOperationType.REPLACE:
        setNestedProperty(result, operation.path, operation.value);
        break;
      
      case DiffOperationType.REMOVE:
        deleteNestedProperty(result, operation.path);
        break;
      
      case DiffOperationType.ARRAY_SPLICE:
        const array = getNestedProperty(result, operation.path);
        if (Array.isArray(array) && typeof operation.index === 'number') {
          array.splice(
            operation.index,
            operation.removed ? operation.removed.length : 0,
            ...(operation.added || [])
          );
        }
        break;
      
      case DiffOperationType.ARRAY_MOVE:
        const moveArray = getNestedProperty(result, operation.path);
        if (Array.isArray(moveArray) && 
            typeof operation.from === 'number' && 
            typeof operation.to === 'number') {
          const [item] = moveArray.splice(operation.from, 1);
          moveArray.splice(operation.to, 0, item);
        }
        break;
    }
  }
  
  return result;
}

/**
 * Hilfsfunktion zum Setzen einer verschachtelten Eigenschaft in einem Objekt
 */
function setNestedProperty(obj: any, path: string[], value: any): void {
  if (path.length === 0) {
    // Kann nicht auf root-Ebene setzen
    return;
  }
  
  let current = obj;
  
  // Bis zum vorletzten Element navigieren
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    
    // Wenn der Pfad nicht existiert, erstellen
    if (current[key] === undefined) {
      // Prüfen, ob der nächste Teil ein Index ist (für Arrays)
      current[key] = isNaN(Number(path[i + 1])) ? {} : [];
    }
    
    current = current[key];
  }
  
  // Letztes Element setzen
  const lastKey = path[path.length - 1];
  current[lastKey] = value;
}

/**
 * Hilfsfunktion zum Löschen einer verschachtelten Eigenschaft in einem Objekt
 */
function deleteNestedProperty(obj: any, path: string[]): void {
  if (path.length === 0) {
    // Kann nicht auf root-Ebene löschen
    return;
  }
  
  let current = obj;
  
  // Bis zum vorletzten Element navigieren
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    
    if (current[key] === undefined) {
      // Pfad existiert nicht, nichts zu tun
      return;
    }
    
    current = current[key];
  }
  
  // Eigenschaft löschen
  const lastKey = path[path.length - 1];
  
  if (Array.isArray(current)) {
    if (!isNaN(Number(lastKey))) {
      current.splice(Number(lastKey), 1);
    }
  } else {
    delete current[lastKey];
  }
}

/**
 * Hilfsfunktion zum Abrufen einer verschachtelten Eigenschaft aus einem Objekt
 */
function getNestedProperty(obj: any, path: string[]): any {
  if (path.length === 0) {
    return obj;
  }
  
  let current = obj;
  
  for (const key of path) {
    if (current === undefined || current === null) {
      return undefined;
    }
    
    current = current[key];
  }
  
  return current;
}