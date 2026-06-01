<script lang="ts">
	let { data } = $props()
	const { files } = $derived(data)
</script>

<section class="intro">
	{#if files.pieces.length}
		<div>
			<p>pieces:</p>
			<div class="list">
				{#each files.pieces as piece (piece.slug)}
					<a href="/admin/piece/{piece.file}/source">{piece.slug}</a>
				{/each}
			</div>
		</div>
	{/if}

	{#if files.directories.length}
		<div>
			<p>directories</p>
			<div class="list">
				{#each files.directories as dir (dir)}
					<a href="/admin/directory/{dir}">{dir}</a>
				{/each}
			</div>
		</div>
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

	.list {
		display: grid;
		gap: 5px;
		justify-items: start;
	}

	.list a {
		max-width: 100%;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	@media screen and (min-width: 768px) {
		section.intro {
			width: clamp(500px, 66.6666%, 1000px);
		}
	}
</style>
