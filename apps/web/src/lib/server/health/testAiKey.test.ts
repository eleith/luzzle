import { describe, test, expect, vi, beforeEach } from 'vitest'
import { validateApiKey } from '@luzzle/core'
import type { AppConfig } from '$lib/server/config'
import { validateAiKeyIfConfigured } from './testAiKey.js'

vi.mock('@luzzle/core', () => ({
	validateApiKey: vi.fn()
}))

const mocks = {
	validateApiKey: vi.mocked(validateApiKey)
}

beforeEach(() => {
	vi.clearAllMocks()
})

describe('validateAiKeyIfConfigured', () => {
	test('validates the configured api key', async () => {
		mocks.validateApiKey.mockResolvedValue({ ok: true })
		const config = { ai: { provider: 'google', api_key: 'key' } } as AppConfig

		const result = await validateAiKeyIfConfigured(config)

		expect(mocks.validateApiKey).toHaveBeenCalledWith('key')
		expect(result).toEqual({ ok: true })
	})

	test('resolves not-ok without calling the api when ai is not configured', async () => {
		const config = { ai: undefined } as AppConfig

		const result = await validateAiKeyIfConfigured(config)

		expect(mocks.validateApiKey).not.toHaveBeenCalled()
		expect(result).toEqual({ ok: false, reason: 'ai is not configured' })
	})
})
