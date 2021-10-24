import type { Config } from '@jest/types'
import { pathsToModuleNameMapper } from 'ts-jest/utils'
import { compilerOptions } from './tsconfig.json'

const config: Config.InitialOptions = {
  verbose: true,
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),
  preset: 'ts-jest',
  transform: {
    '.(ts|tsx)': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.ts', 'tools/**/*.ts'],
  coveragePathIgnorePatterns: ['.mock.ts', '.fixtures.ts', '.d.ts'],
  setupFiles: ['<rootDir>tests/config.ts'],
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
}

export default config
