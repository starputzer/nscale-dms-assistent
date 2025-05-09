/**
 * Composable für das Tracking der Fenstergröße
 * 
 * Bietet reaktive Werte für die aktuelle Fenstergröße (Breite, Höhe)
 * und hilfreiche Berechnungen, um responsive Designs zu unterstützen.
 * 
 * Handhabt automatisch Fenster-Größenänderungen und bereinigt Event-Listener
 * bei Komponenten-Unmount.
 */

import { ref, onMounted, onUnmounted, computed } from 'vue';

export interface WindowSize {
  width: number;
  height: number;
}

export function useWindowSize() {
  // Reaktive Fenstergrößen-Werte
  const width = ref(typeof window !== 'undefined' ? window.innerWidth : 0);
  const height = ref(typeof window !== 'undefined' ? window.innerHeight : 0);
  
  // Berechnung für responsives Verhalten basierend auf Breakpoints
  const isMobile = computed(() => width.value < 768); // MD breakpoint
  const isTablet = computed(() => width.value >= 768 && width.value < 1024); // MD bis LG
  const isDesktop = computed(() => width.value >= 1024); // LG und größer
  
  // Berechnung der Orientierung
  const isPortrait = computed(() => height.value > width.value);
  const isLandscape = computed(() => width.value >= height.value);
  
  // Event-Handler für Fenstergrößenänderungen
  const handleResize = () => {
    width.value = window.innerWidth;
    height.value = window.innerHeight;
  };
  
  // Utility-Funktion zur Abfrage von Breakpoints
  const isBreakpoint = (breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'): boolean => {
    const breakpoints = {
      'xs': 0,
      'sm': 640,
      'md': 768,
      'lg': 1024,
      'xl': 1280,
      '2xl': 1536
    };
    
    const nextBreakpoint = {
      'xs': 'sm',
      'sm': 'md',
      'md': 'lg',
      'lg': 'xl',
      'xl': '2xl',
      '2xl': Infinity
    };
    
    return width.value >= breakpoints[breakpoint] && 
           (nextBreakpoint[breakpoint] === Infinity || 
            width.value < breakpoints[nextBreakpoint[breakpoint] as keyof typeof breakpoints]);
  };
  
  // Lebenszyklusmanagement
  onMounted(() => {
    // Initial-Werte aktualisieren
    handleResize();
    
    // Event-Listener registrieren
    window.addEventListener('resize', handleResize);
    
    // MediaQueryList für Orientierungsänderungen
    // Besonders wichtig für mobile Geräte
    window.matchMedia('(orientation: portrait)').addEventListener('change', handleResize);
  });
  
  onUnmounted(() => {
    // Event-Listener bereinigen
    window.removeEventListener('resize', handleResize);
    window.matchMedia('(orientation: portrait)').removeEventListener('change', handleResize);
  });
  
  // Debug-Funktion für responsive Entwicklung
  const logBreakpoints = () => {
    console.log({
      width: width.value,
      height: height.value,
      isMobile: isMobile.value,
      isTablet: isTablet.value,
      isDesktop: isDesktop.value,
      isPortrait: isPortrait.value,
      isLandscape: isLandscape.value,
      xs: isBreakpoint('xs'),
      sm: isBreakpoint('sm'),
      md: isBreakpoint('md'),
      lg: isBreakpoint('lg'),
      xl: isBreakpoint('xl'),
      '2xl': isBreakpoint('2xl')
    });
  };
  
  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isPortrait,
    isLandscape,
    isBreakpoint,
    logBreakpoints
  };
}