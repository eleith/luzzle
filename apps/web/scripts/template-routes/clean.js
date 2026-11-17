import { rm } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { defaultRoutesDirectory, findGeneratedTemplateRouteFiles } from './files.js'

/** @param {string} routesDirectory */
export async function cleanTemplateRoutes(routesDirectory = defaultRoutesDirectory) {
	for (const filePath of await findGeneratedTemplateRouteFiles(routesDirectory)) {
		await rm(filePath)
	}
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
	await cleanTemplateRoutes()
}
