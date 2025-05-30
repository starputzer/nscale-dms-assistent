/**
 * Bundle-Optimierung-Utilities
 *
 * Diese Datei enthält Funktionen zur Reduzierung der Bundle-Größe
 * und Lazy-Loading von großen Bibliotheken
 */

// Lazy-load marked für Markdown-Rendering
export const loadMarkdownRenderer = async () => {
  const { marked } = await import("marked");
  const { default: DOMPurify } = await import("dompurify");

  return {
    render: (markdown: string): string => {
      const html = marked(markdown);
      return DOMPurify.sanitize(html);
    },
  };
};

// Lazy-load highlight.js für Code-Highlighting
export const loadCodeHighlighter = async () => {
  const { default: hljs } = await import("highlight.js/lib/core");

  // Lade nur die benötigten Sprachen
  const [javascript, typescript, json, css, html, python, sql] =
    await Promise.all([
      import("highlight.js/lib/languages/javascript"),
      import("highlight.js/lib/languages/typescript"),
      import("highlight.js/lib/languages/json"),
      import("highlight.js/lib/languages/css"),
      import("highlight.js/lib/languages/xml"), // HTML
      import("highlight.js/lib/languages/python"),
      import("highlight.js/lib/languages/sql"),
    ]);

  hljs.registerLanguage("javascript", javascript.default);
  hljs.registerLanguage("typescript", typescript.default);
  hljs.registerLanguage("json", json.default);
  hljs.registerLanguage("css", css.default);
  hljs.registerLanguage("html", html.default);
  hljs.registerLanguage("python", python.default);
  hljs.registerLanguage("sql", sql.default);

  return hljs;
};

// Lazy-load date-fns locale
export const loadDateLocale = async (locale: string = "de") => {
  switch (locale) {
    case "de":
      return (await import("date-fns/locale/de")).default;
    case "en":
      return (await import("date-fns/locale/en-US")).default;
    default:
      return (await import("date-fns/locale/en-US")).default;
  }
};

// Lazy-load chart.js
export const loadChart = async () => {
  const { Chart, registerables } = await import("chart.js");
  Chart.register(...registerables);
  return Chart;
};

// Lazy-load vuedraggable
export const loadDraggable = async () => {
  const { VueDraggableNext } = await import("vuedraggable");
  return VueDraggableNext;
};

// Lazy-load größere Komponenten
export const loadAdminComponents = async () => {
  const components = await Promise.all([
    import("@/components/admin/AdminPanel.vue"),
    import("@/components/admin/AdminDashboard.vue"),
    import("@/components/admin/AdminSettings.vue"),
    import("@/components/admin/AdminUsers.vue"),
  ]);

  return {
    AdminPanel: components[0].default,
    AdminDashboard: components[1].default,
    AdminSettings: components[2].default,
    AdminUsers: components[3].default,
  };
};

// Utility zur dynamischen Icon-Ladung
export const loadIcon = async (name: string) => {
  // Lade nur das benötigte Icon statt der gesamten Icon-Bibliothek
  const iconModule = await import(`@mdi/js/mdi-${name}`);
  return iconModule.default;
};

// Optimierte Event-Handler mit Debouncing
let debounceTimer: NodeJS.Timeout | null = null;
export const optimizedDebounce = (fn: EventCallback | UnsubscribeFn, delay: number) => {
  return (...args: any[]) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fn(...args), delay);
  };
};

// Optimierte Intersection Observer für Lazy Loading
const observers = new Map<Element, IntersectionObserver>();

export const lazyLoadObserver = (
  element: Element,
  callback: () => void,
  options?: IntersectionObserverInit,
) => {
  if (observers.has(element)) {
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry: any) => {
      if (entry.isIntersecting) {
        callback();
        observer.unobserve(element);
        observers.delete(element);
      }
    });
  }, options);

  observer.observe(element);
  observers.set(element, observer);
};

// Cleanup-Funktion für Observers
export const cleanupObservers = () => {
  observers.forEach((observer: any) => observer.disconnect());
  observers.clear();
};
