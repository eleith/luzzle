import { afterEach, describe, expect, test, vi } from 'vitest'
import { variables } from './env.js'

const environment = vi.hoisted(() => ({ building: false }))
vi.mock('$app/env', () => environment)

afterEach(() => {
	environment.building = false
})

describe('page routing map', () => {
	const validate = variables.LUZZLE_PAGE_TEMPLATES.schema['~standard'].validate

	test('tooling needs neither a startup map nor runtime configuration', async () => {
		environment.building = true
		expect(await validate(undefined)).toEqual({ value: {} })
		expect(await validate('not a runtime map')).toEqual({ value: {} })
	})

	test('runtime decodes the launcher map, including an explicitly empty configuration', async () => {
		expect(await validate('{"words":"default","constructor":"book"}')).toEqual({
			value: { words: 'default', constructor: 'book' }
		})
		expect(await validate('{}')).toEqual({ value: {} })
	})

	test('runtime fails clearly when the launcher did not provide its map', async () => {
		expect(await validate(undefined)).toMatchObject({
			issues: [{ message: 'Missing routing configuration; start the app through its launcher.' }]
		})
	})

	test.each(['private-token', 'null', '[]', '"private-token"', '{"words":42}'])(
		'runtime rejects malformed mapping %s without exposing its contents',
		async (input) => {
			expect(await validate(input)).toMatchObject({
				issues: [{ message: 'Expected a JSON object mapping piece types to page template names.' }]
			})
		}
	)
})

test('icon routing decodes its own map and labels errors without exposing input', async () => {
	const validate = variables.LUZZLE_ICON_TEMPLATES.schema['~standard'].validate
	expect(await validate('{"words":"lined-notebook-paper"}')).toEqual({
		value: { words: 'lined-notebook-paper' }
	})
	expect(await validate('private-token')).toMatchObject({
		issues: [{ message: 'Expected a JSON object mapping piece types to icon template names.' }]
	})
})
