<script lang="ts">
	import { navigating } from '$app/state'
	import { onMount } from 'svelte'
	import { cubicInOut } from 'svelte/easing'
	import { Tween } from 'svelte/motion'

	const MIN_DISPLAY_MS = 200
	const STORAGE_KEY = 'server-nav-pending'
	const FRESH_MS = 5000

	let visible = $state(false)
	let startedAt = 0
	const tween = new Tween(0, { duration: 400, easing: cubicInOut })

	function finish() {
		tween.set(100, { duration: 200 })
		setTimeout(() => {
			visible = false
			startedAt = 0
		}, 200)
	}

	// Client-side navigation
	$effect(() => {
		if (navigating.to) {
			visible = true
			startedAt = Date.now()
			tween.set(0, { duration: 0 })
			tween.set(20, { duration: 200 })
			tween.set(90, { duration: 10000 })
		} else if (startedAt > 0) {
			const elapsed = Date.now() - startedAt
			const delay = Math.max(0, MIN_DISPLAY_MS - elapsed)

			const timeout = setTimeout(() => finish(), delay)
			return () => clearTimeout(timeout)
		}
	})

	// Server-side navigation
	onMount(() => {
		let pending: string | null = null
		try {
			pending = sessionStorage.getItem(STORAGE_KEY)
			sessionStorage.removeItem(STORAGE_KEY)
		} catch {
			// ignore
		}

		if (pending && Date.now() - Number(pending) < FRESH_MS) {
			visible = true
			tween.set(90, { duration: 0 })
			requestAnimationFrame(() => finish())
		}

		function markPending() {
			try {
				sessionStorage.setItem(STORAGE_KEY, String(Date.now()))
			} catch {
				// ignore
			}
		}

		window.addEventListener('pagehide', markPending)
		window.addEventListener('beforeunload', markPending)

		return () => {
			window.removeEventListener('pagehide', markPending)
			window.removeEventListener('beforeunload', markPending)
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
