import { describe, expect, test, vi, afterEach } from 'vitest';
import { loadConfig } from './config-loader.js';
import { readFileSync, existsSync } from 'fs';
import * as path from 'path';
import { parse as yamlParse } from 'yaml';
import Ajv from 'ajv';

vi.mock('fs');
vi.mock('path');
vi.mock('yaml');
vi.mock('ajv');

describe('lib/config-loader', () => {
	const mocks = {
		readFileSync: vi.mocked(readFileSync),
		existsSync: vi.mocked(existsSync),
		resolve: vi.mocked(path.resolve),
		yamlParse: vi.mocked(yamlParse),
		Ajv: vi.mocked(Ajv.default),
	};

	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset();
		});
	});

	test('should load the default config', () => {
		mocks.resolve.mockImplementation((...args) => args.join('/'));
		mocks.readFileSync.mockReturnValue('{"type": "object", "properties": {}}');
		mocks.yamlParse.mockReturnValue({ text: { title: 'test' } });
		mocks.existsSync.mockReturnValue(true);

		// Mock Ajv to return a valid validator
		mocks.Ajv.mockImplementation(() => ({
			compile: vi.fn().mockReturnValue(vi.fn().mockReturnValue(true)),
			errorsText: vi.fn().mockReturnValue('validation error'),
		}) as unknown as Ajv.default);

		const config = loadConfig();

		expect(config).toBeDefined();
	});

	test('should load a user config', () => {
		mocks.resolve.mockImplementation((...args) => args.join('/'));
		mocks.readFileSync.mockReturnValue('{"type": "object", "properties": {}}');
		mocks.yamlParse.mockReturnValue({ text: { title: 'test' } });
		mocks.existsSync.mockReturnValue(true);

		// Mock Ajv to return a valid validator
		mocks.Ajv.mockImplementation(() => ({
			compile: vi.fn().mockReturnValue(vi.fn().mockReturnValue(true)),
			errorsText: vi.fn().mockReturnValue('validation error'),
		}) as unknown as Ajv.default);

		const config = loadConfig({ userConfigPath: 'my-config.yaml' });

		expect(config).toBeDefined();
	});

	test('should throw an error if user config is not found', () => {
		mocks.resolve.mockImplementation((...args) => args.join('/'));
		mocks.readFileSync.mockReturnValue('{"type": "object", "properties": {}}');
		mocks.yamlParse.mockReturnValue({});
		mocks.existsSync.mockReturnValue(false);

		// Mock Ajv to return a valid validator
		mocks.Ajv.mockImplementation(() => ({
			compile: vi.fn().mockReturnValue(vi.fn().mockReturnValue(true)),
			errorsText: vi.fn().mockReturnValue('validation error'),
		}) as unknown as Ajv.default);

		expect(() => loadConfig({ userConfigPath: 'my-config.yaml' })).toThrow();
	});

	test('should throw an error if config validation fails', () => {
		mocks.resolve.mockImplementation((...args) => args.join('/'));
		mocks.readFileSync.mockReturnValue('{"type": "object", "properties": {}}');
		mocks.yamlParse.mockReturnValue({ text: { title: 'test' } });
		mocks.existsSync.mockReturnValue(true);

		// Mock Ajv to return an invalid validator
		mocks.Ajv.mockImplementation(() => ({
			compile: vi.fn().mockReturnValue(vi.fn().mockReturnValue(false)),
			errorsText: vi.fn().mockReturnValue('validation error'),
		}) as unknown as Ajv.default);

		expect(() => loadConfig()).toThrow('Configuration validation failed: validation error');
	});
});
