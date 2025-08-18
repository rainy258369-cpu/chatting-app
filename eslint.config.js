import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-plugin-prettier'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      prettier, // ✅ 新增
    },
    rules: {
      // ✅ 相当于 .eslintrc.cjs 里的 "prettier"，并忽略 Windows 的换行符差异
      'prettier/prettier': ['error', { endOfLine: 'auto' }],

      // ✅ React 17+ 不需要 import React
      'react/react-in-jsx-scope': 'off',
    },
  },
])
