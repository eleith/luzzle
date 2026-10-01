import { describe, expect, test } from 'vitest'
import { encodeEvent } from './sse.js'

describe('encodeEvent', () => {
	test('preserves unicode and JSON-escapes newlines in a single data line', () => {
		expect(encodeEvent('log', { message: 'café 🧩\nnext\r\n"quoted"' })).toBe(
			'event: log\ndata: {"message":"café 🧩\\nnext\\r\\n\\"quoted\\""}\n\n'
		)
	})

	test('puts the cursor id between the event and data lines', () => {
		expect(encodeEvent('cursor', { sync: 7, publish: 2 }, '{"sync":7,"publish":2}')).toBe(
			'event: cursor\nid: {"sync":7,"publish":2}\ndata: {"sync":7,"publish":2}\n\n'
		)
	})

	test.each([undefined, ''])('omits a falsy id (%s)', (id) => {
		expect(encodeEvent('done', null, id)).toBe('event: done\ndata: null\n\n')
	})

	test('includes a truthy zero string id', () => {
		expect(encodeEvent('state', [], '0')).toBe('event: state\nid: 0\ndata: []\n\n')
	})
})
