import type { Extension } from '@codemirror/state'
import { linkDetector } from './linkDetector'
import iconSvg from '~icons/ph/arrow-circle-up-right?raw&width=20&height=20'

const URL_REGEX = /\bhttps?:\/\/[^\s<>"'`]+/gi

export const luzzleHyperlink: Extension = linkDetector(iconSvg as unknown as string, [
	{ regex: URL_REGEX, href: (m) => m }
])
