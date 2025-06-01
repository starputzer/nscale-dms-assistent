export default {
  en: {
    admin: {
      docConverter: {
        title: "Document Converter",
        description: "Configuration and monitoring of the document converter.",
        statistics: "Statistics",
        uploadDocuments: "Upload Documents",
        recentConversions: "Recent Conversions",
        conversionQueue: "Conversion Queue",
        settings: "Settings",

        // Statistics tab
        totalConversions: "Total Conversions",
        lastWeek: "Last 7 Days",
        successRate: "Success Rate",
        active: "Active",
        conversionsByType: "Conversions by Type",
        conversionTrend: "Conversion Trend",

        // Upload tab
        uploadNewDocuments: "Upload New Documents",
        uploadDescription:
          "Upload documents for conversion. Supported file formats include PDF, Word documents, Excel spreadsheets, PowerPoint presentations, and text files.",
        supportedFormatsHint: "Supported formats: {formats}",
        conversionOptions: "Conversion Options",
        outputFormat: "Output Format",
        preserveFormatting: "Preserve Formatting",
        extractTables: "Extract Tables",
        extractMetadata: "Extract Metadata",
        enableOCR: "Enable OCR",
        ocrLanguage: "OCR Language",
        startUpload: "Start Upload",
        uploading: "Uploading...",
        uploadProgress: "Upload Progress",
        startingUpload: "Starting upload process...",
        processingFile: "Processing {filename} ({current}/{total})",
        errorProcessingFile: "Error processing {filename}: {error}",
        allFilesProcessed: "All files have been processed successfully",
        uploadFailed: "Upload failed: {error}",

        // Recent conversions tab
        searchDocuments: "Search documents...",
        allStatuses: "All Statuses",
        completed: "Completed",
        failed: "Failed",
        processing: "Processing",
        filename: "Filename",
        format: "Format",
        size: "Size",
        convertedOn: "Converted On",
        status: "Status",
        actions: "Actions",
        noConversions: "No conversions found",
        confirmDelete: "Delete Document",
        confirmDeleteMessage:
          'Are you sure you want to delete "{filename}"? This action cannot be undone.',

        // Status labels
        status_completed: "Completed",
        status_failed: "Failed",
        status_processing: "Processing",
        status_pending: "Pending",
        status_waiting: "Waiting",

        // Queue tab
        activeJobs: "Active Jobs",
        waitingJobs: "Waiting Jobs",
        avgConversionTime: "Avg. Time",
        currentQueue: "Current Queue",
        position: "Position",
        user: "User",
        submittedAt: "Submitted At",
        progress: "Progress",
        queueEmpty: "Queue is empty",
        pauseQueue: "Pause Queue",
        resumeQueue: "Resume Queue",
        clearQueue: "Clear Queue",
        confirmClearQueue: "Clear Conversion Queue",
        confirmClearQueueMessage:
          "Are you sure you want to clear the entire conversion queue? This will cancel all pending conversions.",

        // Settings tab
        generalSettings: "General Settings",
        maxFileSize: "Max File Size",
        defaultOutputFormat: "Default Output Format",
        enableThumbnails: "Generate Thumbnails",
        ocrSettings: "OCR Settings",
        enhancedOCR: "Enhanced OCR (Slower)",
        storageSettings: "Storage Settings",
        storageLimit: "Storage Limit",
        retentionPeriod: "Retention Period",
        days: "days",

        // Error messages
        failedToLoadStatistics: "Failed to load statistics",
        failedToLoadConversions: "Failed to load conversions",
        failedToLoadQueue: "Failed to load conversion queue",
        failedToLoadSettings: "Failed to load settings",
      },
      common: {
        loading: "Loading...",
        error: "Error",
        retry: "Retry",
        save: "Save",
        reset: "Reset",
        cancel: "Cancel",
        confirm: "Confirm",
        page: "Page {current} of {total}",
        refresh: "Refresh",
        unknownError: "An unknown error occurred",
      },
    },
    components: {
      fileUpload: {
        dragAndDrop: "Drag and drop files here",
        orClickToSelect: "or click to select files",
        selectFiles: "Select Files",
        clearAll: "Clear All",
        addMore: "Add More",
        fileTooLarge: "File is too large: {size}. Maximum size is {maxSize}.",
        invalidFileType:
          "Invalid file type. Please select a supported file format.",
      },
    },
  },
  de: {
    admin: {
      docConverter: {
        title: "Dokumentenkonverter",
        description: "Konfiguration und Überwachung des Dokumentenkonverters.",
        statistics: "Statistiken",
        uploadDocuments: "Dokumente hochladen",
        recentConversions: "Letzte Konvertierungen",
        conversionQueue: "Konvertierungswarteschlange",
        settings: "Einstellungen",

        // Statistics tab
        totalConversions: "Gesamtkonvertierungen",
        lastWeek: "Letzte 7 Tage",
        successRate: "Erfolgsrate",
        active: "Aktiv",
        conversionsByType: "Konvertierungen nach Typ",
        conversionTrend: "Konvertierungstrend",

        // Upload tab
        uploadNewDocuments: "Neue Dokumente hochladen",
        uploadDescription:
          "Laden Sie Dokumente zur Konvertierung hoch. Unterstützte Dateiformate sind PDF, Word-Dokumente, Excel-Tabellen, PowerPoint-Präsentationen und Textdateien.",
        supportedFormatsHint: "Unterstützte Formate: {formats}",
        conversionOptions: "Konvertierungsoptionen",
        outputFormat: "Ausgabeformat",
        preserveFormatting: "Formatierung beibehalten",
        extractTables: "Tabellen extrahieren",
        extractMetadata: "Metadaten extrahieren",
        enableOCR: "OCR aktivieren",
        ocrLanguage: "OCR-Sprache",
        startUpload: "Upload starten",
        uploading: "Wird hochgeladen...",
        uploadProgress: "Upload-Fortschritt",
        startingUpload: "Starte Upload-Prozess...",
        processingFile: "Verarbeite {filename} ({current}/{total})",
        errorProcessingFile:
          "Fehler bei der Verarbeitung von {filename}: {error}",
        allFilesProcessed: "Alle Dateien wurden erfolgreich verarbeitet",
        uploadFailed: "Upload fehlgeschlagen: {error}",

        // Recent conversions tab
        searchDocuments: "Dokumente suchen...",
        allStatuses: "Alle Status",
        completed: "Abgeschlossen",
        failed: "Fehlgeschlagen",
        processing: "In Bearbeitung",
        filename: "Dateiname",
        format: "Format",
        size: "Größe",
        convertedOn: "Konvertiert am",
        status: "Status",
        actions: "Aktionen",
        noConversions: "Keine Konvertierungen gefunden",
        confirmDelete: "Dokument löschen",
        confirmDeleteMessage:
          'Sind Sie sicher, dass Sie "{filename}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.',

        // Status labels
        status_completed: "Abgeschlossen",
        status_failed: "Fehlgeschlagen",
        status_processing: "In Bearbeitung",
        status_pending: "Ausstehend",
        status_waiting: "Wartend",

        // Queue tab
        activeJobs: "Aktive Aufträge",
        waitingJobs: "Wartende Aufträge",
        avgConversionTime: "Durchschn. Zeit",
        currentQueue: "Aktuelle Warteschlange",
        position: "Position",
        user: "Benutzer",
        submittedAt: "Eingereicht am",
        progress: "Fortschritt",
        queueEmpty: "Warteschlange ist leer",
        pauseQueue: "Warteschlange pausieren",
        resumeQueue: "Warteschlange fortsetzen",
        clearQueue: "Warteschlange leeren",
        confirmClearQueue: "Konvertierungswarteschlange leeren",
        confirmClearQueueMessage:
          "Sind Sie sicher, dass Sie die gesamte Konvertierungswarteschlange leeren möchten? Dadurch werden alle ausstehenden Konvertierungen abgebrochen.",

        // Settings tab
        generalSettings: "Allgemeine Einstellungen",
        maxFileSize: "Maximale Dateigröße",
        defaultOutputFormat: "Standard-Ausgabeformat",
        enableThumbnails: "Vorschaubilder generieren",
        ocrSettings: "OCR-Einstellungen",
        enhancedOCR: "Erweitertes OCR (langsamer)",
        storageSettings: "Speichereinstellungen",
        storageLimit: "Speicherlimit",
        retentionPeriod: "Aufbewahrungsfrist",
        days: "Tage",

        // Error messages
        failedToLoadStatistics: "Fehler beim Laden der Statistiken",
        failedToLoadConversions: "Fehler beim Laden der Konvertierungen",
        failedToLoadQueue: "Fehler beim Laden der Konvertierungswarteschlange",
        failedToLoadSettings: "Fehler beim Laden der Einstellungen",
      },
      common: {
        loading: "Wird geladen...",
        error: "Fehler",
        retry: "Wiederholen",
        save: "Speichern",
        reset: "Zurücksetzen",
        cancel: "Abbrechen",
        confirm: "Bestätigen",
        page: "Seite {current} von {total}",
        refresh: "Aktualisieren",
        unknownError: "Ein unbekannter Fehler ist aufgetreten",
      },
    },
    components: {
      fileUpload: {
        dragAndDrop: "Dateien hierher ziehen",
        orClickToSelect: "oder klicken Sie, um Dateien auszuwählen",
        selectFiles: "Dateien auswählen",
        clearAll: "Alle löschen",
        addMore: "Weitere hinzufügen",
        fileTooLarge:
          "Datei ist zu groß: {size}. Maximale Größe ist {maxSize}.",
        invalidFileType:
          "Ungültiger Dateityp. Bitte wählen Sie ein unterstütztes Dateiformat.",
      },
    },
  },
};
