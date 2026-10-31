/**
 * Enforces the Clean Architecture dependency rule in CI: dependencies only point inwards.
 * domain <- application <- adapters <- infrastructure / ui <- main (composition root)
 */
module.exports = {
  forbidden: [
    {
      name: 'domain-is-pure',
      comment: 'Layer 1 (domain) must not import any other layer or any npm package.',
      severity: 'error',
      from: { path: '^src/domain' },
      to: { pathNot: '^src/domain' },
    },
    {
      name: 'application-depends-only-on-domain',
      severity: 'error',
      from: { path: '^src/application' },
      to: { pathNot: '^src/(domain|application)' },
    },
    {
      name: 'adapters-do-not-know-frameworks',
      severity: 'error',
      from: { path: '^src/adapters' },
      to: { path: '^src/(infrastructure|ui|main)' },
    },
    {
      name: 'engine-does-not-know-variants',
      comment: 'The generic engine must never reference a concrete variant (OCP/LSP).',
      severity: 'error',
      from: { path: '^src/domain/(engine|board|geometry|pieces|scoring|commands|capabilities)' },
      to: { path: '^src/domain/variants' },
    },
    {
      name: 'variants-are-independent',
      severity: 'error',
      from: { path: '^src/domain/variants/([^/]+)/' },
      to: { path: '^src/domain/variants/', pathNot: '^src/domain/variants/$1/' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
  },
};
