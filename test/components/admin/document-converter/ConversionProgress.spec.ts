import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import ConversionProgress from "@/components/admin/document-converter/ConversionProgress.vue";

// Helper to create wrapper with default props
const createWrapper = (props = {}) => {
  return mount(ConversionProgress, {
    props: {
      progress: 0,
      currentStep: "Dokument wird konvertiert...",
      estimatedTime: 0, // Changed from estimatedTimeRemaining to match component prop name
      ...props,
    },
    global: {
      mocks: {
        $t: (key: string, fallback: string) => {
          if (key === "converter.estimatedTimeRemaining") {
            return "Geschätzte Zeit verbleibend:";
          }
          return fallback || key;
        },
      },
    },
  });
};

describe("ConversionProgress.vue", () => {
  // Rendering tests
  describe("Rendering", () => {
    it("renders the progress bar with correct width", () => {
      const testCases = [
        { progress: 0, expected: "0%" },
        { progress: 25, expected: "25%" },
        { progress: 50, expected: "50%" },
        { progress: 75, expected: "75%" },
        { progress: 100, expected: "100%" },
      ];

      testCases.forEach(({ progress, expected }) => {
        const wrapper = createWrapper({ progress });
        const progressBar = wrapper.find(".conversion-progress__bar");

        expect(progressBar.attributes("style")).toContain(`width: ${expected}`);
        expect(progressBar.attributes("aria-valuenow")).toBe(
          progress.toString(),
        );
      });
    });

    it("displays the correct progress percentage", () => {
      const wrapper = createWrapper({ progress: 42 });

      expect(wrapper.find(".conversion-progress__percentage").text()).toBe(
        "42%",
      );
    });

    it("shows estimated time remaining when provided", () => {
      const wrapper = createWrapper({
        progress: 50,
        estimatedTime: 120, // 2 minutes
      });

      expect(
        wrapper.find(".conversion-progress__estimated-time").exists(),
      ).toBe(true);
      expect(
        wrapper.find(".conversion-progress__estimated-time").text(),
      ).toContain("2 Minuten");
    });

    it("does not show estimated time when estimatedTime is 0", () => {
      const wrapper = createWrapper({
        progress: 50,
        estimatedTime: 0,
      });

      expect(
        wrapper.find(".conversion-progress__estimated-time").exists(),
      ).toBe(false);
    });

    it("displays the current step", () => {
      const currentStep = "Preparing document...";
      const wrapper = createWrapper({ currentStep });

      expect(wrapper.find(".conversion-progress__operation-text").text()).toBe(
        currentStep,
      );
    });

    it("displays details when provided", async () => {
      const details = "Converting page 3 of 10";
      const wrapper = createWrapper({ details });

      // First toggle details to show them
      await wrapper
        .find(".conversion-progress__toggle-details")
        .trigger("click");

      // Allow for reactive updates to complete
      await wrapper.vm.$nextTick();

      expect(
        wrapper.find(".conversion-progress__details-content").exists(),
      ).toBe(true);
      expect(wrapper.find(".conversion-progress__details-content").text()).toBe(
        details,
      );
    });

    it("does not display details content when not expanded", () => {
      const wrapper = createWrapper({ details: "Some details" });

      // Details are not expanded by default
      expect(
        wrapper.find(".conversion-progress__details-content").exists(),
      ).toBe(false);
    });

    it("disables cancel button when progress is 100%", () => {
      const wrapper = createWrapper({ progress: 100 });

      expect(
        wrapper
          .find(".conversion-progress__cancel-action")
          .attributes("disabled"),
      ).toBeDefined();
    });

    it("enables cancel button when progress is less than 100%", () => {
      const wrapper = createWrapper({ progress: 99 });

      expect(
        wrapper
          .find(".conversion-progress__cancel-action")
          .attributes("disabled"),
      ).toBeUndefined();
    });
  });

  // Interaction tests
  describe("Interactions", () => {
    it("emits cancel event when cancel button is clicked", async () => {
      const wrapper = createWrapper({ progress: 50 });

      await wrapper
        .find(".conversion-progress__cancel-action")
        .trigger("click");

      expect(wrapper.emitted()).toHaveProperty("cancel");
      expect(wrapper.emitted("cancel")).toHaveLength(1);
    });

    it("does not emit cancel event when button is disabled", async () => {
      const wrapper = createWrapper({ progress: 100 });

      await wrapper
        .find(".conversion-progress__cancel-action")
        .trigger("click");

      expect(wrapper.emitted("cancel")).toBeUndefined();
    });

    it("toggles details visibility when toggle button is clicked", async () => {
      const wrapper = createWrapper({ details: "Some details" });

      // Initially, details should be hidden
      expect(
        wrapper.find(".conversion-progress__details-content").exists(),
      ).toBe(false);

      // Click the toggle button
      await wrapper
        .find(".conversion-progress__toggle-details")
        .trigger("click");

      // Allow for reactive updates to complete
      await wrapper.vm.$nextTick();

      // Now details should be visible
      expect(
        wrapper.find(".conversion-progress__details-content").exists(),
      ).toBe(true);
    });
  });

  // Props tests
  describe("Props", () => {
    it("uses default props when not provided", () => {
      // Always provide required props
      const wrapper = mount(ConversionProgress, {
        props: {
          progress: 0,
          currentStep: "Dokument wird konvertiert...",
        },
        global: {
          mocks: {
            $t: (key: string, fallback: string) => fallback || key,
          },
        },
      });

      expect(
        wrapper.find(".conversion-progress__bar").attributes("style"),
      ).toContain("width: 0%");
      expect(wrapper.find(".conversion-progress__operation-text").text()).toBe(
        "Dokument wird konvertiert...",
      );
      expect(
        wrapper.find(".conversion-progress__estimated-time").exists(),
      ).toBe(false);
    });

    it("updates the UI when props change", async () => {
      const wrapper = createWrapper();

      expect(
        wrapper.find(".conversion-progress__bar").attributes("style"),
      ).toContain("width: 0%");

      // Update the progress
      await wrapper.setProps({ progress: 75 });

      expect(
        wrapper.find(".conversion-progress__bar").attributes("style"),
      ).toContain("width: 75%");
      expect(wrapper.find(".conversion-progress__percentage").text()).toBe(
        "75%",
      );
    });
  });

  // Time formatting tests
  describe("Time formatting", () => {
    it("correctly formats time in seconds", () => {
      const wrapper = createWrapper({ estimatedTime: 45 });

      expect(
        wrapper.find(".conversion-progress__estimated-time").text(),
      ).toContain("45 Sekunden");
    });

    it("correctly formats time in minutes and seconds", () => {
      const wrapper = createWrapper({ estimatedTime: 65 });

      expect(
        wrapper.find(".conversion-progress__estimated-time").text(),
      ).toContain("1 Minute 5 Sekunden");
    });

    it("correctly formats time in minutes only", () => {
      const wrapper = createWrapper({ estimatedTime: 120 });

      expect(
        wrapper.find(".conversion-progress__estimated-time").text(),
      ).toContain("2 Minuten");
    });

    it("handles singular form correctly", () => {
      const oneSec = createWrapper({ estimatedTime: 1 });
      expect(
        oneSec.find(".conversion-progress__estimated-time").text(),
      ).toContain("1 Sekunde");

      const oneMin = createWrapper({ estimatedTime: 60 });
      expect(
        oneMin.find(".conversion-progress__estimated-time").text(),
      ).toContain("1 Minute");

      const oneMinOneSec = createWrapper({ estimatedTime: 61 });
      expect(
        oneMinOneSec.find(".conversion-progress__estimated-time").text(),
      ).toContain("1 Minute 1 Sekunde");
    });
  });

  // Edge cases tests
  describe("Edge cases", () => {
    it("handles negative progress values", () => {
      const wrapper = createWrapper({ progress: -10 });

      expect(
        wrapper.find(".conversion-progress__bar").attributes("style"),
      ).toContain("width: -10%");
      expect(wrapper.find(".conversion-progress__percentage").text()).toBe(
        "-10%",
      );
    });

    it("handles progress values over 100 correctly", () => {
      const wrapper = createWrapper({ progress: 110 });

      expect(
        wrapper.find(".conversion-progress__bar").attributes("style"),
      ).toContain("width: 110%");
      expect(wrapper.find(".conversion-progress__percentage").text()).toBe(
        "110%",
      );
      expect(
        wrapper
          .find(".conversion-progress__cancel-action")
          .attributes("disabled"),
      ).toBeDefined();
    });

    it("handles zero or negative time remaining by not showing the time estimate", () => {
      const zeroTime = createWrapper({ estimatedTime: 0 });
      expect(
        zeroTime.find(".conversion-progress__estimated-time").exists(),
      ).toBe(false);

      const negativeTime = createWrapper({ estimatedTime: -10 });
      expect(
        negativeTime.find(".conversion-progress__estimated-time").exists(),
      ).toBe(false);
    });
  });
});
