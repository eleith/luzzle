<script lang="ts">
	let { data, form } = $props()
	const { files } = $derived(data)
</script>

<section class="main">
	<form action="?/deploy" method="post">
		{#if form && form.success}
			<p class="success">successfully deployed</p>
		{/if}
		<p>
			<button type="submit">deploy</button>
		</p>
	</form>

	{#if files.pieces.length}
		<div>
			<p>pieces:</p>
			<p style="display: grid; gap: 5px;">
				{#each files.pieces as piece (piece.slug)}
					<a href="/pieces/list/{piece.type}/{piece.file}">{piece.slug}</a>
				{/each}
			</p>
		</div>
	{/if}

	{#if files.directories.length}
		<div>
			<p>directories</p>
			<p style="display: grid; gap: 5px;">
				{#each files.directories as directory (directory)}
					<a href="/directory/list/{directory}">{directory}</a>
				{/each}
			</p>
		</div>
	{/if}
</section>

<style>
	section.main {
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
		section.main {
			width: clamp(500px, 66.6666%, 1000px);
		}
	}
</style>
