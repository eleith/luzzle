import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { asCoreDatabase, migrate, Pieces, StorageFileSystem } from '@luzzle/core'
import { createAppDb, runWebMigrations } from '@luzzle/web.db'

export const ADMIN = { username: 'admin', password: 'e2e-only-admin-password' }
export const notebook = {
	file: 'reading/meteor notes.notes.md',
	editorUrl: '/admin/piece/reading/meteor%20notes.notes.md/source',
	publicUrl: '/pieces/notes/meteor-notebook',
	type: 'notes',
	slug: 'meteor-notebook',
	title: 'Meteor Notebook'
}

const pieces = [
	notebook,
	{
		file: 'forest.notes.md',
		type: 'notes',
		slug: 'forest-notebook',
		title: 'Forest Notebook'
	}
]

export async function createFixture(directory: string, origin: string) {
	const dateConsumed = '2024-01-01'
	const consumedAt = Date.parse(`${dateConsumed}T00:00:00Z`)
	const archive = path.join(directory, 'archive')
	await mkdir(path.join(archive, '.luzzle/schemas'), { recursive: true })
	await mkdir(path.join(archive, 'reading'), { recursive: true })
	await mkdir(path.join(directory, 'data'), { recursive: true })
	await writeFile(
		path.join(archive, '.luzzle/schemas/notes.json'),
		JSON.stringify({
			title: 'notes',
			type: 'object',
			properties: {
				title: { type: 'string' },
				date: { type: 'string', format: 'date' }
			},
			required: ['title', 'date'],
			additionalProperties: false
		})
	)
	for (const piece of pieces) {
		await writeFile(
			path.join(archive, piece.file),
			`---\ntitle: ${piece.title}\ndate: ${dateConsumed}\n---\n\nOriginal observation.\n`
		)
	}
	const database = path.join(directory, 'data/luzzle.sqlite')
	await writeFile(
		path.join(directory, 'config.yaml'),
		JSON.stringify({
			url: { app: origin },
			storage: { root: archive },
			paths: { database },
			content: { text: { title: 'E2E Garden' } },
			auth: { secret: 'e2e-only-session-secret-at-least-32-characters', credentials: ADMIN },
			pieces: [{ type: 'notes', fields: { title: 'title', date_consumed: 'date' } }]
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
					title: piece.title,
					note: 'Original observation.',
					json_metadata: JSON.stringify({ title: piece.title, date: dateConsumed }),
					date_added: consumedAt,
					date_consumed: consumedAt
				}))
			)
			.execute()
	} finally {
		await db.destroy()
	}
}
