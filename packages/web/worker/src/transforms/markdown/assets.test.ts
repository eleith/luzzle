import { expect, test, vi } from 'vitest'
import type { Pieces } from '@luzzle/core'
import { validateConfig } from '@luzzle/web.config'
import { assetPathToUrl } from '@luzzle/web.pieces'
import type { TransformInput } from '../utils/types.js'
import { makeLogger } from '../../../test/logger.js'
import { run } from './index.js'

function makeInput(overrides: Partial<TransformInput> = {}): TransformInput {
	return {
		webPiece: {
			id: 'essay',
			key: 'piece-key',
			type: 'words',
			slug: 'essay',
			title: 'Essay',
			file_path: 'essay.words.md',
			date_added: 1,
			json_metadata: '{}',
		},
		config: validateConfig(
			{
				pieces: [{ type: 'words', fields: { title: 'title', date_consumed: 'date' } }],
			},
			{}
		),
		outDir: '/out',
		pieces: {
			getPiece: vi.fn().mockResolvedValue({
				fields: [{ name: 'description', type: 'string', format: 'markdown' }],
			}),
		} as unknown as Pieces,
		assetKeyToPath: new Map(),
		buildAssetUrl: (path) => assetPathToUrl(path, 'https://cdn.test/garden/'),
		logger: makeLogger(),
		...overrides,
	}
}

test('renders registered originals in body and metadata Markdown using public URLs', async () => {
	const input = makeInput({
		assetKeyToPath: new Map([
			['diagram', '.assets/essay/diagram 雪.png'],
			['manual', '.assets/essay/C++.pdf'],
		]),
		priorAssets: [
			{
				asset_key: 'diagram',
				transformation: 'image.xl.jpg',
				asset_path: 'words/piece-key/diagram.xl.jpg',
				mime_type: 'image/jpeg',
			},
			{
				asset_key: 'diagram',
				transformation: 'image.original',
				asset_path: 'words/piece-key/diagram 雪.png',
				mime_type: 'image/png',
			},
			{
				asset_key: 'manual',
				transformation: 'attachment',
				asset_path: 'words/piece-key/C++.pdf',
				mime_type: 'application/pdf',
			},
		],
	})
	input.webPiece.note = [
		'![Diagram](<.assets/essay/diagram 雪.png>)',
		'[Download][manual]',
		'[manual]: .assets/essay/C++.pdf',
		'[Elsewhere](https://example.com)',
		'`[Manual](.assets/essay/C++.pdf)`',
	].join('\n\n')
	input.webPiece.json_metadata = JSON.stringify({
		description: '[Manual](.assets/essay/C++.pdf)',
	})

	const records = await run(input)

	const body = records.find((record) => record.transformation === 'markdown')?.content
	expect(body).toContain(
		'src="https://cdn.test/garden/pieces/assets/words/piece-key/diagram%20%E9%9B%AA.png"'
	)
	expect(body).toContain('href="https://cdn.test/garden/pieces/assets/words/piece-key/C%2B%2B.pdf"')
	expect(body).toContain('href="https://example.com"')
	expect(body).toContain('<code>[Manual](.assets/essay/C++.pdf)</code>')
	expect(
		records.find((record) => record.transformation === 'markdown.description')?.content
	).toContain('href="https://cdn.test/garden/pieces/assets/words/piece-key/C%2B%2B.pdf"')
	expect(input.logger.warn).not.toHaveBeenCalled()
})

test('warns and preserves destinations without a registered, generated original', async () => {
	const input = makeInput({
		assetKeyToPath: new Map([['variant', '.assets/variant-only.png']]),
		priorAssets: [
			{
				asset_key: 'variant',
				transformation: 'image.xl.jpg',
				asset_path: 'words/piece-key/variant-only.xl.jpg',
				mime_type: 'image/jpeg',
			},
			{
				asset_key: 'foreign',
				transformation: 'attachment',
				asset_path: 'words/another-piece/foreign.pdf',
				mime_type: 'application/pdf',
			},
		],
	})
	const destinations = ['.assets/missing.png', '.assets/variant-only.png', '.assets/foreign.pdf']
	input.webPiece.note = destinations.map((path) => `[File](${path})`).join('\n\n')

	const records = await run(input)

	for (const destination of destinations) {
		expect(records[0].content).toContain(`href="${destination}"`)
		expect(input.logger.warn).toHaveBeenCalledWith(
			'Markdown asset has no generated original file',
			{ file: 'essay.words.md', asset: destination }
		)
	}
	expect(input.logger.warn).toHaveBeenCalledTimes(destinations.length)
})
