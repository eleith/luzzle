import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { TemplateBundleModule, TemplateLookup } from '@luzzle/web.templates/bundle'

export interface LoadedTemplateBundle extends TemplateBundleModule {
	revision: string
	themeCss: string
}

export async function loadTemplateBundle(
	preparedDirectory: string
): Promise<LoadedTemplateBundle | null> {
	const directory = path.resolve(preparedDirectory)
	let current: string
	try {
		current = await readFile(path.join(directory, 'current.json'), 'utf8')
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
		throw error
	}
	const selected: unknown = JSON.parse(current)
	if (
		!isRecord(selected) ||
		typeof selected.revision !== 'string' ||
		!/^[a-zA-Z0-9_-]+$/.test(selected.revision)
	) {
		throw new Error('Invalid prepared template revision in current.json')
	}

	const revision = selected.revision
	const revisionDirectory = path.join(directory, 'revisions', revision)
	const themeCss = await readFile(path.join(revisionDirectory, 'theme.css'), 'utf8')
	const moduleUrl = pathToFileURL(path.join(revisionDirectory, 'templates.mjs')).href
	const module: unknown = await import(/* @vite-ignore */ moduleUrl)
	if (!isTemplateBundleModule(module)) {
		throw new Error(`Invalid prepared template exports for revision ${revision}`)
	}
	return { revision, render: module.render, templateLookup: module.templateLookup, themeCss }
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isNameMap(value: unknown): boolean {
	return (
		isRecord(value) &&
		Object.values(value).every((name) => name === undefined || typeof name === 'string')
	)
}

function isTemplateLookup(value: unknown): value is TemplateLookup {
	return isRecord(value) && isNameMap(value.site)
}

function isTemplateBundleModule(value: unknown): value is TemplateBundleModule {
	return (
		isRecord(value) && typeof value.render === 'function' && isTemplateLookup(value.templateLookup)
	)
}
