import { describe, expect, test } from 'vitest';
import { deepMerge } from './deep-merge.js';

describe('lib/deep-merge', () => {
	test('should merge two simple objects', () => {
		const obj1 = { a: 1, b: 2 };
		const obj2 = { c: 3, d: 4 };
		const result = deepMerge(obj1, obj2);
		expect(result).toEqual({ a: 1, b: 2, c: 3, d: 4 });
	});

	test('should overwrite properties in the first object', () => {
		const obj1 = { a: 1, b: 2 };
		const obj2 = { b: 3, c: 4 };
		const result = deepMerge(obj1, obj2);
		expect(result).toEqual({ a: 1, b: 3, c: 4 });
	});

	test('should merge nested objects', () => {
		const obj1 = { a: 1, b: { c: 2 } };
		const obj2 = { b: { d: 3 } };
		const result = deepMerge(obj1, obj2);
		expect(result).toEqual({ a: 1, b: { c: 2, d: 3 } });
	});

	test('should handle arrays', () => {
		const obj1 = { a: [1, 2] };
		const obj2 = { a: [3, 4] };
		const result = deepMerge(obj1, obj2);
		expect(result).toEqual({ a: [3, 4] });
	});
});
