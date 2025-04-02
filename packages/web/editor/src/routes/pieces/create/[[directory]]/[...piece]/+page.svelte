<script lang="ts">
	import FieldEdit from '$lib/components/pieces/fields/edit.svelte'

	let { data, form } = $props()
</script>

<section class="toolbar">
	<div><a href="/directory/list/{data.directory}">cancel</a></div>
</section>

{#if form && !form.error}
	<section class="edit">
		<form method="post" enctype="multipart/form-data" action="?/create">
			<div class="piece-container">
				<div class="field">directory</div>
				<div>
					{form.directory}
					<input type="hidden" name="directory" value={form.directory} />
				</div>
				<div class="field">slug</div>
				<div>
					{form.name}
					<input type="hidden" name="name" value={form.name} required />
				</div>
				<div class="field">type</div>
				<div>
					{form.type}
					<input type="hidden" name="type" value={form.type} required />
				</div>
				{#each form.fields || [] as field}
					<div class="field">{field.name}</div>
					<div>
						<FieldEdit {field} value={form.markdown.frontmatter[field.name]} />
					</div>
				{/each}
				<div class="field">note</div>
				<div>
					<textarea name="note">{form.markdown.note}</textarea>
				</div>
				<div>
					<button type="submit">create</button>
				</div>
			</div>
		</form>
	</section>
{:else}
	<section class="create">
		<form method="post" enctype="multipart/form-data" action="?/prompt">
			<div class="piece-container">
				{#if form?.error}
					<div class="error">
						{form.error.message}
					</div>
				{/if}
				<div class="field">directory</div>
				<div>{data.directory}</div>
				<div class="field">name</div>
				<div>
					<input type="text" name="name" required />
				</div>
				<div class="field">type</div>
				<div>
					<select name="type" required>
						{#each data.types as type}
							<option value={type}>{type}</option>
						{/each}
					</select>
					<div class="field">prompt</div>
					<div>
						<textarea name="prompt"></textarea>
					</div>
					<div class="field">file</div>
					<div>
						<input type="file" name="file" accept=".pdf" />
					</div>
					<div>
						<button type="submit">prompt</button>
					</div>
				</div>
			</div>
		</form>
	</section>
{/if}

<style>
	section.edit,
	section.create {
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
		section.create,
		section.toolbar {
			width: clamp(500px, 66.6666%, 1000px);
		}
	}
</style>
