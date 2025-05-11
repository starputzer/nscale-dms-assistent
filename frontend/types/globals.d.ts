/**
 * globals.d.ts
 * Globale Typdeklarationen für die nscale DMS Assistent Anwendung
 */

// Deklarieren globaler Variablen und Module
declare const Vue: {
  createApp: any;
  ref: any;
  reactive: any;
  watch: any;
  computed: any;
  onMounted: any;
  nextTick: any;
};

declare const axios: {
  defaults: any;
  get: (url: string, config?: any) => Promise<any>;
  post: (url: string, data?: any, config?: any) => Promise<any>;
  put: (url: string, data?: any, config?: any) => Promise<any>;
  delete: (url: string, config?: any) => Promise<any>;
};

declare const marked: {
  parse: (text: string) => string;
};

// Window-Objekterweiterungen
interface Window {
  app: any;
  reloadCurrentSession: any;
  updateSessionTitle: any;
  updateAllSessionTitles: any;
  loadMotd: any;
  loadExplanation: any;
  useSimpleLanguage?: boolean;
  showSourcePopupHandler: (event: MouseEvent, sourceId: string) => void;
  sourceRefState: {
    showSourcePopup: boolean;
    sourcePopupContent: {
      title: string;
      text: string;
      file: string;
      sourceId: string;
    };
    sourcePopupPosition: {
      top: number;
      left: number;
    };
  };
  closeSourcePopup: () => void;
  hasSourceReferences: (text: string) => boolean;
}
