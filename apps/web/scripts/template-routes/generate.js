import { iconTemplateNames, pageTemplateNames } from '@luzzle/web.templates/names'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
	defaultRoutesDirectory,
	generatedFileHeader,
	isGeneratedTemplateRoute,
	readFileIfPresent,
	findGeneratedTemplateRouteFiles
} from './files.js'

const builtInTemplateNames = { icon: iconTemplateNames, page: pageTemplateNames }
/** @type {Array<'icon' | 'page'>} */
const templateRoles = ['icon', 'page']

/** @param {string} templateName */
function isRouteSafeTemplateName(templateName) {
	return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(templateName)
}

/** @param {string} templateName */
function createIconRouteSource(templateName) {
	return `${generatedFileHeader}<script lang="ts">
	import Template from '@luzzle/web.templates/icons/${templateName}'
	import IconListing from '#lib/templates/icon-listing.svelte'

	let { data } = $props()
</script>

<IconListing Icon={Template} {data} />
`
}

/** @param {string} templateName */
function createPageRouteSource(templateName) {
	return `${generatedFileHeader}<script lang="ts">
	import Template from '@luzzle/web.templates/pages/${templateName}'
	import TemplatePage from '#lib/templates/page.svelte'

	let { data } = $props()
</script>

<TemplatePage Page={Template} piece={data.piece} tags={data.tags} />
`
}

/**
 * Generate only component adapters; shared layouts and loaders remain handwritten.
 * @param {string} outputDirectory
 * @param {{ icon: readonly string[]; page: readonly string[] }} templateNames
 */
export async function generateTemplateRoutes(
	outputDirectory = defaultRoutesDirectory,
	templateNames = builtInTemplateNames
) {
	const routesDirectory = path.resolve(outputDirectory)
	const plannedRouteSources = new Map()
	// Validate the complete catalog before touching any output.
	for (const role of templateRoles) {
		const seenTemplateNames = new Set()
		for (const templateName of [...templateNames[role]].sort()) {
			if (!isRouteSafeTemplateName(templateName) || seenTemplateNames.has(templateName)) {
				throw new Error(`Invalid or duplicate ${role} template name: ${templateName}`)
			}
			seenTemplateNames.add(templateName)
			const routeParameters = role === 'icon' ? ['[piece]'] : ['[piece]', '[slug]']
			const filePath = path.join(
				routesDirectory,
				role,
				templateName,
				...routeParameters,
				'+page.svelte'
			)
			const source =
				role === 'icon' ? createIconRouteSource(templateName) : createPageRouteSource(templateName)
			plannedRouteSources.set(filePath, source)
		}
	}

	const existingRouteSources = new Map()
	for (const filePath of plannedRouteSources.keys()) {
		const source = await readFileIfPresent(filePath)
		if (source !== undefined && !isGeneratedTemplateRoute(source)) {
			throw new Error(`Refusing to overwrite handwritten template route: ${filePath}`)
		}
		existingRouteSources.set(filePath, source)
	}

	const generatedRouteFiles = await findGeneratedTemplateRouteFiles(routesDirectory)
	const staleRouteFiles = generatedRouteFiles.filter(
		(filePath) => !plannedRouteSources.has(filePath)
	)

	for (const [filePath, source] of plannedRouteSources) {
		if (existingRouteSources.get(filePath) === source) continue
		await mkdir(path.dirname(filePath), { recursive: true })
		await writeFile(filePath, source)
	}
	for (const filePath of staleRouteFiles) await rm(filePath)
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
	await generateTemplateRoutes()
}
