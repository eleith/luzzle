import { type WebPieces } from '../../types'
import { imageToBase64 } from '$lib/openGraph/image'

async function html(piece: WebPieces, media?: Buffer) {
	const width = 300
	const height = 450
	const metadata = JSON.parse(piece.json_metadata)
	const firstLine = piece.title
	const secondLine = metadata.subtitle || ``

	let imgOrText = `<div style="display: flex">${piece.title}</div>`

	if (media) {
		const base64 = await imageToBase64(media)

		imgOrText = `<div style="display: flex;">
				<img
					src="${base64}"
					alt=""
					width=${width * 0.9}px;
					height=${height * 0.9}px;
				/>
			</div>`
	}

	const articleHtml = `<div style="display: flex;">
			<div
				style="
					width: ${width}px;
					height: ${height}px;
					filter: drop-shadow(0px 0px 4px #000);
					background-color: white;
					display: flex;
					justify-content: center;
					align-items: center;
					flex-direction: column;
					overflow: hidden;
					color: black;
					border-radius: 5px;
					font-size: 10px;
					background: white;"
			>
				${imgOrText}
			</div>
		</div>`

	return {
		icon: articleHtml,
		firstLine,
		secondLine
	}
}

export default html
