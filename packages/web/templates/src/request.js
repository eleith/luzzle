import { getContext } from './runtime/svelte.js';

// This module and all framework-owned components live in the same release graph.
export const requestContext = '@luzzle/web.templates/request/v1';

export function getRequest() {
	const request = getContext(requestContext);
	if (!request) throw new Error('Template component used outside renderTemplate');
	return request;
}

export function recordNavigation(inputs) {
	const request = getRequest();
	if (request.navigation !== null) throw new Error('Only one NavBanner is supported');
	request.navigation = Object.freeze({
		background: 'transparent',
		color: 'var(--color-on-surface)',
		hoverColor: 'var(--color-primary)',
		showHome: true,
		showSearch: true,
		showThemeToggle: true,
		showProgress: true,
		showRandom: false,
		...inputs
	});
}
