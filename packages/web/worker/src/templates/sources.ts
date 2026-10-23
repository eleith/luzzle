import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Config } from '@luzzle/web.config'
import type { TemplateSource } from './compile.js'
import type { SiteSlot } from './types.js'

type TemplateLocation = { family: 'site'; slot: SiteSlot }

interface TemplateReference {
	location: TemplateLocation
	sourcePath: string
}

export type ConfiguredTemplate = TemplateSource & TemplateLocation & { name: string }

export async function readConfiguredTemplates(config: Config): Promise<ConfiguredTemplate[]> {
	const references = collectTemplateReferences(config)
	if (references.length === 0) return []
	if (!config.paths.config) {
		throw new Error('config.paths.config is required to resolve template sources')
	}

	const configDirectory = path.dirname(path.resolve(config.paths.config))
	const sourcesByFilename = new Map<string, TemplateSource & { name: string }>()
	const templates: ConfiguredTemplate[] = []
	for (const reference of references) {
		const filename = path.resolve(configDirectory, reference.sourcePath)
		let loadedSource = sourcesByFilename.get(filename)
		if (!loadedSource) {
			loadedSource = {
				name: `template-${sourcesByFilename.size}`,
				filename,
				source: await readFile(filename, 'utf8'),
			}
			sourcesByFilename.set(filename, loadedSource)
		}
		templates.push({ ...reference.location, ...loadedSource })
	}
	return templates
}

function collectTemplateReferences(config: Config): TemplateReference[] {
	const references: TemplateReference[] = []
	const components = config.content.component
	if (components) {
		for (const slot of Object.keys(components) as SiteSlot[]) {
			const sourcePath = components[slot]
			if (!sourcePath) continue
			references.push({ location: { family: 'site', slot }, sourcePath })
		}
	}
	return references
}
