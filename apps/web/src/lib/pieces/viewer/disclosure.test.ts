import { expect, test } from 'vitest'
import type { OutputValue } from './assets'
import { toggleDisclosure } from './disclosure'

function sourceRow(key: string): OutputValue {
	return {
		key,
		output: 'highlight',
		field: 'Content',
		mime: 'text/plain',
		value: 'identical source text'
	}
}

test('opening and closing a row returns new state without changing the previous state', () => {
	const row = sourceRow('first-snippet')
	const initial: ReadonlySet<OutputValue> = new Set()

	const opened = toggleDisclosure(initial, row)
	const closed = toggleDisclosure(opened, row)

	expect(opened).not.toBe(initial)
	expect([...opened]).toEqual([row])
	expect(initial.size).toBe(0)
	expect(closed).not.toBe(opened)
	expect(closed.size).toBe(0)
})

test('closing one asset does not close another asset with identical source text', () => {
	const first = sourceRow('first-snippet')
	const second = sourceRow('second-snippet')
	const firstOpened = toggleDisclosure(new Set(), first)

	const bothOpened = toggleDisclosure(firstOpened, second)
	const firstClosed = toggleDisclosure(bothOpened, first)

	expect([...bothOpened]).toEqual([first, second])
	expect([...firstClosed]).toEqual([second])
})
