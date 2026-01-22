<script lang="ts">
	import PieceForm from '$lib/pieces/components/PieceForm.svelte'

	let { data } = $props()
	let dialog: HTMLDialogElement
	let fields = $state(data.fields)
</script>

<dialog bind:this={dialog}>
	<form method="post" action="?/delete">
		<p>Are you sure you want to delete this piece?</p>
		<p>This action cannot be undone.</p>
		<button type="button" onclick={() => dialog.close()}>cancel</button>
		<button type="submit">delete</button>
	</form>
</dialog>

{#snippet buttons()}
	<button type="submit">save</button>
	<div>
		<button type="button" style="background-color:blue;">
			<a href="/pieces/list/{data.file}">cancel</a>
		</button>
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
{/snippet}

<PieceForm
	action="?/edit"
	schema={data.schema}
	values={fields}
	originalValues={data.fields}
	note={data.note || ''}
	{buttons}
/>

<style>
	dialog {
		position: fixed;
		transform: translate(-50%, -50%);
		top: 50%;
		left: 50%;
	}

	dialog::backdrop {
		background-color: rgba(0, 0, 0, 0.5);
	}
</style>
