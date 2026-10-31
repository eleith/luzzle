import type { Handle } from '@sveltejs/kit/hooks'
import { generateThemeCss } from '@luzzle/web.theme'
import { generateEditorThemeCss } from '@luzzle/web.theme/editor'
import type { AppConfig } from './config'

export async function prepareConfiguredStyles(config: AppConfig): Promise<string> {
	const css = generateThemeCss(config) + (await generateEditorThemeCss(config.theme.markdown.code))
	// CSS escapes preserve the slash without ending HTML's style raw-text element.
	const escaped = css.replace(/<\/style/gi, (tag) => tag.replace('/', '\\/'))
	return `<style data-luzzle-configured-styles>${escaped}</style>`
}

export function renderConfiguredStyles(
	{ event, resolve }: Parameters<Handle>[0],
	configuredStyles: string
) {
	let requested = false
	let replaced = false

	event.locals.inlineConfiguredStyles = () => {
		requested = true
	}

	return resolve(event, {
		transformPageChunk: ({ html }) => {
			if (replaced) return html
			const replacement = requested ? configuredStyles : ''
			return html.replace('%luzzle.styles%', () => {
				replaced = true
				return replacement
			})
		}
	})
}
