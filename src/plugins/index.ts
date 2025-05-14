/**
 * Zentrale Registrierung aller globalen Vue-Plugins
 */

import { App, Plugin } from 'vue'
import { createDialogPlugin } from './dialog'

// Interface für Plugin-Registrierung
interface PluginRegistration {
  name: string
  plugin: Plugin
  options?: Record<string, any>
}

// Dialog-Plugin erstellen
const dialogPlugin = createDialogPlugin({
  defaultOptions: {
    dismissable: true,
    backdropClose: true,
    transition: 'fade',
    maxWidth: '500px'
  }
})

// Mock-Service-Provider importieren
import { mockServiceProvider } from './mockServiceProvider'

// Sammlung aller globalen Plugins
export const globalPlugins: PluginRegistration[] = [
  {
    name: 'dialog',
    plugin: dialogPlugin
  },
  {
    name: 'mockServiceProvider',
    plugin: mockServiceProvider
  }
  // Weitere Plugins hier hinzufügen
]

/**
 * Registriert alle globalen Plugins in einer Vue-Instanz
 */
export function registerGlobalPlugins(app: App): void {
  globalPlugins.forEach(pluginRegistration => {
    app.use(pluginRegistration.plugin, pluginRegistration.options)
  })
}

// Export einzelner Plugins für spezifischen Import
export { createDialogPlugin } from './dialog'