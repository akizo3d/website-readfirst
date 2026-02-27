import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

const browserAndRuntimeGlobals = {
  window: 'readonly',
  document: 'readonly',
  localStorage: 'readonly',
  fetch: 'readonly',
  crypto: 'readonly',
  DOMParser: 'readonly',
  File: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  RequestInit: 'readonly',
  Response: 'readonly',
  setTimeout: 'readonly',
  CanvasRenderingContext2D: 'readonly',
  HTMLElement: 'readonly',
  process: 'readonly',
  alert: 'readonly',
};

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'api/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: browserAndRuntimeGlobals,
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];
