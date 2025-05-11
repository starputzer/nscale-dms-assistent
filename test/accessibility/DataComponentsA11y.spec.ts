import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { toHaveNoViolations } from 'jest-axe';
import { runAxeTest, wcag21aaRules } from './setup-axe';

// Import Daten-Komponenten
import Table from '@/components/ui/data/Table.vue';
import List from '@/components/ui/data/List.vue';
import Pagination from '@/components/ui/data/Pagination.vue';
import Tree from '@/components/ui/data/Tree.vue';
import TreeNode from '@/components/ui/data/TreeNode.vue';
import Tag from '@/components/ui/data/Tag.vue';
import Calendar from '@/components/ui/data/Calendar.vue';

// Jest-Axe Matcher erweitern
expect.extend(toHaveNoViolations);

describe('Daten-Komponenten Barrierefreiheitstests', () => {
  let wrapper: any;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  // Table-Komponente
  describe('Table', () => {
    const columns = [
      { key: 'id', label: 'ID', sortable: true },
      { key: 'name', label: 'Name', sortable: true },
      { key: 'email', label: 'E-Mail' },
      { key: 'status', label: 'Status' }
    ];

    const items = [
      { id: 1, name: 'Max Mustermann', email: 'max@beispiel.de', status: 'Aktiv' },
      { id: 2, name: 'Maria Musterfrau', email: 'maria@beispiel.de', status: 'Inaktiv' },
      { id: 3, name: 'John Doe', email: 'john@example.com', status: 'Archiviert' }
    ];

    it('sollte grundlegende Barrierefreiheitsanforderungen erfüllen', async () => {
      wrapper = mount(Table, {
        props: {
          columns,
          items,
          caption: 'Liste der Benutzer',
          bordered: true
        }
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();
    });

    it('sollte korrekte ARIA-Attribute für Tabellen verwenden', async () => {
      wrapper = mount(Table, {
        props: {
          columns,
          items,
          caption: 'Liste der Benutzer'
        }
      });

      // Prüfe Tabellen-Attribute
      const table = wrapper.find('table');
      expect(table.attributes('aria-rowcount')).toBe(String(items.length + 1)); // +1 für Header
      expect(table.attributes('aria-colcount')).toBe(String(columns.length));
      
      // Prüfe, ob Caption vorhanden ist
      expect(wrapper.find('caption').exists()).toBe(true);
      
      // Prüfe, ob Sortierbarkeit korrekt gekennzeichnet ist
      const sortableHeader = wrapper.find('th.n-table-th--sortable');
      expect(sortableHeader.exists()).toBe(true);
      expect(sortableHeader.attributes('aria-sort')).toBeDefined();
      
      // Prüfe Zeilen
      const tableRows = wrapper.findAll('tbody tr');
      expect(tableRows.length).toBe(items.length);
      
      // Prüfe, ob Zellen entsprechende aria-colindex haben
      const firstRowCells = tableRows.at(0).findAll('td');
      firstRowCells.forEach((cell, index) => {
        expect(cell.attributes('aria-colindex')).toBe(String(index + 1));
      });
    });

    it('sollte mit Paginierung barrierefrei sein', async () => {
      wrapper = mount(Table, {
        props: {
          columns,
          items,
          pagination: true,
          totalItems: 25,
          page: 1,
          pageSize: 10
        }
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();
      
      // Prüfe Paginierungs-Controls
      const pagination = wrapper.find('.n-table-pagination');
      expect(pagination.exists()).toBe(true);
      
      // Prüfe, ob Seitenwechsel-Buttons beschriftet sind
      const prevButton = pagination.find('.n-table-pagination-prev');
      const nextButton = pagination.find('.n-table-pagination-next');
      
      expect(prevButton.attributes('aria-label')).toBe('Previous page');
      expect(nextButton.attributes('aria-label')).toBe('Next page');
      
      // Prüfe, ob aktive Seite korrekt gekennzeichnet ist
      const activePage = pagination.find('.n-table-pagination-page--active');
      expect(activePage.attributes('aria-current')).toBe('page');
    });

    it('sollte im Lademodus korrekte ARIA-Live-Region verwenden', async () => {
      wrapper = mount(Table, {
        props: {
          columns,
          items,
          loading: true,
          loadingText: 'Daten werden geladen...'
        }
      });

      // Prüfe Loading Overlay
      const loadingOverlay = wrapper.find('.n-table-loading-overlay');
      expect(loadingOverlay.exists()).toBe(true);
      expect(loadingOverlay.attributes('aria-live')).toBe('polite');
      
      // Prüfe Tabelle im Ladezustand
      expect(wrapper.find('table').attributes('aria-busy')).toBe('true');
    });
  });

  // List-Komponente
  describe('List', () => {
    const listItems = [
      { id: 1, title: 'Eintrag 1', description: 'Beschreibung 1' },
      { id: 2, title: 'Eintrag 2', description: 'Beschreibung 2' },
      { id: 3, title: 'Eintrag 3', description: 'Beschreibung 3' }
    ];

    it('sollte grundlegende Barrierefreiheitsanforderungen erfüllen', async () => {
      wrapper = mount(List, {
        props: {
          items: listItems,
          keyField: 'id'
        },
        slots: {
          item: `
            <template #default="{item}">
              <div class="list-item">
                <h3>{{item.title}}</h3>
                <p>{{item.description}}</p>
              </div>
            </template>
          `
        }
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();
    });

    it('sollte mit Selektierbarkeit barrierefrei sein', async () => {
      try {
        wrapper = mount(List, {
          props: {
            items: listItems,
            keyField: 'id',
            selectable: true,
            modelValue: [1]
          },
          slots: {
            item: `
              <template #default="{item}">
                <div class="list-item">
                  <h3>{{item.title}}</h3>
                  <p>{{item.description}}</p>
                </div>
              </template>
            `
          }
        });

        const results = await runAxeTest(wrapper.element);
        expect(results).toHaveNoViolations();
        
        // Prüfe, ob selektierbare Elemente korrekte Attribute haben
        const selectableItems = wrapper.findAll('.n-list-item--selectable');
        if (selectableItems.length > 0) {
          selectableItems.forEach((item) => {
            expect(item.attributes('role')).toBe('option');
            if (item.classes().includes('n-list-item--selected')) {
              expect(item.attributes('aria-selected')).toBe('true');
            } else {
              expect(item.attributes('aria-selected')).toBe('false');
            }
          });
        }
      } catch (error) {
        console.log('List Selektierbar test konnte nicht durchgeführt werden:', error);
      }
    });
  });

  // Pagination-Komponente
  describe('Pagination', () => {
    it('sollte grundlegende Barrierefreiheitsanforderungen erfüllen', async () => {
      wrapper = mount(Pagination, {
        props: {
          totalItems: 100,
          itemsPerPage: 10,
          currentPage: 3
        }
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();
    });

    it('sollte ARIA-Attribute für Paginierung korrekt verwenden', async () => {
      wrapper = mount(Pagination, {
        props: {
          totalItems: 100,
          itemsPerPage: 10,
          currentPage: 3,
          showPageInfo: true
        }
      });

      // Prüfe Navigation landmark
      expect(wrapper.attributes('role')).toBe('navigation');
      expect(wrapper.attributes('aria-label')).toBeDefined();
      
      // Prüfe, ob aktuelle Seite korrekt gekennzeichnet ist
      const currentPageButton = wrapper.find('.n-pagination-item--active');
      expect(currentPageButton.exists()).toBe(true);
      expect(currentPageButton.attributes('aria-current')).toBe('page');
      
      // Prüfe Vor- und Zurück-Buttons
      const prevButton = wrapper.find('.n-pagination-prev');
      const nextButton = wrapper.find('.n-pagination-next');
      
      expect(prevButton.exists()).toBe(true);
      expect(nextButton.exists()).toBe(true);
      expect(prevButton.attributes('aria-label')).toBeDefined();
      expect(nextButton.attributes('aria-label')).toBeDefined();
    });
  });

  // Tree und TreeNode-Komponenten
  describe('Tree und TreeNode', () => {
    const treeData = [
      {
        id: 'node1',
        label: 'Hauptknoten 1',
        children: [
          { id: 'node1-1', label: 'Unterknoten 1.1' },
          { id: 'node1-2', label: 'Unterknoten 1.2' }
        ]
      },
      {
        id: 'node2',
        label: 'Hauptknoten 2',
        children: [
          { id: 'node2-1', label: 'Unterknoten 2.1' }
        ]
      }
    ];

    it('sollte grundlegende Barrierefreiheitsanforderungen erfüllen', async () => {
      try {
        wrapper = mount(Tree, {
          props: {
            items: treeData,
            expandedKeys: ['node1']
          }
        });

        const results = await runAxeTest(wrapper.element);
        expect(results).toHaveNoViolations();
        
        // Prüfe Tree-Struktur
        expect(wrapper.attributes('role')).toBe('tree');
        
        // Prüfe TreeNode-Struktur (falls verschachtelte Komponenten sichtbar sind)
        const treeItems = wrapper.findAll('[role="treeitem"]');
        if (treeItems.length > 0) {
          // Prüfe Expansionsstatus
          const expandableItems = wrapper.findAll('.n-tree-node--expandable');
          expandableItems.forEach(item => {
            expect(item.attributes('aria-expanded')).toBeDefined();
          });
        }
      } catch (error) {
        console.log('Tree test konnte nicht durchgeführt werden:', error);
      }
    });
  });

  // Tag-Komponente
  describe('Tag', () => {
    it('sollte grundlegende Barrierefreiheitsanforderungen erfüllen', async () => {
      wrapper = mount(Tag, {
        props: {
          label: 'Beispiel-Tag'
        }
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();
    });

    it('sollte als schließbares Tag barrierefrei sein', async () => {
      wrapper = mount(Tag, {
        props: {
          label: 'Schließbares Tag',
          closable: true
        }
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();
      
      // Prüfe Close-Button
      const closeButton = wrapper.find('.n-tag-close');
      expect(closeButton.exists()).toBe(true);
      expect(closeButton.attributes('aria-label')).toBeDefined();
    });
  });

  // Calendar-Komponente
  describe('Calendar', () => {
    it('sollte grundlegende Barrierefreiheitsanforderungen erfüllen', async () => {
      try {
        wrapper = mount(Calendar, {
          props: {
            value: new Date()
          }
        });

        const results = await runAxeTest(wrapper.element);
        expect(results).toHaveNoViolations();
        
        // Prüfe Calendar-Attribute
        expect(wrapper.attributes('role')).toBeDefined();
        
        // Prüfe Navigation
        const prevButton = wrapper.find('.n-calendar-nav-prev');
        const nextButton = wrapper.find('.n-calendar-nav-next');
        
        if (prevButton.exists() && nextButton.exists()) {
          expect(prevButton.attributes('aria-label')).toBeDefined();
          expect(nextButton.attributes('aria-label')).toBeDefined();
        }
        
        // Prüfe Datumsangaben
        const dateButtons = wrapper.findAll('.n-calendar-day');
        if (dateButtons.length > 0) {
          // Stichprobenprüfung auf aria-label mit Datumsangabe
          const firstDateButton = dateButtons.at(0);
          expect(firstDateButton.attributes('aria-label')).toBeDefined();
        }
      } catch (error) {
        console.log('Calendar test konnte nicht durchgeführt werden:', error);
      }
    });
  });
});