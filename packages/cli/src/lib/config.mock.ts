import { vi, Mocked } from 'vitest'
import Conf from 'conf'
import { SchemaConfig } from './config.js'

vi.mock('./config.js')

function mockConfig() {
  return {
    set: vi.fn(),
  } as unknown as Mocked<Conf<SchemaConfig>>
}

export { mockConfig }
