import { describe, it, expect, vi, beforeEach } from "vitest";
import { routerMigrator } from "../../src/migration/RouterMigration";

describe("RouterMigrator", () => {
  // Mock-Objekte
  const mockVueRouter = {
    push: vi.fn(),
    beforeEach: vi.fn(),
  };

  const mockEventBus = {
    on: vi.fn(),
    emit: vi.fn(),
  };

  beforeEach(() => {
    // Mocks zurücksetzen
    vi.clearAllMocks();

    // RouterMigrator initialisieren
    routerMigrator.initialize(mockVueRouter, mockEventBus);

    // Test-Routen registrieren
    routerMigrator.registerRouteConfig({
      legacyPath: "/admin",
      vuePath: "/admin",
      redirectType: "permanent",
    });

    routerMigrator.registerRouteConfig({
      legacyPath: "/chat/:sessionId",
      vuePath: "/chat/:sessionId",
      redirectType: "permanent",
    });

    routerMigrator.registerRouteConfig({
      legacyPath: "/convert",
      vuePath: "/documents/convert",
      paramMapping: {
        type: "documentType",
      },
      additionalParams: {
        source: "migration",
      },
      redirectType: "permanent",
    });
  });

  it("should register route configs", () => {
    // Act
    const configs = routerMigrator.getAllRouteConfigs();

    // Assert
    expect(configs).toHaveLength(3);
    expect(configs[0].legacyPath).toBe("/admin");
    expect(configs[0].vuePath).toBe("/admin");
  });

  it("should register multiple route configs at once", () => {
    // Arrange
    const newConfigs = [
      {
        legacyPath: "/settings",
        vuePath: "/settings",
        redirectType: "permanent" as const,
      },
      {
        legacyPath: "/profile",
        vuePath: "/user/profile",
        redirectType: "permanent" as const,
      },
    ];

    // Act
    routerMigrator.registerRouteConfigs(newConfigs);
    const configs = routerMigrator.getAllRouteConfigs();

    // Assert
    expect(configs).toHaveLength(5);
    expect(configs).toContainEqual(newConfigs[0]);
    expect(configs).toContainEqual(newConfigs[1]);
  });

  it("should identify legacy URLs", () => {
    // Act & Assert
    expect(routerMigrator.isLegacyUrl("http://example.com/admin")).toBe(true);
    expect(routerMigrator.isLegacyUrl("http://example.com/chat/123")).toBe(
      true,
    );
    expect(routerMigrator.isLegacyUrl("http://example.com/convert")).toBe(true);
    expect(routerMigrator.isLegacyUrl("http://example.com/unknown")).toBe(
      false,
    );
  });

  it("should convert legacy URLs to Vue URLs", () => {
    // Act & Assert
    expect(routerMigrator.legacyUrlToVueUrl("http://example.com/admin")).toBe(
      "/admin",
    );
    expect(
      routerMigrator.legacyUrlToVueUrl("http://example.com/chat/123"),
    ).toBe("/chat/123");
    expect(routerMigrator.legacyUrlToVueUrl("http://example.com/convert")).toBe(
      "/documents/convert",
    );
    expect(
      routerMigrator.legacyUrlToVueUrl("http://example.com/convert?type=pdf"),
    ).toBe("/documents/convert?type=pdf");
    expect(routerMigrator.legacyUrlToVueUrl("http://example.com/unknown")).toBe(
      null,
    );
  });

  it("should setup Vue Router guards during initialization", () => {
    // Assert
    expect(mockVueRouter.beforeEach).toHaveBeenCalled();
  });

  it("should setup event listeners for legacy navigation", () => {
    // Assert
    expect(mockEventBus.on).toHaveBeenCalledWith(
      "legacy:navigation",
      expect.any(Function),
    );
  });

  it("should handle navigation from legacy to Vue", () => {
    // Arrange
    const legacyNavigationHandler = mockEventBus.on.mock.calls[0][1];

    // Act
    legacyNavigationHandler({
      path: "/chat/123",
      params: { sessionId: "123" },
      query: { mode: "read" },
    });

    // Assert
    expect(mockVueRouter.push).toHaveBeenCalledWith({
      path: "/chat/123",
      query: { mode: "read" },
    });
  });

  it("should handle navigation with parameter mapping", () => {
    // Arrange
    const legacyNavigationHandler = mockEventBus.on.mock.calls[0][1];

    // Act
    legacyNavigationHandler({
      path: "/convert",
      params: { type: "pdf" },
      query: { mode: "advanced" },
    });

    // Assert
    expect(mockVueRouter.push).toHaveBeenCalledWith({
      path: "/documents/convert",
      query: { mode: "advanced" },
    });

    // Leider können wir die transformierten Parameter nicht direkt prüfen,
    // da sie in der Path-Substitution verwendet werden, nicht im params-Objekt
  });

  it("should handle unknown legacy paths", () => {
    // Arrange
    const legacyNavigationHandler = mockEventBus.on.mock.calls[0][1];

    // Act
    legacyNavigationHandler({
      path: "/unknown",
      params: {},
      query: {},
    });

    // Assert
    expect(mockVueRouter.push).not.toHaveBeenCalled();
  });
});
