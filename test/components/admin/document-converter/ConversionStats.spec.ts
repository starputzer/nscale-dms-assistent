import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import ConversionStats from "@/src/components/admin/document-converter/ConversionStats.vue";

// Mock store
vi.mock("@/stores/documentConverter", () => ({
  useDocumentConverterStore: () => ({
    convertedDocuments: [
      {
        id: "doc1",
        originalName: "test-document.pdf",
        originalFormat: "pdf",
        size: 1024 * 1024, // 1MB
        uploadedAt: new Date("2025-05-01T10:00:00Z"),
        convertedAt: new Date("2025-05-01T10:01:00Z"),
        status: "success",
        duration: 60000, // 60 seconds
      },
      {
        id: "doc2",
        originalName: "test-spreadsheet.xlsx",
        originalFormat: "xlsx",
        size: 512 * 1024, // 512KB
        uploadedAt: new Date("2025-05-02T15:00:00Z"),
        convertedAt: new Date("2025-05-02T15:02:00Z"),
        status: "success",
        duration: 120000, // 120 seconds
      },
      {
        id: "doc3",
        originalName: "test-presentation.pptx",
        originalFormat: "pptx",
        size: 2 * 1024 * 1024, // 2MB
        uploadedAt: new Date("2025-05-03T09:00:00Z"),
        status: "error",
        error: "Conversion failed",
        duration: 30000, // 30 seconds
      },
      {
        id: "doc4",
        originalName: "test-image.jpg",
        originalFormat: "jpg",
        size: 256 * 1024, // 256KB
        uploadedAt: new Date("2025-05-04T14:00:00Z"),
        status: "processing",
      },
      {
        id: "doc5",
        originalName: "test-document2.docx",
        originalFormat: "docx",
        size: 768 * 1024, // 768KB
        uploadedAt: new Date("2025-05-05T11:00:00Z"),
        status: "pending",
      },
    ],
    initialized: true,
    initialize: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Mock Chart.js
global.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  // Minimal mock of canvas context
}));

describe("ConversionStats.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window methods
    global.URL.createObjectURL = vi.fn(() => "mock-url");
    global.URL.revokeObjectURL = vi.fn();

    // Mock document methods
    document.createElement = vi.fn().mockImplementation((tag) => {
      if (tag === "a") {
        return {
          href: "",
          download: "",
          click: vi.fn(),
        };
      }
      return {};
    });
  });

  it("renders correctly with initial data", async () => {
    const wrapper = mount(ConversionStats);
    await flushPromises();

    // Check for main elements
    expect(wrapper.find(".conversion-stats__title").exists()).toBe(true);
    expect(wrapper.find(".conversion-stats__summary").exists()).toBe(true);
    expect(wrapper.find(".conversion-stats__charts").exists()).toBe(true);
    expect(wrapper.find(".conversion-stats__table").exists()).toBe(true);
  });

  it("calculates summary statistics correctly", async () => {
    const wrapper = mount(ConversionStats);
    await flushPromises();

    // Check summary counts
    const totalCount = wrapper.vm.totalCount;
    const successCount = wrapper.vm.successCount;
    const errorCount = wrapper.vm.errorCount;
    const pendingCount = wrapper.vm.pendingCount;

    expect(totalCount).toBe(5);
    expect(successCount).toBe(2);
    expect(errorCount).toBe(1);
    expect(pendingCount).toBe(2); // includes both pending and processing
  });

  it("calculates rates correctly", async () => {
    const wrapper = mount(ConversionStats);
    await flushPromises();

    // Check success and error rates
    const successRate = wrapper.vm.successRate;
    const errorRate = wrapper.vm.errorRate;

    expect(successRate).toBe("40.0"); // 2/5 = 40%
    expect(errorRate).toBe("20.0"); // 1/5 = 20%
  });

  it("formats file sizes correctly", async () => {
    const wrapper = mount(ConversionStats);
    await flushPromises();

    // Format function test
    const formatFileSize = wrapper.vm.formatFileSize;

    expect(formatFileSize(1024)).toBe("1 KB");
    expect(formatFileSize(1024 * 1024)).toBe("1 MB");
    expect(formatFileSize(1024 * 1024 * 1024)).toBe("1 GB");
    expect(formatFileSize(0)).toBe("0 Bytes");
  });

  it("formats durations correctly", async () => {
    const wrapper = mount(ConversionStats);
    await flushPromises();

    // Format function test
    const formatDuration = wrapper.vm.formatDuration;

    expect(formatDuration(1000)).toBe("1s");
    expect(formatDuration(60000)).toBe("1m 0s");
    expect(formatDuration(65000)).toBe("1m 5s");
    expect(formatDuration(0)).toBe("0s");
  });

  it("displays recent documents in the table", async () => {
    const wrapper = mount(ConversionStats);
    await flushPromises();

    // Check table rows
    const tableRows = wrapper.findAll(".conversion-stats__table tbody tr");
    expect(tableRows.length).toBeGreaterThan(0);

    // Recent documents should be sorted by date (newest first)
    const recentDocs = wrapper.vm.recentDocuments;
    expect(recentDocs[0].id).toBe("doc5"); // Most recent
  });

  it("filters documents by time range", async () => {
    const wrapper = mount(ConversionStats);
    await flushPromises();

    // Change time range
    await wrapper.setData({ timeRange: "day" });

    // Since our mock data has dates spread across multiple days,
    // filtering to a single day should reduce the count
    expect(wrapper.vm.filteredDocuments.length).toBeLessThan(5);
  });

  it("exports data in CSV format", async () => {
    const wrapper = mount(ConversionStats);
    await flushPromises();

    // Spy on document.createElement and URL.createObjectURL
    const createElementSpy = vi.spyOn(document, "createElement");
    const createObjectURLSpy = vi.spyOn(URL, "createObjectURL");

    // Trigger CSV export
    await wrapper.vm.exportStats("csv");

    // Verify export functions were called
    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(createObjectURLSpy).toHaveBeenCalled();

    // Verify cleanup
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it("exports data in JSON format", async () => {
    const wrapper = mount(ConversionStats);
    await flushPromises();

    // Spy on document.createElement and URL.createObjectURL
    const createElementSpy = vi.spyOn(document, "createElement");
    const createObjectURLSpy = vi.spyOn(URL, "createObjectURL");

    // Trigger JSON export
    await wrapper.vm.exportStats("json");

    // Verify export functions were called
    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(createObjectURLSpy).toHaveBeenCalled();

    // Verify cleanup
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it("handles window resize events", async () => {
    const wrapper = mount(ConversionStats);
    await flushPromises();

    // Spy on handleResize method
    const handleResizeSpy = vi.spyOn(wrapper.vm, "handleResize");

    // Trigger resize event
    window.dispatchEvent(new Event("resize"));

    // Verify resize handler was called
    expect(handleResizeSpy).toHaveBeenCalled();
  });

  it("initializes chart instances on mount", async () => {
    // Mock Chart.js
    const mockChart = {
      Chart: vi.fn().mockImplementation(() => ({
        update: vi.fn(),
        destroy: vi.fn(),
      })),
    };

    // Spy on loadChartLibrary method
    const loadChartLibrarySpy = vi
      .spyOn(ConversionStats.methods, "loadChartLibrary")
      .mockResolvedValue(mockChart);

    const wrapper = mount(ConversionStats);
    await flushPromises();

    // Verify chart library was loaded
    expect(loadChartLibrarySpy).toHaveBeenCalled();
  });
});
