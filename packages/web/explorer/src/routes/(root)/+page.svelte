<script lang="ts">
	import {
		PUBLIC_CLIENT_APP_URL,
		PUBLIC_SITE_DESCRIPTION,
		PUBLIC_SITE_TITLE
	} from '$env/static/public'
	import PieceIcon from '$lib/pieces/components/icon/index.svelte'
	import type { WebPieces } from '$lib/pieces/types.js'
	import CaretDownIcon from 'virtual:icons/ph/caret-down-thin'
	import CaretUpIcon from 'virtual:icons/ph/caret-up-thin'
	import CheckIcon from 'virtual:icons/ph/check'
	import DiceFiveIcon from 'virtual:icons/ph/dice-five'
	import ShuffleIcon from 'virtual:icons/ph/shuffle'
	import { createSelect, melt } from '@melt-ui/svelte'

	let { data } = $props()
	const { types, latestPiece } = data

	let activePieceId = $state<string | null>(null)
	let latestPieceType = $state<WebPieces | null>(latestPiece)
	let random = $state<WebPieces | null>(null)

	const {
		elements: { trigger, menu, option, label },
		states: { selectedLabel, open },
		helpers: { isSelected }
	} = createSelect<WebPieces['type']>({
		onSelectedChange: ({ next }) => {
			if (next) {
				getLatest(next.value)
			}
			return next
		},
		defaultSelected: {
			value: latestPiece?.type || types[0].type,
			label: latestPiece?.type || types[0].type
		},
		loop: true
	})

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

	$effect.pre(() => {
		getRandom()
	})
</script>

<svelte:head>
	<title>{PUBLIC_SITE_TITLE}</title>
	<meta name="description" content={PUBLIC_SITE_DESCRIPTION} />
	<meta property="og:title" content={PUBLIC_SITE_TITLE} />
	<meta property="og:description" content={PUBLIC_SITE_DESCRIPTION} />
	<meta property="og:image" content="{PUBLIC_CLIENT_APP_URL}/images/opengraph.png" />
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
		{#each types as one, i (i)}
			{#if i !== types.length - 1}
				<a href="/pieces/{one.type}">{one.type}</a>,&nbsp;
			{:else}
				<a href="/pieces/{one.type}">{one.type}</a>
			{/if}
		{/each}
		other <a href="/pieces">pieces</a>
	</p>

	{#if latestPieceType}
		<h2>
			<label use:melt={$label}>latest</label>
			<button use:melt={$trigger} class="plain">
				{($selectedLabel || latestPieceType.type).replace(/s$/, '')}
				{#if $open}
					<CaretUpIcon style="margin: auto; font-size: 0.5em;" />
				{:else}
					<CaretDownIcon style="margin: auto; font-size: 0.5em;" />
				{/if}
			</button>
		</h2>
		{#if $open}
			<div use:melt={$menu} class="select-menu">
				{#each types as one, i (i)}
					{#if $isSelected(one.type)}
						<div use:melt={$option({ value: one.type, label: one.type })}>
							<div
								style="display: flex; align-items: center; gap: 0.5em;
							justify-content: space-between;"
							>
								<div>
									{one.type}
								</div>
								<div style="justify-self: end;">
									<CheckIcon style="margin: auto; font-size: 0.5em;" />
								</div>
							</div>
						</div>
					{:else}
						<div
							use:melt={$option({ value: one.type, label: one.type })}
							onclick={() => {
								getLatest(one.type)
							}}
						>
							{one.type}
						</div>
					{/if}
				{/each}
			</div>
		{/if}

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

	button.plain {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--colors-on-surface);
	}

	button.plain:hover {
		color: var(--colors-primary);
	}

	.select-menu {
		background: var(--colors-surface-bright);
		border-radius: var(--radius-2);
		box-shadow: var(--shadow-1);
		border: 1px solid var(--colors-outline);
	}

	.select-menu > div {
		cursor: pointer;
		padding: var(--space-2);
	}

	.select-menu > div[data-highlighted] {
		background: var(--colors-primary-container);
		color: var(--colors-on-primary-container);
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
