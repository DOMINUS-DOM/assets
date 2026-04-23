/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  // Serial execution: the DB-backed suites (multi-tenant-isolation,
  // onboarding-menu, settings-regression) share the Neon `test` branch
  // pooler. Running them concurrently causes flaky "POST replace" where
  // the cascade+reseed transaction races with other suites' reads.
  // Serial is ~2x slower (55s vs ~28s) but 100% deterministic.
  maxWorkers: 1,
  transform: {
    // tsconfig has jsx:"preserve" so Next can handle it at build time; ts-jest
    // can't execute preserved JSX, so override to react-jsx for tests only.
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx', esModuleInterop: true, module: 'commonjs', target: 'es2019', moduleResolution: 'node', allowJs: true, resolveJsonModule: true, isolatedModules: false, skipLibCheck: true, paths: { '@/*': ['./src/*'] }, baseUrl: '.', strict: true } }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/src/__tests__/setup.ts', '/src/__tests__/_helpers/'],
};
