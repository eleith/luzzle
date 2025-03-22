<script lang="ts">
	let { data } = $props()
</script>

<section class="main">
	<div class="piece-container">
		<div class="field">folder</div>
		<div><a href="/directory/{data.directory}">{data.directory}</a></div>

		{#each data.schema as field}
			<div class="field">{field.name}</div>
			{#if data.fields[field.name]}
				<div>{data.fields[field.name]}</div>
			{:else}
				<div><em>empty</em></div>
			{/if}
		{/each}
	</div>
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

	div.piece-container {
		display: grid;
		grid-template-columns: 1fr 3fr;
		gap: 5px;
	}

	div.field {
		justify-self: end;
	}
</style>
