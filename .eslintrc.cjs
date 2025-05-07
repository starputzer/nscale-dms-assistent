/* eslint-env node */
module.exports = {
  root: true,
  'extends': [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/eslint-config-typescript',
    '@vue/eslint-config-prettier'
  ],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  rules: {
    // Für schrittweise Migration: Warnungen statt Fehler für viele Regeln
    'no-unused-vars': 'warn',
    'no-undef': 'warn',
    'vue/multi-word-component-names': 'off',
    'vue/no-deprecated-slot-attribute': 'off',
    'vue/no-v-for-template-key': 'off'
  }
}