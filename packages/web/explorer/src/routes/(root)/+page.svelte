<script lang="ts">
	import PieceIcon from '$lib/pieces/components/icon/index.svelte'
	import type { WebPieces } from '$lib/pieces/types.js'
	import DiceFiveIcon from 'virtual:icons/ph/dice-five'
	import ShuffleIcon from 'virtual:icons/ph/shuffle'
	import { page } from '$app/state'

	let { data } = $props()
	let activePieceId = $state<string | null>(null)
	let latestPieceType = $state<WebPieces | null>(data.latestPiece)
	let random = $state<WebPieces | null>(null)

	async function getLatest(type: string | null = null) {
		const params = new URLSearchParams()
		params.append('take', '1')

		if (type) {
			params.append('type', type)
		}

		const res = await fetch(`/api/pieces?${params}`, {
			headers: {
				'Content-Type': 'application/json'
			}
		})

		if (res.ok) {
			const json = (await res.json()) as { pieces: WebPieces[] }
			latestPieceType = json.pieces[0] || null
		}
	}

	async function getRandom() {
		const params = new URLSearchParams()
		params.append('order', 'random')
		params.append('take', '1')
		params.append('random', Math.random().toString())

		const res = await fetch(`/api/pieces?${params}`, {
			headers: {
				'Content-Type': 'application/json'
			}
		})

		if (res.ok) {
			const json = (await res.json()) as { pieces: WebPieces[] }
			random = json.pieces[0] || null
		}
	}

	async function getNextLatest() {
		const currentType = latestPieceType ? latestPieceType.type : data.types[0].type
		const nextTypeIndex = data.types.findIndex((one) => one.type === currentType) + 1
		const nextType = data.types[nextTypeIndex] ? data.types[nextTypeIndex].type : data.types[0].type

		getLatest(nextType)
	}

	$effect.pre(() => {
		getRandom()
	})
</script>

<svelte:head>
	<title>{page.data.config.text.title}</title>
	<meta name="description" content={page.data.config.text.description} />
	<meta property="og:title" content={page.data.config.text.title} />
	<meta property="og:description" content={page.data.config.text.description} />
	<meta property="og:image" content="{page.data.config.url.app_assets}/images/opengraph.png" />
	<meta property="og:type" content="article" />
	<meta property="og:locale" content="en_US" />
</svelte:head>

<section class="intro">
	<h1>hello</h1>

	<p>
		this site allows me to recall and share
		{#each data.types as one, i (i)}
			{#if i !== data.types.length - 1}
				<a href="/pieces/{one.type}">{one.type}</a>,&nbsp;
			{:else}
				<a href="/pieces/{one.type}">{one.type}</a>
			{/if}
		{/each}
		other <a href="/pieces">pieces</a>
	</p>

	{#if latestPieceType}
		<h2>
			latest
			<button class="plain" onclick={() => getNextLatest()}>
				<ShuffleIcon style="margin: auto; font-size: 0.5em;" />
			</button>
		</h2>

		<section class="pieces">
			<a
				href="/pieces/{latestPieceType.type}/{latestPieceType.slug}"
				onmouseenter={() => {
					activePieceId = latestPieceType ? latestPieceType.id : null
				}}
				onmouseleave={() => {
					activePieceId = null
				}}
				onfocus={() => {
					activePieceId = latestPieceType ? latestPieceType.id : null
				}}
				onblur={() => {
					activePieceId = null
				}}
				ontouchstart={() => {
					activePieceId = latestPieceType ? latestPieceType.id : null
				}}
				ontouchend={() => {
					activePieceId = null
				}}
			>
				<div style="display: flex; align-items: flex-start;">
					<div style="flex: 1 1 0%;">
						<div style="display: flex;">
							<div style="align-self: baseline;">
								<PieceIcon
									piece={latestPieceType}
									size="small"
									active={activePieceId === latestPieceType.id}
								/>
							</div>
						</div>
					</div>
					<div class="piece-text">
						{latestPieceType.title}
					</div>
				</div>
			</a>
		</section>
	{/if}

	<h2>
		random
		<button
			class="plain"
			title="fetch random piece"
			onclick={() => {
				getRandom()
			}}
		>
			<ShuffleIcon style="margin: auto; font-size: 0.5em;" />
		</button>
	</h2>

	{#if random}
		<section class="pieces">
			<a
				href="/pieces/{random.type}/{random.slug}"
				onmouseenter={() => {
					activePieceId = random ? random.id : null
				}}
				onmouseleave={() => {
					activePieceId = null
				}}
				onfocus={() => {
					activePieceId = random ? random.id : null
				}}
				onblur={() => {
					activePieceId = null
				}}
				ontouchstart={() => {
					activePieceId = random ? random.id : null
				}}
				ontouchend={() => {
					activePieceId = null
				}}
			>
				<div style="display: flex; align-items: flex-start;">
					<div style="flex: 1 1 0%;">
						<div style="display: flex;">
							<div style="align-self: baseline;">
								<PieceIcon piece={random} size="small" active={activePieceId === random.id} />
							</div>
						</div>
					</div>
					<div class="piece-text">
						{random.title}
					</div>
				</div>
			</a>
		</section>
	{:else}
		<section style="display: flex; justify-content: center; padding: var(--space-10);">
			<DiceFiveIcon style="font-size: 2em; margin: auto;" />
		</section>
	{/if}
</section>

<style>
	section.intro {
		margin: var(--space-4);
		margin-bottom: var(--space-8);
		margin-left: auto;
		margin-right: auto;
		width: 85%;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding-bottom: var(--space-5);
	}

	section.pieces {
		display: grid;
		grid-template-columns: repeat(auto-fill, 280px);
		gap: 20px;
		padding-left: var(--space-5);
		padding-right: var(--space-5);
		align-items: start;
		justify-content: start;
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

	button.plain {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--colors-primary);
	}

	button.plain:hover {
		color: var(--colors-primary);
		border-bottom: 1px solid var(--colors-primary);
	}

	@media screen and (min-width: 768px) {
		section.intro {
			width: clamp(500px, 66.6666%, 1000px);
		}
	}

	.piece-text {
		flex: 1 1 0%;
		align-self: center;
		max-height: 160px;
		overflow: hidden;
		text-overflow: ellipsis;
		margin-left: var(--space-2);
	}
</style>
