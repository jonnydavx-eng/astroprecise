// Flat ESLint config (ESLint 9+). Intentionally lenient at adoption — the website
// modules are vanilla browser scripts attached to `window`, so cross-module globals
// are expected. Rules are tuned to surface real problems (unused vars, unsafe
// patterns) without drowning the first run in style noise. Tighten over the
// overhaul waves (see OVERHAUL-PLAN.md). Activate with `npm install`.
import js from '@eslint/js'
import globals from 'globals'

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', 'app/**', 'website/js/vendor/**', 'tools/visual-check/tmp/**'] },

  // Website modules — browser scripts (not ES modules yet; that's a later wave).
  {
    files: ['website/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
        // Project-wide cross-module globals (see `window.*` map in the audit).
        AP_MON: 'writable',
        AP_NAV: 'writable',
        AP_SOCIAL: 'writable',
        AstroInterpretations: 'writable',
        AstroChartRender: 'writable',
        AstroEphemeris: 'writable',
        AstroProfile: 'writable',
        ZodiacSphere: 'writable',
        Interpretations: 'writable',
        loadInterpretations: 'writable',
        normalizeAngle: 'writable',
        deferPageCss: 'writable',
        deferMainCss: 'writable',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', { args: 'none', ignoreRestSiblings: true }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-constant-condition': ['warn', { checkLoops: false }],
      'no-cond-assign': ['error', 'except-parens'],
      'no-undef': 'warn',
    },
  },

  // Node ES-module test/tool scripts.
  {
    files: ['test-*.mjs', 'tools/**/*.mjs', 'ephemeris-package/**/*.{mjs,cjs,js}', '*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', { args: 'none' }],
    },
  },
]
