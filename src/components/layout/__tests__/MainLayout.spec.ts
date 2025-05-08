import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import MainLayout from '../MainLayout.vue';
import Header from '../Header.vue';
import Sidebar from '../Sidebar.vue';

// Mock für Header und Sidebar
vi.mock('../Header.vue', () => ({
  default: {
    name: 'Header',
    setup: () => ({}),
    render: () => null
  }
}));

vi.mock('../Sidebar.vue', () => ({
  default: {
    name: 'Sidebar',
    setup: () => ({}),
    render: () => null
  }
}));

describe('MainLayout', () => {
  // Test grundlegende Rendering-Funktionalität
  it('rendert korrekt mit Standard-Props', () => {
    const wrapper = mount(MainLayout);
    
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.classes()).toContain('n-main-layout');
    expect(wrapper.find('.n-main-layout__header').exists()).toBe(true);
    expect(wrapper.find('.n-main-layout__sidebar').exists()).toBe(true);
    expect(wrapper.find('.n-main-layout__content').exists()).toBe(true);
    expect(wrapper.find('.n-main-layout__footer').exists()).toBe(true);
  });
  
  // Test für bedingte Rendering von Komponenten
  it('rendert Header, Sidebar und Footer basierend auf Props', async () => {
    const wrapper = mount(MainLayout, {
      props: {
        showHeader: true,
        showSidebar: true,
        showFooter: true
      }
    });
    
    expect(wrapper.find('.n-main-layout__header').exists()).toBe(true);
    expect(wrapper.find('.n-main-layout__sidebar').exists()).toBe(true);
    expect(wrapper.find('.n-main-layout__footer').exists()).toBe(true);
    
    await wrapper.setProps({ showHeader: false });
    expect(wrapper.find('.n-main-layout__header').exists()).toBe(false);
    
    await wrapper.setProps({ showSidebar: false });
    expect(wrapper.find('.n-main-layout__sidebar').exists()).toBe(false);
    
    await wrapper.setProps({ showFooter: false });
    expect(wrapper.find('.n-main-layout__footer').exists()).toBe(false);
  });
  
  // Test für das Umschalten der Sidebar
  it('schaltet den Sidebar-Kollaps-Zustand korrekt um', async () => {
    const wrapper = mount(MainLayout, {
      props: {
        sidebarCollapsed: false
      }
    });
    
    expect(wrapper.classes()).not.toContain('n-main-layout--sidebar-collapsed');
    
    await wrapper.setProps({ sidebarCollapsed: true });
    expect(wrapper.classes()).toContain('n-main-layout--sidebar-collapsed');
    
    // Teste die toggleSidebar-Methode
    // @ts-ignore - Wir greifen auf die innere Komponenten-Instanz zu
    wrapper.vm.toggleSidebar();
    
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:sidebarCollapsed')).toBeTruthy();
    expect(wrapper.emitted('sidebar-toggle')).toBeTruthy();
    
    // Überprüfe den Wert des emittierten Events
    expect(wrapper.emitted('update:sidebarCollapsed')?.[0]).toEqual([false]);
  });
  
  // Test für Theme-Klassen
  it('wendet die richtige Theme-Klasse an', async () => {
    const wrapper = mount(MainLayout, {
      props: {
        theme: 'light'
      }
    });
    
    expect(wrapper.classes()).toContain('n-main-layout--light');
    
    await wrapper.setProps({ theme: 'dark' });
    expect(wrapper.classes()).toContain('n-main-layout--dark');
    
    await wrapper.setProps({ theme: 'system' });
    expect(wrapper.classes()).toContain('n-main-layout--system');
  });
  
  // Test für Slots
  it('rendert Slots korrekt', () => {
    const wrapper = mount(MainLayout, {
      slots: {
        header: '<div class="test-header">Header Slot</div>',
        sidebar: '<div class="test-sidebar">Sidebar Slot</div>',
        default: '<div class="test-content">Content Slot</div>',
        footer: '<div class="test-footer">Footer Slot</div>'
      }
    });
    
    expect(wrapper.find('.test-header').exists()).toBe(true);
    expect(wrapper.find('.test-sidebar').exists()).toBe(true);
    expect(wrapper.find('.test-content').exists()).toBe(true);
    expect(wrapper.find('.test-footer').exists()).toBe(true);
  });
});