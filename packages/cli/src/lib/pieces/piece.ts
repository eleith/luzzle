import Ajv from 'ajv'
import { JTDSchemaType } from 'ajv/dist/core.js'
import { existsSync } from 'fs'
import { writeFile } from 'fs/promises'
import log from '../log.js'
import { extract } from '../md.js'
import Pieces, { PieceDirectories, PieceType } from './pieces.js'
import { PieceMarkDown, toValidatedMarkDown, toMarkDownString } from './markdown.js'
import { PieceCache } from './cache.js'

export type PieceDatabase = Record<string, string | null | number | unknown>

class Piece<T extends PieceType, K extends PieceDatabase, M extends PieceMarkDown<K, keyof K>> {
	private _pieces: Pieces
	private _piece: T
	private _validator: Ajv.ValidateFunction<M>

	constructor(
		dir: string,
		piece: T,
		validator: Ajv.ValidateFunction<M>,
		schema: JTDSchemaType<PieceCache<K>>
	) {
		this._pieces = new Pieces(dir)
		this._piece = piece
		this._validator = validator

		this._pieces.register(piece, schema as JTDSchemaType<PieceCache<PieceDatabase>>)
	}

	get directories(): PieceDirectories {
		return this._pieces.directories(this._piece)
	}

	get caches() {
		return this._pieces.caches(this._piece)
	}

	get type() {
		return this._piece
	}

	async getSlugs(): Promise<string[]> {
		return this._pieces.getSlugs(this._piece)
	}

	async getSlugsUpdated(type: 'lastProcessed' | 'lastSynced'): Promise<string[]> {
		return this._pieces.getSlugsUpdated(this._piece, type)
	}

	getPath(slug: string): string {
		return this._pieces.getPath(this._piece, slug)
	}

	getFileName(slug: string): string {
		return this._pieces.getFileName(slug)
	}

	exists(slug: string): boolean {
		return existsSync(this.getPath(slug))
	}

	async get(slug: string): Promise<M | null> {
		if (this.exists(slug)) {
			const filepath = this.getPath(slug)
			const data = (await extract(filepath)) as M
			return this.create(slug, data.markdown, data.frontmatter)
		} else {
			return null
		}
	}

	async attach(slug: string, file: string) {
		log.info(`${this._piece} does not support attachment of ${file} to ${slug}`)
	}

	create(slug: string, notes: M['markdown'], frontmatter: M['frontmatter']): M {
		const filename = this.getFileName(slug)
		return toValidatedMarkDown(filename, notes, frontmatter, this._validator)
	}

	async write(slug: string, markdown: M) {
		const markdownString = toMarkDownString(markdown)
		const markdownPath = this.getPath(slug)

		await writeFile(markdownPath, markdownString)

		const cache = {
			lastProcessed: new Date().toJSON(),
		}

		await this.caches.update(slug, cache)
	}

	async process(slug: string) {
		log.info(`${this._piece} does not support processing of ${slug}`)
	}

	async removeStaleCache() {
		return this._pieces.removeStaleCache(this._piece)
	}
}

export default Piece
