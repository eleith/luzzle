import DefaultOpengraph from './default/template.svelte';

const opengraphs = new Map([['default', DefaultOpengraph]]);

export function getOpengraph(name = 'default') {
	const component = opengraphs.get(name);
	if (!component) throw new Error(`Unknown opengraph template: ${name}`);
	return component;
}
