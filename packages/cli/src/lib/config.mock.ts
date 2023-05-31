import { vi, Mocked } from 'vitest'
import Conf from 'conf'
import { SchemaConfig } from './config'

vi.mock('./config')

function mockConfig() {
  return {
    set: vi.fn(),
  } as unknown as Mocked<Conf<SchemaConfig>>
}

export { mockConfig }
