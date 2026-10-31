module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      ['engine', 'board', 'geometry', 'hexa-lines', 'hexa-fit', 'hexa-sort', 'hexa-merge',
       'levels', 'use-cases', 'aop', 'ui', 'i18n', 'audio', 'storage', 'api-client', 'ci', 'docs', 'readme', 'deps'],
    ],
  },
};
