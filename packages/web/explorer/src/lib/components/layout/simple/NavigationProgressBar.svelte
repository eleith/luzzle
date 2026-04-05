<script lang="ts">
	import { navigating } from '$app/state'
	import { cubicInOut } from 'svelte/easing'
	import { Tween } from 'svelte/motion'

	let visible = $state(false)
	const tween = new Tween(0, { duration: 400, easing: cubicInOut })

	$effect(() => {
		if (navigating.to) {
			visible = true
			tween.set(0, { duration: 0 })
			tween.set(25, { duration: 200 })
			tween.set(90, { duration: 10000 })
		} else {
			tween.set(100, { duration: 100 })

			const timeout = setTimeout(() => {
				visible = false
			}, 200)

			return () => clearTimeout(timeout)
		}
	})
</script>

{#if visible}
	<div class="progress-root" role="progressbar" aria-valuenow={tween.current} aria-valuemax={100}>
		<div class="progress-fill" style={`transform: translateX(-${100 - tween.current}%)`}></div>
	</div>
{/if}

<style>
	.progress-root {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		width: 100%;
		z-index: 100;
		pointer-events: none;
		height: 3px;
		background: transparent;
		overflow: hidden;
	}

	.progress-fill {
		background-color: var(--color-primary);
		height: 100%;
		width: 100%;
		transform-origin: left;
		position: relative;
	}

	.progress-fill::after {
		content: '';
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		width: 100px;
		height: 100%;
		box-shadow:
			0 0 10px var(--color-primary),
			0 0 5px var(--color-primary);
		transform: rotate(3deg) translate(0px, -4px);
		opacity: 1;
		display: block;
	}
</style>
