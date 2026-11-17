import { expect, test } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateTemplateRoutes } from './generate-template-routes.js'

const cache = fileURLToPath(new URL('../node_modules/.cache/', import.meta.url))

test('generates adapters without site config, reuses unchanged files and removes only obsolete generated routes', async () => {
	await mkdir(cache, { recursive: true })
	const directory = await mkdtemp(path.join(cache, 'generated-template-routes-'))
	try {
		const icon = path.join(directory, 'icon/book/[piece]/+page.svelte')
		const stale = path.join(directory, 'icon/poster/[piece]/+page.svelte')
		const page = path.join(directory, 'page/note/[piece]/[slug]/+page.svelte')
		const layout = path.join(directory, 'icon/+layout.server.ts')
		const handwritten = path.join(directory, 'icon/manual/[piece]/+page.svelte')
		await mkdir(path.dirname(handwritten), { recursive: true })
		await writeFile(handwritten, '<p>Handwritten route</p>\n')
		await writeFile(layout, '// Shared loader\n')

		// There is no config.yaml, database or archive in this fixture.
		await generateTemplateRoutes(directory, { icon: ['poster', 'book'], page: ['note'] })
		const iconSource = await readFile(icon, 'utf8')
		expect(iconSource).toContain("from '@luzzle/web.templates/icons/book'")
		expect(iconSource).toContain('<IconListing Icon={Template} {data} />')
		const pageSource = await readFile(page, 'utf8')
		expect(pageSource).toContain("from '@luzzle/web.templates/pages/note'")
		expect(pageSource).toContain(
			'<TemplatePage Page={Template} piece={data.piece} tags={data.tags} />'
		)

		// An unchanged adapter must not be rewritten and trigger development reloads.
		await utimes(icon, new Date(0), new Date(0))
		await generateTemplateRoutes(directory, { icon: ['book'], page: ['note'] })
		expect(await readFile(icon, 'utf8')).toBe(iconSource)
		expect((await stat(icon)).mtimeMs).toBe(0)
		await expect(readFile(stale)).rejects.toMatchObject({ code: 'ENOENT' })
		expect(await readFile(layout, 'utf8')).toBe('// Shared loader\n')
		expect(await readFile(handwritten, 'utf8')).toBe('<p>Handwritten route</p>\n')

		await expect(
			generateTemplateRoutes(directory, { icon: ['new-icon'], page: ['../escape'] })
		).rejects.toThrow('Invalid or duplicate page template name')
		await expect(
			readFile(path.join(directory, 'icon/new-icon/[piece]/+page.svelte'))
		).rejects.toMatchObject({ code: 'ENOENT' })

		await expect(generateTemplateRoutes(directory, { icon: ['manual'], page: [] })).rejects.toThrow(
			'Refusing to overwrite handwritten template route'
		)
		expect(await readFile(handwritten, 'utf8')).toBe('<p>Handwritten route</p>\n')
		expect(await readFile(icon, 'utf8')).toBe(iconSource)
	} finally {
		await rm(directory, { recursive: true, force: true })
	}
})
