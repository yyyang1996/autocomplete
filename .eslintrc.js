const OFF = 0;
// const WARNING = 1;
const ERROR = 2;

module.exports = {
  extends: ['algolia', 'algolia/jest', 'algolia/react', 'algolia/typescript'],
  globals: {
    __DEV__: false,
    __TEST__: false,
  },
  settings: {
    react: {
      pragma: 'React',
      version: 'detect',
    },
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts', '.tsx'],
      },
    },
  },
  rules: {
    curly: 2,
    'no-param-reassign': OFF,
    'valid-jsdoc': OFF,
    'no-shadow': OFF,
    'prefer-template': OFF,
    'jest/no-disabled-tests': OFF,
    'react/prop-types': OFF,
    'react/no-unescaped-entities': OFF,
    'new-cap': OFF,
    'eslint-comments/disable-enable-pair': [ERROR, { allowWholeFile: true }],
    'import/extensions': OFF,
    '@typescript-eslint/camelcase': [
      ERROR,
      {
        allow: ['__autocomplete_'],
      },
    ],
    // Useful to call functions like `nodeItem?.scrollIntoView()`.
    'no-unused-expressions': OFF,
    complexity: OFF,
    'import/order': [
      ERROR,
      {
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
        'newlines-between': 'always',
        groups: ['builtin', 'external', 'parent', 'sibling', 'index'],
        pathGroups: [
          {
            pattern: '@/**/*',
            group: 'parent',
            position: 'before',
          },
        ],
        pathGroupsExcludedImportTypes: ['builtin'],
      },
    ],
  },
  overrides: [
    {
      files: ['test/**/*'],
      rules: {
        'import/no-extraneous-dependencies': OFF,
      },
    },
    {
      files: ['packages/autocomplete-js/**/*/setProperties.ts'],
      rules: {
        'eslint-comments/no-unlimited-disable': OFF,
      },
    },
    {
      files: ['packages/website/**/*'],
      rules: {
        'import/no-extraneous-dependencies': OFF,
        'import/no-unresolved': [
          ERROR,
          { ignore: ['^@theme', '^@docusaurus', '^@generated'] },
        ],
      },
    },
    {
      files: ['**/rollup.config.js', 'stories/**/*', '**/__tests__/**'],
      rules: {
        'import/no-extraneous-dependencies': OFF,
      },
    },
    {
      files: ['cypress/**/*'],
      plugins: ['cypress'],
      env: {
        'cypress/globals': true,
      },
      rules: {
        'jest/expect-expect': OFF,
        'spaced-comment': OFF,
        '@typescript-eslint/triple-slash-reference': OFF,
      },
    },
    {
      files: ['scripts/**/*', '*.config.js'],
      rules: {
        'import/no-commonjs': OFF,
      },
    },
    {
      files: ['examples/**/*'],
      rules: {
        'spaced-comment': OFF,
      },
    },
  ],
};
