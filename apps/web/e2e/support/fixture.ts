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
	caption: 'Published observation',
	previewCaption: 'Unpublished observation',
	previewTitle: 'Private Meteor Draft',
	previewAsset: 'draft meteor.png',
	previewShareAsset: 'draft meteor share.png',
	publishedAt: Date.UTC(2026, 0, 1)
}

// Deliberately unrelated filename/type and independently selected Page/Icon/Opengraph roles.
export const fieldGuide = {
	file: 'reading/field guide.records.md',
	editorUrl: '/admin/piece/reading/field%20guide.records.md/source',
	publishedUrl: '/admin/view/published/reading/field%20guide.records.md',
	publicUrl: '/pieces/records/field-guide',
	type: 'records',
	slug: 'field-guide',
	title: 'Field Guide',
	previewTitle: 'Private Field Guide Draft',
	previewAsset: 'private cover.png',
	previewShareAsset: 'private share image.png'
}

export const notePageFile = 'notes-page.svelte'
export const fieldNotesTag = { label: 'Field Notes', slug: 'field-notes' }

export type PreviewJobs = {
	completed: string
	notebook: string
	failedShare: string
	failed: string
	pending: string
}

const note = `Original observation.

> First quoted paragraph.
>
> Second quoted paragraph.
`
const sidenoteHtml = `<p>More on this observation<span class="sidenote">
<sup class="sidenote__reference"><a href="#sidenote-1" aria-label="Locate sidenote 1">1</a></sup>
<button type="button" class="sidenote__button" popovertarget="sidenote-1" aria-label="Sidenote 1"><sup>1</sup></button>
</span>.</p>
<div class="sidenote__slot"><div id="sidenote-1" class="sidenote__content sidenote__content--live" tabindex="-1" popover="auto" role="note" aria-label="Sidenote 1">
<span class="sidenote__header">
<span class="sidenote__label" aria-hidden="true">Sidenote 1</span>
<button type="button" autofocus class="sidenote__close" popovertarget="sidenote-1" popovertargetaction="hide" aria-label="Close sidenote 1"><span class="sidenote__close-icon">×</span></button>
</span>
<div class="sidenote__body">
<p><span class="sidenote__id" aria-hidden="true">1</span> <a href="#observation">Early source</a></p>
<details class="sidenote__rest">
<summary><span class="sidenote__read-more">Read more</span><span class="sidenote__show-less">Show less</span></summary>
<p>The observation was recorded from a different site. <a href="#observation">Later source</a>.</p>
</details>
</div>
</div></div>`

const noteHtml = (extra = '') => `<section class="markdown">
${extra}
<p id="observation">Original observation.</p>
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
					date: { type: 'string', format: 'date' },
					cover: { type: 'string', format: 'asset' },
					...(type === 'notes' ? { caption: { type: 'string' } } : {})
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
	await writeFile(
		path.join(directory, 'notes-icon.svelte'),
		`<script>
			let { piece, fields, helpers, size } = $props()
			const cover = $derived(helpers.getPieceImageUrl(fields.image, size.width, 'jpg'))
		</script>
		{@html '<!---->'}<a class="fixture-note-icon" data-width={size.width} data-caption={fields.label} href="/decorative">
			{#if cover}<img src={cover} alt="" width="24" />{/if}{piece.title}
		</a>
		<style>
			.fixture-note-icon { --fixture-note-active: no }
			:global([data-active="true"]) .fixture-note-icon { --fixture-note-active: yes }
		</style>`
	)
	await writeFile(
		path.join(directory, notePageFile),
		`<script>
			let { piece, fields, tags, helpers } = $props()
			helpers.requestNavBar({ showRandom: true })
			const cover = $derived(helpers.getPieceImageUrl(fields.jacket, 500, 'jpg'))
		</script>
		<article class="fixture-note-page">
			<h1>{piece.title}</h1>
			{#if fields.subtitle}<p>{fields.subtitle}</p>{/if}
			{#if cover}<img src={cover} alt="Notebook cover" width="120" />{/if}
			{@html helpers.getPieceAssetContent(piece.key, 'markdown') || ''}
			{#each tags as { tag, slug }}<a href="/tags/{slug}">{tag}</a>{/each}
		</article>
		<style>
			article { --fixture-page-style: applied; max-width: 48rem; margin-inline: auto }
		</style>`
	)
	await writeFile(
		path.join(directory, 'notes-share.svelte'),
		`<script>
			let { piece, fields, helpers } = $props()
			if (!fields.summary) throw new Error('Private missing summary')
			const cover = $derived(helpers.getPieceImageUrl(fields.jacket, 500, 'jpg'))
		</script>
		<article>
			<h1>{piece.title}</h1><p>{fields.summary}</p>
			{#if cover}<img src={cover} alt="Share card cover" />{/if}
		</article>
		<style>article { --fixture-share-style: applied }</style>`
	)
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
			pieces: {
				notes: {
					fields: { title: 'title', date_consumed: 'date', tags: 'tags' },
					templates: {
						page: {
							file: `./${notePageFile}`,
							mapping: { jacket: 'cover', subtitle: 'caption' }
						},
						icon: { file: './notes-icon.svelte', mapping: { image: 'cover', label: 'caption' } },
						opengraph: {
							file: './notes-share.svelte',
							mapping: { jacket: 'cover', summary: 'caption' }
						}
					}
				},
				[fieldGuide.type]: {
					fields: { title: 'title', date_consumed: 'date' },
					templates: {
						page: {
							name: 'default',
							mapping: { image: 'cover', people: { value: ['Ada Reader'] } }
						},
						icon: { name: 'default', mapping: { image: 'cover' } },
						opengraph: {
							name: 'default',
							mapping: { image: 'cover', director: { value: 'Olivia Sharer' } }
						}
					}
				}
			}
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
					json_metadata: JSON.stringify({
						title: piece.title,
						date: dateConsumed,
						...(piece.slug === notebook.slug
							? { cover: 'meteor-cover', caption: notebook.caption }
							: {})
					}),
					date_added: consumedAt,
					date_consumed: consumedAt,
					last_published_at: notebook.publishedAt
				}))
			)
			.execute()
		await db
			.insertInto('web_pieces_tags')
			.values(
				[notebook, fieldGuide].map((piece) => ({
					piece_type: piece.type,
					piece_slug: piece.slug,
					piece_id: piece.slug,
					tag: fieldNotesTag.label,
					slug: fieldNotesTag.slug
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
					content: noteHtml(piece.slug === notebook.slug ? sidenoteHtml : '')
				}))
			)
			.execute()
		// Recorded public images for Share and Icon; no Takumi or Publish job needed.
		const assetsDirectory = path.join(directory, 'assets/pieces')
		await mkdir(path.join(assetsDirectory, notebook.slug), { recursive: true })
		for (const [filename, assetKey, transformation] of [
			['share image.png', notebook.slug, 'opengraph'],
			['published meteor.png', 'meteor-cover', 'image.original']
		]) {
			const assetPath = `${notebook.slug}/${filename}`
			await copyFile(
				new URL('../../static/images/opengraph.png', import.meta.url),
				path.join(assetsDirectory, assetPath)
			)
			await db
				.insertInto('web_pieces_assets')
				.values({
					piece_file_path: notebook.file,
					piece_key: notebook.slug,
					asset_key: assetKey,
					transformation,
					asset_path: assetPath,
					mime_type: 'image/png',
					is_embedded: 0
				})
				.execute()
		}
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
		const notebookJob = await claim(notebook.file)
		await seedPreviewAssets(directory, notebookJob, notebook)
		await completeRecordedPreview(backend, notebookJob, workerId, notebook)
		// This recorded draft has a PNG, but its authored share HTML requires a caption.
		const failedShare = await claim(notebook.file)
		await seedPreviewAssets(directory, failedShare, notebook)
		await completeRecordedPreview(backend, failedShare, workerId, {
			...notebook,
			previewCaption: ''
		})
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
		return { completed, notebook: notebookJob, failedShare, failed, pending: pending.id }
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

async function seedPreviewAssets(
	directory: string,
	job: string,
	piece: typeof fieldGuide | typeof notebook = fieldGuide
) {
	const assets = path.join(directory, 'assets/previews', job)
	await mkdir(assets, { recursive: true })
	for (const asset of [piece.previewAsset, piece.previewShareAsset]) {
		await copyFile(
			new URL('../../static/images/opengraph.png', import.meta.url),
			path.join(assets, asset)
		)
	}
}

async function completeRecordedPreview(
	backend: BackendSqlite,
	job: string,
	workerId: string,
	piece: typeof fieldGuide | typeof notebook = fieldGuide
) {
	// Recorded worker-shaped output, consumed by the real assembler and private asset route.
	await backend.completeWorkflowRun({
		workflowRunId: job,
		workerId,
		output: {
			filePath: piece.file,
			type: piece.type,
			slug: piece.slug,
			pieceKey: piece.slug,
			sanitizedFrontmatter: {
				title: piece.previewTitle,
				date: Date.UTC(2024, 0, 1),
				cover: 'private-cover',
				...('previewCaption' in piece
					? { caption: piece.previewCaption, tags: ['Draft notes'] }
					: {})
			},
			note: 'Private preview observation.',
			pathToKey: {},
			transforms: [
				{
					asset_key: 'private-cover',
					transformation: 'image.original',
					asset_path: piece.previewAsset,
					mime_type: 'image/png',
					is_embedded: 0
				},
				{
					asset_key: piece.slug,
					transformation: 'opengraph',
					asset_path: piece.previewShareAsset,
					mime_type: 'image/png',
					is_embedded: 0
				},
				{
					asset_key: piece.slug,
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
