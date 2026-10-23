import DefaultPage from './default/template.svelte';

const pages = new Map([['default', DefaultPage]]);

export function getPage(name = 'default') {
	const component = pages.get(name);
	if (!component) throw new Error(`Unknown page template: ${name}`);
	return component;
}
