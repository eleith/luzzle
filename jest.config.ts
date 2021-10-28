import type { Config } from '@jest/types'
import { pathsToModuleNameMapper } from 'ts-jest/utils'
import { compilerOptions } from './tsconfig.json'

const config: Config.InitialOptions = {
  verbose: true,
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),
  preset: 'ts-jest',
  transform: {
    '.(ts|tsx)': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.ts', 'tools/**/*.ts'],
  coveragePathIgnorePatterns: ['.mock.ts', '.fixtures.ts', '.d.ts'],
  setupFilesAfterEnv: ['<rootDir>tests/setup.ts'],
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
}

export default config
