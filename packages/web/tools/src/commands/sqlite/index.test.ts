import { describe, test, vi, afterEach, expect, MockInstance } from 'vitest';
import { mockKysely } from './database.mock.js';
import generateWebSqlite from './index.js';
import {
	generateWebSqlite as generateWebSqliteDb,
} from './database.js';
import { type Config } from '@luzzle/web.utils';
import { getConfig } from '../../lib/config.js';
import { getDatabase } from '../../lib/database.js';

vi.mock('../../lib/config.js');
vi.mock('../../lib/database.js');
vi.mock('./database.js');

const mocks = {
	getConfig: vi.mocked(getConfig),
	getDatabase: vi.mocked(getDatabase),
	generateWebSqliteDb: vi.mocked(generateWebSqliteDb),
};

const spies: { [key: string]: MockInstance } = {};

describe('tools/sqlite', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset();
		});
		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore();
			delete spies[key];
		});
	});

	test('should generate the web sqlite database', async () => {
		const { db } = mockKysely();
		const config = { paths: { database: 'test' } } as Config;
		mocks.getConfig.mockReturnValue(config);
		mocks.getDatabase.mockReturnValue(db);

		await generateWebSqlite(config);

		expect(mocks.getDatabase).toHaveBeenCalledOnce();
		expect(mocks.generateWebSqliteDb).toHaveBeenCalledWith(db, config);
	});
});
