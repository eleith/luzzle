import { describe, test, vi, afterEach, expect } from 'vitest';
import { getLastRunData, getLastRunFor, setLastRunFor } from './lastRun.js';
import { access, readFile, writeFile } from 'fs/promises';

vi.mock('fs/promises');

describe('lib/lastRun', () => {
	const mocks = {
		access: vi.mocked(access),
		readFile: vi.mocked(readFile),
		writeFile: vi.mocked(writeFile),
	};

	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset();
		});
	});

	test('should get last run data', async () => {
		mocks.access.mockResolvedValueOnce();
		mocks.readFile.mockResolvedValue('{ "test": "2025-01-01T00:00:00.000Z" }');

		const data = await getLastRunData('test-folder');

		expect(data).toEqual({ test: '2025-01-01T00:00:00.000Z' });
	});

	test('should handle error in getLastRunData', async () => {
		mocks.access.mockRejectedValueOnce(new Error('test error'));
		mocks.readFile.mockResolvedValueOnce('invalid json');

		const data = await getLastRunData('test-folder');

		expect(data).toEqual({});
	});

	test('getLastRunFor', async () => {
		mocks.access.mockResolvedValueOnce();
		mocks.readFile.mockResolvedValueOnce('{ "test": "2025-01-01T00:00:00.000Z" }');

		const date = await getLastRunFor('test-folder', 'test');

		expect(date).toEqual(new Date('2025-01-01T00:00:00.000Z'));
	});

	test('getLastRunFor has not seen operation', async () => {
		mocks.access.mockResolvedValueOnce();
		mocks.readFile.mockResolvedValueOnce('{ "test": "2025-01-01T00:00:00.000Z" }');

		const date = await getLastRunFor('test-folder', 'test2');

		expect(date).toEqual(new Date(0));
	});

	test('should set last run for an operation', async () => {
		mocks.access.mockResolvedValueOnce();
		mocks.readFile.mockResolvedValue('{ "test": "2025-01-01T00:00:00.000Z" }');

		await setLastRunFor('test-folder', 'test', new Date('2025-01-02T00:00:00.000Z'));

		expect(mocks.writeFile).toHaveBeenCalledWith(
			'test-folder/.lastRun',
			JSON.stringify({ test: '2025-01-02T00:00:00.000Z' }, null, 2)
		);
	});
});
