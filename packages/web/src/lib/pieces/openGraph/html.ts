import { type WebPieces } from '../types'
import iconHtml from './icon/index'

const OpenGraphImageWidth = 1200
const OpenGraphImageHeight = 600

async function pieceToHtml(piece: WebPieces, media?: Buffer) {
	const html = await iconHtml(piece, media)

	return `
	<div style="display:flex; background:#282828; color:#fbf1c7; height:${OpenGraphImageHeight}px; width:${OpenGraphImageWidth}px; align-items:center; gap:10px;">
		<div style="display:flex; flex:1; align-items:flex-start;">
			<div style="display:flex; flex:1; justify-content:center;">
				${html.icon}
			</div>
			<div style="display:flex; flex:2; flex-direction:column; justify-content: center;">
				<span style="font-size:96px;">${html.firstLine}</span>
				<span style="font-size:32px;">${html.secondLine}</span>
			</div>
		</div>
	</div>`
}

export default pieceToHtml
