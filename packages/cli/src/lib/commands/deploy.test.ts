import log from '../log.js'
import { describe, expect, test, vi, afterEach, MockInstance, MockedObject } from 'vitest'
import command from './deploy.js'
import { Arguments } from 'yargs'
import { makeContext } from './context.fixtures.js'
import got from 'got'
import { getConfig, Config } from '../config.js'

vi.mock('got')
vi.mock('../config')

const mocks = {
	logInfo: vi.spyOn(log, 'info'),
	logError: vi.spyOn(log, 'error'),
	logChild: vi.spyOn(log, 'child'),
	getConfig: vi.mocked(getConfig),
	gotPost: vi.mocked(got.post),
}

const spies: { [key: string]: MockInstance } = {}

describe('lib/commands/deploy', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})

	test('run', async () => {
		const deployConfig = { url: 'webhook', token: 'secret', body: '{"body":"body"}' }
		const config = {
			get: vi.fn(),
		} as MockedObject<Config>
		const ctx = makeContext({ config })

		mocks.getConfig.mockReturnValueOnce(config)
		mocks.gotPost.mockResolvedValueOnce({ statusCode: 200 })
		config.get.mockReturnValueOnce(deployConfig)

		await command.run(ctx, {} as Arguments)

		expect(mocks.gotPost).toHaveBeenCalledWith(deployConfig.url, {
			json: JSON.parse(deployConfig.body),
			headers: { Authorization: `Bearer ${deployConfig.token}` },
		})
	})

	test('run without body', async () => {
		const deployConfig = { url: 'webhook', token: 'secret' }
		const config = {
			get: vi.fn(),
		} as MockedObject<Config>
		const ctx = makeContext({ config })

		mocks.getConfig.mockReturnValueOnce(config)
		mocks.gotPost.mockResolvedValueOnce({ statusCode: 200 })
		config.get.mockReturnValueOnce(deployConfig)

		await command.run(ctx, {} as Arguments)

		expect(mocks.gotPost).toHaveBeenCalledWith(deployConfig.url, {
			headers: { Authorization: `Bearer ${deployConfig.token}` },
		})
	})
})
