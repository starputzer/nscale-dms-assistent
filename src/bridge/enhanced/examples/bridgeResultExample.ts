/**
 * Beispiele für die Verwendung der typisierten Fehlerbehandlung in Bridge-Komponenten
 * 
 * Diese Datei zeigt praktische Beispiele, wie die BridgeResult<T, E>-Pattern
 * zur verbesserten Fehlerbehandlung in Bridge-Komponenten verwendet werden kann.
 */

import { 
  BridgeErrorCode,
  BridgeResult,
  executeBridgeOperation,
  failure,
  success,
  unwrapResult,
  withRecovery
} from '../bridgeErrorUtils';
import { createLogger } from '../logger/index';

// Komponenten-spezifischer Logger
const logger = createLogger('BridgeResultExample');

/**
 * Beispielklasse für eine Bridge-Komponente mit typisierten Fehlerresultaten
 */
export class TypedBridgeComponent {
  private componentName = 'TypedBridgeComponent';
  private isInitialized = false;
  private retryCount = 0;
  private maxRetries = 3;

  /**
   * Initialisiert die Komponente
   * Demonstriert Verwendung des BridgeResult-Patterns für asynchrone Operationen
   */
  public async initialize(): Promise<BridgeResult<boolean>> {
    return executeBridgeOperation(
      async () => {
        logger.info('Initialisiere TypedBridgeComponent...');
        
        // Simulierte asynchrone Initialisierung
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Beispiel für erfolgreiche Initialisierung
        this.isInitialized = true;
        return true;
      },
      {
        component: this.componentName,
        operationName: 'initialize',
        errorMessage: 'Initialisierung der Bridge-Komponente fehlgeschlagen',
        errorCode: BridgeErrorCode.INITIALIZATION_FAILED,
        recoverable: true
      }
    );
  }

  /**
   * Beispielhafte Operation, die Fehler behandelt und Wiederherstellung unterstützt
   * Demonstriert die Verwendung von withRecovery für Self-Healing-Mechanismen
   */
  public async performOperation(id: string): Promise<BridgeResult<string>> {
    // Prüfen, ob die Komponente initialisiert ist
    if (!this.isInitialized) {
      return failure(
        BridgeErrorCode.COMPONENT_INACTIVE,
        'Komponente ist nicht initialisiert',
        {
          component: this.componentName,
          operation: 'performOperation',
          recoverable: true
        }
      );
    }

    // Operation ausführen mit Fehlerbehandlung
    const result = await executeBridgeOperation<string>(
      () => {
        // Simulieren einer fehlschlagenden Operation für Demo-Zwecke
        if (id === 'error') {
          throw new Error('Simulierter Fehler bei performOperation');
        }
        
        return `Ergebnis für ${id}`;
      },
      {
        component: this.componentName,
        operationName: 'performOperation',
        errorCode: BridgeErrorCode.COMMUNICATION_ERROR,
        recoverable: true
      }
    );

    // Self-Healing-Mechanismus hinzufügen
    return withRecovery(result, async () => {
      // Implementiere Self-Healing für diese Operation
      logger.warn(`Versuche Wiederherstellung nach Fehler in performOperation (${++this.retryCount}/${this.maxRetries})`);
      
      if (this.retryCount >= this.maxRetries) {
        return failure<string>(
          BridgeErrorCode.RETRY_LIMIT_EXCEEDED,
          `Maximale Anzahl an Wiederholungsversuchen (${this.maxRetries}) überschritten`,
          {
            component: this.componentName,
            operation: 'performOperation',
            recoverable: false
          }
        );
      }
      
      // Simulierter Wiederherstellungsversuch (verwende einen Fallback-Wert)
      return success(`Fallback-Ergebnis für ${id} nach Wiederherstellung`);
    });
  }

  /**
   * Beispiel für die sichere Verwendung mehrerer BridgeResult-Operationen
   * Demonstriert Verkettung und Fehlerbehandlung
   */
  public async processData(data: unknown): Promise<BridgeResult<{ processed: boolean, id: string }>> {
    // Stufenweise Verarbeitung mit Fehlerbehandlung
    const validateResult = await this.validateData(data);
    if (!validateResult.success) {
      return failure(
        BridgeErrorCode.INVALID_STATE,
        'Datenvalidierung fehlgeschlagen',
        {
          component: this.componentName,
          operation: 'processData',
          details: validateResult.error,
          recoverable: false
        }
      );
    }

    const id = validateResult.data;

    // Nächste Operation nur ausführen, wenn vorherige erfolgreich war
    const operationResult = await this.performOperation(id);
    if (!operationResult.success) {
      return failure(
        BridgeErrorCode.COMMUNICATION_ERROR,
        `Verarbeitung für ID ${id} fehlgeschlagen`,
        {
          component: this.componentName,
          operation: 'processData',
          details: operationResult.error,
          recoverable: false
        }
      );
    }

    // Erfolgreiches Gesamtergebnis zurückgeben
    return success({
      processed: true,
      id
    });
  }

  /**
   * Hilfsmethode zur Datenvalidierung
   * Demonstriert einfache synchrone Operation mit BridgeResult
   */
  private async validateData(data: unknown): Promise<BridgeResult<string>> {
    return executeBridgeOperation(
      () => {
        if (!data) {
          throw new Error('Daten dürfen nicht leer sein');
        }
        
        if (typeof data === 'object' && data !== null) {
          if ('id' in data && typeof (data as any).id === 'string') {
            return (data as any).id;
          }
        }
        
        if (typeof data === 'string') {
          return data;
        }
        
        throw new Error('Ungültiges Datenformat: ID konnte nicht extrahiert werden');
      },
      {
        component: this.componentName,
        operationName: 'validateData',
        errorCode: BridgeErrorCode.INVALID_STATE,
        recoverable: false
      }
    );
  }

  /**
   * Beispiel für die Verwendung von unwrapResult
   * Diese Methode zeigt, wie man mit dem Result-Pattern arbeiten kann,
   * wenn man mit nicht-Result-kompatiblem Code interagieren muss
   */
  public async getProcessedDataForLegacyCode(data: unknown): Promise<string> {
    try {
      // Verarbeitung mit Result-Pattern
      const result = await this.processData(data);
      
      // Auspacken des Ergebnisses (wirft bei Fehler)
      const processedData = unwrapResult(result);
      
      // Formatieren für Legacy-Code
      return JSON.stringify(processedData);
    } catch (error) {
      // Fehlerbehandlung für Legacy-Code
      logger.error('Fehler bei der Datenverarbeitung für Legacy-Code:', error);
      throw error; // Für Legacy-Code neu werfen
    }
  }
}

/**
 * Beispiel für die Verwendung des TypedBridgeComponent in einer Anwendung
 */
export async function demonstrateBridgeResultPattern(): Promise<void> {
  const component = new TypedBridgeComponent();
  
  try {
    // Komponente initialisieren
    const initResult = await component.initialize();
    if (!initResult.success) {
      logger.error('Initialisierung fehlgeschlagen:', initResult.error.message);
      return;
    }
    
    // Erfolgreiche Operation
    const successResult = await component.performOperation('test123');
    if (successResult.success) {
      logger.info('Operation erfolgreich:', successResult.data);
    } else {
      logger.error('Operation fehlgeschlagen:', successResult.error.message);
    }
    
    // Fehlgeschlagene Operation mit Wiederherstellung
    const failureResult = await component.performOperation('error');
    if (failureResult.success) {
      logger.info('Operation nach Wiederherstellung erfolgreich:', failureResult.data);
    } else {
      logger.error('Operation trotz Wiederherstellung fehlgeschlagen:', failureResult.error.message);
    }
    
    // Komplexe Operation mit Verkettung
    const processResult = await component.processData({ id: 'complex-data' });
    if (processResult.success) {
      logger.info('Datenverarbeitung erfolgreich:', processResult.data);
    } else {
      logger.error('Datenverarbeitung fehlgeschlagen:', processResult.error.message);
    }
  } catch (error) {
    logger.error('Unerwarteter Fehler bei der Demonstration:', error);
  }
}