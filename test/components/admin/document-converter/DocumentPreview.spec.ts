import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import DocumentPreview from "@/src/components/admin/document-converter/DocumentPreview.vue";

// Mock des Dokumentenkonverter-Stores
vi.mock("@/stores/documentConverter", () => ({
  useDocumentConverterStore: () => ({
    getDocumentContent: vi.fn().mockResolvedValue({
      blob: new Blob(["test content"], { type: "text/plain" }),
      content: "test content",
    }),
  }),
}));

// Mock der Feature-Toggles
vi.mock("@/composables/useFeatureToggles", () => ({
  useFeatureToggles: () => ({
    isFeatureEnabled: vi.fn().mockReturnValue(false),
  }),
}));

// Mock der i18n-Funktion
vi.mock("@/composables/useI18n", () => ({
  useI18n: () => ({
    t: (key: string, defaultValue: string) => defaultValue,
  }),
}));

// Mock von highlight.js
vi.mock("highlight.js", () => ({
  default: {
    highlightAuto: vi.fn().mockReturnValue({ value: "highlighted content" }),
    highlight: vi.fn().mockReturnValue({ value: "highlighted content" }),
  },
}));

describe("DocumentPreview.vue", () => {
  let testDocument;

  beforeEach(() => {
    // Reset Mocks
    vi.clearAllMocks();

    // Test-Dokument erstellen
    testDocument = {
      id: "test-doc-1",
      name: "test-document.txt",
      originalName: "test-document.txt",
      originalFormat: "txt",
      size: 1024,
      uploadDate: new Date(),
      status: "completed",
      content: "Test content",
      metadata: {
        title: "Test Document",
        author: "Test Author",
        created: new Date(),
        modified: new Date(),
        pageCount: 1,
      },
    };

    // URL.createObjectURL mocken
    global.URL.createObjectURL = vi.fn().mockReturnValue("blob:test-url");
    global.URL.revokeObjectURL = vi.fn();
  });

  it("sollte korrekt gerendert werden", async () => {
    const wrapper = mount(DocumentPreview, {
      props: {
        document: testDocument,
      },
      global: {
        stubs: ["font-awesome-icon"],
      },
    });

    await flushPromises();

    expect(wrapper.find(".document-preview").exists()).toBe(true);
    expect(wrapper.find(".document-preview__file-name").text()).toBe(
      testDocument.originalName,
    );
  });

  it("sollte den korrekten Dokumenttyp für Textdateien erkennen", async () => {
    const textDocument = { ...testDocument, originalFormat: "txt" };
    const wrapper = mount(DocumentPreview, {
      props: {
        document: textDocument,
      },
      global: {
        stubs: ["font-awesome-icon"],
      },
    });

    await flushPromises();

    expect(wrapper.find(".document-preview__text-container").exists()).toBe(
      true,
    );
  });

  it("sollte den korrekten Dokumenttyp für PDF-Dateien erkennen", async () => {
    const pdfDocument = { ...testDocument, originalFormat: "pdf" };
    const wrapper = mount(DocumentPreview, {
      props: {
        document: pdfDocument,
      },
      global: {
        stubs: ["font-awesome-icon"],
      },
    });

    await flushPromises();

    expect(wrapper.find(".document-preview__pdf-container").exists()).toBe(
      true,
    );
  });

  it("sollte den korrekten Dokumenttyp für Bilddateien erkennen", async () => {
    const imageDocument = { ...testDocument, originalFormat: "png" };
    const wrapper = mount(DocumentPreview, {
      props: {
        document: imageDocument,
      },
      global: {
        stubs: ["font-awesome-icon"],
      },
    });

    await flushPromises();

    expect(wrapper.find(".document-preview__image-container").exists()).toBe(
      true,
    );
  });

  it("sollte den korrekten Dokumenttyp für HTML-Dateien erkennen", async () => {
    const htmlDocument = { ...testDocument, originalFormat: "html" };
    const wrapper = mount(DocumentPreview, {
      props: {
        document: htmlDocument,
      },
      global: {
        stubs: ["font-awesome-icon"],
      },
    });

    await flushPromises();

    expect(wrapper.find(".document-preview__html-container").exists()).toBe(
      true,
    );
  });

  it("sollte den korrekten Dokumenttyp für Excel-Dateien erkennen", async () => {
    const excelDocument = {
      ...testDocument,
      originalFormat: "xlsx",
      metadata: {
        ...testDocument.metadata,
        tables: [
          {
            headers: ["Column 1", "Column 2"],
            data: [
              ["Row 1 Cell 1", "Row 1 Cell 2"],
              ["Row 2 Cell 1", "Row 2 Cell 2"],
            ],
          },
        ],
      },
    };

    const wrapper = mount(DocumentPreview, {
      props: {
        document: excelDocument,
      },
      global: {
        stubs: ["font-awesome-icon"],
      },
    });

    await flushPromises();

    expect(wrapper.find(".document-preview__table-container").exists()).toBe(
      true,
    );
  });

  it("sollte den korrekten Dokumenttyp für PowerPoint-Dateien erkennen", async () => {
    const pptDocument = {
      ...testDocument,
      originalFormat: "pptx",
      metadata: {
        ...testDocument.metadata,
        slides: [
          { url: "slide1.png", thumbnailUrl: "thumb1.png" },
          { url: "slide2.png", thumbnailUrl: "thumb2.png" },
        ],
      },
    };

    const wrapper = mount(DocumentPreview, {
      props: {
        document: pptDocument,
      },
      global: {
        stubs: ["font-awesome-icon"],
      },
    });

    await flushPromises();

    expect(
      wrapper.find(".document-preview__presentation-container").exists(),
    ).toBe(true);
  });

  it("sollte den korrekten Dokumenttyp für Word-Dateien erkennen", async () => {
    const wordDocument = { ...testDocument, originalFormat: "docx" };
    const wrapper = mount(DocumentPreview, {
      props: {
        document: wordDocument,
      },
      global: {
        stubs: ["font-awesome-icon"],
      },
    });

    await flushPromises();

    expect(wrapper.find(".document-preview__word-container").exists()).toBe(
      true,
    );
  });

  it("sollte den korrekten Dokumenttyp für Audio-Dateien erkennen", async () => {
    const audioDocument = {
      ...testDocument,
      originalFormat: "mp3",
      metadata: {
        ...testDocument.metadata,
        duration: 180, // 3 Minuten
        bitrate: 320000, // 320 kbps
      },
    };

    const wrapper = mount(DocumentPreview, {
      props: {
        document: audioDocument,
      },
      global: {
        stubs: ["font-awesome-icon"],
      },
    });

    await flushPromises();

    expect(wrapper.find(".document-preview__audio-container").exists()).toBe(
      true,
    );
  });

  it("sollte den korrekten Dokumenttyp für Video-Dateien erkennen", async () => {
    const videoDocument = {
      ...testDocument,
      originalFormat: "mp4",
      metadata: {
        ...testDocument.metadata,
        duration: 300, // 5 Minuten
        resolution: "1920x1080",
      },
    };

    const wrapper = mount(DocumentPreview, {
      props: {
        document: videoDocument,
      },
      global: {
        stubs: ["font-awesome-icon"],
      },
    });

    await flushPromises();

    expect(wrapper.find(".document-preview__video-container").exists()).toBe(
      true,
    );
  });

  it("sollte den Fallback rendern, wenn das Dateiformat nicht unterstützt wird", async () => {
    const unknownDocument = { ...testDocument, originalFormat: "unknown" };
    const wrapper = mount(DocumentPreview, {
      props: {
        document: unknownDocument,
      },
      global: {
        stubs: ["font-awesome-icon"],
      },
    });

    await flushPromises();

    expect(wrapper.find(".document-preview__fallback").exists()).toBe(true);
  });

  it("sollte Syntax-Highlighting für Code-Dateien korrekt anwenden", async () => {
    const codeDocument = {
      ...testDocument,
      originalFormat: "js",
      content: 'const test = "hello";',
    };
    const wrapper = mount(DocumentPreview, {
      props: {
        document: codeDocument,
      },
      global: {
        stubs: ["font-awesome-icon"],
      },
    });

    await flushPromises();

    expect(wrapper.find(".document-preview__text-container").exists()).toBe(
      true,
    );
    expect(wrapper.find(".document-preview__highlighted-text").exists()).toBe(
      true,
    );
  });

  it("sollte die close-Ereignisse emittieren, wenn die Schließen-Schaltfläche geklickt wird", async () => {
    const wrapper = mount(DocumentPreview, {
      props: {
        document: testDocument,
      },
      global: {
        stubs: ["font-awesome-icon"],
      },
    });

    await flushPromises();

    const closeButton = wrapper.find('[data-testid="close-btn"]');
    await closeButton.trigger("click");

    expect(wrapper.emitted().close).toBeTruthy();
  });

  it("sollte die download-Ereignisse emittieren, wenn die Download-Schaltfläche geklickt wird", async () => {
    const wrapper = mount(DocumentPreview, {
      props: {
        document: testDocument,
      },
      global: {
        stubs: ["font-awesome-icon"],
      },
    });

    await flushPromises();

    const downloadButton = wrapper.find('[data-testid="download-btn"]');
    await downloadButton.trigger("click");

    expect(wrapper.emitted().download).toBeTruthy();
    expect(wrapper.emitted().download[0]).toEqual([testDocument.id]);
  });

  it("sollte den Vollbildmodus umschalten können", async () => {
    const wrapper = mount(DocumentPreview, {
      props: {
        document: testDocument,
      },
      global: {
        stubs: ["font-awesome-icon"],
      },
    });

    await flushPromises();

    const fullscreenButton = wrapper.find('[data-testid="fullscreen-btn"]');
    await fullscreenButton.trigger("click");

    expect(wrapper.classes()).toContain("document-preview--fullscreen");

    await fullscreenButton.trigger("click");

    expect(wrapper.classes()).not.toContain("document-preview--fullscreen");
  });

  it("sollte die Zoom-Funktionen korrekt anwenden", async () => {
    const wrapper = mount(DocumentPreview, {
      props: {
        document: testDocument,
      },
      global: {
        stubs: ["font-awesome-icon"],
      },
    });

    await flushPromises();

    // Initial-Zoom prüfen
    expect(wrapper.vm.zoomLevel).toBe(1);

    // Hineinzoomen
    const zoomInButton = wrapper.find('[data-testid="zoom-in-btn"]');
    await zoomInButton.trigger("click");
    expect(wrapper.vm.zoomLevel).toBeGreaterThan(1);

    // Hinauszoomen
    const zoomOutButton = wrapper.find('[data-testid="zoom-out-btn"]');
    await zoomOutButton.trigger("click");
    expect(wrapper.vm.zoomLevel).toBe(1);

    // Zoom zurücksetzen
    await zoomInButton.trigger("click");
    const resetButton = wrapper.find('[data-testid="zoom-reset-btn"]');
    await resetButton.trigger("click");
    expect(wrapper.vm.zoomLevel).toBe(1);
  });

  it("sollte die Metadaten korrekt anzeigen", async () => {
    const wrapper = mount(DocumentPreview, {
      props: {
        document: testDocument,
      },
      global: {
        stubs: ["font-awesome-icon"],
      },
    });

    await flushPromises();

    // Metadaten-Anzeige einschalten
    const showMetadataButton = wrapper.find(
      '[data-testid="show-metadata-btn"]',
    );
    await showMetadataButton.trigger("click");

    // Prüfen, ob die Metadaten angezeigt werden
    expect(wrapper.find(".document-preview__metadata-content").exists()).toBe(
      true,
    );
    expect(wrapper.html()).toContain("Test Document");
    expect(wrapper.html()).toContain("Test Author");
  });
});
