import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { asCoreDatabase, migrate, Pieces, StorageFileSystem } from '@luzzle/core'
import { createAppDb, runWebMigrations } from '@luzzle/web.db'
import { BackendSqlite } from 'openworkflow/sqlite'

export const ADMIN = { username: 'admin', password: 'e2e-only-admin-password' }
export const notebook = {
	file: 'reading/meteor notes.notes.md',
	editorUrl: '/admin/piece/reading/meteor%20notes.notes.md/source',
	publishedUrl: '/admin/view/published/reading/meteor%20notes.notes.md',
	publicUrl: '/pieces/notes/meteor-notebook',
	type: 'notes',
	slug: 'meteor-notebook',
	title: 'Meteor Notebook',
	publishedAt: Date.UTC(2026, 0, 1)
}

// Deliberately unrelated filename/type and independently selected Page/Icon roles.
export const fieldGuide = {
	file: 'reading/field guide.records.md',
	editorUrl: '/admin/piece/reading/field%20guide.records.md/source',
	publishedUrl: '/admin/view/published/reading/field%20guide.records.md',
	publicUrl: '/pieces/records/field-guide',
	type: 'records',
	slug: 'field-guide',
	title: 'Field Guide',
	previewTitle: 'Private Field Guide Draft',
	previewAsset: 'private cover.png'
}

export type PreviewJobs = { completed: string; failed: string; pending: string }

const note = `Original observation.

> First quoted paragraph.
>
> Second quoted paragraph.
`
const noteHtml = `<section class="markdown">
<p>Original observation.</p>
<blockquote>
<p>First quoted paragraph.</p>
<p>Second quoted paragraph.</p>
</blockquote>
</section>`

const pieces = [
	notebook,
	{
		file: 'forest.notes.md',
		type: 'notes',
		slug: 'forest-notebook',
		title: 'Forest Notebook'
	},
	fieldGuide
]

export async function createFixture(directory: string, origin: string) {
	const dateConsumed = '2024-01-01'
	const consumedAt = Date.parse(`${dateConsumed}T00:00:00Z`)
	const archive = path.join(directory, 'archive')
	await mkdir(path.join(archive, '.luzzle/schemas'), { recursive: true })
	await mkdir(path.join(archive, 'reading'), { recursive: true })
	await mkdir(path.join(directory, 'data'), { recursive: true })
	for (const type of ['notes', 'records']) {
		await writeFile(
			path.join(archive, `.luzzle/schemas/${type}.json`),
			JSON.stringify({
				title: type,
				type: 'object',
				properties: {
					title: { type: 'string' },
					date: { type: 'string', format: 'date' }
				},
				required: ['title', 'date'],
				additionalProperties: false
			})
		)
	}
	for (const piece of pieces) {
		await writeFile(
			path.join(archive, piece.file),
			`---\ntitle: ${piece.title}\ndate: ${dateConsumed}\n---\n\n${note}`
		)
	}
	const database = path.join(directory, 'data/luzzle.sqlite')
	await writeFile(
		path.join(directory, 'config.yaml'),
		JSON.stringify({
			url: { app: origin },
			storage: { root: archive },
			paths: { database },
			worker: { queue: { path: path.join(directory, 'data/openworkflow.sqlite') } },
			content: { text: { title: 'E2E Garden' } },
			auth: { secret: 'e2e-only-session-secret-at-least-32-characters', credentials: ADMIN },
			pieces: [
				{
					type: 'notes',
					fields: { title: 'title', date_consumed: 'date' },
					templates: { page: { name: 'note' } }
				},
				{
					type: fieldGuide.type,
					fields: { title: 'title', date_consumed: 'date' },
					templates: {
						page: { name: 'book', mapping: { image: 'cover', author: { value: 'Ada Reader' } } },
						icon: { name: 'recipe-card', mapping: { image: 'cover' } }
					}
				}
			]
		})
	)
	const db = createAppDb(database)
	try {
		const core = await migrate(asCoreDatabase(db))
		if (core.error) throw core.error
		const web = await runWebMigrations(db)
		if (web.error) throw web.error
		const schemas = new Pieces(new StorageFileSystem(archive))
		for await (const result of await schemas.sync(asCoreDatabase(db))) {
			if (result.error) throw new Error(result.message)
		}
		for (const type of ['notes', 'records']) {
			const schema = await schemas.getPiece(type)
			for await (const result of await schema.sync(
				asCoreDatabase(db),
				pieces.filter((piece) => piece.type === type).map((piece) => piece.file)
			)) {
				if (result.error) throw new Error(result.message)
			}
		}
		const cachedPieces = await db
			.selectFrom('pieces_cache')
			.select(['file_path', 'content_hash'])
			.execute()
		// Seed the published read model directly; no Publish job is being simulated.
		await db
			.insertInto('web_pieces')
			.values(
				pieces.map((piece) => ({
					id: piece.slug,
					key: piece.slug,
					slug: piece.slug,
					type: piece.type,
					file_path: piece.file,
					content_hash: cachedPieces.find((cached) => cached.file_path === piece.file)!
						.content_hash,
					title: piece.title,
					note,
					json_metadata: JSON.stringify({ title: piece.title, date: dateConsumed }),
					date_added: consumedAt,
					date_consumed: consumedAt,
					last_published_at: notebook.publishedAt
				}))
			)
			.execute()
		await db
			.insertInto('web_pieces_assets')
			.values(
				pieces.map((piece) => ({
					piece_file_path: piece.file,
					piece_key: piece.slug,
					asset_key: piece.slug,
					transformation: 'markdown',
					mime_type: 'text/html',
					is_embedded: 1,
					content: noteHtml
				}))
			)
			.execute()
		// A recorded output for the Share viewer; this fixture does not run Takumi or publish.
		const sharePath = `${notebook.slug}/share image.png`
		const assetsDirectory = path.join(directory, 'assets/pieces')
		await mkdir(path.join(assetsDirectory, notebook.slug), { recursive: true })
		await copyFile(
			new URL('../../static/images/opengraph.png', import.meta.url),
			path.join(assetsDirectory, sharePath)
		)
		await db
			.insertInto('web_pieces_assets')
			.values({
				piece_file_path: notebook.file,
				piece_key: notebook.slug,
				asset_key: notebook.slug,
				transformation: 'opengraph',
				asset_path: sharePath,
				mime_type: 'image/png',
				is_embedded: 0
			})
			.execute()
	} finally {
		await db.destroy()
	}
	return seedPreviews(directory)
}

async function seedPreviews(directory: string): Promise<PreviewJobs> {
	const backend = BackendSqlite.connect(path.join(directory, 'data/openworkflow.sqlite'))
	const workerId = 'e2e-recorded-output'
	async function claim(filePath: string) {
		const run = await createPreviewRun(backend, filePath)
		const claimed = await backend.claimWorkflowRun({ workerId, leaseDurationMs: 60_000 })
		if (claimed?.id !== run.id) throw new Error('Unexpected fixture workflow claim')
		return run.id
	}
	try {
		const completed = await claim(fieldGuide.file)
		await seedPreviewAssets(directory, completed)
		await completeRecordedPreview(backend, completed, workerId)
		const failed = await claim(notebook.file)
		await backend.failWorkflowRun({
			workflowRunId: failed,
			workerId,
			error: { name: 'PreviewError', message: 'Recorded preview failure' },
			retryPolicy: {
				maximumAttempts: 1,
				initialInterval: '1s',
				maximumInterval: '1s',
				backoffCoefficient: 1
			}
		})
		const pending = await createPreviewRun(backend, fieldGuide.file)
		await seedPreviewAssets(directory, pending.id)
		return { completed, failed, pending: pending.id }
	} finally {
		await backend.stop()
	}
}

function createPreviewRun(backend: BackendSqlite, filePath: string) {
	return backend.createWorkflowRun({
		workflowName: 'Preview',
		version: null,
		idempotencyKey: null,
		config: {},
		context: null,
		input: { filePath },
		parentStepAttemptNamespaceId: null,
		parentStepAttemptId: null,
		availableAt: null,
		deadlineAt: null
	})
}

async function seedPreviewAssets(directory: string, job: string) {
	const assets = path.join(directory, 'assets/previews', job)
	await mkdir(assets, { recursive: true })
	await copyFile(
		new URL('../../static/images/opengraph.png', import.meta.url),
		path.join(assets, fieldGuide.previewAsset)
	)
}

async function completeRecordedPreview(backend: BackendSqlite, job: string, workerId: string) {
	// Recorded worker-shaped output, consumed by the real assembler and private asset route.
	await backend.completeWorkflowRun({
		workflowRunId: job,
		workerId,
		output: {
			filePath: fieldGuide.file,
			type: fieldGuide.type,
			slug: fieldGuide.slug,
			pieceKey: fieldGuide.slug,
			sanitizedFrontmatter: {
				title: fieldGuide.previewTitle,
				date: Date.UTC(2024, 0, 1),
				cover: 'private-cover'
			},
			note: 'Private preview observation.',
			pathToKey: {},
			transforms: [
				{
					asset_key: 'private-cover',
					transformation: 'image.original',
					asset_path: fieldGuide.previewAsset,
					mime_type: 'image/png',
					is_embedded: 0
				},
				{
					asset_key: fieldGuide.slug,
					transformation: 'opengraph',
					asset_path: fieldGuide.previewAsset,
					mime_type: 'image/png',
					is_embedded: 0
				},
				{
					asset_key: fieldGuide.slug,
					transformation: 'markdown',
					mime_type: 'text/html',
					is_embedded: 1,
					content: '<p>Private preview observation.</p>'
				}
			]
		}
	})
}

// The only waiting run belongs to this browser scenario; no worker or testing HTTP API.
export async function completePendingPreview(directory: string, job: string) {
	const backend = BackendSqlite.connect(path.join(directory, 'data/openworkflow.sqlite'))
	const workerId = 'e2e-live-completion'
	try {
		const claimed = await backend.claimWorkflowRun({ workerId, leaseDurationMs: 60_000 })
		if (claimed?.id !== job) throw new Error('Unexpected pending preview claim')
		await completeRecordedPreview(backend, job, workerId)
	} finally {
		await backend.stop()
	}
}
