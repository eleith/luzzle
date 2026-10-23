import type { Config } from '@luzzle/web.config'
import { generateThemeCss } from '@luzzle/web.theme'
import { generateEditorThemeCss } from '@luzzle/web.theme/editor'
import { compileTemplateBundle, type CompiledTemplateBundle } from './compile.js'
import { readConfiguredTemplates, type ConfiguredTemplate } from './sources.js'
import type { SiteSlot, TemplateLookup } from './types.js'

export interface TemplateBundle extends CompiledTemplateBundle {
	templateLookup: TemplateLookup
	themeCss: string
}

export async function buildTemplateBundle(config: Config): Promise<TemplateBundle> {
	const templates = await readConfiguredTemplates(config)
	const templateLookup = buildTemplateLookup(templates)
	const sources = Object.fromEntries(
		templates.map(({ name, source, filename }) => [name, { source, filename }])
	)
	const compiled = await compileTemplateBundle(sources, templateLookup)
	const themeCss = generateThemeCss(config)
	const editorThemeCss = await generateEditorThemeCss(config.theme.markdown.code)
	return { ...compiled, templateLookup, themeCss: themeCss + editorThemeCss }
}

function buildTemplateLookup(templates: ConfiguredTemplate[]): TemplateLookup {
	const site = new Map<SiteSlot, string>()
	for (const template of templates) site.set(template.slot, template.name)
	return { site: Object.fromEntries(site) }
}
