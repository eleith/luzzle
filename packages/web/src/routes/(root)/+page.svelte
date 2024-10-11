<script lang="ts">
	import { PUBLIC_SITE_DESCRIPTION, PUBLIC_SITE_TITLE } from '$env/static/public'
	import PieceIcon from '$lib/pieces/components/icon/index.svelte'
	import type { WebPieces } from '$lib/pieces/types.js'
	import CaretRightIcon from 'virtual:icons/ph/caret-right-thin'
	import DiceFiveIcon from 'virtual:icons/ph/dice-five'
	import DiceTwoIcon from 'virtual:icons/ph/dice-two'

	let { data } = $props()
	let activePieceId = $state<string | null>(null)
	let random: WebPieces[] = $state([])

	const { types, latest } = data

	async function getRandom() {
		const params = new URLSearchParams()
		params.append('order', 'random')
		params.append('take', '2')

		const res = await fetch(`/api/pieces?${params}`, {
			headers: {
				'Content-Type': 'application/json'
			}
		})

		if (res.ok) {
			const json = (await res.json()) as { pieces: WebPieces[] }
			random = json.pieces
		}
	}

	$effect.pre(() => {
		getRandom()
	})
</script>

<svelte:head>
	<title>{PUBLIC_SITE_TITLE}</title>
	<meta name="description" content={PUBLIC_SITE_DESCRIPTION} />
	<meta property="og:title" content={PUBLIC_SITE_TITLE} />
	<meta property="og:description" content={PUBLIC_SITE_DESCRIPTION} />
	<meta property="og:image" content="/images/opengraph.jpg" />
	<meta property="og:type" content="article" />
	<!--
  <meta property="og:site_name" content="" />
  <meta property="og:url" content="{window.location.href}" />
  -->
	<meta property="og:locale" content="en_US" />
</svelte:head>

<section class="intro">
	<h1>hello</h1>

	<p>
		this site allows me to recall and share
		{#each types as piece, i}
			{#if i !== types.length - 1}
				<a href="/pieces/{piece.type}">{piece.type}</a>,&nbsp;
			{:else}
				<a href="/pieces/{piece.type}">{piece.type}</a>
			{/if}
		{/each}
		other <a href="/pieces">pieces</a>
	</p>

	<h2>latest</h2>

	<section class="pieces">
		{#each latest as piece}
			<a
				href="/pieces/{piece.type}/{piece.slug}"
				onmouseenter={() => {
					activePieceId = piece.id
				}}
				onmouseleave={() => {
					if (activePieceId) {
						activePieceId = null
					}
				}}
				onfocus={() => {
					activePieceId = piece.id
				}}
				onblur={() => {
					if (activePieceId) {
						activePieceId = null
					}
				}}
				ontouchstart={() => {
					activePieceId = piece.id
				}}
				ontouchend={() => {
					if (activePieceId) {
						activePieceId = null
					}
				}}
			>
				<div style="display: flex; align-items: flex-start;">
					<div style="flex: 1 1 0%;">
						<div style="display: flex;">
							<div style="align-self: baseline;">
								{#key activePieceId === piece.id}
									<PieceIcon {piece} size="small" active={activePieceId === piece.id} />
								{/key}
							</div>
							<div style="align-self: center;">
								<CaretRightIcon style="margin: auto; font-size: 2em; max-width:unset;" />
							</div>
						</div>
					</div>
					<div style="flex: 1 1 0%; align-self: center; max-height: 160px; overflow: hidden;">
						{piece.title}
					</div>
				</div>
			</a>
		{/each}
	</section>

	<h2>random</h2>

	{#if random.length === 0}
		<section style="display: flex; justify-content: center; padding: var(--space-10);">
			<DiceFiveIcon style="font-size: 2em; margin: auto;" />
			<DiceTwoIcon style="font-size: 2em; margin: auto;" />
		</section>
	{:else}
		<section class="pieces">
			{#each random as piece}
				<a
					href="/pieces/{piece.type}/{piece.slug}"
					onmouseenter={() => {
						activePieceId = piece.id
					}}
					onmouseleave={() => {
						if (activePieceId) {
							activePieceId = null
						}
					}}
					onfocus={() => {
						activePieceId = piece.id
					}}
					onblur={() => {
						if (activePieceId) {
							activePieceId = null
						}
					}}
					ontouchstart={() => {
						activePieceId = piece.id
					}}
					ontouchend={() => {
						if (activePieceId) {
							activePieceId = null
						}
					}}
				>
					<div style="display: flex; align-items: flex-start;">
						<div style="flex: 1 1 0%;">
							<div style="display: flex;">
								<div style="align-self: baseline;">
									{#key activePieceId === piece.id}
										<PieceIcon {piece} size="small" active={activePieceId === piece.id} />
									{/key}
								</div>
								<div style="align-self: center;">
									<CaretRightIcon style="margin: auto; font-size: 2em; max-width:unset;" />
								</div>
							</div>
						</div>
						<div style="flex: 1 1 0%; align-self: center; max-height: 160px; overflow: hidden;">
							{piece.title}
						</div>
					</div>
				</a>
			{/each}
		</section>
	{/if}
</section>

<style>
	section.intro {
		margin: var(--space-4);
		margin-bottom: var(--space-8);
		margin-left: auto;
		margin-right: auto;
		width: 66.666%;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	section.pieces {
		display: grid;
		grid-template-columns: repeat(auto-fill, 280px);
		gap: 20px;
		width: 100%;
		margin: auto;
		align-items: start;
		justify-content: center;
	}

	section.pieces > a {
		color: var(--colors-on-surface);
		cursor: pointer;
		text-decoration: none;
		min-height: 200px;
	}

	section.pieces > a:hover {
		text-decoration: underline;
		color: var(--colors-primary);
	}

	@media screen and (max-width: 768px) {
		section.intro {
			width: 50%;
			min-width: 550px;
			padding-left: 20px;
			padding-right: 20px;
		}
	}
</style>
