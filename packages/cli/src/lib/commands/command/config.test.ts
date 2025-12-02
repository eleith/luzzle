import log from '../../log.js'
import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import command, { ConfigArgv } from './config.js'
import { Arguments } from 'yargs'
import yargs from 'yargs'
import { makeContext } from '../utils/context.fixtures.js'
import { withDefaults } from '../../config.js'
import yaml from 'yaml'

vi.mock('../../config.js')
vi.mock('../../log.js')
vi.mock('yaml')

const mocks = {
	logError: vi.spyOn(log, 'error'),
	logInfo: vi.spyOn(log, 'info'),
	consoleLog: vi.spyOn(console, 'log'),
	withDefaults: vi.mocked(withDefaults),
	yamlStringify: vi.spyOn(yaml, 'stringify'),
}

const spies: { [key: string]: MockInstance } = {}

describe('lib/commands/field.ts', () => {
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
		const defaults = { a: 'apple', b: 'banana' } as unknown as ReturnType<typeof withDefaults>
		const yamlString = 'yaml'
		const ctx = makeContext()

		mocks.withDefaults.mockReturnValueOnce(defaults)
		mocks.yamlStringify.mockReturnValueOnce(yamlString)

		await command.run(ctx, {} as Arguments<ConfigArgv>)

		expect(mocks.consoleLog).toHaveBeenCalledTimes(2)
		expect(mocks.yamlStringify).toHaveBeenCalledWith(defaults)
	})

	test('run can not remove without a field', async () => {
		const ctx = makeContext()

		await command.run(ctx, { remove: true } as Arguments<ConfigArgv>)

		expect(mocks.yamlStringify).not.toHaveBeenCalled()
		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('run returns the config path', async () => {
		const ctx = makeContext()

		await command.run(ctx, { field: 'path' } as Arguments<ConfigArgv>)

		expect(mocks.consoleLog).toHaveBeenCalledWith(ctx.config.path)
	})

	test('run can not set the config path', async () => {
		const ctx = makeContext()

		await command.run(ctx, { field: 'path', value: 'a' } as Arguments<ConfigArgv>)

		expect(mocks.logError).toHaveBeenCalledOnce()
		expect(mocks.consoleLog).not.toHaveBeenCalled()
	})

	test('run can not remove the config path', async () => {
		const ctx = makeContext()

		await command.run(ctx, { field: 'path', remove: true } as Arguments<ConfigArgv>)

		expect(mocks.logError).toHaveBeenCalledOnce()
		expect(mocks.consoleLog).not.toHaveBeenCalled()
	})

	test('run can not remove and set a config field', async () => {
		const ctx = makeContext()

		await command.run(ctx, { field: 'field', remove: true, value: 'a' } as Arguments<ConfigArgv>)

		expect(mocks.logError).toHaveBeenCalledOnce()
		expect(mocks.consoleLog).not.toHaveBeenCalled()
	})

	test('run sets a config field', async () => {
		const ctx = makeContext()

		spies.configSet = vi.spyOn(ctx.config, 'set')

		await command.run(ctx, { field: 'field', value: 'a' } as Arguments<ConfigArgv>)

		expect(mocks.logInfo).toHaveBeenCalledOnce()
		expect(spies.configSet).toHaveBeenCalledWith('field', 'a')
	})

	test('run sets a config field with dry-run', async () => {
		const ctx = makeContext({ flags: { dryRun: true } })

		spies.configSet = vi.spyOn(ctx.config, 'set')

		await command.run(ctx, { field: 'field', value: 'a' } as Arguments<ConfigArgv>)

		expect(mocks.logInfo).toHaveBeenCalledOnce()
		expect(spies.configSet).not.toHaveBeenCalled()
	})

	test('run removes a config field', async () => {
		const ctx = makeContext()

		spies.configDelete = vi.spyOn(ctx.config, 'delete')

		await command.run(ctx, { field: 'field', remove: true } as Arguments<ConfigArgv>)

		expect(mocks.logInfo).toHaveBeenCalledOnce()
		expect(spies.configDelete).toHaveBeenCalledWith('field')
	})

	test('run removes a config field with dry-run', async () => {
		const ctx = makeContext({ flags: { dryRun: true } })

		spies.configDelete = vi.spyOn(ctx.config, 'delete')

		await command.run(ctx, { field: 'field', remove: true } as Arguments<ConfigArgv>)

		expect(mocks.logInfo).toHaveBeenCalledOnce()
		expect(spies.configDelete).not.toHaveBeenCalled()
	})

	test('run returns the current config field value', async () => {
		const ctx = makeContext()
		const value = 'value'

		spies.configDelete = vi.spyOn(ctx.config, 'get')
		spies.configDelete.mockReturnValueOnce(value)

		await command.run(ctx, { field: 'field' } as Arguments<ConfigArgv>)

		expect(mocks.consoleLog).toHaveBeenCalledWith(value)
	})

	test('builder', async () => {
		const args = yargs()

		spies.positional = vi.spyOn(args, 'positional').mockReturnValue(args)
		spies.option = vi.spyOn(args, 'option').mockReturnValue(args)

		command.builder?.(args)

		expect(spies.positional).toHaveBeenCalledTimes(2)
		expect(spies.option).toHaveBeenCalledTimes(1)
	})
})
