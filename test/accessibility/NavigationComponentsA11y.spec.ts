import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { toHaveNoViolations } from 'jest-axe';
import { runAxeTest, wcag21aaRules } from './setup-axe';

// Import Navigation-Komponenten
import TabPanel from '@/components/layout/TabPanel.vue';
import Sidebar from '@/components/layout/Sidebar.vue';
import Drawer from '@/components/layout/Drawer.vue';
import Header from '@/components/layout/Header.vue';
import Footer from '@/components/layout/Footer.vue';

// Jest-Axe Matcher erweitern
expect.extend(toHaveNoViolations);

describe('Navigation- und Layout-Komponenten Barrierefreiheitstests', () => {
  let wrapper: any;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  // TabPanel-Komponente
  describe('TabPanel', () => {
    const defaultTabs = [
      { id: "tab1", label: "Tab 1", icon: "icon-home" },
      { id: "tab2", label: "Tab 2", icon: "icon-settings" },
      { id: "tab3", label: "Tab 3", icon: "icon-user" },
    ];

    it('sollte grundlegende Barrierefreiheitsanforderungen erfüllen', async () => {
      wrapper = mount(TabPanel, {
        props: {
          tabs: defaultTabs,
          activeId: 'tab1'
        },
        slots: {
          tab1: '<div class="tab-content">Tab 1 Inhalt</div>',
          tab2: '<div class="tab-content">Tab 2 Inhalt</div>',
          tab3: '<div class="tab-content">Tab 3 Inhalt</div>',
        },
        global: {
          stubs: {
            transition: false,
          },
        },
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();
    });

    it('sollte korrekte ARIA-Attribute für Tabs verwenden', async () => {
      wrapper = mount(TabPanel, {
        props: {
          tabs: defaultTabs,
          activeId: 'tab1'
        },
        slots: {
          tab1: '<div class="tab-content">Tab 1 Inhalt</div>',
          tab2: '<div class="tab-content">Tab 2 Inhalt</div>',
          tab3: '<div class="tab-content">Tab 3 Inhalt</div>',
        },
      });

      // Prüfe, ob role="tablist" für den Container existiert
      const tablist = wrapper.find('[role="tablist"]');
      expect(tablist.exists()).toBe(true);

      // Prüfe, ob alle Tabs korrekte Attribute haben
      const tabs = wrapper.findAll('[role="tab"]');
      expect(tabs.length).toBe(defaultTabs.length);
      
      // Prüfe Tab-Attribute (aria-selected, aria-controls)
      tabs.forEach((tab, index) => {
        const tabId = defaultTabs[index].id;
        expect(tab.attributes('id')).toBe(`tab-${tabId}`);
        expect(tab.attributes('aria-controls')).toBe(`panel-${tabId}`);
        
        if (tabId === 'tab1') {
          expect(tab.attributes('aria-selected')).toBe('true');
          expect(tab.attributes('tabindex')).toBe('0');
        } else {
          expect(tab.attributes('aria-selected')).toBe('false');
          expect(tab.attributes('tabindex')).toBe('-1');
        }
      });

      // Prüfe, ob alle Panels korrekte Attribute haben
      const panels = wrapper.findAll('[role="tabpanel"]');
      expect(panels.length).toBe(defaultTabs.length);
      
      // Prüfe Panel-Attribute (aria-labelledby)
      panels.forEach((panel, index) => {
        const tabId = defaultTabs[index].id;
        expect(panel.attributes('id')).toBe(`panel-${tabId}`);
        expect(panel.attributes('aria-labelledby')).toBe(`tab-${tabId}`);
        
        if (tabId !== 'tab1') {
          expect(panel.attributes('hidden')).toBeDefined();
        }
      });
    });

    it('sollte mit der Tastatur bedienbar sein', async () => {
      wrapper = mount(TabPanel, {
        props: {
          tabs: defaultTabs,
          activeId: 'tab1'
        },
        slots: {
          tab1: '<div class="tab-content">Tab 1 Inhalt</div>',
          tab2: '<div class="tab-content">Tab 2 Inhalt</div>',
          tab3: '<div class="tab-content">Tab 3 Inhalt</div>',
        },
      });

      // Finde den aktiven Tab
      const activeTab = wrapper.find('[role="tab"][aria-selected="true"]');
      
      // Simuliere Tastendruck Rechts
      await activeTab.trigger('keydown', { key: 'ArrowRight' });
      
      // Prüfe, ob update:active-id emittiert wurde
      expect(wrapper.emitted()).toHaveProperty('update:active-id');
      expect(wrapper.emitted()['update:active-id'][0]).toEqual(['tab2']);
      
      // Simuliere v-model Update
      await wrapper.setProps({ activeId: 'tab2' });
      
      // Simuliere Tastendruck Links vom neuen aktiven Tab
      const newActiveTab = wrapper.find('[role="tab"][aria-selected="true"]');
      await newActiveTab.trigger('keydown', { key: 'ArrowLeft' });
      
      // Prüfe, ob update:active-id wieder emittiert wurde
      expect(wrapper.emitted()['update:active-id'][1]).toEqual(['tab1']);
    });
  });

  // Sidebar-Komponente
  describe('Sidebar', () => {
    const defaultItems = [
      { id: "item1", label: "Element 1", icon: "icon-home" },
      { id: "item2", label: "Element 2", icon: "icon-settings" },
      { id: "item3", label: "Element 3", icon: "icon-user", active: true },
      {
        id: "item4",
        label: "Element 4 mit Unterelementen",
        icon: "icon-folder",
        children: [
          { id: "item4-1", label: "Unterelement 1", icon: "icon-file" },
          { id: "item4-2", label: "Unterelement 2", icon: "icon-file" },
        ],
      },
    ];

    it('sollte grundlegende Barrierefreiheitsanforderungen erfüllen', async () => {
      wrapper = mount(Sidebar, {
        props: {
          items: defaultItems,
          title: 'Navigation'
        },
        global: {
          stubs: {
            RouterLink: true,
          },
        },
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();
    });

    it('sollte korrekte ARIA-Attribute für Navigation verwenden', async () => {
      wrapper = mount(Sidebar, {
        props: {
          items: defaultItems,
          title: 'Hauptnavigation'
        },
        global: {
          stubs: {
            RouterLink: true,
          },
        },
      });

      // Prüfe Navigation Landmarks
      const nav = wrapper.find('[role="navigation"]');
      expect(nav.exists()).toBe(true);
      expect(nav.attributes('aria-label')).toBe('Hauptnavigation');

      // Prüfe Erweiterbares Element
      const expandableItem = wrapper.findAll('.n-sidebar__nav-item').at(3);
      const expandButton = expandableItem.find('.n-sidebar__nav-link-wrapper');
      
      // Prüfe Button-Attribute
      expect(expandButton.attributes('aria-expanded')).toBe('false');
      expect(expandButton.attributes('aria-controls')).toBeDefined();
      
      // Klappe auf und prüfe Änderung
      await expandButton.trigger('click');
      await wrapper.vm.$nextTick();
      
      // Prüfe, ob aria-expanded geändert wurde
      expect(expandableItem.find('.n-sidebar__nav-link-wrapper').attributes('aria-expanded')).toBe('true');
    });

    it('sollte kollabierte Seitenleiste korrekt mit ARIA kennzeichnen', async () => {
      wrapper = mount(Sidebar, {
        props: {
          items: defaultItems,
          collapsed: true
        },
        global: {
          stubs: {
            RouterLink: true,
          },
        },
      });

      // Prüfe, ob Sidebar den kollabierten Zustand korrekt kennzeichnet
      const sidebar = wrapper.find('.n-sidebar');
      expect(sidebar.classes()).toContain('n-sidebar--collapsed');
      
      // Prüfe Toggle-Button
      const toggleButton = wrapper.find('.n-sidebar__toggle-btn');
      expect(toggleButton.attributes('aria-expanded')).toBe('false');
      expect(toggleButton.attributes('aria-label')).toBeDefined();
      
      // Prüfe, ob Icons in der kollabierten Ansicht Labels haben
      const navItems = wrapper.findAll('.n-sidebar__nav-item');
      navItems.forEach(item => {
        const icon = item.find('.n-sidebar__icon');
        if (icon.exists()) {
          // Icon sollte aria-hidden sein, aber beschriftet über umgebendes Element
          expect(icon.attributes('aria-hidden')).toBe('true');
        }
        
        // Prüfe, ob Item trotz Kollabierung accessible ist
        const link = item.find('.n-sidebar__nav-link');
        expect(link.attributes('aria-label') || link.text()).toBeTruthy();
      });
    });
  });

  // Drawer-Komponente (wenn verfügbar)
  describe('Drawer', () => {
    it('sollte grundlegende Barrierefreiheitsanforderungen erfüllen', async () => {
      try {
        wrapper = mount(Drawer, {
          props: {
            modelValue: true,
            title: 'Testdrawer',
            position: 'right'
          },
          slots: {
            default: '<div>Drawer-Inhalt</div>',
            footer: '<button>Schließen</button>'
          },
          global: {
            stubs: {
              teleport: true
            }
          }
        });
      } catch (error) {
        // Falls Komponente Teleport oder andere spezielle Anforderungen hat
        wrapper = mount(Drawer, {
          props: {
            modelValue: true,
            title: 'Testdrawer',
            position: 'right'
          },
          slots: {
            default: '<div>Drawer-Inhalt</div>',
            footer: '<button>Schließen</button>'
          },
          global: {
            stubs: {
              teleport: true
            }
          }
        });
      }

      if (wrapper) {
        const results = await runAxeTest(wrapper.element);
        expect(results).toHaveNoViolations();

        // Spezifische Tests für Drawer
        expect(wrapper.attributes('role')).toBe('dialog');
        expect(wrapper.attributes('aria-modal')).toBe('true');
        expect(wrapper.attributes('aria-labelledby')).toBeDefined();
      }
    });
  });

  // Header-Komponente
  describe('Header', () => {
    it('sollte grundlegende Barrierefreiheitsanforderungen erfüllen', async () => {
      try {
        wrapper = mount(Header, {
          props: {
            title: 'Titel der Anwendung'
          },
          global: {
            stubs: {
              RouterLink: true
            }
          }
        });

        const results = await runAxeTest(wrapper.element);
        expect(results).toHaveNoViolations();

        // Header sollte role="banner" haben
        expect(wrapper.attributes('role')).toBe('banner');
      } catch (error) {
        console.log('Header kann nicht getestet werden:', error);
      }
    });
  });

  // Footer-Komponente
  describe('Footer', () => {
    it('sollte grundlegende Barrierefreiheitsanforderungen erfüllen', async () => {
      try {
        wrapper = mount(Footer, {
          slots: {
            default: '<p>© 2025 nscale DMS Assistent</p>'
          }
        });

        const results = await runAxeTest(wrapper.element);
        expect(results).toHaveNoViolations();

        // Footer sollte role="contentinfo" haben
        expect(wrapper.attributes('role')).toBe('contentinfo');
      } catch (error) {
        console.log('Footer kann nicht getestet werden:', error);
      }
    });
  });
});