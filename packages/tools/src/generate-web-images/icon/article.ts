import { type WebPieces } from '../utils/types.js'
import { imageToBase64 } from '../utils/imageToBase64.js'

const ARTICLE_WIDTH = 300

function articleImage(url: string) {
	return `<div style="display: flex; position: relative; justify-content: center; overflow: hidden; background: black; height: ${
		(ARTICLE_WIDTH * 1.5) / 4
	}px;">
						<img
							style="
								width: 100%;
								position: relative;"
							src="${url}"
							alt=""
					/>
				</div>`
}

function articleHtml(title: string, image?: string | null) {
	const paragraphBlock = `<div style="height: 1px; border:1px black solid; border-radius: 3px; margin-bottom: 10px; width: 100%; " />`
	const paragraphBlockShort = `<div style="height: 1px; border:1px black solid; border-radius: 3px; margin-bottom: 20px; width: 50%; " />`

	return `
		<div style="display:flex; flex-direction: column; width:${ARTICLE_WIDTH}px;">
			<div style="display:flex; flex-direction: column; height:${
				ARTICLE_WIDTH * 1.5
			}px; overflow: hidden; background-color: white; color: black; border-radius: 7px; font-size: 10px;">
				<div style="display:flex; padding: 10px; text-align:center;">${title}</div>
				${image || ''}
			  <div style="display: flex; flex-direction: column; align-items: flex-start; padding: 10px; overflow: hidden;">
				${Array(20)
					.fill(paragraphBlock)
					.map((block, i) => (i % 6 === 5 ? paragraphBlockShort : block))
					.join('')}
				</div>
			</div>
		  <div style="position: absolute; top: 0p; left: 0px; width: ${ARTICLE_WIDTH}px; height: ${
				ARTICLE_WIDTH * 1.5
			}px; border-top-right-radius: 7px; border-bottom-right-radius: 7px; box-shadow: -11px 11px 15px black;"/>
		</div>`
}

async function html(piece: WebPieces, media?: Buffer) {
	const metadata = JSON.parse(piece.json_metadata)
	const firstLine = piece.title
	const secondLine = metadata.subtitle || ``

	let imgOrText = ``

	if (media) {
		const base64 = await imageToBase64(media)
		imgOrText = articleImage(base64)
	}

	return {
		icon: articleHtml(piece.title, imgOrText),
		firstLine,
		secondLine
	}
}

export default html
