import { vi } from 'vitest'
import type { Logger } from '../src/services/logger.js'

export function makeLogger(): Logger {
	return {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}
}
