import { PieceSelectable } from '@luzzle/core'
import { html, imageAsBase64 } from './template.js'

function cartridge(url?: string | null) {
	return (
		<div
			style={{
				width: '100px',
				filter: 'drop-shadow(0px 0px 4px #000)',
				display: 'flex',
				flexDirection: 'column',
			}}
		>
			<div
				style={{
					width: '90px',
					height: '2px',
					background: '#8c8c8c',
					borderRadius: '7px 7px 0 0',
					boxShadow: '0px -2px 0px #aaa',
				}}
			></div>
			<div
				style={{
					justifyContent: 'center',
					width: '100px',
					height: '8px',
					borderRadius: '0 7px 0 0',
					background: '#8c8c8c',
					display: 'flex',
					alignItems: 'center',
				}}
			></div>
			<div
				style={{
					width: '100px',
					background: '#8c8c8c',
					borderRadius: '0 0 7px 7px',
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'flex-end',
					backgroundImage: 'linear-gradient(transparent, #666)',
				}}
			>
				<div
					style={{
						width: '5%',
						height: '35px',
						background: '#5d5d5d',
						borderTop: '3px solid #444',
					}}
				></div>
				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
					<div
						style={{
							width: '74px',
							height: '74px',
							background: '#666',
							backgroundImage: 'linear-gradient(#666, #555)',
							borderRadius: '7px',
							display: 'flex',
							justifyContent: 'center',
							alignItems: 'center',
							borderTop: '2px solid #444',
							borderBottom: '2px solid #aaa',
							overflow: 'hidden',
						}}
					>
						<div style={{ display: 'flex' }}>
							{url && (
								<img
									style={{
										width: '67px',
										height: '67px',
										objectFit: 'cover',
										borderRadius: '7px',
										objectPosition: 'top',
									}}
									src={url}
									width="50"
									loading="eager"
									alt=""
								/>
							)}
						</div>
					</div>
					<div
						style={{
							borderTop: '1px solid #555',
							borderLeft: '1px solid transparent',
							borderRight: '1px solid transparent',
							borderWidth: '10px',
							borderRadius: '10px',
							margin: '8px 0 8px 0',
							filter: 'drop-shadow(0 1px 0 #999) drop-shadow(0 -1px 0 #444)',
						}}
					></div>
				</div>
				<div
					style={{
						width: '5%',
						height: '35px',
						background: '#5d5d5d',
						borderTop: '3px solid #444',
					}}
				></div>
			</div>
		</div>
	)
}

function gameToHtml(game: PieceSelectable<'games'>, folder: string) {
	const url = imageAsBase64(`${folder}/${game.representative_image}.w125.jpg`)

	return html(cartridge(url), {
		title: game.title,
		subtitle: game.played_on ?? '',
	})
}

export { gameToHtml }
