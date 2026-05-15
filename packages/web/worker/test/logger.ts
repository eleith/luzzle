import { vi } from 'vitest'
import type { Logger } from '../src/logger.js'

export function makeLogger(): Logger {
	return {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}
}
