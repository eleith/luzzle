import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { getPieces } from '$lib/server/pieces'
import { config } from '$lib/server/config'
import { setFrontmatterValue } from '@luzzle/core'

export const load: PageServerLoad = async ({ params, url }) => {
	const typeParam = url.searchParams.get('type')
	const directory = params.directory || ''
	const types = config.pieces.map((x) => x.type)
	const type = typeParam && types.includes(typeParam) ? typeParam : types[0]

	const pieces = getPieces()
	const currentDir = directory || '.'
	const files = await pieces.getFilesIn(currentDir)
	const subDirectories = files.directories
		.filter((d) => !pieces.isAsset(d))
		.map((d) => {
			const name = d.replace(/\/$/, '')
			return currentDir === '.' ? name : `${currentDir}/${name}`
		})
	const allDirectories = [currentDir, ...subDirectories]

	return {
		types,
		type,
		directory,
		directories: allDirectories
	}
}

export const actions = {
	create: async (event) => {
		const formData = await event.request.formData()
		const nameInput = formData.get('name')
		const typeInput = formData.get('type')
		const directoryInput = formData.get('directory')
		const name = typeof nameInput === 'string' ? nameInput : ''
		const type = typeof typeInput === 'string' ? typeInput : ''
		const directory = typeof directoryInput === 'string' ? directoryInput : ''
		const submitted = { name, type, directory }

		let file: string
		try {
			const pieces = getPieces()
			const types = await pieces.getTypes()
			if (!type || !types.includes(type)) {
				return fail(400, { ...submitted, error: { message: 'piece type does not exist' } })
			}

			const titleField = config.pieces.find((p) => p.type === type)?.fields.title
			if (!name.trim() || !titleField) {
				return fail(400, {
					...submitted,
					error: { message: 'name is required and piece needs a title field' }
				})
			}

			const piece = await pieces.getPiece(type)
			const markdown = await piece.create(directory, name)
			setFrontmatterValue(markdown.frontmatter, titleField, name)
			await piece.write(markdown, { createOnly: true })
			file = markdown.filePath
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e)
			const conflict = e !== null && typeof e === 'object' && 'code' in e && e.code === 'EEXIST'
			return fail(conflict ? 409 : 400, {
				...submitted,
				error: { message: `failed to create piece: ${message}` }
			})
		}

		redirect(303, `/admin/piece/${file}/source`)
	}
} satisfies Actions
