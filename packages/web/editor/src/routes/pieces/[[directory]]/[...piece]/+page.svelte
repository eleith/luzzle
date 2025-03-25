<script lang="ts">
	import FieldDislay from '$lib/components/pieces/fields/display.svelte'
	import FieldEdit from '$lib/components/pieces/fields/edit.svelte'

	let { data } = $props()
	let mode: 'edit' | 'preview' = $state('preview')
	let formElement = $state<HTMLFormElement>()

	function submit() {
		formElement?.submit()
	}
</script>

<section class="toolbar">
	{#if mode === 'preview'}
		<button onclick={() => (mode = 'edit')}>edit</button>
	{:else if mode === 'edit'}
		<button onclick={() => (mode = 'preview')}>cancel</button>
		<button onclick={submit}>save</button>
	{/if}
	<div><a href="/directory/{data.directory}">{data.directory}</a></div>
</section>

{#if mode === 'preview'}
	<section class="preview">
		<div class="piece-container">
			{#each data.schema as field}
				<div class="field">{field.name}</div>
				<div>
					<FieldDislay field={field} value={data.fields[field.name]} />
				</div>
			{/each}
			<div class="field">note</div>
			<div>{data.note}</div>
		</div>
	</section>
{:else if mode === 'edit'}
	<section class="edit">
		<form method="post" bind:this={formElement} enctype="multipart/form-data">
			<div class="piece-container">
				{#each data.schema as field}
					<div class="field">{field.name}</div>
					<div>
						<FieldEdit field={field} value={data.fields[field.name]} />
					</div>
				{/each}
				<div class="field">note</div>
				<div>
					<textarea name="note">{data.note}</textarea>
				</div>
			</div>
		</form>
	</section>
{/if}

<style>
	section.edit,
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

	section.toolbar {
		margin: var(--space-4);
		margin-bottom: var(--space-8);
		margin-left: auto;
		margin-right: auto;
		width: 85%;
		display: flex;
		flex-direction: row;
		gap: var(--space-4);
	}

	@media screen and (min-width: 768px) {
		section.edit,
		section.preview,
		section.toolbar {
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
