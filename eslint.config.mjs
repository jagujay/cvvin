import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
    {
        // Apply these settings to all TypeScript files in the monorepo
        files: ['**/*.ts', '**/*.tsx'],
        extends: [
            ...tseslint.configs.recommended,
        ],
        rules: {
            'no-unused-vars': 'off', // Turned off in favor of TS rule
            '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
            '@typescript-eslint/no-explicit-any': 'warn',
            'no-console': ['warn', { allow: ['warn', 'error', 'info'] }]
        }
    },
    {
        // Ignore build artifacts and cache folders globally
        ignores: [
            '**/dist/**',
            '**/.next/**',
            '**/node_modules/**',
            '**/.vite/**',
            'version 1/**'
        ]
    },
    eslintConfigPrettier // Disables linting rules that conflict with Prettier formatting
);