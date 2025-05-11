import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { bannerService } from "@/services/ui/BannerService";

describe("BannerService", () => {
  beforeEach(() => {
    // Reset state between tests
    bannerService.hideAll();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a banner with default options", () => {
    const bannerId = bannerService.show("Test message");
    const banners = bannerService.getAll();

    expect(banners.length).toBe(1);
    expect(banners[0].id).toBe(bannerId);
    expect(banners[0].message).toBe("Test message");
    expect(banners[0].options.variant).toBe("info");
    expect(banners[0].options.dismissible).toBe(true);
    expect(banners[0].visible).toBe(true);
  });

  it("shows banners with different variants", () => {
    bannerService.info("Info message");
    bannerService.success("Success message");
    bannerService.warning("Warning message");
    bannerService.error("Error message");
    bannerService.neutral("Neutral message");

    const banners = bannerService.getAll();

    expect(banners.length).toBe(5);
    expect(banners.some((b) => b.options.variant === "info")).toBe(true);
    expect(banners.some((b) => b.options.variant === "success")).toBe(true);
    expect(banners.some((b) => b.options.variant === "warning")).toBe(true);
    expect(banners.some((b) => b.options.variant === "error")).toBe(true);
    expect(banners.some((b) => b.options.variant === "neutral")).toBe(true);
  });

  it("hides a specific banner", () => {
    const bannerId = bannerService.show("Test message");
    expect(bannerService.getAll().length).toBe(1);

    bannerService.hide(bannerId);

    // Banner should still be in the list but marked as not visible
    const banners = bannerService.getAll();
    expect(banners.length).toBe(1);
    expect(banners[0].visible).toBe(false);

    // After animation timeout, it should be removed
    vi.advanceTimersByTime(300);
    expect(bannerService.getAll().length).toBe(0);
  });

  it("hides all banners", () => {
    bannerService.info("First message");
    bannerService.warning("Second message");
    bannerService.error("Third message");

    expect(bannerService.getAll().length).toBe(3);

    bannerService.hideAll();

    // Banners should still be in the list but marked as not visible
    const banners = bannerService.getAll();
    expect(banners.length).toBe(3);
    expect(banners.every((b) => !b.visible)).toBe(true);

    // After animation timeout, they should all be removed
    vi.advanceTimersByTime(300);
    expect(bannerService.getAll().length).toBe(0);
  });

  it("auto-dismisses a banner after specified time", () => {
    const bannerId = bannerService.show("Auto-dismiss message", {
      autoDismiss: 1000,
    });
    expect(bannerService.getAll().length).toBe(1);

    vi.advanceTimersByTime(500);
    expect(bannerService.getAll().length).toBe(1);

    vi.advanceTimersByTime(600); // Total 1100ms
    // Wait for animation timeout to complete
    vi.advanceTimersByTime(300);

    expect(bannerService.getAll().length).toBe(0);
  });

  it("maintains only one active banner at a time", () => {
    const firstId = bannerService.info("First banner");
    expect(bannerService.getActiveBannerId()).toBe(firstId);

    const secondId = bannerService.warning("Second banner");

    // First banner should be hidden
    expect(bannerService.isVisible(firstId)).toBe(false);
    expect(bannerService.isVisible(secondId)).toBe(true);
    expect(bannerService.getActiveBannerId()).toBe(secondId);
  });

  it("calls onDismiss callback when banner is dismissed", () => {
    const onDismissMock = vi.fn();
    const bannerId = bannerService.show("Test message", {
      onDismiss: onDismissMock,
    });

    bannerService.hide(bannerId);
    expect(onDismissMock).toHaveBeenCalledTimes(1);
  });

  it("handles action clicks and callbacks", () => {
    const actionHandlerMock = vi.fn();
    const onActionMock = vi.fn();

    const action = {
      label: "Test Action",
      type: "primary",
      handler: actionHandlerMock,
    };

    const bannerId = bannerService.show("Message with action", {
      actions: [action],
      onAction: onActionMock,
    });

    bannerService.handleAction(bannerId, action);

    expect(actionHandlerMock).toHaveBeenCalledTimes(1);
    expect(onActionMock).toHaveBeenCalledTimes(1);
    expect(onActionMock).toHaveBeenCalledWith(action);
  });

  it("checks if a banner is visible", () => {
    const bannerId = bannerService.show("Visibility test");

    expect(bannerService.isVisible(bannerId)).toBe(true);

    bannerService.hide(bannerId);
    expect(bannerService.isVisible(bannerId)).toBe(false);
  });

  it("returns false for isVisible on non-existent banner", () => {
    expect(bannerService.isVisible("non-existent-id")).toBe(false);
  });

  it("returns null for getActiveBannerId when no banner is active", () => {
    expect(bannerService.getActiveBannerId()).toBeNull();

    const bannerId = bannerService.show("Test banner");
    expect(bannerService.getActiveBannerId()).toBe(bannerId);

    bannerService.hide(bannerId);
    expect(bannerService.getActiveBannerId()).toBeNull();
  });
});
