import { PieceSelectable } from '@luzzle/kysely'
import { html, imageAsBase64 } from './template.js'

function repeatBlock(times: number): JSX.Element[] {
	const blocks = []
	for (let i = 1; i <= times; i++) {
		blocks.push(
			<div
				key={i}
				style={{
					height: '3px',
					borderRadius: '3px',
					backgroundColor: 'black',
					marginBottom: '10px',
					width: i == times ? '50%' : '100%',
				}}
			/>
		)
	}
	return blocks
}

function linkToHtml(link: PieceSelectable<'links'>, folder: string) {
	const url = imageAsBase64(`${folder}/${link.slug}.h125.jpg`)

	const size = {
		width: 200,
		height: 300,
	}

	const articleImg = function (url: string) {
		return (
			<div
				style={{
					position: 'relative',
					display: 'flex',
					justifyContent: 'center',
					overflow: 'hidden',
					background: 'black',
				}}
			>
				<img
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						filter: 'blur(2px)',
						opacity: 0.3,
						//transform: 'scale(1.1)',
					}}
					src={url}
					width={'100%'}
					height={100}
					alt="" // decorative
				/>
				<img
					src={url}
					height={100}
					alt="" // decorative
					style={{ position: 'relative' }}
				/>
			</div>
		)
	}

	const article = (
		<div style={{ display: 'flex' }}>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					height: size.height,
					width: size.width,
					overflow: 'hidden',
					color: 'black',
					borderRadius: '5px',
					fontSize: '10px',
					background: 'white',
				}}
			>
				{url && articleImg(url)}
				{!url && (
					<div
						style={{
							backgroundColor: 'black',
							height: '20px',
							opacity: 0.5,
						}}
					/>
				)}
				<div
					style={{ padding: '10px', paddingBottom: 0, textAlign: 'center', alignSelf: 'center' }}
				>
					{link.title}
				</div>
				<div
					style={{
						display: 'flex',
						flex: 1,
						flexDirection: 'column',
						justifyItems: 'right',
						padding: '10px',
						alignItems: 'flex-start',
						overflow: 'hidden',
					}}
				>
					{repeatBlock(size.height / (url ? 30 : 20))}
				</div>
			</div>
			<div
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					width: size.width,
					height: size.height,
					borderTopRightRadius: '7px',
					borderTopLeftRadius: '5px',
					boxShadow: '-11px 11px 15px rgba(0, 0, 0, 0.35)',
				}}
			/>
		</div>
	)

	return html(article, {
		title: link.title,
		subtitle: link.subtitle ?? '',
	})
}

export { linkToHtml }
