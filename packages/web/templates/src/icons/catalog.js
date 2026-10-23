import DefaultIcon from './default/template.svelte';

const icons = new Map([['default', DefaultIcon]]);

export function getIcon(name = 'default') {
	const component = icons.get(name);
	if (!component) throw new Error(`Unknown icon template: ${name}`);
	return component;
}
