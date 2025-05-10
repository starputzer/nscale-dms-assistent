import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import Sidebar from '@/components/layout/Sidebar.vue';

describe('Sidebar.vue', () => {
  const defaultItems = [
    { id: 'item1', label: 'Item 1', icon: 'icon-home' },
    { id: 'item2', label: 'Item 2', icon: 'icon-settings' },
    { id: 'item3', label: 'Item 3', icon: 'icon-user', active: true },
    {
      id: 'item4',
      label: 'Item 4 with children',
      icon: 'icon-folder',
      children: [
        { id: 'item4-1', label: 'Child 1', icon: 'icon-file' },
        { id: 'item4-2', label: 'Child 2', icon: 'icon-file' }
      ]
    }
  ];
  
  const createWrapper = (props = {}) => {
    return mount(Sidebar, {
      props: {
        items: defaultItems,
        ...props
      },
      global: {
        stubs: {
          RouterLink: true
        }
      }
    });
  };
  
  it('renders correctly with default props', () => {
    const wrapper = createWrapper();
    
    expect(wrapper.find('.n-sidebar').exists()).toBe(true);
    expect(wrapper.find('.n-sidebar__title').text()).toBe('Navigation');
    expect(wrapper.findAll('.n-sidebar__nav-item').length).toBe(defaultItems.length);
  });
  
  it('toggles collapse state when toggle button is clicked', async () => {
    const wrapper = createWrapper();
    const toggleButton = wrapper.find('.n-sidebar__toggle-btn');
    
    await toggleButton.trigger('click');
    
    expect(wrapper.emitted()).toHaveProperty('collapse');
    expect(wrapper.emitted().collapse[0]).toEqual([true]);
  });
  
  it('expands and collapses submenu items', async () => {
    const wrapper = createWrapper();
    
    // Find the item with children
    const itemWithChildren = wrapper.findAll('.n-sidebar__nav-item').at(3);
    
    // Click on it to expand
    await itemWithChildren.find('.n-sidebar__nav-link-wrapper').trigger('click');
    
    // Check that it emitted the correct events
    expect(wrapper.emitted()).toHaveProperty('item-expand');
    expect(wrapper.emitted()['item-expand'][0]).toEqual(['item4', true]);
    
    // Click again to collapse
    await itemWithChildren.find('.n-sidebar__nav-link-wrapper').trigger('click');
    
    // Check that it emitted the correct events again
    expect(wrapper.emitted()['item-expand'][1]).toEqual(['item4', false]);
  });
  
  it('renders favorited items correctly when showFavorites is true', async () => {
    const wrapper = createWrapper({
      showFavorites: true,
      favorites: ['item1', 'item3']
    });
    
    // Should have a favorites section
    expect(wrapper.find('.n-sidebar__favorites').exists()).toBe(true);
    
    // Should have 2 favorited items
    expect(wrapper.findAll('.n-sidebar__nav-item--favorite').length).toBe(2);
    
    // Should have 2 remaining regular items
    expect(wrapper.findAll('.n-sidebar__nav-list').at(1).findAll('.n-sidebar__nav-item').length).toBe(2);
  });
  
  it('handles adding a favorite item', async () => {
    const wrapper = createWrapper({
      showFavorites: true,
      favorites: ['item1']
    });
    
    // Find 'Add to favorites' button on a non-favorited item
    const addFavoriteButton = wrapper.findAll('.n-sidebar__nav-item').at(1)
      .find('.n-sidebar__action-button--add-favorite');
    
    // Click it
    await addFavoriteButton.trigger('click');
    
    // Check that it emitted the correct event
    expect(wrapper.emitted()).toHaveProperty('add-favorite');
    expect(wrapper.emitted()['add-favorite'][0]).toEqual(['item2']);
  });
  
  it('handles removing a favorite item', async () => {
    const wrapper = createWrapper({
      showFavorites: true,
      favorites: ['item1', 'item3']
    });
    
    // Find 'Remove from favorites' button on a favorited item
    const removeFavoriteButton = wrapper.findAll('.n-sidebar__nav-item--favorite').at(0)
      .find('.n-sidebar__action-button--remove-favorite');
    
    // Click it
    await removeFavoriteButton.trigger('click');
    
    // Check that it emitted the correct event
    expect(wrapper.emitted()).toHaveProperty('remove-favorite');
    expect(wrapper.emitted()['remove-favorite'][0]).toEqual(['item1']);
  });
  
  it('supports drag and drop for item reordering', async () => {
    const wrapper = createWrapper({
      draggable: true
    });
    
    // Mock drag and drop events
    const dragStartEvent = new Event('dragstart');
    Object.defineProperty(dragStartEvent, 'dataTransfer', {
      value: { setData: vi.fn(), effectAllowed: null }
    });
    
    const dropEvent = new Event('drop');
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: { getData: () => 'item1' }
    });
    dropEvent.preventDefault = vi.fn();
    dropEvent.stopPropagation = vi.fn();
    
    // Start dragging the first item
    const firstItem = wrapper.findAll('.n-sidebar__nav-item').at(0);
    await firstItem.trigger('dragstart', dragStartEvent);
    
    // Drop it on the third item
    const thirdItem = wrapper.findAll('.n-sidebar__nav-item').at(2);
    await thirdItem.trigger('drop', dropEvent);
    
    // Check that the correct event was emitted
    expect(wrapper.emitted()).toHaveProperty('reorder');
  });
  
  it('opens context menu on right-click', async () => {
    const wrapper = createWrapper();
    
    // Mock right-click event
    const contextMenuEvent = new MouseEvent('contextmenu');
    Object.defineProperty(contextMenuEvent, 'clientX', { value: 100 });
    Object.defineProperty(contextMenuEvent, 'clientY', { value: 100 });
    contextMenuEvent.preventDefault = vi.fn();
    
    // Right-click on an item
    const item = wrapper.findAll('.n-sidebar__nav-item').at(0);
    await item.trigger('contextmenu', contextMenuEvent);
    
    // Check that the correct event was emitted
    expect(wrapper.emitted()).toHaveProperty('context-menu');
    expect(wrapper.emitted()['context-menu'][0][0]).toEqual(defaultItems[0]);
  });
  
  it('supports collapse on mobile when autoCollapseOnMobile is true', async () => {
    // Mock the layout context
    const mockLayoutContext = {
      isMobile: { value: true },
      toggleSidebar: vi.fn()
    };
    
    // Mount with provide/inject
    const wrapper = mount(Sidebar, {
      props: {
        items: defaultItems,
        autoCollapseOnMobile: true
      },
      global: {
        provide: {
          layout: mockLayoutContext
        }
      }
    });
    
    // Should emit collapse event with true
    expect(wrapper.emitted()).toHaveProperty('collapse');
    expect(wrapper.emitted().collapse[0]).toEqual([true]);
    
    // Should call layout context's toggleSidebar
    expect(mockLayoutContext.toggleSidebar).toHaveBeenCalled();
  });
  
  it('supports accordion mode for menu items', async () => {
    const wrapper = createWrapper({
      mode: 'accordion',
      defaultExpanded: ['item4']
    });
    
    // Click on another expandable item
    const itemWithoutChildren = wrapper.findAll('.n-sidebar__nav-item').at(0);
    
    // Create a child for this item temporarily
    await wrapper.setProps({
      items: [
        { 
          id: 'item1', 
          label: 'Item 1', 
          icon: 'icon-home',
          children: [{ id: 'item1-1', label: 'Child 1' }]
        },
        ...defaultItems.slice(1)
      ]
    });
    
    // Now click to expand
    await itemWithoutChildren.find('.n-sidebar__nav-link-wrapper').trigger('click');
    
    // In accordion mode, the previously expanded item should collapse
    const expandedItems = wrapper.vm.expandedItems;
    expect(expandedItems.length).toBe(1);
    expect(expandedItems[0]).toBe('item1');
  });
});