<script lang="ts">
	import FieldEdit from '$lib/pieces/components/fields/edit.svelte'

	let { data } = $props()
	let dialog: HTMLDialogElement
</script>

<dialog bind:this={dialog}>
	<form method="post" action="?/delete">
		<p>Are you sure you want to delete this piece?</p>
		<p>This action cannot be undone.</p>
		<button type="button" onclick={() => dialog.close()}>cancel</button>
		<button type="submit">delete</button>
	</form>
</dialog>

<section class="edit">
	<form method="post" enctype="multipart/form-data" action="?/edit">
		<div class="piece-container">
			{#each data.schema as field}
				<div class="field">{field.name}</div>
				<div class="field-edit">
					<FieldEdit {field} value={data.fields[field.name]} />
				</div>
			{/each}
			<div class="field">note</div>
			<div class="field-edit">
				<textarea name="note" style="width: 100%;height:300px;">{data.note}</textarea>
			</div>
			<div style="display: flex; justify-content: space-between;">
				<button type="submit">save</button>
				<button
					type="button"
					onclick={() => {
						dialog.showModal()
					}}
					style="background-color:red;"
				>
					delete
				</button>
			</div>
		</div>
	</form>
</section>

<style>
	div.field {
		font-size: 80%;
	}

	div.field-edit {
		padding-bottom: 10px;
	}

	dialog {
		position: fixed;
		transform: translate(-50%, -50%);
		top: 50%;
		left: 50%;
	}

	dialog::backdrop {
		background-color: rgba(0, 0, 0, 0.5);
	}

	section.edit {
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
		section.edit {
			width: clamp(500px, 66.6666%, 1000px);
		}
	}
</style>
