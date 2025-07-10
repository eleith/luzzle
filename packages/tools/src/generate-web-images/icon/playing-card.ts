import { type WebPieces } from '../utils/types.js'
import { imageToBase64 } from '../utils/imageToBase64.js'
import iconsPH from '@iconify-json/ph/icons.json' with { type: 'json' }
//import { getIconData } from '@iconify/utils'

// const Shield = getIconData(iconsPH.icons, 'shield-chevron?raw&width=1.5em&height=1.5em')
// const Dice = getIconData(iconsPH.icons, 'dice-five?raw&width=1.5em&height=1.5em')
// const Trophy = getIconData(iconsPH.icons, 'trophy?raw&width=1.5em&height=1.5em')
// const MoonStars = getIconData(iconsPH.icons, 'moon-stars?raw&width=1.5em&height=1.5em')
// const Crown = getIconData(iconsPH.icons, 'crown?raw&width=1.5em&height=1.5em')
// const Sword = getIconData(iconsPH.icons, 'sword?raw&width=1.5em&height=1.5em')
// const Coins = getIconData(iconsPH.icons, 'coins?raw&width=1.5em&height=1.5em')
// const Bomb = getIconData(iconsPH.icons, 'bomb?raw&width=1.5em&height=1.5em')

const ph = (iconsPH as unknown as { icons: { [key: string]: string } }).icons
const Shield = ph['shield-chevron']
const Dice = ph['dice-five']
const Trophy = ph['trophy']
const MoonStars = ph['moon-stars']
const Crown = ph['crown']
const Sword = ph['sword']
const Coins = ph['coins']
const Bomb = ph['bomb']

const colorThemes = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'brown', 'teal']
const colorThemeText = ['white', 'black', 'black', 'black', 'white', 'black', 'white', 'black']
const icons = [Shield, Dice, Trophy, MoonStars, Crown, Sword, Coins, Bomb]

function getHashIndexFor(word: string, max: number): number {
	let hash = 0
	for (let i = 0; i < word.length; i++) {
		const char = word.charCodeAt(i)
		hash = (hash << 5) - hash + char
		hash = hash & hash // Convert to 32bit integer
	}
	return Math.abs(hash) % max
}

async function html(piece: WebPieces, media?: Buffer) {
	const hashTitle = getHashIndexFor(piece.title, colorThemes.length)
	const hashId = getHashIndexFor(piece.id, icons.length)
	const themeColor = colorThemes[hashTitle]
	const themeText = colorThemeText[hashTitle]
	const Icon = icons[hashId]
	const width = 300
	const firstLine = piece.title
	const texts = piece.keywords
		? (JSON.parse(piece.keywords) as string[])
		: piece.summary?.split(' ') || []
	const text = texts.slice(0, 7).join(' ')
	let imageOrText = ''

	if (media) {
		const base64 = await imageToBase64(media)
		imageOrText = `<img alt="" src="${base64}" style="width: ${width}px; object-fit: cover; object-position: top; max-width: 100%;" />`
	}

	const icon = `<div style="box-shadow: -8px 8px 8px #000; border-radius: 8px; flex-direction: column; display: flex; position: relative; width: ${width}px; background: white;">
	<div style="height: ${
		width * 1.15
	}px; display: flex; overflow: hidden; border-top-left-radius: 8px; border-top-right-radius: 8px;">
		${imageOrText}
	</div>
	<div style="position: absolute; display: flex; right: 0px; top: 0px; border-top-right-radius: 8px; overflow: hidden;">
		<svg width="${width / 4}" height="${width / 4}" viewBox="0 0 ${width / 4} ${width / 4}">
		  <path d="M100 100 L100 0 A 10 10 0 0 0 90 0 L0 0 Z" fill="${themeColor}" />
		</svg>
	</div>
	<div style="display: flex; text-align: center; font-size: ${
		width * 0.05
	}px; border-top: 5px solid ${themeColor}; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; padding: 10px; padding-top: ${
		width * 0.1
	}px; background: white; position: relative; color: black;">
		<div style="border-radius: 50px; color: ${themeText}; width: ${width * 0.15}px; height: ${
			width * 0.15
		}px; position: absolute; display: flex; align-items: center; justify-content: center; text-align: center; top: ${
			(width * -0.15) / 2 - 2.5
		}px; left: ${
			width / 2 - (width * 0.15) / 2
		}px; transform: rotate(45deg); background: ${themeColor}; ">
			${Icon}
		</div>
		<div style="text-align: center; font-size: ${width * 0.05}px; display: flex;">
			${text}
		</div>
	</div>
</div>`

	return {
		icon,
		firstLine,
		secondLine: ''
	}
}

export default html
