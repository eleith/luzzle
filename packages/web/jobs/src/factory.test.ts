import { describe, test, expect } from 'vitest'
import { createJobStub } from './factory.js'

describe('createJobStub', () => {
	test('produces a class whose name matches the given identifier', () => {
		const Foo = createJobStub<void, 'ok'>('Foo')
		expect(Foo.name).toBe('Foo')
	})

	test('instances throw with a descriptive error when run() is called', async () => {
		const Bar = createJobStub<{ x: number }, string>('Bar')
		const instance = new Bar()
		await expect(
			(instance as unknown as { run: (p: unknown) => Promise<unknown> }).run({ x: 1 })
		).rejects.toThrow(/Bar: producer-side stub/)
	})

	test('two stubs are independent classes', () => {
		const A = createJobStub<void, 'ok'>('A')
		const B = createJobStub<void, 'ok'>('B')
		expect(A.name).toBe('A')
		expect(B.name).toBe('B')
		expect(new A()).not.toBeInstanceOf(B)
	})
})
