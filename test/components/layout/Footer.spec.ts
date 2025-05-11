import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import Footer from "@/components/layout/Footer.vue";

describe("Footer.vue", () => {
  const createWrapper = (props = {}) => {
    return mount(Footer, {
      props,
      slots: {
        default: '<div class="test-content">Default Content</div>',
        left: '<div class="test-left">Left Content</div>',
        right: '<div class="test-right">Right Content</div>',
        links: '<a href="/test">Test Link</a>',
      },
    });
  };

  it("renders correctly with default props", async () => {
    const wrapper = createWrapper();

    expect(wrapper.find(".n-footer").exists()).toBe(true);
    expect(wrapper.find(".n-footer__container").exists()).toBe(true);
    expect(wrapper.find(".n-footer__section--left").exists()).toBe(true);
    expect(wrapper.find(".n-footer__section--middle").exists()).toBe(true);
    expect(wrapper.find(".n-footer__section--right").exists()).toBe(true);

    // Check default slot content
    expect(wrapper.find(".test-content").exists()).toBe(true);
    expect(wrapper.find(".test-left").exists()).toBe(true);
    expect(wrapper.find(".test-right").exists()).toBe(true);
    expect(wrapper.find('a[href="/test"]').exists()).toBe(true);
  });

  it("renders copyright and version when provided", async () => {
    const wrapper = createWrapper({
      copyright: "Test Company",
      version: "1.2.3",
      showVersion: true,
    });

    expect(wrapper.find(".n-footer__copyright").text()).toContain(
      "Test Company",
    );
    expect(wrapper.find(".n-footer__version").text()).toContain(
      "Version 1.2.3",
    );
  });

  it("respects showVersion prop", async () => {
    const wrapper = createWrapper({
      version: "1.2.3",
      showVersion: false,
    });

    expect(wrapper.find(".n-footer__version").exists()).toBe(false);
  });

  it("applies sticky class when sticky is true", async () => {
    const wrapper = createWrapper({ sticky: true });

    expect(wrapper.find(".n-footer").classes()).toContain("n-footer--sticky");
  });

  it("applies elevated class when elevated is true", async () => {
    const wrapper = createWrapper({ elevated: true });

    expect(wrapper.find(".n-footer").classes()).toContain("n-footer--elevated");
  });

  it("applies fixed class when fixed is true", async () => {
    const wrapper = createWrapper({ fixed: true });

    expect(wrapper.find(".n-footer").classes()).toContain("n-footer--fixed");
  });

  it("applies bordered class when bordered is true", async () => {
    const wrapper = createWrapper({ bordered: true });

    expect(wrapper.find(".n-footer").classes()).toContain("n-footer--bordered");
  });

  it("applies size class based on size prop", async () => {
    const sizes = ["small", "medium", "large"];

    for (const size of sizes) {
      const wrapper = createWrapper({ size });
      expect(wrapper.find(".n-footer").classes()).toContain(
        `n-footer--size-${size}`,
      );
    }
  });

  it("applies variant class based on variant prop", async () => {
    const variants = ["default", "minimal", "compact", "dark", "primary"];

    for (const variant of variants) {
      const wrapper = createWrapper({ variant });
      expect(wrapper.find(".n-footer").classes()).toContain(
        `n-footer--variant-${variant}`,
      );
    }
  });

  it("applies full-width class when fullWidth is true", async () => {
    const wrapper = createWrapper({ fullWidth: true });

    expect(wrapper.find(".n-footer__container").classes()).toContain(
      "n-footer__container--full-width",
    );
  });

  it("applies custom height when provided", async () => {
    const wrapper = createWrapper({ height: "80px" });

    expect(wrapper.find(".n-footer").attributes("style")).toContain(
      "--n-footer-height: 80px",
    );
  });

  it("applies custom CSS variables when provided", async () => {
    const customCssVars = {
      "--custom-var": "test-value",
      "--another-var": "10px",
    };

    const wrapper = createWrapper({ customCssVars });

    const footerStyle = wrapper.find(".n-footer").attributes("style");
    expect(footerStyle).toContain("--custom-var: test-value");
    expect(footerStyle).toContain("--another-var: 10px");
  });

  it("displays custom version prefix when provided", async () => {
    const wrapper = createWrapper({
      version: "1.2.3",
      versionPrefix: "Build",
    });

    expect(wrapper.find(".n-footer__version").text()).toContain("Build 1.2.3");
  });

  it("correctly handles complex slot content", async () => {
    const wrapper = mount(Footer, {
      slots: {
        left: `
          <div class="custom-content">
            <h3>Company</h3>
            <p>Description</p>
          </div>
        `,
        right: `
          <div class="social-links">
            <a href="#">Twitter</a>
            <a href="#">Facebook</a>
          </div>
        `,
      },
    });

    expect(wrapper.find(".custom-content").exists()).toBe(true);
    expect(wrapper.find(".custom-content h3").text()).toBe("Company");
    expect(wrapper.find(".social-links").exists()).toBe(true);
    expect(wrapper.findAll(".social-links a").length).toBe(2);
  });

  it("calculates the current year correctly", async () => {
    const wrapper = createWrapper({ copyright: "Test Company" });
    const currentYear = new Date().getFullYear();

    expect(wrapper.find(".n-footer__copyright").text()).toContain(
      currentYear.toString(),
    );
  });

  it("allows the links slot to be rendered inside the left section", async () => {
    const wrapper = createWrapper();

    const leftSection = wrapper.find(".n-footer__section--left");
    expect(leftSection.find(".n-footer__links").exists()).toBe(true);
    expect(leftSection.find('a[href="/test"]').exists()).toBe(true);
  });

  it("handles empty slots gracefully", async () => {
    const wrapper = mount(Footer);

    // Footer should still render with empty sections
    expect(wrapper.find(".n-footer").exists()).toBe(true);
    expect(wrapper.find(".n-footer__section--left").exists()).toBe(true);
    expect(wrapper.find(".n-footer__section--middle").exists()).toBe(true);
    expect(wrapper.find(".n-footer__section--right").exists()).toBe(true);
  });
});
