import { getLastRunFor, setLastRunFor } from './utils/lastRun.js'
import { mkdir, writeFile } from 'fs/promises'
import { WebPieces } from './utils/types.js'
import { generateHtml } from '../generate-open-graph/html.js'
import { generatePng } from '../generate-open-graph/png.js'
import { getBrowser } from '../generate-open-graph/browser.js'
import { Browser } from 'puppeteer'
import { PieceFrontmatter, PieceMarkdown, Pieces, StorageFileSystem } from '@luzzle/cli'
import path from 'path'

async function generateOpenGraphForMarkdown(
	markdown: PieceMarkdown<PieceFrontmatter>,
	pieces: Pieces,
	browser: Browser,
	output: string,
	template: string
) {
	try {
		console.log(`generating opengraph for ${output}`)

		const html = await generateHtml(markdown, pieces, template)
		const png = await generatePng(html, browser)
		const ogDir = path.dirname(output)

		await mkdir(ogDir, { recursive: true })
		await writeFile(output, png)
	} catch (e) {
		console.error(`Error generating Open Graph for ${output}: ${e}`)
	}
}

export async function generateOpenGraphsForPieces(
	webPieces: WebPieces[],
	luzzle: string,
	outputDir: string,
	template: string,
	options: { force?: boolean, limit?: number }
) {
	const force = options.force || false
	const limit = options.limit || Infinity
	const operation = 'generate-open-graph'
	const lastRun = force ? new Date(0) : await getLastRunFor(outputDir, operation)
	const piecesToProcess = limit === Infinity ? webPieces : webPieces.slice(0, limit)

	const browser = await getBrowser()
	const storage = new StorageFileSystem(luzzle)
	const pieces = new Pieces(storage)

	for (const webPiece of piecesToProcess) {
		const pieceModifiedTime = new Date(webPiece.date_updated || webPiece.date_added)

		if (pieceModifiedTime > lastRun || force) {
			const filePath = webPiece.file_path
			const pieceType = webPiece.type
			const pieceSlug = webPiece.slug
			const markdown = await pieces.getPieceMarkdown(filePath)
			const output = `${outputDir}/${pieceType}/${pieceSlug}/opengraph.png`

			await generateOpenGraphForMarkdown(markdown, pieces, browser, output, template)
		}
	}

	if (!force && (limit === Infinity || !limit)) {
		await setLastRunFor(outputDir, operation, new Date())
	}

	await browser.close()
}
