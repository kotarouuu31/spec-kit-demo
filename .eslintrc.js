module.exports = {
  env: {
    browser: true,
    es2022: true,
    node: true,
    vitest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    // コードスタイル
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'never'],
    
    // ベストプラクティス
    'no-console': 'warn',
    'no-unused-vars': 'error',
    'no-undef': 'error',
    
    // ES2022 features
    'prefer-const': 'error',
    'prefer-arrow-callback': 'error',
    'arrow-spacing': 'error'
  },
  globals: {
    // Vitest globals
    'describe': 'readonly',
    'it': 'readonly',
    'expect': 'readonly',
    'beforeEach': 'readonly',
    'afterEach': 'readonly',
    'vi': 'readonly'
  }
}