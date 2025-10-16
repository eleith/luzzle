<script lang="ts">
	import { type WebPieceIconProps } from '$lib/pieces/types'

	let { piece, icon, helpers }: WebPieceIconProps = $props()
</script>

<div
	class="browser-container"
	style="
	  --piece-icon-scale: {helpers.getIconScale(375)};
	  --piece-icon-width: {icon.size.width}px; 
		--piece-icon-height: {icon.size.height}px;"
>
	<div class="browser-mockup">
		<div class="browser-window-bar">
			<div class="browser-controls">
				<div class="browser-control-dot red"></div>
				<div class="browser-control-dot yellow"></div>
				<div class="browser-control-dot green"></div>
			</div>
		</div>
		<div class="browser-url-bar">
			<div class="browser-nav-buttons">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="32"
					height="32"
					fill="currentColor"
					viewBox="0 0 256 256"
					><path
						d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"
					></path></svg
				>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="32"
					height="32"
					fill="currentColor"
					viewBox="0 0 256 256"
					><path
						d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z"
					></path></svg
				>
			</div>
			<div class="browser-address-input">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="32"
					height="32"
					fill="currentColor"
					viewBox="0 0 256 256"
					><path
						d="M208,40H48A16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.27,47,25.53a8,8,0,0,0,4.2,0c1-.26,23.91-6.67,47-25.53C198.48,196.67,224,164.72,224,112V56A16,16,0,0,0,208,40Zm0,72c0,37.07-13.66,67.16-40.6,89.42A129.3,129.3,0,0,1,128,223.62a128.25,128.25,0,0,1-38.92-21.81C61.82,179.51,48,149.3,48,112l0-56,160,0Z"
					></path></svg
				>
				<div class="browser-address-url">
					{helpers.getPieceUrl()}
				</div>
			</div>
		</div>
		<div class="browser-content-area">
			<div class="browser-content-inner">
				{#if piece.media}
					<picture>
						<source srcset={helpers.getImageUrl(piece.media, 'avif')} type="image/avif" />
						<img
							src={helpers.getImageUrl(piece.media, 'jpg')}
							loading={icon.lazy ? 'lazy' : 'eager'}
							alt="webpage banner"
						/>
					</picture>
				{/if}
				<h1>
					{piece.title}
				</h1>
				<p>
					{piece.summary || piece.note || ''}
				</p>
			</div>
		</div>
	</div>
</div>

<style>
	.browser-container {
		width: var(--piece-icon-width);
		height: var(--piece-icon-height);
	}

	.browser-mockup {
		background-color: #e5e7eb;
		border: 1px solid #d1d5db;
		border-radius: calc(0.75rem * var(--piece-icon-scale));
		box-shadow: 2.6px 5.3px 5.3px hsl(0deg 0% 0% / 0.42);
		height: 100%;
		overflow: hidden;
	}

	.browser-window-bar {
		height: calc(30px * var(--piece-icon-scale));
		background-color: #f3f4f6;
		display: flex;
		align-items: center;
		padding: 0 calc(10px * var(--piece-icon-scale));
		border-bottom: 1px solid #d1d5db;
		justify-content: flex-end;
	}

	.browser-controls {
		display: flex;
		gap: calc(5px * var(--piece-icon-scale));
	}

	.browser-control-dot {
		width: calc(0.675rem * var(--piece-icon-scale));
		height: calc(0.675rem * var(--piece-icon-scale));
		border-radius: 9999px;
		border: 1px solid;
	}

	.browser-control-dot.red {
		background-color: #ef4444;
		border-color: #dc2626;
	}

	.browser-control-dot.yellow {
		background-color: #f59e0b;
		border-color: #d97706;
	}

	.browser-control-dot.green {
		background-color: #22c55e;
		border-color: #16a34a;
	}

	.browser-url-bar {
		background-color: #f3f4f6;
		display: flex;
		flex-direction: row-reverse;
		align-items: center;
		padding: calc(10px * var(--piece-icon-scale)) calc(10px * var(--piece-icon-scale));
		border-bottom: 1px solid #d1d5db;
		gap: calc(5px * var(--piece-icon-scale));
	}

	.browser-nav-buttons {
		display: flex;
		gap: calc(5px * var(--piece-icon-scale));
		color: #6b7280;
	}

	.browser-nav-buttons svg {
		width: calc(30px * var(--piece-icon-scale));
		height: calc(30px * var(--piece-icon-scale));
	}

	.browser-address-input {
		flex-grow: 1;
		background-color: #ffffff;
		border-radius: 9999px;
		display: flex;
		align-items: center;
		padding: 0 calc(5px * var(--piece-icon-scale));
		height: calc(30px * var(--piece-icon-scale));
		border-top: 1px solid #d1d5db;
		border-bottom: 1px solid #d1d5db;
		overflow: hidden;
	}

	.browser-address-input svg {
		width: calc(30px * var(--piece-icon-scale));
		height: calc(30px * var(--piece-icon-scale));
		color: #22c55e;
		margin-right: calc(5px * var(--piece-icon-scale));
	}

	.browser-address-url {
		color: #6b7280;
		font-size: calc(0.75rem * var(--piece-icon-scale));
		line-height: calc(1.25rem * var(--piece-icon-scale));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.browser-content-area {
		background-color: #ffffff;
		max-height: var(--piece-icon-height);
		min-height: calc(var(--piece-icon-height) * 2 / 3);
	}

	.browser-content-inner {
		margin: auto;
		height: var(--piece-icon-height);
	}

	picture {
		width: 100%;
		height: calc(var(--piece-icon-height) / 3);
		border-radius: 0.5rem;
		margin-bottom: calc(10px * var(--piece-icon-scale));
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #f0f0f0;
	}

	picture img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: top center;
	}

	.browser-content-inner h1 {
		font-size: calc(1.25rem * var(--piece-icon-scale));
		font-weight: 700;
		color: #111827;
		margin: calc(3px * var(--piece-icon-scale));
		text-align: center;
	}

	.browser-content-inner p {
		color: #4b5563;
		line-height: calc(1.35rem * var(--piece-icon-scale));
		margin: calc(10px * var(--piece-icon-scale));
		padding-top: 0;
		text-align: left;
		font-size: calc(0.75rem * var(--piece-icon-scale));
	}
</style>
