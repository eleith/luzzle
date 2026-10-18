import Host from './TemplateHost.svelte'
import { render as renderApplication } from 'svelte/server'
import { getContext as applicationGetContext } from 'svelte'

export { renderTemplate, components } from '@luzzle/web.templates'
export { render } from '@luzzle/web.templates/runtime/server'
export { getContext } from '@luzzle/web.templates/runtime/svelte'
export { applicationGetContext }

export function renderHost(html) {
	return renderApplication(Host, {
		props: { html },
		context: new Map([['application-context', 'application runtime']])
	}).body
}
