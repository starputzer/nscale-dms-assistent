import { mount, shallowMount } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SessionManager from "@/components/chat/enhanced/SessionManager.vue";
import { ref } from "vue";

// Mock für vuedraggable
vi.mock("vuedraggable", () => ({
  default: {
    render: () => {},
    props: ["modelValue", "itemKey", "handle", "tag", "disabled"],
    emits: ["update:modelValue", "end"],
  },
}));

// Testdaten
const mockSessions = [
  {
    id: "session-1",
    title: "Implementierung der Indexierung",
    createdAt: new Date(new Date().getTime() - 86400000 * 2).toISOString(),
    updatedAt: new Date(new Date().getTime() - 3600000).toISOString(),
    userId: "user-1",
    isPinned: true,
  },
  {
    id: "session-2",
    title: "Dokumentenverwaltung und Speicherung",
    createdAt: new Date(new Date().getTime() - 86400000 * 3).toISOString(),
    updatedAt: new Date(new Date().getTime() - 86400000).toISOString(),
    userId: "user-1",
    category: { id: "docs", name: "Dokumentation", color: "#48BB78" },
  },
  {
    id: "session-3",
    title: "Benutzerberechtigungen in nscale",
    createdAt: new Date(new Date().getTime() - 86400000 * 5).toISOString(),
    updatedAt: new Date(new Date().getTime() - 86400000 * 2).toISOString(),
    userId: "user-1",
    tags: [{ id: "important", name: "Wichtig", color: "#F56565" }],
  },
];

const mockCategories = [
  { id: "general", name: "Allgemein", color: "#718096" },
  { id: "docs", name: "Dokumentation", color: "#48BB78" },
  { id: "project", name: "Projekt", color: "#ED8936" },
];

const mockTags = [
  { id: "important", name: "Wichtig", color: "#F56565" },
  { id: "work", name: "Arbeit", color: "#3182CE" },
  { id: "followup", name: "Nachverfolgen", color: "#ED8936" },
];

describe("SessionManager", () => {
  // Grundlegende Rendering-Tests
  it("renders correctly with default props", () => {
    const wrapper = shallowMount(SessionManager, {
      props: {
        sessions: [],
      },
    });
    expect(wrapper.exists()).toBe(true);
  });

  it("renders sessions when provided", () => {
    const wrapper = mount(SessionManager, {
      props: {
        sessions: mockSessions,
      },
      global: {
        stubs: {
          VueDraggable: {
            template:
              '<div class="draggable-stub"><slot v-if="$slots.item" name="item" v-for="element in elements" :element="element"></slot></div>',
            props: ["modelValue"],
            setup(props) {
              return {
                elements: props.modelValue,
              };
            },
          },
        },
      },
    });
    expect(wrapper.find(".n-session-manager__session-list").exists()).toBe(
      true,
    );
  });

  // Event-Emitter-Tests
  it("emits session-selected event when a session is clicked", async () => {
    const wrapper = mount(SessionManager, {
      props: {
        sessions: mockSessions,
      },
      global: {
        stubs: {
          VueDraggable: {
            template:
              '<div class="draggable-stub"><slot v-if="$slots.item" name="item" v-for="element in elements" :element="element"></slot></div>',
            props: ["modelValue"],
            setup(props) {
              return {
                elements: props.modelValue,
              };
            },
          },
        },
      },
    });

    // Finde die erste Session und klicke sie an
    const sessionElement = wrapper.find(".n-session-manager__session");
    await sessionElement.trigger("click");

    // Prüfe, ob das Event emittiert wurde
    expect(wrapper.emitted("session-selected")).toBeTruthy();
    expect(wrapper.emitted("session-selected")![0]).toEqual(["session-1"]);
  });

  // Filterfunktionen-Tests
  it("filters sessions by search query", async () => {
    const wrapper = mount(SessionManager, {
      props: {
        sessions: mockSessions,
        searchEnabled: true,
      },
      global: {
        stubs: {
          VueDraggable: {
            template:
              '<div class="draggable-stub"><slot v-if="$slots.item" name="item" v-for="element in elements" :element="element"></slot></div>',
            props: ["modelValue"],
            setup(props) {
              return {
                elements: props.modelValue,
              };
            },
          },
        },
      },
    });

    // Öffne die Suche
    await wrapper
      .find('.n-session-manager__action-btn[aria-label="Suche anzeigen"]')
      .trigger("click");

    // Setze den Suchwert
    const searchInput = wrapper.find(".n-session-manager__search-input");
    await searchInput.setValue("Dokumentenverwaltung");

    // Finde die gefilterten Sessions
    const sessions = wrapper.findAll(".n-session-manager__session");
    expect(sessions.length).toBe(1);
    expect(sessions[0].text()).toContain("Dokumentenverwaltung");
  });

  // Tests für die neuen Features
  describe("Category System", () => {
    it("shows category information in session items when available", () => {
      const wrapper = mount(SessionManager, {
        props: {
          sessions: mockSessions,
          availableCategories: mockCategories,
          categoriesEnabled: true,
        },
        global: {
          stubs: {
            VueDraggable: {
              template:
                '<div class="draggable-stub"><slot v-if="$slots.item" name="item" v-for="element in elements" :element="element"></slot></div>',
              props: ["modelValue"],
              setup(props) {
                return {
                  elements: props.modelValue,
                };
              },
            },
          },
        },
      });

      // Suche nach der zweiten Session, die eine Kategorie hat
      const sessions = wrapper.findAll(".n-session-manager__session");
      expect(sessions.length).toBe(3);

      // Prüfe, ob die Kategorieinformation angezeigt wird
      expect(sessions[1].find(".n-session-manager__category").exists()).toBe(
        true,
      );
      expect(sessions[1].find(".n-session-manager__category-name").text()).toBe(
        "Dokumentation",
      );
    });
  });

  describe("Multi-Select functionality", () => {
    it("enables multi-select mode when the multi-select button is clicked", async () => {
      const wrapper = mount(SessionManager, {
        props: {
          sessions: mockSessions,
          multiSelectEnabled: true,
        },
        global: {
          stubs: {
            VueDraggable: {
              template:
                '<div class="draggable-stub"><slot v-if="$slots.item" name="item" v-for="element in elements" :element="element"></slot></div>',
              props: ["modelValue"],
              setup(props) {
                return {
                  elements: props.modelValue,
                };
              },
            },
          },
        },
      });

      // Multi-Select-Modus aktivieren
      const multiSelectButton = wrapper.find(
        ".n-session-manager__multi-select-btn",
      );
      await multiSelectButton.trigger("click");

      // Prüfe, ob der Multi-Select-Modus aktiv ist
      expect(
        wrapper.find(".n-session-manager__multi-select-btn--active").exists(),
      ).toBe(true);

      // Prüfe, ob die Checkboxen angezeigt werden
      const checkbox = wrapper.find(".n-session-manager__checkbox");
      expect(checkbox.exists()).toBe(true);
    });
  });

  describe("Tag System", () => {
    it("shows tag information in session items when available", () => {
      const wrapper = mount(SessionManager, {
        props: {
          sessions: mockSessions,
          availableTags: mockTags,
          tagsEnabled: true,
        },
        global: {
          stubs: {
            VueDraggable: {
              template:
                '<div class="draggable-stub"><slot v-if="$slots.item" name="item" v-for="element in elements" :element="element"></slot></div>',
              props: ["modelValue"],
              setup(props) {
                return {
                  elements: props.modelValue,
                };
              },
            },
          },
        },
      });

      // Suche nach der dritten Session, die Tags hat
      const sessions = wrapper.findAll(".n-session-manager__session");
      expect(sessions.length).toBe(3);

      // Prüfe, ob die Tag-Information angezeigt wird
      expect(sessions[2].find(".n-session-manager__tags").exists()).toBe(true);
      expect(sessions[2].find(".n-session-manager__tag").text()).toBe(
        "Wichtig",
      );
    });
  });
});
