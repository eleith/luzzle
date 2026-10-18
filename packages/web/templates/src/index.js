import { render } from './runtime/server.js';
import { components } from './components.js';
import { requestContext } from './request.js';

export { components } from './components.js';
export { compatibility, assertCompatible } from './compatibility.js';

/**
 * Minimal synchronous SSR boundary, not the full author role contract.
 * A fallback, when supplied, is attempted exactly once with fresh request state.
 * No application-owned Svelte component may cross into this graph.
 */
export function renderTemplate(Component, options = {}) {
	const { props = {}, iconForPiece, context, fallback } = options;
	function attempt(component, usedFallback) {
		const request = { navigation: null, helpers: props.helpers, iconForPiece };
		const renderContext = new Map(context);
		renderContext.set(requestContext, request);
		const result = render(component, {
			props: { ...props, components },
			context: renderContext
		});
		// Svelte 5.55 renders lazily. Force both getters INSIDE the try boundary.
		const { body, head } = result;
		return { body, head, navigation: request.navigation, usedFallback };
	}
	try {
		return attempt(Component, false);
	} catch (error) {
		if (!fallback) throw error;
		return attempt(fallback, true);
	}
}
