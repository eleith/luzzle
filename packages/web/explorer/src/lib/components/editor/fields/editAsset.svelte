<script lang="ts">
	import type { AssetField } from './types'

	type Props = {
		field: AssetField
		value: unknown
		originalValue?: unknown
		isModified?: boolean
		pathPrefix?: string
	}

	let {
		field,
		value,
		originalValue,
		isModified = $bindable(false),
		pathPrefix = 'frontmatter'
	}: Props = $props()

	const isArray = field.type === 'array'
	const currentPath = `${pathPrefix}.${field.name}`

	let toRemove = $state<string[]>([])
	let toUpload = $state<FileList | null>(null)
	let toDownload = $state<string | null>(null)
	let retainAssets = $state<string[]>([])
	let fileInput = $state<HTMLInputElement>()

	// Derived initial state from originalValue for comparison
	const originalValues = $derived(
		originalValue === undefined
			? []
			: isArray
				? (originalValue as string[])
				: [originalValue as string]
	)

	// Effect to sync from Prop (Server/LLM) to Internal State
	$effect(() => {
		const values = value === undefined ? [] : isArray ? (value as string[]) : [value as string]
		retainAssets = values
	})

	// Calculate modification status
	const checkModified = $derived.by(() => {
		const assetsChanged = JSON.stringify(retainAssets) !== JSON.stringify(originalValues)
		const hasDownload = !!toDownload
		const hasUpload = !!toUpload && toUpload.length > 0
		return assetsChanged || hasDownload || hasUpload
	})

	$effect(() => {
		isModified = checkModified
	})

	function clickToRemove(asset: string) {
		const index = retainAssets.indexOf(asset)
		retainAssets.splice(index, 1)
		toRemove.push(asset)
	}

	function clickToRemoveUpload() {
		toUpload = null

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

	export function focus() {
		fileInput?.focus()
	}
</script>

<div>
	{#if retainAssets.length > 0}
		{#each retainAssets as asset, index (index)}
			<div>
				<span><a href="/editor/asset/{asset}" target="_blank">{asset}</a></span>
				<input type="hidden" name={currentPath} value={asset} />
				<button class="button" data-variant="error" onclick={() => clickToRemove(asset)}
					>remove</button
				>
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
					name="frontmatter.upload.{currentPath.replace(/^frontmatter\./, '')}"
					class={toDownload ? 'hide input' : 'input'}
					required={!field.nullable}
				/>
				{#if toUpload?.length}
					<button class="button" onclick={() => clickToRemoveUpload()}>cancel</button>
				{/if}
			</div>
			{#if !(toUpload?.length || toDownload)}
				<div>or</div>
			{/if}
			<div>
				<input
					type="text"
					style="width: 100%"
					name="frontmatter.download.{currentPath.replace(/^frontmatter\./, '')}"
					bind:value={toDownload}
					class={toUpload?.length ? 'hide input' : 'input'}
					placeholder="url to download"
				/>
			</div>
		</div>
	{/if}
	{#each toRemove as asset, index (index)}
		<input
			type="hidden"
			name="frontmatter.remove.{currentPath.replace(/^frontmatter\./, '')}"
			value={asset}
		/>
	{/each}
</div>

<style>
	.hide {
		display: none;
	}
</style>
