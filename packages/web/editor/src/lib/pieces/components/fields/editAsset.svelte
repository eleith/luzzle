<script lang="ts">
	import type { AssetField } from './types'

	type Props = {
		field: AssetField
		value: unknown
	}

	let { field, value }: Props = $props()

	const isArray = field.type === 'array'
	const values = value === undefined ? [] : isArray ? (value as string[]) : [value as string]

	const prefix = 'frontmatter'

	let toRemove = $state<string[]>([])
	let toUpload = $state<FileList | null>()
	let toDownload = $state<string>()
	let retainAssets = $state<string[]>(values)
	let fileInput = $state<HTMLInputElement>()

	function clickToRemove(asset: string) {
		const index = retainAssets.indexOf(asset)
		retainAssets.splice(index, 1)
		toRemove.push(asset)
	}

	function clickToRemoveUpload() {
		toUpload = undefined

		if (fileInput) {
			fileInput.value = ''
		}
	}

	function onChangeUpload() {
		const files = fileInput?.files

		if (files) {
			toUpload = files
		}
	}
</script>

<div>
	{#if retainAssets.length > 0}
		{#each retainAssets as asset}
			<div>
				<span><a href="/asset/{asset}" target="_blank">{asset}</a></span>
				<input type="hidden" name="{prefix}.{field.name}" value={asset} />
				<button onclick={() => clickToRemove(asset)}>remove</button>
			</div>
		{/each}
	{/if}

	{#if isArray || retainAssets.length === 0}
		<div>
			<div>
				<input
					type="file"
					multiple={isArray}
					bind:this={fileInput}
					bind:files={toUpload}
					onchange={onChangeUpload}
					name="{prefix}.upload.{field.name}"
					class={toDownload ? 'hide' : ''}
					required={!field.nullable}
				/>
				{#if toUpload?.length}
					<button onclick={() => clickToRemoveUpload()}>cancel</button>
				{/if}
			</div>
			{#if !(toUpload || toDownload)}
				<div>or</div>
			{/if}
			<div>
				<input
					type="text"
					style="width: 100%"
					name="{prefix}.download.{field.name}"
					bind:value={toDownload}
					class={toUpload ? 'hide' : ''}
					placeholder="url to download"
				/>
			</div>
		</div>
	{/if}
	{#each toRemove as asset}
		<input type="hidden" name="{prefix}.remove.{field.name}" value={asset} />
	{/each}
</div>

<style>
	.hide {
		display: none;
	}
</style>
