// ESLint 9 flat config
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import prettierSkip from 'eslint-config-prettier'
import globals from 'globals'

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'public/models/**']
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  prettierSkip,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/require-v-for-key': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    }
  }
]
