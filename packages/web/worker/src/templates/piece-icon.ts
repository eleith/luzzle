import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import type { TemplateLookup, TemplateSource } from './types.js'

export async function readDefaultIconSource(): Promise<TemplateSource> {
	const filename = createRequire(import.meta.url).resolve(
		'@luzzle/web.templates/components/icon.default.svelte'
	)
	return { source: await readFile(filename, 'utf8'), filename }
}

export function createPieceIconSource(
	templateModules: ReadonlyMap<string, string>,
	defaultIconModuleId: string,
	templateLookup: TemplateLookup
): TemplateSource {
	const imports: string[] = []
	const entries: string[] = []
	for (const [name, moduleId] of templateModules) {
		const component = `Template${imports.length}`
		imports.push(`import ${component} from ${JSON.stringify(moduleId)};`)
		entries.push(`[${JSON.stringify(name).replaceAll('<', '\\u003c')}, ${component}]`)
	}
	// The registry lives inside a Svelte script element, so names must not close it.
	const lookupJson = JSON.stringify(templateLookup).replaceAll('<', '\\u003c')
	return {
		filename: 'luzzle:PieceIcon.svelte',
		source: `
<script module>
${imports.join('\n')}
import DefaultIcon from ${JSON.stringify(defaultIconModuleId)};
import { getContext } from 'svelte';
export const templates = new Map([${entries.join(',\n')}]);
export const iconHelpersKey = Symbol('luzzle.icon.helpers');
export const templateLookup = JSON.parse(${JSON.stringify(lookupJson)});
</script>
<script>
let { piece, size, lazy, active } = $props();
const helpers = getContext(iconHelpersKey);
const roles = $derived(Object.hasOwn(templateLookup.pieces, piece.type) ? templateLookup.pieces[piece.type] : undefined);
const Icon = $derived(templates.get(roles?.icon));
const options = $derived({
	size: { width: size.width, height: size.height ?? size.width * 1.5 },
	lazy: lazy ?? false,
	active: active ?? false,
});
</script>

{#if Icon}
	<Icon data={{ piece }} {options} {helpers} />
{:else}
	<DefaultIcon {piece} size={options.size} lazy={options.lazy} active={options.active} helpers={{ getPieceImageUrl: helpers.forPiece(piece).getImageUrl }} />
{/if}
`,
	}
}
