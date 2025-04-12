<script lang="ts">
	let { data } = $props()
	const { files, directory } = $derived(data)
</script>

<section class="intro">
	{#if files.pieces.length}
		<p>
			pieces: <br />
			{#each files.pieces as piece}
				<a href="/pieces/list/{directory.current}/{piece.file}">{piece.slug}</a> <br />
			{/each}
		</p>
	{/if}

	{#if files.directories.length}
		<p>
			directories <br />
			{#each files.directories as directory}
				<a href="/directory/list/{directory}">{directory}</a> <br />
			{/each}
		</p>
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

	@media screen and (min-width: 768px) {
		section.intro {
			width: clamp(500px, 66.6666%, 1000px);
		}
	}
</style>
