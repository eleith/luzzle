import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Config } from '@luzzle/web.config'
import type { TemplateSource } from './compile.js'

type PieceRole = keyof NonNullable<Config['pieces'][number]['components']>
type SiteSlot = keyof NonNullable<Config['content']['component']>

type TemplateLocation =
	| { family: 'piece'; pieceType: string; role: PieceRole }
	| { family: 'site'; slot: SiteSlot }

interface TemplateReference {
	location: TemplateLocation
	sourcePath: string
}

export type ConfiguredTemplate = TemplateSource & TemplateLocation & { name: string }

export async function loadTemplateSources(config: Config): Promise<ConfiguredTemplate[]> {
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
	for (const piece of config.pieces) {
		const components = piece.components
		if (!components) continue
		for (const role of Object.keys(components) as PieceRole[]) {
			const sourcePath = components[role]
			if (!sourcePath) continue
			references.push({
				location: { family: 'piece', pieceType: piece.type, role },
				sourcePath,
			})
		}
	}

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
