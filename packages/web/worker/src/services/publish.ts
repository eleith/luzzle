import { createHash } from 'node:crypto'
import path from 'node:path'
import {
	Pieces,
	StorageFileSystem,
	extractFullMarkdown,
	makePieceMarkdown,
	makePieceItemInsertable,
	type PieceFrontmatter,
	type PiecesDiff,
} from '@luzzle/core'
import type { PublishPayload, PublishPiecePayload, PublishPieceFailure } from '@luzzle/web.jobs'
import { completed, type Step, type StepContext } from '../core/step.js'
import { runProgressPhase, type DurableStepApi } from '../core/run-progress-phase.js'
import type { JobProgress } from '../core/job-progress.js'
import { archiveSyncStep } from '../steps/archive-sync.js'
import { luzzleSyncStep } from '../steps/luzzle-sync.js'
import { publishPrepareStep } from '../steps/publish-prepare.js'
import { webSyncStep, pruneWebPiecesStep, type PublicationSource } from '../steps/web-sync/index.js'
import { assetsGenerateStep } from '../steps/assets-generate.js'
import { cdnSyncStep } from '../steps/cdn-sync.js'
import { cdnCopyFilesStep } from '../steps/cdn-copy-files.js'
import type { PublicationPiece } from './publication.js'
import { emptyPiecesDiff } from '../workflows/pieces-diff.js'

export interface PublishExecution {
	step: DurableStepApi
	ctx: StepContext
	jobId: string
	progress: JobProgress
}

export interface PublicationReport {
	summary: PiecesDiff
	pieces: PublicationPiece[]
	failedPieces: PublishPieceFailure[]
}

const publicationSourcesStep: Step<string[], PublicationSource[]> = {
	name: 'publish.sources',
	async run(filePaths, { db, config }) {
		const storage = new StorageFileSystem(config.storage.root)
		const pieces = new Pieces(storage)
		const sources: PublicationSource[] = []
		for (const filePath of filePaths) {
			if (typeof filePath !== 'string' || !filePath) throw new Error('Invalid piece filename')
			if (path.posix.isAbsolute(filePath) || filePath.includes('\\') || filePath.includes('\0')) {
				throw new Error('Invalid piece filename')
			}
			if (filePath.split('/').some((part) => !part || part === '.' || part === '..')) {
				throw new Error('Invalid piece filename')
			}
			const { type, format } = pieces.parseFilename(filePath)
			if (!type || format !== '.md' || !config.pieces.some((piece) => piece.type === type)) {
				throw new Error('Expected a configured Markdown piece')
			}
			const source = (await storage.readFile(filePath, 'text')) as string
			const piece = await pieces.getPiece(type)
			const data = await extractFullMarkdown(source)
			const markdown = makePieceMarkdown(
				filePath,
				type,
				data.markdown,
				data.frontmatter as PieceFrontmatter
			)
			const validation = piece.validate(markdown)
			if (!validation.isValid) {
				throw new Error(`Invalid piece source: ${validation.errors.join('\n')}`)
			}
			const identity = await db
				.selectFrom('pieces_items')
				.select(['id', 'date_added'])
				.where('file_path', '=', filePath)
				.executeTakeFirst()
			const item = makePieceItemInsertable(type, markdown, piece.schema)
			const id = identity?.id ?? item.id
			if (!id) throw new Error('Piece has no identity')
			sources.push({
				item: {
					id,
					file_path: filePath,
					type,
					date_added: identity?.date_added ?? Date.now(),
					date_updated: Date.now(),
					note_markdown: item.note_markdown,
					frontmatter_json: item.frontmatter_json,
					assets_json_array: item.assets_json_array,
				},
				contentHash: createHash('md5').update(source).digest('hex'),
			})
		}
		return completed(sources)
	},
}

export async function publishPieces(
	filePaths: string[],
	execution: PublishExecution,
	copyGeneratedFiles = true
): Promise<PublicationReport> {
	const { step, ctx, jobId, progress } = execution
	const sources = await runProgressPhase(
		step,
		ctx,
		jobId,
		progress,
		publicationSourcesStep,
		filePaths
	)
	if (!sources) throw new Error('Publication sources could not be prepared')
	const prepared = await runProgressPhase(step, ctx, jobId, progress, webSyncStep, sources)
	if (!prepared) throw new Error('Publication preparation did not complete')
	const generated = await runProgressPhase(step, ctx, jobId, progress, assetsGenerateStep, prepared)
	if (!generated) throw new Error('Asset generation did not complete')
	if (copyGeneratedFiles) {
		await runProgressPhase(step, ctx, jobId, progress, cdnCopyFilesStep, {
			filePaths: generated.filePaths,
		})
	}
	const summary = emptyPiecesDiff()
	for (const piece of prepared) {
		const paths = piece.wasPublished ? summary.pieces.updated : summary.pieces.added
		paths.push(piece.webPiece.file_path)
	}
	return {
		summary,
		pieces: prepared.map((piece) => ({
			filePath: piece.webPiece.file_path,
			contentHash: piece.contentHash,
		})),
		failedPieces: generated.failedPieces,
	}
}

export async function publishPiece(
	input: PublishPiecePayload,
	execution: PublishExecution
): Promise<PublicationReport> {
	return publishPieces([input.filePath], execution)
}

export async function publishArchive(
	input: PublishPayload,
	execution: PublishExecution
): Promise<PublicationReport> {
	const { step, ctx, jobId, progress } = execution
	if (input.bisync) await runProgressPhase(step, ctx, jobId, progress, archiveSyncStep, undefined)
	const changes = await runProgressPhase(step, ctx, jobId, progress, luzzleSyncStep, undefined)
	const plan = await runProgressPhase(step, ctx, jobId, progress, publishPrepareStep, {
		summary: changes ?? emptyPiecesDiff(),
		filePaths: input.filePaths,
	})
	if (!plan) throw new Error('Publication selection did not complete')
	await runProgressPhase(step, ctx, jobId, progress, pruneWebPiecesStep, undefined)
	const report = await publishPieces(plan.filePaths, execution, false)
	await runProgressPhase(step, ctx, jobId, progress, cdnSyncStep, undefined)
	return { ...report, summary: plan.summary }
}
