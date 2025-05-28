// This file dynamically imports the CSS styles for the admin panel
import { onMounted } from 'vue';

export function useAdminStyles() {
  onMounted(() => {
    // Create and append stylesheet links
    const adminSidebarLink = document.createElement('link');
    adminSidebarLink.rel = 'stylesheet';
    adminSidebarLink.href = '/assets/styles/admin-sidebar.css';
    
    const adminOverridesLink = document.createElement('link');
    adminOverridesLink.rel = 'stylesheet';
    adminOverridesLink.href = '/assets/styles/admin-overrides.css';
    
    const adminDirectFixLink = document.createElement('link');
    adminDirectFixLink.rel = 'stylesheet';
    adminDirectFixLink.href = '/assets/styles/admin-direct-fix.css';
    
    // Add to head, prioritizing the direct fix to override any other styles
    document.head.appendChild(adminSidebarLink);
    document.head.appendChild(adminOverridesLink);
    document.head.appendChild(adminDirectFixLink);
    
    // Also add inline styles for the most critical fixes
    const inlineStyle = document.createElement('style');
    inlineStyle.textContent = `
      .admin-panel__nav-item { display: flex !important; }
      .admin-panel__nav-label { display: inline-block !important; visibility: visible !important; }
    `;
    document.head.appendChild(inlineStyle);
  });
}