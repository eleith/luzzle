<script module lang="ts">
	let storeTransforms: Record<string, string> = {}
</script>

<script lang="ts">
	import type { WebPieces } from '$lib/pieces/types'
	import Picture from '$lib/pieces/components/picture.svelte'

	type Props = {
		piece: WebPieces
		active?: boolean
		transform?: { active?: string; initial?: string }
		size?: 's' | 'm' | 'l' | 'xl'
		lazy?: boolean
	}

	let { size = 's', piece, active, transform, lazy }: Props = $props()
	let initialTransform = transform?.initial || 'none'
	let activeTransform = transform?.active || 'none'
	let divBook: HTMLDivElement
	let key = `1`
	let canTransform = initialTransform !== activeTransform || activeTransform !== 'none'
	let width = size === 's' ? 120 : size === 'm' ? 200 : size === 'l' ? 300 : 400

	function transformToActive() {
		if (startingStateTransform !== activeTransform) {
			futureStateTransform = activeTransform
			isTransformed = true
		}
	}

	function transformToInitial() {
		if (startingStateTransform !== initialTransform) {
			futureStateTransform = initialTransform
			isTransformed = true
		}
	}

	function transformFinished() {
		isTransformed = active ? activeTransform !== 'none' : initialTransform !== 'none'
	}

	let isLoading = $state<boolean>(!!piece.media)
	let startingStateTransform = $state<string>(storeTransforms[key] || initialTransform)
	let futureStateTransform = $state<string | null>(null)
	let isTransformed = $state<boolean>(startingStateTransform !== 'none')

	if (canTransform) {
		setTimeout(() => {
			if (active) {
				transformToActive()
			} else {
				transformToInitial()
			}
		}, 0)
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function silentAnimation(_: HTMLDivElement) {
		return {}
	}

	function silentAnimationEnd() {
		const currentTransform = getComputedStyle(divBook).getPropertyValue('transform')

		if (currentTransform !== 'none') {
			storeTransforms[key] = currentTransform
		} else {
			delete storeTransforms[key]
		}
	}
</script>

<div
	role="figure"
	class="book"
	out:silentAnimation|global
	onoutroend={silentAnimationEnd}
	style:--piece-icon-transform-start={startingStateTransform}
	style:--piece-icon-transform-future={futureStateTransform}
	style:--piece-icon-width="{width}px"
	bind:this={divBook}
	class:bookTransformFuture={futureStateTransform !== null}
	class:bookTransformed={isTransformed}
	ontransitionend={transformFinished}
>
	<div class="bookShadow"></div>
	<div class="bookSpine"></div>
	<div class="bookPages"></div>
	<div class="bookPagesBottom"></div>
	<div class="bookPagesTop"></div>
	<div class="bookBack"></div>
	<div>
		<div class="bookCover" class:bookCoverLoading={isLoading}>
			<div class="bookCoverFront" class:bookCoverFrontTitle={piece.media && !isLoading}>
				{piece.title}
			</div>
			<Picture
				{piece}
				{size}
				{lazy}
				alt=""
				onerror={() => {
					isLoading = false
				}}
				onload={() => {
					isLoading = false
				}}
			/>
		</div>
	</div>
</div>

<style>
	@keyframes bookPulse {
		0% {
			background-color: #494949;
		}
		100% {
			background-color: var(--piece-icon-background-color, black);
		}
	}

	.bookCoverLoading {
		position: absolute;
		top: 0px;
		left: 0px;
		bottom: 0px;
		right: 0px;
		animation-name: bookPulse;
		animation-duration: 500ms;
		animation-direction: alternate;
		animation-iteration-count: infinite;
		animation-timing-function: ease-in-out;
	}

	.bookCover > :global(picture > img) {
		position: relative;
		width: var(--piece-icon-width, 200px);
		height: calc(var(--piece-icon-width, 200px) * 3 / 2);
		object-fit: cover;
	}

	.book {
		width: var(--piece-icon-width, 200px);
		height: calc(var(--piece-icon-width, 200px) * 3 / 2);
		position: relative;
		color: var(--piece-icon-text-color, white);
		transform-style: flat;
		transition: var(--piece-icon-transition, transform 0.75s ease);
		transform: var(--piece-icon-transform-start, 'none');
		box-shadow: -8px 8px 8px var(--colors-shadow);
	}

	.bookTransformed {
		transform-style: preserve-3d;
		--piece-icon-transform-display: block;
	}

	.bookTransformFuture {
		transform: var(--piece-icon-transform-future, 'none');
	}

	.bookPages {
		display: var(--piece-icon-transform-display, none);
		position: absolute;
		left: 0;
		top: var(--piece-icon-page-offset, 3px);
		width: calc(var(--piece-icon-thickness, 25px) - 2px);
		height: calc((var(--piece-icon-width, 200px) * 3 / 2) - 2 * var(--piece-icon-page-offset, 3px));
		transform: translateX(
				calc(
					var(--piece-icon-width, 200px) - var(--piece-icon-thickness, 25px) / 2 -
						var(--piece-icon-page-offset, 3px)
				)
			)
			translateZ(calc(0px - var(--piece-icon-thickness, 25px) / 2)) rotateY(90deg);
		background: linear-gradient(
			90deg,
			#fff 0%,
			#f9f9f9 5%,
			#fff 10%,
			#f9f9f9 15%,
			#fff 20%,
			#f9f9f9 25%,
			#fff 30%,
			#f9f9f9 35%,
			#fff 40%,
			#f9f9f9 45%,
			#fff 50%,
			#f9f9f9 55%,
			#fff 60%,
			#f9f9f9 65%,
			#fff 70%,
			#f9f9f9 75%,
			#fff 80%,
			#f9f9f9 85%,
			#fff 90%,
			#f9f9f9 95%,
			#fff 100%
		);
	}

	.bookPagesBottom {
		display: var(--piece-icon-transform-display, none);
		position: absolute;
		left: 1;
		bottom: 0;
		width: calc(var(--piece-icon-width, 200px) - 4px);
		height: var(--piece-icon-thickness, 25px);
		transform: translateY(calc(var(--piece-icon-thickness, 25px) / 2 - 5px))
			translateZ(calc(0px - var(--piece-icon-thickness, 25px) / 2)) rotateX(270deg);
		background: linear-gradient(
			0deg,
			#fff 0%,
			#f9f9f9 5%,
			#fff 10%,
			#f9f9f9 15%,
			#fff 20%,
			#f9f9f9 25%,
			#fff 30%,
			#f9f9f9 35%,
			#fff 40%,
			#f9f9f9 45%,
			#fff 50%,
			#f9f9f9 55%,
			#fff 60%,
			#f9f9f9 65%,
			#fff 70%,
			#f9f9f9 75%,
			#fff 80%,
			#f9f9f9 85%,
			#fff 90%,
			#f9f9f9 95%,
			#fff 100%
		);
	}

	.bookPagesTop {
		display: var(--piece-icon-transform-display, none);
		position: absolute;
		right: 1;
		top: 0;
		width: calc(var(--piece-icon-width, 200px) - 4px);
		height: var(--piece-icon-thickness, 25px);
		transform: translateY(calc(0px - (var(--piece-icon-thickness, 25px) / 2 - 5px)))
			translateZ(calc(0px - var(--piece-icon-thickness, 25px) / 2)) rotateX(270deg);
		background: linear-gradient(
			0deg,
			#fff 0%,
			#f9f9f9 5%,
			#fff 10%,
			#f9f9f9 15%,
			#fff 20%,
			#f9f9f9 25%,
			#fff 30%,
			#f9f9f9 35%,
			#fff 40%,
			#f9f9f9 45%,
			#fff 50%,
			#f9f9f9 55%,
			#fff 60%,
			#f9f9f9 65%,
			#fff 70%,
			#f9f9f9 75%,
			#fff 80%,
			#f9f9f9 85%,
			#fff 90%,
			#f9f9f9 95%,
			#fff 100%
		);
	}

	.bookSpine {
		display: var(--piece-icon-transform-display, none);
		position: absolute;
		left: 0;
		top: 0;
		width: calc(var(--piece-icon-thickness, 25px) - 2px);
		height: calc(var(--piece-icon-width, 200px) * 3 / 2);
		transform: translateX(calc(0px - (var(--piece-icon-thickness, 25px) / 2 - 1px)))
			translateZ(calc(0px - var(--piece-icon-thickness, 25px) / 2)) rotateY(-90deg);
		background-color: var(--piece-icon-background-color, black);
	}

	.bookBack {
		display: var(--piece-icon-transform-display, none);
		position: absolute;
		top: 0;
		left: 0;
		width: var(--piece-icon-width, 200px);
		height: calc(var(--piece-icon-width, 200px) * 3 / 2);
		transform: translateZ(calc(0px - var(--piece-icon-thickness, 25px)));
		background-color: var(--piece-icon-background-color, black);
		border-top-right-radius: var(--piece-icon-border-radius, 7px);
		border-bottom-right-radius: var(--piece-icon-border-radius, 7px);
	}

	.bookCoverFront {
		width: 100%;
		position: absolute;
		text-align: center;
		top: 0px;
		left: 0px;
		bottom: 0px;
		right: 0px;
		hyphens: auto;
		padding: 7px;
		overflow: hidden;
		display: flex;
		align-items: center;
	}

	.bookCoverFrontTitle {
		display: none;
	}

	.bookShadow {
		position: absolute;
		top: 0;
		left: 0;
		width: var(--piece-icon-width, 200px);
		height: calc(var(--piece-icon-width, 200px) * 3 / 2);
		border-top-right-radius: var(--piece-icon-border-radius, 7px);
		border-bottom-right-radius: var(--piece-icon-border-radius, 7px);
	}

	:global(html[data-theme='light']) .bookShadow {
		box-shadow: -11px 11px 15px rgba(0, 0, 0, 0.35);
	}

	:global(html[data-theme='dark']) .bookShadow {
		box-shadow: -11px 11px 15px black;
	}

	.bookCover {
		position: absolute;
		top: 0px;
		left: 0px;
		bottom: 0px;
		right: 0px;
		background-color: var(--piece-icon-background-color, black);
		overflow: hidden;
		border-top-right-radius: var(--piece-icon-border-radius, 7px);
		border-bottom-right-radius: var(--piece-icon-border-radius, 7px);
		display: flex;
		align-items: center;
	}
</style>
