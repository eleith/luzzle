<script lang="ts">
	import FieldDisplay from '$lib/pieces/components/fields/display.svelte'

	let { data } = $props()
</script>

<section class="preview">
	<div class="piece-container">
		{#each data.schema as field}
			<div style="padding-bottom: 10px;">
				<div style="font-size: 80%;">
					{field.name}
				</div>
				<div>
					<FieldDisplay {field} value={data.fields[field.name]} />
				</div>
			</div>
		{/each}
		<div style="font-size: 80%;">note</div>
		<div>{data.note}</div>
	</div>
</section>

<style>
	section.preview {
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
		section.preview {
			width: clamp(500px, 66.6666%, 1000px);
		}
	}
</style>
