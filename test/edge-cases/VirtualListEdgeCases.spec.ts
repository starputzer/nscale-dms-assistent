import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nextTick, ref, defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { useVirtualScroll } from "@/composables/useVirtualScroll";

// Erstelle Test-Komponente mit VirtualScroll
const VirtualList = defineComponent({
  name: "VirtualList",
  props: {
    items: {
      type: Array,
      required: true,
    },
    itemHeight: {
      type: Number,
      default: 50,
    },
    overscan: {
      type: Number,
      default: 5,
    },
  },
  setup(props) {
    const containerRef = ref<HTMLElement | null>(null);

    const { visibleItems, containerProps, wrapperProps, scrollToIndex } =
      useVirtualScroll(() => props.items, {
        itemHeight: props.itemHeight,
        overscan: props.overscan,
        containerRef,
      });

    return {
      containerRef,
      visibleItems,
      containerProps,
      wrapperProps,
      scrollToIndex,
    };
  },
  template: `
    <div ref="containerRef" v-bind="containerProps" class="virtual-container">
      <div v-bind="wrapperProps" class="virtual-wrapper">
        <div 
          v-for="{ item, index, style } in visibleItems" 
          :key="'item-' + index" 
          :style="style"
          class="virtual-item"
          :data-index="index"
        >
          {{ item.text }}
        </div>
      </div>
    </div>
  `,
});

// Hilfsfunktion zum Generieren großer Datensätze
function generateLargeDataset(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    text: `Item ${i} - ${Math.random().toString(36).substring(2, 8)}`,
    height: 50 + (i % 3) * 20, // Variable Höhen für Edge Case Tests
  }));
}

// Performance-Messungshilfsfunktion
const measurePerformance = (callback: () => void) => {
  const start = performance.now();
  callback();
  return performance.now() - start;
};

// Performance-Budget in Millisekunden
const PERFORMANCE_BUDGET = {
  RENDER_LARGE_DATASET: 500, // 500ms für initiales Rendern
  SCROLL_LARGE_DATASET: 100, // 100ms für Scroll-Operation
};

// Mock IntersectionObserver
class MockIntersectionObserver {
  readonly root: Element | null;
  readonly rootMargin: string;
  readonly thresholds: ReadonlyArray<number>;
  callback: IntersectionObserverCallback;

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this.callback = callback;
    this.root = options?.root || null;
    this.rootMargin = options?.rootMargin || "0px";
    this.thresholds = options?.threshold
      ? Array.isArray(options.threshold)
        ? options.threshold
        : [options.threshold]
      : [0];
  }

  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

global.IntersectionObserver = MockIntersectionObserver as any;

// Setup ResizeObserver Mock
global.ResizeObserver = class ResizeObserver {
  callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe() {}
  unobserve() {}
  disconnect() {}
};

describe("VirtualList Edge Cases", () => {
  // Bereinige Mocks nach jedem Test
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Mock scrollHeight und clientHeight in HTMLElement
  beforeEach(() => {
    Object.defineProperties(HTMLElement.prototype, {
      scrollHeight: {
        configurable: true,
        get: function () {
          return 10000;
        },
      },
      clientHeight: {
        configurable: true,
        get: function () {
          return 500;
        },
      },
    });

    // Mock für getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = vi
      .fn()
      .mockImplementation(function () {
        return {
          width: 800,
          height: 500,
          top: 0,
          left: 0,
          bottom: 500,
          right: 800,
          x: 0,
          y: 0,
          toJSON: () => {},
        };
      });
  });

  it("sollte extrem große Datensätze (10.000+ Einträge) verarbeiten können", async () => {
    // Generiere einen sehr großen Datensatz
    const largeDataset = generateLargeDataset(10000);

    // Messe Zeit für initiales Rendern
    const renderTime = measurePerformance(() => {
      const wrapper = mount(VirtualList, {
        props: {
          items: largeDataset,
          itemHeight: 50,
        },
      });
    });

    // Erwartung: Rendering sollte innerhalb des Performance-Budgets erfolgen
    expect(renderTime).toBeLessThan(PERFORMANCE_BUDGET.RENDER_LARGE_DATASET);

    // Mounten mit großem Datensatz
    const wrapper = mount(VirtualList, {
      props: {
        items: largeDataset,
        itemHeight: 50,
      },
    });

    // Überprüfe initiale Rendermenge (basierend auf Viewportgröße)
    const initialItemCount = wrapper.findAll(".virtual-item").length;
    expect(initialItemCount).toBeGreaterThan(0);
    expect(initialItemCount).toBeLessThan(30); // Sollte nur sichtbare Items + overscan rendern

    // Simuliere Scrollen
    const container = wrapper.find(".virtual-container").element;

    // Messe Zeit für Scroll-Operation
    const scrollTime = measurePerformance(() => {
      Object.defineProperty(container, "scrollTop", {
        writable: true,
        value: 5000,
      });

      // Löse scroll-Event aus
      container.dispatchEvent(new Event("scroll"));
    });

    await nextTick();
    await nextTick(); // Warte auf Neuberechnung der sichtbaren Items

    // Erwartung: Scroll-Verarbeitung sollte schnell sein
    expect(scrollTime).toBeLessThan(PERFORMANCE_BUDGET.SCROLL_LARGE_DATASET);

    // Andere Items sollten jetzt sichtbar sein
    const scrolledItems = wrapper.findAll(".virtual-item");
    expect(scrolledItems.length).toBeGreaterThan(0);

    // Prüfe, ob die richtigen Items basierend auf Scroll-Position gerendert werden
    const firstVisibleIndex = Number(scrolledItems[0].attributes("data-index"));
    expect(firstVisibleIndex).toBeGreaterThan(50); // Bei scrollTop 5000 und itemHeight 50 sollten wir ~100 items runter sein
  });

  it("sollte robust mit leeren Arrays umgehen", async () => {
    const wrapper = mount(VirtualList, {
      props: {
        items: [],
        itemHeight: 50,
      },
    });

    // Sollte keine Fehler werfen und keine Items rendern
    expect(wrapper.findAll(".virtual-item").length).toBe(0);

    // Teste Hinzufügen von Items nach initialem Rendern
    await wrapper.setProps({ items: generateLargeDataset(10) });

    await nextTick();

    // Sollte korrekt aktualisieren und Items rendern
    expect(wrapper.findAll(".virtual-item").length).toBeGreaterThan(0);
  });

  it("sollte mit variablen Elementhöhen umgehen können", async () => {
    // Datensatz mit variablen Höhen
    const variableHeightItems = Array.from({ length: 100 }, (_, i) => ({
      id: `item-${i}`,
      text: `Variable height item ${i}`,
      height: 30 + (i % 5) * 20, // Höhen von 30, 50, 70, 90, 110px
    }));

    // Custom Height Estimator Funktion
    const estimateHeight = (
      item: (typeof variableHeightItems)[0],
      index: number,
    ) => item.height;

    const wrapper = mount(VirtualList, {
      props: {
        items: variableHeightItems,
        itemHeight: estimateHeight,
      },
    });

    await nextTick();

    // Prüfe, ob Items korrekt gerendert werden
    const items = wrapper.findAll(".virtual-item");
    expect(items.length).toBeGreaterThan(0);

    // Teste Scrolling mit variablen Höhen
    const container = wrapper.find(".virtual-container").element;

    Object.defineProperty(container, "scrollTop", {
      writable: true,
      value: 1000,
    });

    container.dispatchEvent(new Event("scroll"));

    await nextTick();
    await nextTick();

    // Sollte neue Items basierend auf variablen Höhen rendern
    const scrolledItems = wrapper.findAll(".virtual-item");
    expect(scrolledItems.length).toBeGreaterThan(0);
  });

  it("sollte mit dynamisch ändernden Datensätzen umgehen können", async () => {
    // Starte mit kleinem Datensatz
    const initialItems = generateLargeDataset(50);

    const wrapper = mount(VirtualList, {
      props: {
        items: initialItems,
        itemHeight: 50,
      },
    });

    await nextTick();

    const initialItemCount = wrapper.findAll(".virtual-item").length;

    // Dynamisch zu größerem Datensatz wechseln
    const largerDataset = generateLargeDataset(500);
    await wrapper.setProps({ items: largerDataset });

    await nextTick();
    await nextTick();

    // Sollte immer noch etwa gleich viele Items rendern (basierend auf Viewport)
    const updatedItemCount = wrapper.findAll(".virtual-item").length;
    expect(updatedItemCount).toBeCloseTo(initialItemCount, 5); // Sollte ungefähr gleich sein (±5)

    // Dynamisch zu viel kleinerem Datensatz wechseln
    const smallerDataset = generateLargeDataset(5);
    await wrapper.setProps({ items: smallerDataset });

    await nextTick();

    // Sollte korrekt alle Items des kleineren Datensatzes rendern
    expect(wrapper.findAll(".virtual-item").length).toBe(5);
  });

  it("sollte mit schnell aufeinanderfolgenden Scroll-Ereignissen umgehen können", async () => {
    const wrapper = mount(VirtualList, {
      props: {
        items: generateLargeDataset(1000),
        itemHeight: 50,
      },
    });

    await nextTick();

    const container = wrapper.find(".virtual-container").element;

    // Simuliere schnelle Scroll-Ereignisse
    for (let i = 0; i < 10; i++) {
      Object.defineProperty(container, "scrollTop", {
        writable: true,
        value: i * 500,
      });

      container.dispatchEvent(new Event("scroll"));
    }

    await nextTick();
    await nextTick();

    // Sollte ein stabiles Ergebnis ohne Fehler liefern
    const items = wrapper.findAll(".virtual-item");
    expect(items.length).toBeGreaterThan(0);
  });

  it("sollte scrollToIndex korrekt verarbeiten", async () => {
    const wrapper = mount(VirtualList, {
      props: {
        items: generateLargeDataset(1000),
        itemHeight: 50,
      },
    });

    await nextTick();

    // Zugriff auf scrollToIndex Methode
    const { vm } = wrapper;

    // Teste scrollToIndex mit definiertem Index
    const targetIndex = 50;
    vm.scrollToIndex(targetIndex);

    await nextTick();
    await nextTick();

    // Prüfe, ob der richtige Bereich sichtbar ist
    const items = wrapper.findAll(".virtual-item");
    const visibleIndices = items.map((item) =>
      Number(item.attributes("data-index")),
    );

    // Der gezielte Index sollte im sichtbaren Bereich sein
    expect(visibleIndices).toContain(targetIndex);
  });
});
