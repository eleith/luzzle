<script lang="ts">
	import { type WebPieces } from '$lib/pieces/types'
	import Picture from '../picture.svelte'
	import Shield from 'virtual:icons/ph/shield-chevron'
	import Dice from 'virtual:icons/ph/dice-five'
	import Trophy from 'virtual:icons/ph/trophy'
	import MoonStars from 'virtual:icons/ph/moon-stars'
	import Crown from 'virtual:icons/ph/crown'
	import Sword from 'virtual:icons/ph/sword'
	import Coins from 'virtual:icons/ph/coins'
	import Bomb from 'virtual:icons/ph/bomb'

	type Props = {
		piece: WebPieces
		active?: boolean
		size?: 'small' | 'medium' | 'large'
		lazy?: boolean
	}

	const colorThemes = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'brown', 'teal']
	const colorThemeText = ['white', 'black', 'black', 'black', 'white', 'black', 'white', 'black']
	const icons = [Shield, Dice, Trophy, MoonStars, Crown, Sword, Coins, Bomb]

	let { piece, active, size = 'small', lazy }: Props = $props()
	let width = size === 'small' ? 120 : size === 'medium' ? 200 : size === 'large' ? 300 : 400
	const text = piece.keywords
		? (JSON.parse(piece.keywords) as string[])
		: piece.summary?.split(' ') || []
	const hashTitle = getHashIndexFor(piece.title, colorThemes.length)
	const hashId = getHashIndexFor(piece.id, icons.length)
	const themeColor = colorThemes[hashTitle]
	const themeText = colorThemeText[hashTitle]
	const Icon = icons[hashId]

	function onInteractive(event: MouseEvent) {
		const card = event.currentTarget as HTMLElement
		const angleX = 15
		const angleY = -35
		card.style.transform = `rotateX(${angleX}deg) rotateY(${angleY}deg)`
	}

	function offInteractive(event: Event) {
		const card = event.currentTarget as HTMLElement
		card.style.transform = 'rotateX(0deg) rotateY(0deg)'
	}

	function getHashIndexFor(word: string, max: number): number {
		let hash = 0
		for (let i = 0; i < word.length; i++) {
			const char = word.charCodeAt(i)
			hash = (hash << 5) - hash + char
			hash = hash & hash // Convert to 32bit integer
		}
		return Math.abs(hash) % max
	}
</script>

<div
	class="playing-card"
	class:active
	style:--piece-icon-width="{width}px"
	style:--piece-icon-height="{width}px"
	style:--piece-icon-theme-color={themeColor}
	style:--piece-icon-color-theme-text={themeText}
	onmousemove={onInteractive}
	onmouseout={offInteractive}
	onblur={offInteractive}
	role="figure"
>
	<div class="picture">
		{#if piece.media}
			<Picture {piece} {size} {lazy} decoding="async" alt="" />
		{/if}
	</div>
	<div class="corner-top"></div>
	<div class="text">
		<div class="icon">
			<Icon style="font-size: 1.5em; margin: auto;" />
		</div>
		<div class="description">
			{text.slice(0, 7)}
		</div>
	</div>
</div>

<style>
	.active {
		--piece-color: var(--colors-primary);
		--piece-color-text: var(--colors-on-primary);
	}

	.playing-card {
		box-shadow: -8px 8px 8px var(--colors-shadow);
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		position: relative;
		perspective: 1000px;
		transition:
			transform 0.3s ease-in-out,
			box-shadow 0.3s ease-in-out;
		transform-style: preserve-3d;
		width: var(--piece-icon-width);
		background: color-mix(in srgb, var(--piece-icon-theme-color), white);
		color: var(--colors-on-surface);
	}

	.picture {
		height: calc(var(--piece-icon-width) * 1.15);
		background: black;
		overflow: hidden;
		border-top-left-radius: 8px;
		border-top-right-radius: 8px;
	}

	.picture > :global(picture > img) {
		width: var(--piece-icon-width);
		object-fit: cover;
		object-position: top;
	}

	.icon {
		border-radius: 50px;
		background: var(--piece-color, var(--piece-icon-theme-color));
		color: var(--piece-color-text, var(--piece-icon-color-theme-text));
		width: calc(var(--piece-icon-width) * 0.15);
		height: calc(var(--piece-icon-width) * 0.15);
		position: absolute;
		display: flex;
		justify-content: center;
		top: calc(((var(--piece-icon-width) * -0.15) / 2) - 2.5px);
		left: calc(var(--piece-icon-width) / 2 - var(--piece-icon-width) * 0.15 / 2);
		transform: rotate(45deg);
	}

	.corner-top {
		position: absolute;
		width: 0px;
		height: 0px;
		right: 0px;
		top: 0px;
		border-left: calc(var(--piece-icon-width) * 0.25) solid transparent;
		border-right: calc(var(--piece-icon-width) * 0.25) solid
			var(--piece-color, var(--piece-icon-theme-color));
		border-bottom: calc(var(--piece-icon-width) * 0.25) solid transparent;
		border-top-right-radius: 8px;
	}

	.text {
		text-align: center;
		font-size: calc(var(--piece-icon-width) * 0.05);
		border-top: 5px solid var(--piece-icon-theme-color);
		border-bottom-left-radius: 8px;
		border-bottom-right-radius: 8px;
		padding: 10px;
		padding-top: calc(var(--piece-icon-width) * 0.1);
		background: color-mix(in srgb, var(--piece-icon-theme-color), white);
		position: relative;
		color: var(--colors-on-surface);
	}
</style>
