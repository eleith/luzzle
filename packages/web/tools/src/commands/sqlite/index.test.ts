import { describe, test, vi, afterEach, expect, MockInstance } from 'vitest';
import { mockKysely } from './database.mock.js';
import generateWebSqlite from './index.js';
import {
	dropWebTables,
	createWebTables,
	populateWebPieceTags,
	populateWebPieceItems,
	populateWebPieceSearch,
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
	dropWebTables: vi.mocked(dropWebTables),
	createWebTables: vi.mocked(createWebTables),
	populateWebPieceTags: vi.mocked(populateWebPieceTags),
	populateWebPieceItems: vi.mocked(populateWebPieceItems),
	populateWebPieceSearch: vi.mocked(populateWebPieceSearch),
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
		spies.consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
		const { db, queries } = mockKysely();
		const config = { paths: { database: 'test' } } as Config;
		mocks.getConfig.mockReturnValue(config);
		mocks.getDatabase.mockReturnValue(db);
		vi.spyOn(queries, 'execute').mockResolvedValue([]);

		await generateWebSqlite(config);

		expect(mocks.getDatabase).toHaveBeenCalledOnce();
		expect(mocks.dropWebTables).toHaveBeenCalledOnce();
		expect(mocks.createWebTables).toHaveBeenCalledOnce();
		expect(mocks.populateWebPieceItems).toHaveBeenCalledOnce();
		expect(mocks.populateWebPieceTags).toHaveBeenCalledOnce();
		expect(mocks.populateWebPieceSearch).toHaveBeenCalledOnce();
		expect(queries.execute).toHaveBeenCalledTimes(2);
		expect(spies.consoleLog).toHaveBeenCalledOnce();
	});
});
