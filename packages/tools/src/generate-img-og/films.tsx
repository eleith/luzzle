import { html, imageAsBase64 } from './template.js'
import { WebPieces, getItemMetadata } from '../lib/web.js'

function filmToHtml(film: WebPieces, folder: string) {
	const url = imageAsBase64(`${folder}/${film.media}.w250.jpg`)
	const metadata = getItemMetadata<{ subtitle?: string }>(film)

	const size = {
		width: 200,
		height: 300,
	}

	const articleImg = function (url: string) {
		return (
			<div style={{ display: 'flex' }}>
				<img
					src={url}
					alt="" // decorative
					width={size.width * 0.9}
					height={size.height * 0.9}
				/>
			</div>
		)
	}

	const article = (
		<div style={{ display: 'flex' }}>
			<div
				style={{
					width: size.width,
					height: size.height,
					filter: 'drop-shadow(0px 0px 4px #000)',
					backgroundColor: 'white',
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					flexDirection: 'column',
					overflow: 'hidden',
					color: 'black',
					borderRadius: '5px',
					fontSize: '10px',
					background: 'white',
				}}
			>
				{url && articleImg(url)}
				{!url && <div style={{ display: 'flex' }}>{film.title}</div>}
			</div>
		</div>
	)

	return html(article, {
		title: film.title,
		subtitle: metadata.subtitle ?? '',
	})
}

export { filmToHtml }
