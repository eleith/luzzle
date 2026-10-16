import { expect, test } from 'vitest'
import type { OutputValue } from './assets'
import { toggleDisclosure } from './disclosure'

function value(): OutputValue {
	return {
		key: 'private',
		output: 'custom.note',
		field: 'Content',
		mime: 'text/plain',
		value: 'raw'
	}
}

test('opens and closes one row without mutating its input set', () => {
	const row = value()
	const initial: ReadonlySet<OutputValue> = new Set()
	const opened = toggleDisclosure(initial, row)
	expect(opened).not.toBe(initial)
	expect([...opened]).toEqual([row])
	expect(initial.size).toBe(0)
	const closed = toggleDisclosure(opened, row)
	expect(closed).not.toBe(opened)
	expect(closed.size).toBe(0)
	expect(opened.has(row)).toBe(true)
})

test('multiple rows stay independently open and close in any order', () => {
	const first = value()
	const second = value()
	const third = value()
	const both = toggleDisclosure(toggleDisclosure(new Set(), first), second)
	expect(both.size).toBe(2)
	const justSecond = toggleDisclosure(both, first)
	expect(justSecond.has(second)).toBe(true)
	expect(justSecond.has(first)).toBe(false)
	expect(both.has(first)).toBe(true)
	const secondAndThird = toggleDisclosure(justSecond, third)
	expect([...secondAndThird]).toEqual([second, third])
	expect([...toggleDisclosure(secondAndThird, second)]).toEqual([third])
})

test('identical fields and raw keys do not merge different projected row identities', () => {
	const first = value()
	const sameFields = { ...first }
	const opened = toggleDisclosure(new Set(), first)
	expect(opened.has(sameFields)).toBe(false)
	const both = toggleDisclosure(opened, sameFields)
	expect(both.size).toBe(2)
	expect([...toggleDisclosure(both, first)]).toEqual([sameFields])
})

test('a fresh model starts from an empty set, including replaced rows with identical fields', () => {
	// Parent reset wiring is a source contract in AssetOutputs.test.ts, not a mounted effect test.
	const previous = value()
	const previousState = toggleDisclosure(new Set(), previous)
	const replacement = { ...previous }
	const reset: ReadonlySet<OutputValue> = new Set()
	expect(reset.has(previous)).toBe(false)
	expect(reset.has(replacement)).toBe(false)
	expect([...toggleDisclosure(reset, replacement)]).toEqual([replacement])
	expect([...previousState]).toEqual([previous])
})
