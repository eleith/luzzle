import { type WebPieces } from '../../types'
import { imageToBase64 } from '$lib/openGraph/image'

const CARTRIDGE_WIDTH = 300

function cartridgeImage(url: string) {
	return `<img
						style="
							width:${CARTRIDGE_WIDTH * 0.67}px;
							height:${CARTRIDGE_WIDTH * 0.67}px;
							object-fit:cover;
							border-radius:7px;
							object-position:top;"
						src="${url}"
						alt=""
				/>`
}

function cartridgeHtml(title: string, image?: string | null) {
	return `
		<div style="display:flex; flex-direction: column;">
			<div
				style="
					width:${CARTRIDGE_WIDTH * 0.9}px;
					height:${CARTRIDGE_WIDTH * 1.25 * 0.02}px;
					background:#8c8c8c;
					border-radius:7px 7px 0 0;
					box-shadow:0px -2px 0px #aaa;" />
			<div
				style="
					justify-content:center;
					width:${CARTRIDGE_WIDTH}px;
					height:${CARTRIDGE_WIDTH * 1.25 * 0.12}px;
					border-radius:0 7px 0 0;
					background: linear-gradient(#8c8c8c 0 15%, transparent 15% 75%, #8c8c8c 75%), linear-gradient(90deg, transparent 0 1%, #444 1% 5%, #000 50%, #444 95% 99%, transparent 99%);
					display:flex;
					align-items:center;">
					<div
						style="
							width: 100%;
							height: 75%;
							background: repeating-linear-gradient(#8c8c8c 0 8%, transparent 12% 16%), linear-gradient(#222 0% 11%, transparent 11% 19%, #222 24% 26%, transparent 26% 40%, #222 40% 42%, transparent 43% 52%, #222 56% 58%, transparent 58% 64%, #222 74% 70%, transparent 70%);
						 display:flex;
						 justify-content:center;"
					>
						<div
							style="
								width: 78%;
								height: 95%;
								background: linear-gradient(#444 5%, #777 85%);
								box-shadow: 0 5px 15px 3px #4448 inset, 0 -1px 0 1px #ddd inset, 0 1px 2px 2px #222 inset;
								box-shadow: 1px 1px 5px #ddd inset;
								border: 2px solid #8c8c8c;
								border-radius: 75px;
								transform: translate(0, -3%);
								display:flex;
								justify-content:center;
								align-items:center;
								color: #444;
								overflow: hidden;
								text-overflow: ellipsis;
								text-wrap: nowrap;"
						>
								${title}
						</div>
					</div>
			</div>
			<div
				style="
					width:${CARTRIDGE_WIDTH}px;
					background:#8c8c8c;
					border-radius:0 0 7px 7px;
					display:flex;
					justify-content:space-between;
					align-items:flex-end;
					background-image:linear-gradient(transparent, #666);">
				<div
					style="
						width:5%;
						height:${CARTRIDGE_WIDTH * 1.25 * 0.35}px;
						background:#444;
						border-top:3px solid #222;" />
				<div style="display:flex; flex-direction:column; align-items: center;">
					<div
						style="
							width:${CARTRIDGE_WIDTH * 0.74}px;
							height:${CARTRIDGE_WIDTH * 0.74}px;
							background:#666;
							background-image:linear-gradient(#666, #555);
							border-radius:7px;
							display:flex;
							justify-content:center;
							align-tems:center;
							border-top:2px solid #444;
							border-bottom:2px solid #aaa;
							overflow:hidden;"
					>
						<div style="display:flex;align-items:center;">
							${image || ''}
						</div>
					</div>
					<div
						style="
							border-top:1px solid #555;
							border-left:1px solid transparent;
							border-right:1px solid transparent;
							border-width:${CARTRIDGE_WIDTH * 0.1}px;
							border-radius:25px;
							margin:8px 0 8px 0;
							filter:drop-shadow(0 1px 0 #999) drop-shadow(0 -1px 0 #444);" />
				</div>
				<div
					style="
						width:5%;
						height:${CARTRIDGE_WIDTH * 1.25 * 0.35}px;
						background:#444;
						border-top:3px solid #222;" />
			</div>
		</div>`
}

async function html(piece: WebPieces, media?: Buffer) {
	const metadata = JSON.parse(piece.json_metadata)
	const firstLine = piece.title
	const secondLine = metadata.subtitle || ``

	let imgOrText = ``

	if (media) {
		const base64 = await imageToBase64(media)
		imgOrText = cartridgeImage(base64)
	}

	return {
		icon: cartridgeHtml(piece.title, imgOrText),
		firstLine,
		secondLine
	}
}

export default html
