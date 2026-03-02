import { describe, test, vi, afterEach, expect } from 'vitest';
import generateWebSqliteCommand from './index.js';
import { generateWebSqlite } from './database.js';
import { type Config } from '@luzzle/web.utils';
import { getDatabase } from '../../lib/database.js';
import { LuzzleDatabase } from '@luzzle/core';

vi.mock('../../lib/database.js');
vi.mock('./database.js');

const mocks = {
	getDatabase: vi.mocked(getDatabase),
	generateWebSqlite: vi.mocked(generateWebSqlite),
};

describe('tools/sqlite', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	test('should run web migrations', async () => {
		const mockDb = {} as LuzzleDatabase;
		const config = { paths: { database: 'test' } } as Config;
		mocks.getDatabase.mockReturnValue(mockDb);
		mocks.generateWebSqlite.mockResolvedValue({ results: [], error: undefined });

		await generateWebSqliteCommand(config);

		expect(mocks.getDatabase).toHaveBeenCalledWith(config);
		expect(mocks.generateWebSqlite).toHaveBeenCalledWith(mockDb);
	});

	test('should throw if migration fails', async () => {
		const mockDb = {} as LuzzleDatabase;
		const config = { paths: { database: 'test' } } as Config;
		mocks.getDatabase.mockReturnValue(mockDb);
		mocks.generateWebSqlite.mockResolvedValue({ results: [], error: new Error('migration error') });

		await expect(generateWebSqliteCommand(config)).rejects.toThrow('Web migration failed:');
	});
});
