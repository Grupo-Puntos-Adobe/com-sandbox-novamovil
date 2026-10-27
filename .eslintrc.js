module.exports = {
  root: true,
  extends: 'airbnb-base',
  env: {
    browser: true,
  },
  parser: '@babel/eslint-parser',
  parserOptions: {
    allowImportExportEverywhere: true,
    sourceType: 'module',
    requireConfigFile: false,
  },
  rules: {
    'import/extensions': ['error', { js: 'always' }], // require js file extensions in imports
    'linebreak-style': ['error', 'unix'], // enforce unix linebreaks
    'no-param-reassign': [2, { props: false }], // allow modifying properties of param
    curly: ['error', 'all'], // braces on every if / else / for / while
  },
  overrides: [
    {
      // vendored from the AEM boilerplate: never edited, so it keeps its own style
      files: ['scripts/aem.js'],
      rules: { curly: 'off' },
    },
    {
      // Node CLI that builds the PDF of the documentation (not served: .hlxignore)
      files: ['doc-generator/**/*.js'],
      env: { node: true, browser: false },
      parserOptions: { sourceType: 'script' },
      rules: {
        'no-console': 'off', // it reports its progress in the terminal
        // its dependencies live in doc-generator/package.json (npm install inside that folder)
        'import/no-unresolved': 'off',
      },
    },
  ],
};
