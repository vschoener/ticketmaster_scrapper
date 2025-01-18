import pluginJs from '@eslint/js'
import tseslint from 'typescript-eslint'

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ['**/*.{js,mjs,cjs,ts}'] },
  {
    ignores: [
      'node_modules/**', // Ignorer le dossier node_modules
      'dist/**', // Ignorer le dossier de build
    ],
  },
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
    },
  },
  {
    'overrides': [
      {
        'files': ['tests/**/*'],
        'env': {
          'jest': true,
        },
      },
    ],
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
]
