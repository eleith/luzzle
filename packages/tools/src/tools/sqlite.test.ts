import { describe, test, vi, afterEach, expect, MockInstance } from 'vitest';
import { mockKysely } from './sqlite/database.mock.js';
import { generateWebSqlite } from './sqlite.js';
import { getDatabaseClient } from '@luzzle/core';
import {
	dropWebTables,
	createWebTables,
	populateWebPieceTags,
	populateWebPieceItems,
	populateWebPieceSearch,
} from './sqlite/database.js';
import { AppConfig, loadConfig } from '../lib/config-loader.js';

vi.mock('@luzzle/core');
vi.mock('./sqlite/database.js');
vi.mock('../lib/config-loader.js');

const mocks = {
	getDatabaseClient: vi.mocked(getDatabaseClient),
	dropWebTables: vi.mocked(dropWebTables),
	createWebTables: vi.mocked(createWebTables),
	populateWebPieceTags: vi.mocked(populateWebPieceTags),
	populateWebPieceItems: vi.mocked(populateWebPieceItems),
	populateWebPieceSearch: vi.mocked(populateWebPieceSearch),
	loadConfig: vi.mocked(loadConfig),
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
		mocks.loadConfig.mockReturnValue({ paths: { database: 'test' } } as AppConfig);
		mocks.getDatabaseClient.mockReturnValue(db);
		vi.spyOn(queries, 'execute').mockResolvedValue([]);

		await generateWebSqlite('test');

		expect(mocks.loadConfig).toHaveBeenCalledOnce();
		expect(mocks.getDatabaseClient).toHaveBeenCalledOnce();
		expect(mocks.dropWebTables).toHaveBeenCalledOnce();
		expect(mocks.createWebTables).toHaveBeenCalledOnce();
		expect(mocks.populateWebPieceItems).toHaveBeenCalledOnce();
		expect(mocks.populateWebPieceTags).toHaveBeenCalledOnce();
		expect(mocks.populateWebPieceSearch).toHaveBeenCalledOnce();
		expect(queries.execute).toHaveBeenCalledTimes(2);
		expect(spies.consoleLog).toHaveBeenCalledOnce();
	});
});
