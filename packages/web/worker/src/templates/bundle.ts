import type { Config } from '@luzzle/web.config'
import { compileTemplateBundle, type CompiledTemplateBundle } from './compile.js'
import {
	readConfiguredTemplates,
	type ConfiguredTemplate,
	type PieceRole,
	type SiteSlot,
} from './sources.js'

export interface TemplateLookup {
	pieces: Record<string, Partial<Record<PieceRole, string>>>
	site: Partial<Record<SiteSlot, string>>
}

export interface TemplateBundle extends CompiledTemplateBundle {
	templateLookup: TemplateLookup
}

export async function buildTemplateBundle(config: Config): Promise<TemplateBundle> {
	const templates = await readConfiguredTemplates(config)
	const templateLookup = buildTemplateLookup(templates)
	const sources = Object.fromEntries(
		templates.map(({ name, source, filename }) => [name, { source, filename }])
	)
	const compiled = await compileTemplateBundle(sources)
	return { ...compiled, templateLookup }
}

function buildTemplateLookup(templates: ConfiguredTemplate[]): TemplateLookup {
	const pieces = new Map<string, Map<PieceRole, string>>()
	const site = new Map<SiteSlot, string>()
	for (const template of templates) {
		if (template.family === 'site') {
			site.set(template.slot, template.name)
			continue
		}

		let roles = pieces.get(template.pieceType)
		if (!roles) {
			roles = new Map()
			pieces.set(template.pieceType, roles)
		}
		const previous = roles.get(template.role)
		if (previous && previous !== template.name) {
			throw new Error(
				`Conflicting ${template.role} templates for piece type "${template.pieceType}"`
			)
		}
		roles.set(template.role, template.name)
	}

	return {
		pieces: Object.fromEntries(
			[...pieces].map(([type, roles]) => [type, Object.fromEntries(roles)])
		),
		site: Object.fromEntries(site),
	}
}
