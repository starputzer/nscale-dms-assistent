/**
 * Zentrale Registrierung aller globalen Vue-Direktiven
 */

import { Directive } from 'vue'
import * as touchDirectives from './touch-directives'
import * as enhancedTouchDirectives from './enhanced-touch-directives'

// Interface für Direktiven-Registrierung
interface DirectiveRegistration {
  name: string
  definition: Directive
}

// Sammlung aller globalen Direktiven
export const globalDirectives: DirectiveRegistration[] = [
  // Touch-Direktiven
  {
    name: 'touch-swipe',
    definition: touchDirectives.touchSwipe
  },
  {
    name: 'touch-tap',
    definition: touchDirectives.touchTap
  },
  {
    name: 'touch-long-press',
    definition: touchDirectives.touchLongPress
  },
  
  // Erweiterte Touch-Direktiven
  {
    name: 'enhanced-swipe',
    definition: enhancedTouchDirectives.enhancedSwipe
  },
  {
    name: 'enhanced-tap',
    definition: enhancedTouchDirectives.enhancedTap
  },
  {
    name: 'enhanced-long-press',
    definition: enhancedTouchDirectives.enhancedLongPress
  },
  {
    name: 'enhanced-pan',
    definition: enhancedTouchDirectives.enhancedPan
  },
  {
    name: 'enhanced-pinch',
    definition: enhancedTouchDirectives.enhancedPinch
  }
]

/**
 * Registriert alle globalen Direktiven in einer Vue-Instanz
 */
export function registerGlobalDirectives(app: any): void {
  globalDirectives.forEach(directive => {
    app.directive(directive.name, directive.definition)
  })
}

// Export einzelner Direktiven für spezifischen Import
export {
  touchSwipe,
  touchTap,
  touchLongPress
} from './touch-directives'

export {
  enhancedSwipe,
  enhancedTap,
  enhancedLongPress,
  enhancedPan,
  enhancedPinch
} from './enhanced-touch-directives'