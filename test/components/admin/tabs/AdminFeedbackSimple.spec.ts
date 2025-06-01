import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { createI18n } from "vue-i18n";
import AdminFeedback from "@/components/admin/tabs/AdminFeedback.vue";

// Mock Chart.js to avoid rendering issues in tests
vi.mock("chart.js", () => ({
  Chart: vi.fn(() => ({
    destroy: vi.fn(),
  })),
  registerables: [],
}));

describe("AdminFeedback Component - Basic", () => {
  it("should render without crashing", async () => {
    // Create a basic i18n instance for testing
    const i18n = createI18n({
      legacy: false,
      locale: "de",
      messages: {
        de: {
          "admin.feedback.title": "Feedback",
          "admin.feedback.export": "Export",
          "admin.feedback.resetFilters": "Reset",
          "admin.feedback.noData": "No data",
        },
      },
    });

    // Mock store data
    const mockStore = {
      adminFeedback: {
        stats: {
          total: 100,
          averageRating: 3.5,
          positiveCount: 75,
          negativeCount: 25,
          withCommentsCount: 50,
          bySource: { chat: 60, "document-converter": 40 },
          byWeek: { "2023-01-01": 30, "2023-01-08": 70 },
        },
        feedback: [],
        filter: {
          startDate: null,
          endDate: null,
          onlyWithComments: false,
          searchTerm: "",
        },
        loading: false,
        fetchStats: vi.fn(),
        fetchNegativeFeedback: vi.fn(),
        setFilter: vi.fn(),
        resetFilter: vi.fn(),
      },
    };

    // Mount the component with minimal configuration
    const wrapper = mount(AdminFeedback, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: mockStore,
          }),
          i18n,
        ],
        stubs: {
          // Stub all child components
          BaseButton: true,
          BaseInput: true,
          BaseCheckbox: true,
          Chart: true,
          Dialog: true,
        },
        mocks: {
          $t: (key: string) => key,
        },
      },
    });

    // Basic assertions to verify the component is mounted
    expect(wrapper.exists()).toBe(true);
  });
});
