/**
 * Service Adapter Factory
 * 
 * Diese Factory erstellt Adapter, die bestehende Service-Implementierungen
 * in die neuen typisierten Service-Interfaces konvertieren.
 */

import { ApiServiceInterface, SessionServiceInterface, StreamingServiceInterface } from '@/utils/serviceTypes';
import { 
  NScaleApiServiceAdapter, 
  NScaleSessionServiceAdapter, 
  NScaleStreamingServiceAdapter 
} from './apiTypes';
import { apiService } from './ApiService';
import { sessionService } from './SessionService';
import { createStreamingConnection } from './StreamingService';

/**
 * Adapter-Factory für Service-Implementierungen
 */
export class ServiceAdapterFactory {
  /**
   * Erstellt einen typisierten API-Service-Adapter
   * @param originalService Originaler ApiService oder undefined für den Singleton
   * @returns Typisierter API-Service
   */
  public static createApiServiceAdapter(originalService: any = apiService): ApiServiceInterface {
    return new NScaleApiServiceAdapter(originalService);
  }
  
  /**
   * Erstellt einen typisierten Session-Service-Adapter
   * @param originalService Originaler SessionService oder undefined für den Singleton
   * @returns Typisierter Session-Service
   */
  public static createSessionServiceAdapter(originalService: any = sessionService): SessionServiceInterface {
    return new NScaleSessionServiceAdapter(originalService);
  }
  
  /**
   * Erstellt einen typisierten Streaming-Service-Adapter
   * @param streamingOptions Optionen für die Streaming-Verbindung
   * @returns Typisierter Streaming-Service
   */
  public static createStreamingServiceAdapter(streamingOptions: any): StreamingServiceInterface {
    const originalService = createStreamingConnection(streamingOptions);
    return new NScaleStreamingServiceAdapter(originalService);
  }
}

// Typisierte Singleton-Instanzen exportieren
export const typedApiService = ServiceAdapterFactory.createApiServiceAdapter();
export const typedSessionService = ServiceAdapterFactory.createSessionServiceAdapter();

export default ServiceAdapterFactory;