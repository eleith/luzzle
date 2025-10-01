import { describe, test, vi, afterEach, expect } from 'vitest';
import { generateHtml } from './html.js';
import { Pieces, Storage } from '@luzzle/cli';
import { Eta } from 'eta';
import { readFile } from 'fs/promises';
import Sharp from 'sharp';
import { Vibrant } from 'node-vibrant/node';
import { LuzzleSelectable } from '@luzzle/core';

vi.mock('fs/promises');
vi.mock('eta');
vi.mock('@luzzle/cli');
vi.mock('sharp', () => {
	const mockSharp = {
		clone: vi.fn().mockReturnThis(),
		resize: vi.fn().mockReturnThis(),
		toFormat: vi.fn().mockReturnThis(),
		toBuffer: vi.fn().mockResolvedValue(Buffer.from('test')),
	};
	return {
		__esModule: true,
		default: vi.fn(() => mockSharp),
	};
});
vi.mock('node-vibrant/node');

describe('src/tools/opengraph/html-generate', () => {
	const mocks = {
		readFile: vi.mocked(readFile),
		Eta: vi.mocked(Eta),
		Sharp: vi.mocked(Sharp),
		Vibrant: vi.mocked(Vibrant),
	};

	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset();
		});
	});

	test('should generate html', async () => {
		mocks.readFile.mockResolvedValue(Buffer.from('template'));
		const mockEta = {
			loadTemplate: vi.fn(),
			renderStringAsync: vi.fn().mockResolvedValue('html'),
		};
		mocks.Eta.mockReturnValue(mockEta as unknown as Eta);

		const item: LuzzleSelectable<'pieces_items'> = {
			id: 'item1',
			file_path: 'path/to/item1.md',
			type: 'books',
			date_added: 124,
			date_updated: 125,
			note_markdown: '',
			frontmatter_json: '{}',
			assets_json_array: '[]',
		}
		const pieces = new Pieces({} as unknown as Storage);
		const template = 'template.eta';

		const html = await generateHtml(item, pieces, template);

		expect(html).toBe('html');
	});

	test('should call helpers', async () => {
		mocks.readFile.mockResolvedValue(Buffer.from('template'));
		const mockEta = {
			loadTemplate: vi.fn(),
			renderStringAsync: vi.fn().mockImplementation(async (_, data) => {
				await data.helpers.extractImage('test.jpg');
				await data.helpers.fontToBase64('test.ttf');
				await data.helpers.pieceExtractImage('test.jpg');
				return 'html';
			}),
		};
		mocks.Eta.mockReturnValue(mockEta as unknown as Eta);

		const item: LuzzleSelectable<'pieces_items'> = {
			id: 'item1',
			file_path: 'path/to/item1.md',
			type: 'books',
			date_added: 124,
			date_updated: 125,
			note_markdown: '',
			frontmatter_json: '{}',
			assets_json_array: '[]',
		}
		const pieces = new Pieces({} as unknown as Storage);
		vi.spyOn(pieces, 'getPieceAsset').mockResolvedValue(Buffer.from('test'));
		const template = 'template.eta';

		const html = await generateHtml(item, pieces, template);

		expect(html).toBe('html');
	});

	test('should call Vibrant.getPalette', async () => {
		mocks.readFile.mockResolvedValue(Buffer.from('template'));
		const mockEta = {
			loadTemplate: vi.fn(),
			renderStringAsync: vi.fn().mockImplementation(async (_, data) => {
				await data.helpers.extractImage('test.jpg');
				return 'html';
			}),
		};
		mocks.Eta.mockReturnValue(mockEta as unknown as Eta);

		const mockVibrant = {
			getPalette: vi.fn().mockResolvedValue({}),
		};
		mocks.Vibrant.mockReturnValue(mockVibrant as unknown as Vibrant);

		const item: LuzzleSelectable<'pieces_items'> = {
			id: 'item1',
			file_path: 'path/to/item1.md',
			type: 'books',
			date_added: 124,
			date_updated: 125,
			note_markdown: '',
			frontmatter_json: '{}',
			assets_json_array: '[]',
		}
		const pieces = new Pieces({} as unknown as Storage);
		vi.spyOn(pieces, 'getPieceAsset').mockResolvedValue(Buffer.from('test'));
		const template = 'template.eta';

		await generateHtml(item, pieces, template);

		expect(mockVibrant.getPalette).toHaveBeenCalledOnce();
	});
});
