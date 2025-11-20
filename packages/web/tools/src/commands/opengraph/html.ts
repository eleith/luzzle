import { Pieces } from '@luzzle/cli'
import {
	type WebPieces,
	type Config,
	OpengraphImageWidth,
	OpengraphImageHeight,
} from '@luzzle/web.utils'
import { getIconComponentForType, getOpengraphComponentForType } from './svelte.js'
import { render } from 'svelte/server'
import { findAndReplaceLuzzleUrls, getProps } from './utils.js'

async function buildHtmlDoc(head: string, body: string, pieces: Pieces) {
	const html = await findAndReplaceLuzzleUrls(body, pieces)

	return `
<html>
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<style>
			* {
				box-sizing: border-box;
			}

			html, body {
				margin: 0;
				padding: 0;
				width: ${OpengraphImageWidth}px;
				height: ${OpengraphImageHeight}px;
			}
		</style>
		${head}
	</head>
	<body>${html}</body>
</html>`
}

async function generateHtml(item: WebPieces, pieces: Pieces, config: Config) {
	console.log(`generating opengraph for ${item.file_path} (${item.id})`)

	try {
		const OpenGraph = await getOpengraphComponentForType(item, config)

		if (OpenGraph) {
			const Icon = await getIconComponentForType(item, config)
			const props = await getProps(item, Icon, pieces, config)
			const { head, body } = await render(OpenGraph, { props: props })

			return buildHtmlDoc(head, body, pieces)
		}
	} catch (e) {
		throw new Error(`Error generating Open Graph for ${item.file_path} (${item.id}): ${e}`)
	}

	return null
}

export { generateHtml }
