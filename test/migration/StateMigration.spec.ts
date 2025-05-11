import { describe, it, expect, beforeEach } from 'vitest';
import { stateMigrator } from '../../src/migration/StateMigration';
import { StateVersion } from '../../src/migration/types';

describe('StateMigrator', () => {
  // Test-Daten
  const testStateKey = 'testState';
  const oldVersion: StateVersion = { major: 2, minor: 0, patch: 0 };
  const newVersion: StateVersion = { major: 3, minor: 0, patch: 0 };
  
  const legacyData = {
    user: {
      id: 1,
      name: 'Test User',
      settings: {
        theme: 'dark'
      }
    },
    messages: [
      { id: 1, text: 'Hello' },
      { id: 2, text: 'World' }
    ]
  };
  
  const vueData = {
    user: {
      id: 1,
      name: 'Test User',
      settings: {
        theme: 'dark',
        fontSize: 'medium' // Zusätzliches Feld im neuen Format
      }
    },
    messages: [
      { id: 1, text: 'Hello', status: 'sent' }, // Zusätzliches Feld im neuen Format
      { id: 2, text: 'World', status: 'sent' }
    ]
  };
  
  beforeEach(() => {
    // Vorhandene Strategien entfernen und neue Teststrategien registrieren
    
    // Forward-Migration: Wandelt Legacy-Daten in Vue-Format um
    const migrateForward = (data: any) => {
      const result = JSON.parse(JSON.stringify(data));
      
      // User-Einstellungen erweitern
      if (result.user?.settings) {
        result.user.settings.fontSize = 'medium';
      }
      
      // Nachrichten erweitern
      if (result.messages) {
        result.messages = result.messages.map((msg: any) => ({
          ...msg,
          status: 'sent'
        }));
      }
      
      return result;
    };
    
    // Backward-Migration: Wandelt Vue-Daten in Legacy-Format um
    const migrateBackward = (data: any) => {
      const result = JSON.parse(JSON.stringify(data));
      
      // User-Einstellungen reduzieren
      if (result.user?.settings) {
        delete result.user.settings.fontSize;
      }
      
      // Nachrichten reduzieren
      if (result.messages) {
        result.messages = result.messages.map((msg: any) => {
          const newMsg = { ...msg };
          delete newMsg.status;
          return newMsg;
        });
      }
      
      return result;
    };
    
    // Validierung
    const validateMigration = (data: any) => {
      // Prüfen, ob Daten gültig sind (vereinfacht)
      return data && data.user && data.messages;
    };
    
    // Strategie registrieren
    stateMigrator.registerMigrationStrategy(
      testStateKey,
      oldVersion,
      newVersion,
      migrateForward,
      migrateBackward,
      validateMigration
    );
  });
  
  it('should migrate data from legacy to Vue format', () => {
    // Act
    const result = stateMigrator.migrateForward(testStateKey, legacyData);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(vueData);
  });
  
  it('should migrate data from Vue to legacy format', () => {
    // Act
    const result = stateMigrator.migrateBackward(testStateKey, vueData);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(legacyData);
  });
  
  it('should handle unknown state keys', () => {
    // Act
    const result = stateMigrator.migrateForward('unknownState', legacyData);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.errors).toContain('Keine Migrationsstrategie gefunden');
  });
  
  it('should repair inconsistent state', () => {
    // Arrange
    const inconsistentData = {
      user: {
        id: 1,
        name: 'Test User'
        // settings fehlt
      },
      messages: [
        { id: 1, text: 'Hello' },
        { id: 2, text: 'World' }
      ]
    };
    
    // Act
    const result = stateMigrator.repairState(testStateKey, inconsistentData, oldVersion);
    
    // Assert: Prüfen, ob die Reparatur erfolgreich war (vereinfacht)
    expect(result.success).toBe(true);
    expect(result.data.user).toHaveProperty('settings');
  });
  
  it('should list all registered strategies', () => {
    // Act
    const strategies = stateMigrator.listAllStrategies();
    
    // Assert
    expect(strategies).toHaveProperty(testStateKey);
    expect(strategies[testStateKey]).toHaveLength(1);
    expect(strategies[testStateKey][0]).toEqual({
      fromVersion: oldVersion,
      toVersion: newVersion
    });
  });
});