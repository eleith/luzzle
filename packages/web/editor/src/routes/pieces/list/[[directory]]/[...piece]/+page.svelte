<script lang="ts">
	import FieldDislay from '$lib/pieces/components/fields/display.svelte'
	import FieldEdit from '$lib/pieces/components/fields/edit.svelte'

	let { data } = $props()
	let mode: 'edit' | 'preview' | 'prompt-delete' = $state('preview')
	let formElement = $state<HTMLFormElement>()
</script>

{#if mode === 'prompt-delete'}
	<dialog open={mode === 'prompt-delete'}>
		<form method="post" action="?/delete">
			<p>Are you sure you want to delete this piece?</p>
			<p>This action cannot be undone.</p>
			<button type="button" onclick={() => (mode = 'edit')}>cancel</button>
			<button type="submit">delete</button>
		</form>
	</dialog>
{/if}

<section class="toolbar">
	{#if mode === 'preview'}
		<button onclick={() => (mode = 'edit')}>edit</button>
	{:else if mode === 'edit' || mode === 'prompt-delete'}
		<button onclick={() => (mode = 'preview')}>cancel</button>
		<button onclick={() => (mode = 'prompt-delete')} style="background-color:red;">delete</button>
	{/if}
	<div><a href="/directory/list/{data.directory}">{data.directory}</a></div>
</section>

{#if mode === 'preview'}
	<section class="preview">
		<div class="piece-container">
			{#each data.schema as field}
				<div>
					<FieldDislay {field} value={data.fields[field.name]} />
				</div>
			{/each}
			<div class="field">note</div>
			<div>{data.note}</div>
		</div>
	</section>
{:else if mode === 'edit' || mode === 'prompt-delete'}
	<section class="edit">
		<form method="post" bind:this={formElement} enctype="multipart/form-data" action="?/edit">
			<div class="piece-container">
				{#each data.schema as field}
					<div class="field">{field.name}</div>
					<div>
						<FieldEdit {field} value={data.fields[field.name]} />
					</div>
				{/each}
				<div class="field">note</div>
				<div>
					<textarea name="note">{data.note}</textarea>
				</div>
				<div>
					<button type="submit">save</button>
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
</style>
