
// Lazy loading helper for Vue components
export function lazyLoadComponent(path: string) {
  return () => import(/* @vite-ignore */ path);
}

// Preload critical components
export function preloadComponents(components: string[]) {
  components.forEach(comp => {
    import(/* @vite-ignore */ comp);
  });
}

// Usage in router:
// component: lazyLoadComponent('./views/AdminView.vue')
