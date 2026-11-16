import { afterEach, expect, test, vi } from 'vitest'
import { variables } from './env.js'

const environment = vi.hoisted(() => ({ building: false }))
vi.mock('$app/env', () => environment)
const validate = variables.LUZZLE_PAGE_TEMPLATES.schema['~standard'].validate

afterEach(() => {
	environment.building = false
})

test('tooling needs neither a startup map nor runtime configuration', async () => {
	environment.building = true
	expect(await validate(undefined)).toEqual({ value: {} })
	expect(await validate('not a runtime map')).toEqual({ value: {} })
})

test('runtime decodes the launcher map, including an explicitly empty configuration', async () => {
	expect(await validate('{"words":"note","constructor":"book"}')).toEqual({
		value: { words: 'note', constructor: 'book' }
	})
	expect(await validate('{}')).toEqual({ value: {} })
})

test('runtime fails clearly when the launcher did not provide its map', async () => {
	expect(await validate(undefined)).toMatchObject({
		issues: [{ message: 'Missing routing configuration; start the app through its launcher.' }]
	})
})

test.each(['private-token', 'null', '[]', '{"words":42}'])(
	'runtime rejects malformed mapping %s without exposing its contents',
	async (input) => {
		expect(await validate(input)).toMatchObject({
			issues: [{ message: 'Expected a JSON object mapping piece types to page template names.' }]
		})
	}
)
