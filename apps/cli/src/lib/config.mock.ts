import type { Mocked } from 'vitest';
import { vi } from 'vitest'
import type Conf from 'conf'
import type { SchemaConfig } from './config.js'

vi.mock('./config.js')

function mockConfig() {
	return {
		set: vi.fn(),
		get: vi.fn(),
	} as unknown as Mocked<Conf<SchemaConfig>>
}

export { mockConfig }
