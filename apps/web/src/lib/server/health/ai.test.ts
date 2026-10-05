import { describe, test, expect, vi, beforeEach } from 'vitest'
import { validateApiKey } from '@luzzle/core'
import { makeConfig } from '../config.fixture'
import { validateAiKeyIfConfigured } from './ai.js'

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
		const config = makeConfig({ ai: { provider: 'google', api_key: 'key' } })

		const result = await validateAiKeyIfConfigured(config)

		expect(mocks.validateApiKey).toHaveBeenCalledWith('key')
		expect(result).toEqual({ ok: true })
	})

	test('resolves not-ok without calling the api when ai is not configured', async () => {
		const config = makeConfig()

		const result = await validateAiKeyIfConfigured(config)

		expect(mocks.validateApiKey).not.toHaveBeenCalled()
		expect(result).toEqual({ ok: false, reason: 'ai is not configured' })
	})
	test('does not silently validate an unsupported provider as Google', async () => {
		const config = makeConfig({ ai: { provider: 'google', api_key: 'key' } })
		// Deliberately bypass the validated config boundary to exercise fail-closed dispatch.
		Object.defineProperty(config.ai, 'provider', { value: 'unsupported' })
		expect(await validateAiKeyIfConfigured(config)).toEqual({
			ok: false,
			reason: 'AI provider is not supported'
		})
		expect(mocks.validateApiKey).not.toHaveBeenCalled()
	})
})
