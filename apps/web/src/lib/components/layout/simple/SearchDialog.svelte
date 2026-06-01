<script lang="ts">
	import SearchIcon from 'virtual:icons/ph/magnifying-glass'
	import { fly, fade } from 'svelte/transition'
	import { Dialog } from 'bits-ui'
</script>

<Dialog.Root>
	<Dialog.Trigger>
		{#snippet child({
			props
		}: {
			props: Record<string, unknown> & { onclick?: (e: Event) => unknown }
		})}
			<a
				href="/search"
				aria-label="search"
				{...props}
				onclick={(e) => {
					e.preventDefault()
					props.onclick?.(e)
				}}
			>
				<SearchIcon style="font-size: 1em;" />
			</a>
		{/snippet}
	</Dialog.Trigger>
	<Dialog.Portal>
		<Dialog.Overlay forceMount>
			{#snippet child({ props, open })}
				{#if open}
					<div class="searchOverlay" {...props} transition:fade={{ duration: 50 }}></div>
				{/if}
			{/snippet}
		</Dialog.Overlay>
		<Dialog.Content forceMount>
			{#snippet child({ props, open })}
				{#if open}
					<div class="search" {...props} transition:fly={{ y: -500, opacity: 100, duration: 500 }}>
						<form method="GET" action="/search" style="display:flex;gap:10px;">
							<input
								type="search"
								placeholder="the electric stAte ..."
								name="query"
								class="input"
							/>
							<Dialog.Close class="button">search</Dialog.Close>
						</form>
					</div>
				{/if}
			{/snippet}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	.search {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
	}

	.search {
		padding: 20px;
		background: var(--color-surface-container-high);
		height: 200px;
		display: flex;
		justify-content: center;
		align-items: center;
		border-bottom: 2px solid var(--color-outline);
	}

	.searchOverlay {
		position: fixed;
		inset: 0;
		opacity: 0.5;
		background: var(--color-surface-inverse);
	}
</style>
