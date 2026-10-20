import { randomUUID } from 'node:crypto'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { TemplateBundle } from './bundle.js'

const bundleFilename = 'templates.mjs'
const themeFilename = 'theme.css'
const stagingDirectoryPrefix = '.template-bundle-'

export async function writeTemplateBundle(
	bundle: TemplateBundle,
	outputDirectory: string
): Promise<string> {
	const destination = path.resolve(outputDirectory)
	const parentDirectory = path.dirname(destination)
	await mkdir(parentDirectory, { recursive: true })

	const stagingDirectory = path.join(parentDirectory, `${stagingDirectoryPrefix}${randomUUID()}`)
	await mkdir(stagingDirectory)
	try {
		await writeFile(path.join(stagingDirectory, bundleFilename), bundle.moduleCode, 'utf8')
		await writeFile(path.join(stagingDirectory, themeFilename), bundle.themeCss, 'utf8')
		await rename(stagingDirectory, destination)
	} catch (error) {
		try {
			await rm(stagingDirectory, { recursive: true, force: true })
		} catch (cleanupError) {
			throw new AggregateError(
				[error, cleanupError],
				'Template bundle write failed and its temporary directory could not be removed',
				{ cause: error }
			)
		}
		throw error
	}

	return path.join(destination, bundleFilename)
}
