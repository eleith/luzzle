<script lang="ts">
	import { getPieceTags } from '@luzzle/web.pieces'
	import { getCardSymbol } from './helpers.js'
	import type { PublicWebPiece, PieceComponentHelpers } from '@luzzle/web.pieces'
	import type { Fields } from './schema.js'

	type Props = {
		piece: PublicWebPiece
		fields: Fields
		size: { width: number; height?: number }
		helpers: PieceComponentHelpers
		lazy?: boolean
		active?: boolean
	}
	let { piece, size, helpers, active = false }: Props = $props()
	const symbolScope = $props.id()
	const palette = $derived(helpers.getPiecePalette())
	const scale = $derived(Math.round((size.width / 375) * 100) / 100)
	const tags = $derived(getPieceTags(piece.keywords))
	const symbol = $derived(getCardSymbol(piece.title))
</script>

<svg style="display: none;">
	<symbol
		id={`${symbolScope}-icon-shield`}
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 256 256"
	>
		<path
			d="M208,40H48A16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.26,47,25.53a8,8,0,0,0,4.2,0c1-.27,23.91-6.67,47-25.53C198.48,196.67,224,164.72,224,112V56A16,16,0,0,0,208,40ZM167.4,201.42A129.3,129.3,0,0,1,128,223.62a128.25,128.25,0,0,1-38.92-21.81,111.82,111.82,0,0,1-24.51-27.64L128,129.77l63.43,44.4A111.56,111.56,0,0,1,167.4,201.42ZM208,112q0,26.31-9.14,47.84l-66.27-46.39a8,8,0,0,0-9.18,0L57.13,159.84C51.06,145.52,48,129.54,48,112l0-56,160,0Z"
		>
		</path>
	</symbol>
	<symbol id={`${symbolScope}-icon-dice`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
		<path
			d="M192,32H64A32,32,0,0,0,32,64V192a32,32,0,0,0,32,32H192a32,32,0,0,0,32-32V64A32,32,0,0,0,192,32Zm16,160a16,16,0,0,1-16,16H64a16,16,0,0,1-16-16V64A16,16,0,0,1,64,48H192a16,16,0,0,1,16,16ZM104,92A12,12,0,1,1,92,80,12,12,0,0,1,104,92Zm72,0a12,12,0,1,1-12-12A12,12,0,0,1,176,92Zm-72,72a12,12,0,1,1-12-12A12,12,0,0,1,104,164Zm36-36a12,12,0,1,1-12-12A12,12,0,0,1,140,128Zm36,36a12,12,0,1,1-12-12A12,12,0,0,1,176,164Z"
		>
		</path>
	</symbol>
	<symbol
		id={`${symbolScope}-icon-trophy`}
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 256 256"
	>
		<path
			d="M232,64H208V48a8,8,0,0,0-8-8H56a8,8,0,0,0-8,8V64H24A16,16,0,0,0,8,80V96a40,40,0,0,0,40,40h3.65A80.13,80.13,0,0,0,120,191.61V216H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16H136V191.58c31.94-3.23,58.44-25.64,68.08-55.58H208a40,40,0,0,0,40-40V80A16,16,0,0,0,232,64ZM48,120A24,24,0,0,1,24,96V80H48v32q0,4,.39,8Zm144-8.9c0,35.52-29,64.64-64,64.9a64,64,0,0,1-64-64V56H192ZM232,96a24,24,0,0,1-24,24h-.5a81.81,81.81,0,0,0,.5-8.9V80h24Z"
		>
		</path>
	</symbol>
	<symbol id={`${symbolScope}-icon-moon`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
		<path
			d="M240,96a8,8,0,0,1-8,8H216v16a8,8,0,0,1-16,0V104H184a8,8,0,0,1,0-16h16V72a8,8,0,0,1,16,0V88h16A8,8,0,0,1,240,96ZM144,56h8v8a8,8,0,0,0,16,0V56h8a8,8,0,0,0,0-16h-8V32a8,8,0,0,0-16,0v8h-8a8,8,0,0,0,0,16Zm72.77,97a8,8,0,0,1,1.43,8A96,96,0,1,1,95.07,37.8a8,8,0,0,1,10.6,9.06A88.07,88.07,0,0,0,209.14,150.33,8,8,0,0,1,216.77,153Zm-19.39,14.88c-1.79.09-3.59.14-5.38.14A104.11,104.11,0,0,1,88,64c0-1.79,0-3.59.14-5.38A80,80,0,1,0,197.38,167.86Z"
		>
		</path>
	</symbol>
	<symbol id={`${symbolScope}-icon-crown`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
		<path
			d="M248,80a28,28,0,1,0-51.12,15.77l-26.79,33L146,73.4a28,28,0,1,0-36.06,0L85.91,128.74l-26.79-33a28,28,0,1,0-26.6,12L47,194.63A16,16,0,0,0,62.78,208H193.22A16,16,0,0,0,209,194.63l14.47-86.85A28,28,0,0,0,248,80ZM128,40a12,12,0,1,1-12,12A12,12,0,0,1,128,40ZM24,80A12,12,0,1,1,36,92,12,12,0,0,1,24,80ZM193.22,192H62.78L48.86,108.52,81.79,149A8,8,0,0,0,88,152a7.83,7.83,0,0,0,1.08-.07,8,8,0,0,0,6.26-4.74l29.3-67.4a27,27,0,0,0,6.72,0l29.3,67.4a8,8,0,0,0,6.26,4.74A7.83,7.83,0,0,0,168,152a8,8,0,0,0,6.21-3l32.93-40.52ZM220,92a12,12,0,1,1,12-12A12,12,0,0,1,220,92Z"
		>
		</path>
	</symbol>
	<symbol id={`${symbolScope}-icon-sword`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
		<path
			d="M216,32H152a8,8,0,0,0-6.34,3.12l-64,83.21L72,108.69a16,16,0,0,0-22.64,0l-12.69,12.7a16,16,0,0,0,0,22.63l20,20-28,28a16,16,0,0,0,0,22.63l12.69,12.68a16,16,0,0,0,22.62,0l28-28,20,20a16,16,0,0,0,22.64,0l12.69-12.7a16,16,0,0,0,0-22.63l-9.64-9.64,83.21-64A8,8,0,0,0,224,104V40A8,8,0,0,0,216,32ZM52.69,216,40,203.32l28-28L80.68,188Zm70.61-8L48,132.71,60.7,120,136,195.31ZM208,100.06l-81.74,62.88L115.32,152l50.34-50.34a8,8,0,0,0-11.32-11.31L104,140.68,93.07,129.74,155.94,48H208Z"
		>
		</path>
	</symbol>
	<symbol id={`${symbolScope}-icon-coins`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
		<path
			d="M184 89.57V84c0-25.08-37.83-44-88-44S8 58.92 8 84v40c0 20.89 26.25 37.49 64 42.46V172c0 25.08 37.83 44 88 44s88-18.92 88-44v-40c0-20.7-25.42-37.32-64-42.43M232 132c0 13.22-30.79 28-72 28c-3.73 0-7.43-.13-11.08-.37C170.49 151.77 184 139 184 124v-18.26c29.87 4.45 48 16.53 48 26.26M72 150.25v-23.79A184 184 0 0 0 96 128a184 184 0 0 0 24-1.54v23.79A163 163 0 0 1 96 152a163 163 0 0 1-24-1.75m96-40.32V124c0 8.39-12.41 17.4-32 22.87V123.5c12.91-3.13 23.84-7.79 32-13.57M96 56c41.21 0 72 14.78 72 28s-30.79 28-72 28s-72-14.78-72-28s30.79-28 72-28m-72 68v-14.07c8.16 5.78 19.09 10.44 32 13.57v23.37C36.41 141.4 24 132.39 24 124m64 48v-4.17c2.63.1 5.29.17 8 .17c3.88 0 7.67-.13 11.39-.35a122 122 0 0 0 12.61 3.76v23.46c-19.59-5.47-32-14.48-32-22.87m48 26.25V174.4a179.5 179.5 0 0 0 24 1.6a184 184 0 0 0 24-1.54v23.79a165.5 165.5 0 0 1-48 0m64-3.38V171.5c12.91-3.13 23.84-7.79 32-13.57V172c0 8.39-12.41 17.4-32 22.87"
		/>
	</symbol>
	<symbol id={`${symbolScope}-idk`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
		<path
			d="M248,32h0a8,8,0,0,0-8,8,52.66,52.66,0,0,1-3.57,17.39C232.38,67.22,225.7,72,216,72c-11.06,0-18.85-9.76-29.49-24.65C176,32.66,164.12,16,144,16c-16.39,0-29,8.89-35.43,25a66.07,66.07,0,0,0-3.9,15H88A16,16,0,0,0,72,72v9.59A88,88,0,0,0,112,248h1.59A88,88,0,0,0,152,81.59V72a16,16,0,0,0-16-16H120.88a46.76,46.76,0,0,1,2.69-9.37C127.62,36.78,134.3,32,144,32c11.06,0,18.85,9.76,29.49,24.65C184,71.34,195.88,88,216,88c16.39,0,29-8.89,35.43-25A68.69,68.69,0,0,0,256,40,8,8,0,0,0,248,32ZM140.8,94a72,72,0,1,1-57.6,0A8,8,0,0,0,88,86.66V72h48V86.66A8,8,0,0,0,140.8,94ZM111.89,209.32A8,8,0,0,1,104,216a8.52,8.52,0,0,1-1.33-.11,57.5,57.5,0,0,1-46.57-46.57,8,8,0,1,1,15.78-2.64,41.29,41.29,0,0,0,33.43,33.43A8,8,0,0,1,111.89,209.32Z"
		>
		</path>
	</symbol>
</svg>

<div
	class="cards-container"
	class:active
	inert
	style="
  --game-scale: {scale};
  --game-width: {size.width}px;
	--game-height: {size.height ?? (size.width * 3) / 2}px;
	--game-card-color-border: {palette?.accent || '#6A7A89'};
	--game-card-color-bg: {palette?.muted || '#A6B3BF'};
	--game-card-color-divider: {'white'};
	--game-card-color-text: #222;
	--game-card-icon-text-color: #fff;
	--game-card-icon-color: {palette?.accent || '#47ac65'};
	"
>
	<div class="card" style="transform: rotateZ(33deg); position: absolute;">
		<div class="card-image-container">{piece.title.toUpperCase()}</div>
		<div class="card-icon">
			<svg>
				<use href={`#${symbolScope}-${symbol}`}></use>
			</svg>
		</div>

		<div class="card-divider">
			{tags.join(',')}
		</div>
	</div>

	<div class="card" style="transform: rotateZ(15deg); position: absolute;">
		<div class="card-image-container">{piece.title.toUpperCase()}</div>
		<div class="card-icon">
			<svg>
				<use href={`#${symbolScope}-${symbol}`}></use>
			</svg>
		</div>
		<div class="card-divider">
			{tags.join(', ')}
		</div>
	</div>

	<div class="card">
		<div class="card-image-container">
			<div class="card-title">
				{piece.title.toUpperCase()}
			</div>
		</div>
		<div class="card-icon">
			<svg>
				<use href={`#${symbolScope}-${symbol}`}></use>
			</svg>
		</div>
		<div class="card-divider">
			{tags.join(', ')}
		</div>
	</div>
</div>

<style>
	.cards-container {
		width: var(--game-width);
		height: var(--game-height);
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.card {
		border-radius: calc(22px * var(--game-scale));
		flex-direction: column;
		display: flex;
		position: relative;
		width: calc(var(--game-width) * 0.75);
		transform: rotateZ(-17deg);
		box-shadow: calc(8px * var(--game-scale)) calc(8px * var(--game-scale))
			calc(8px * var(--game-scale)) var(--color-shadow);
	}

	.active .card-divider {
		background: var(--color-primary);
		color: var(--color-on-primary);
	}

	.card-image-container {
		height: calc(var(--game-height) * 0.75 * 0.75);
		display: flex;
		border-top-left-radius: calc(16px * var(--game-scale));
		border-top-right-radius: calc(16px * var(--game-scale));
		width: 100%;
		align-items: center;
		justify-content: center;
		background: oklch(from var(--game-card-color-bg) 0.85 c h);
		color: var(--game-card-color-text);
		font-size: calc(2rem * var(--game-scale));
		position: relative;
		overflow-wrap: break-word;
		word-break: break-word;
		overflow: hidden;
	}

	.card-title {
		position: relative;
		padding: calc(10px * var(--game-scale));
		display: flex;
		justify-content: center;
		align-items: center;
		text-align: center;
		overflow-wrap: break-word;
		word-break: break-word;
	}

	.card-divider {
		height: calc(var(--game-height) * 0.75 * 0.25);
		text-align: center;
		border-top: calc(5px * var(--game-scale)) solid var(--game-card-color-border);
		border-bottom-left-radius: calc(16px * var(--game-scale));
		border-bottom-right-radius: calc(16px * var(--game-scale));
		padding-left: calc(10px * var(--game-scale));
		padding-right: calc(10px * var(--game-scale));
		padding-top: calc(20px * var(--game-scale));
		border-bottom: solid calc(20px * var(--game-scale)) transparent;
		background: var(--game-card-color-divider);
		color: #222;
		font-size: calc(0.75rem * var(--game-scale));
		overflow: hidden;
		line-height: calc(1.25rem * var(--game-scale));
	}

	.card-icon {
		border-radius: 50px;
		width: calc(45px * var(--game-scale));
		height: calc(45px * var(--game-scale));
		position: absolute;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		top: calc(var(--game-height) * 0.75 * 0.75 - (45px * var(--game-scale)) / 2);
		left: calc(var(--game-width) * 0.75 * 0.5 - (45px * var(--game-scale)) / 2);
		background: oklch(from var(--game-card-icon-color) 0.22 c h);
		border: calc(3px * var(--game-scale)) solid var(--game-card-icon-text-color);
		z-index: 1;
	}

	.card-icon svg {
		transform: rotate(-35deg);
		fill: var(--game-card-icon-text-color);
		width: calc(32px * var(--game-scale));
		height: calc(32px * var(--game-scale));
	}
</style>
