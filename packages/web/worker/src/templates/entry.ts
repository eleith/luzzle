export function createRenderEntry(iconComponentModuleId: string): string {
	return `
import PieceIcon, { templates, templateLookup, iconHelpersKey } from ${JSON.stringify(iconComponentModuleId)};
import { render as renderSvelte } from 'svelte/server';
export { templateLookup };
export function render(name, props) {
	const Template = templates.get(name);
	if (!Template) throw new Error('Unknown template: ' + name);
	const baseHelpers = {
		forPiece: props.helpers?.forPiece,
		getStaticAssetUrl: props.helpers?.getStaticAssetUrl,
	};
	const { body, head } = renderSvelte(Template, {
		props: { ...props, components: { PieceIcon } },
		context: new Map([[iconHelpersKey, baseHelpers]]),
	});
	return { body, head };
}
`
}
