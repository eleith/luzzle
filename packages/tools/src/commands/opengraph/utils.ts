import { Pieces } from '@luzzle/cli'
import { WebPieces } from '../sqlite/index.js'
import { Config } from '../../lib/config/config.js'
import { Component } from 'svelte'
import path from 'path'
import * as cheerio from 'cheerio'
import { OpengraphImageHeight, OpengraphImageWidth, PieceOpengraphProps, PieceComponentHelpers, PieceIconProps } from '../../lib/browser.js'
import { getPalette } from '../../lib/vibrant.js'

async function getProps(
	item: WebPieces,
	Icon: Component<PieceIconProps> | null,
	pieces: Pieces,
	config: Config
): Promise<PieceOpengraphProps> {
	const props = {
		Icon: Icon || undefined,
		piece: {
			frontmatter: JSON.parse(item.json_metadata || '{}'),
			tags: JSON.parse(item.keywords || '[]'),
			...item,
		},
		size: {
			width: OpengraphImageWidth,
			height: OpengraphImageHeight,
		},
		helpers: getHelpers(item, config),
	}

	if (item.media) {
		const imageBuffer = await pieces.getPieceAsset(item.media)
		const palette = await getPalette(imageBuffer)

		return {
			...props,
			palette,
		}
	}

	return props
}

async function luzzleImageUrlToBase64(url: string, pieces: Pieces) {
	const srcPath = url.replace('luzzle://', '').trim()
	const ext = path.extname(srcPath).slice(1)
	const newSrc = await pieces.getPieceAsset(srcPath)
	return bufferToBase64(newSrc, 'image', ext)
}

async function replaceAsync(
	str: string,
	regex: RegExp,
	asyncFn: (match: string, ...args: string[]) => Promise<string>
): Promise<string> {
	const matches = Array.from(str.matchAll(regex))
	const replacements = await Promise.all(
		matches.map((match) => asyncFn(match[0], ...match.slice(1)))
	)

	let result = ''
	let lastIndex = 0

	matches.forEach((match, index) => {
		result += str.substring(lastIndex, match.index)
		result += replacements[index]
		lastIndex = (match.index || 0) + match[0].length
	})

	result += str.substring(lastIndex)
	return result
}

async function findAndReplaceLuzzleUrls(html: string, pieces: Pieces): Promise<string> {
	const $ = cheerio.load(html)
	const tasks: Promise<void>[] = []

	$('img').each((_, el) => {
		const $el = $(el)
		const src = $el.attr('src')
		if (src && src.startsWith('luzzle://')) {
			const task = (async () => {
				const base64 = await luzzleImageUrlToBase64(src, pieces)
				$el.attr('src', base64)
			})()
			tasks.push(task)
		}
	})

	$('img[srcset], picture source[srcset]').each((_, el) => {
		const $el = $(el)
		const srcset = $el.attr('srcset')

		if (srcset) {
			const task = (async () => {
				const sourcePromises = srcset.split(',').map(async (source) => {
					const [url, ...descriptors] = source.trim().split(/\s+/)

					if (url && url.startsWith('luzzle://')) {
						const base64 = await luzzleImageUrlToBase64(url, pieces)
						return [base64, ...descriptors].join(' ')
					}

					return source
				})

				const newSources = await Promise.all(sourcePromises)
				$el.attr('srcset', newSources.join(', '))
			})()
			tasks.push(task)
		}
	})

	const urlRegex = /url\((['"]?\s*)(.*?)\1\)/g

	$('style').each((_, el) => {
		const $el = $(el)
		const styleContent = $el.html() // Get the raw text content of the style tag

		if (styleContent) {
			const task = (async () => {
				const newStyleContent = await replaceAsync(
					styleContent,
					urlRegex,
					async (_: string, quote: string, url: string) => {
						if (url.startsWith('luzzle://')) {
							const base64 = await luzzleImageUrlToBase64(url, pieces)
							return `url(${quote}${base64}${quote})`
						}
						return `url(${quote}${url}${quote})`
					}
				)
				$el.html(newStyleContent) // Set the modified CSS back
			})()
			tasks.push(task)
		}
	})

	$('[style*="url("]').each((_, el) => {
		const $el = $(el)
		const style = $el.attr('style')

		if (style) {
			const task = (async () => {
				const newStyle = await replaceAsync(
					style,
					urlRegex,
					async (_: string, quote: string, url: string) => {
						if (url.startsWith('luzzle://')) {
							const base64 = await luzzleImageUrlToBase64(url, pieces)
							return `url(${quote}${base64}${quote})`
						}
						return `url(${quote}${url}${quote})`
					}
				)
				$el.attr('style', newStyle)
			})()
			tasks.push(task)
		}
	})

	await Promise.all(tasks)
	return $.html()
}

function bufferToBase64(buffer: Buffer, type: string, format: string) {
	const base64 = buffer.toString('base64')
	return `data:${type}/${format};base64,${base64}`
}

function getHelpers(item: WebPieces, config: Config): PieceComponentHelpers {
	return {
		getPieceUrl: function() {
			return `${config.url.app}/pieces/${item.type}/${item.slug}`
		},
		getPieceImageUrl: function(
			image: string,
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			_minWidth: number,
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			_format: 'jpg' | 'avif'
		) {
			return `luzzle://${image}`
		},
	}
}

export {
	getProps,
	findAndReplaceLuzzleUrls,
	bufferToBase64,
	replaceAsync,
}
