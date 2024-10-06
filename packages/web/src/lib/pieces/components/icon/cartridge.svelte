<script lang="ts">
	import type { WebPieces } from '$lib/pieces/types'
	import Picture from '../picture.svelte'

	type Props = {
		piece: WebPieces
		active?: boolean
		size?: 'small' | 'medium' | 'large' | 'xlarge'
	}

	let { size = 'small', piece, active }: Props = $props()
	let width = size === 'small' ? 120 : size === 'medium' ? 200 : size === 'large' ? 300 : 400
</script>

<div class:cartridgeActive={active} style:--piece-icon-width="{width}px">
	<div class="cartridgeTop"></div>
	<div class="cartridgeHeader">
		<div class="cartridgeHeaderOverlay">
			<div class="cartridgeBrand">
				<span class="cartridgeBrandName">{piece.title}</span>
			</div>
		</div>
	</div>
	<div class="cartridgeBody">
		<div class="cartridgeEnd"></div>
		<div class="cartridgeLabelContainer">
			<div class="cartridgeGap">
				<div class="cartridgeImageContainer">
					<Picture {piece} {size} loading="lazy" decoding="async" alt="" />
				</div>
			</div>
			<div class="arrowDown"></div>
		</div>
		<div class="cartridgeEnd"></div>
	</div>
</div>

<style>
	.cartridgeActive {
		--piece-icon-color: var(--colors-primary);
	}

	.cartridgeTop {
		width: calc(var(--piece-icon-width, 300px) * 0.9);
		height: calc(var(--piece-icon-width, 300px) * 1.25 * 0.02);
		background: var(--piece-icon-color, #8c8c8c);
		border-radius: var(--piece-icon-border-radius, 7px) var(--piece-icon-border-radius, 7px) 0 0;
		box-shadow: 0px -2px 0px #aaa;
	}

	.cartridgeBody {
		width: var(--piece-icon-width, 300px);
		background: var(--piece-icon-color, #8c8c8c);
		border-radius: 0 0 var(--piece-icon-border-radius, 7px) var(--piece-icon-border-radius, 7px);
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		background-image: linear-gradient(transparent, #666);
	}

	.cartridgeLabelContainer {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.cartridgeEnd {
		width: 5%;
		height: calc(var(--piece-icon-width, 300px) * 1.25 * 0.35);
		background: #5d5d5d;
		border-top: 3px solid #444;
	}

	.cartridgeEnd:first-child {
		border-radius: 0 0 0 var(--piece-icon-border-radius, 7px);
	}

	.cartridgeEnd:last-child {
		border-radius: 0 0 var(--piece-icon-border-radius, 7px) 0;
	}

	.cartridgeGap {
		width: calc(var(--piece-icon-width, 300px) * 0.74);
		height: calc(var(--piece-icon-width, 300px) * 0.74);
		background: #666;
		background-image: linear-gradient(#666, #555);
		border-radius: var(--piece-icon-border-radius, 7px);
		display: flex;
		justify-content: center;
		align-items: center;
		border-top: 2px solid #444;
		border-bottom: 2px solid #aaa;
		overflow: hidden;
	}

	.arrowDown {
		border-top: 1px solid #555;
		border-left: 1px solid transparent;
		border-right: 1px solid transparent;
		border-width: calc(var(--piece-icon-width, 300px) * 0.1);
		border-radius: 10px;
		margin: 8px 0 8px 0;
		filter: drop-shadow(0 1px 0 #999) drop-shadow(0 -1px 0 #444);
	}

	.cartridgeHeader {
		justify-content: center;
		width: calc(var(--piece-icon-width, 300px) * 1);
		height: calc(var(--piece-icon-width, 300px) * 1.25 * 0.12);
		background: var(
			--cartridge-header-patch-gradient,
			linear-gradient(
				var(--piece-icon-color, #8c8c8c) 0 15%,
				transparent 15% 75%,
				var(--piece-icon-color, #8c8c8c) 75%
			),
			linear-gradient(90deg, transparent 0 1%, #444 1% 5%, #000 50%, #444 95% 99%, transparent 99%)
		);
		border-radius: 0 var(--piece-icon-border-radius, 7px) 0 0;
		display: flex;
		align-items: center;
		container: cartridge / inline-size;
	}

	.cartridgeHeaderOverlay {
		width: 100%;
		height: 75%;
		background: var(
			--cartridge-header-gaps-gradient,
			repeating-linear-gradient(var(--piece-icon-color, #8c8c8c) 0 8%, transparent 8% 16%),
			linear-gradient(
				#222 0% 11%,
				transparent 11% 19%,
				#222 24% 26%,
				transparent 26% 40%,
				#222 40% 42%,
				transparent 43% 52%,
				#222 56% 58%,
				transparent 58% 64%,
				#222 74% 70%,
				transparent 70%
			)
		);
		display: flex;
		justify-content: center;
	}

	.cartridgeBrand {
		width: 78%;
		height: 95%;
		background: linear-gradient(#444 5%, #777 85%);
		box-shadow:
			0 5px 15px 10px #4448 inset,
			0 -1px 0 1px #ddd inset,
			0 1px 2px 2px #222 inset;
		border: clamp(0px, 5%, 5px) solid var(--piece-icon-color, #8c8c8c);
		border-radius: 75px;
		transform: translate(0, -3%);
		display: flex;
		justify-content: center;
		align-items: center;
		color: var(--piece-icon-color, #8c8c8c);
		text-shadow: 1px 2px 1px #0005;
		overflow: hidden;
		text-overflow: ellipsis;
		text-wrap: nowrap;
	}

	.cartridgeBrandName {
		font-size: 1em;
		letter-spacing: 0px;
	}

	@container cartridge (width < 150px) {
		.cartridgeBrand {
			visibility: hidden;
		}
	}

	.cartridgeImageContainer > :global(picture > img) {
		width: calc(var(--piece-icon-width, 300px) * 0.67);
		height: calc(var(--piece-icon-width, 300px) * 0.67);
		object-fit: cover;
		border-radius: var(--piece-icon-border-radius, 7px);
		object-position: top;
	}
</style>
