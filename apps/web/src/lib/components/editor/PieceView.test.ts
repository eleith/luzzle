import { readFileSync } from 'node:fs'
import { expect, test, vi } from 'vitest'
import { render } from 'svelte/server'
import PieceView from './PieceView.svelte'

vi.mock('$app/navigation', () => ({ goto: vi.fn() }))
const source = readFileSync(new URL('./PieceView.svelte', import.meta.url), 'utf8')

// Bits portals do not render menu contents in SSR. These tests establish the
// trigger and source contracts, not popup visibility, clicks, warnings or focus.
test.each([false, true])('SSR keeps View available while saving=%s', (isSaving) => {
	const { body } = render(PieceView, {
		props: { file: 'books/a #?.md', hasPublishedVersion: false, isSaving }
	})
	expect(body.replace(/<!--.*?-->/g, '')).toMatch(
		/<button[^>]*aria-haspopup="menu"[^>]*>View<\/button>/
	)
	expect(body).not.toMatch(/<button[^>]*disabled/)
})

test('both literal items use native disabled state and current-prop navigation callbacks', () => {
	expect(source).toContain('$derived(getViewAvailability(hasPublishedVersion, isSaving))')
	expect(source).toMatch(/class="dropdown-content">\s*<DropdownMenu.Item/)
	expect(source).toMatch(/<\/DropdownMenu.Item>\s*<DropdownMenu.Item/)
	expect(source.match(/<DropdownMenu.Item\s/g)).toHaveLength(2)
	for (const [view, helper] of [
		['published', 'publishedHref'],
		['preview', 'previewHref']
	]) {
		expect(source).toContain(`disabled={!availability.${view}}`)
		expect(source).toContain(`onSelect={() => goto(${helper}(file))}`)
	}
	expect(source).not.toMatch(/<a\b|\bhref=|preload|autoSave|bypassWarning|setTimeout|async\b/)
	expect(source).not.toMatch(/isDirty|markdownStatus|content_hash|previewUrl|publishedUrl/)
})

test('source editor wires availability and encoded actions without replacing its unsaved guard', () => {
	const editor = readFileSync(
		new URL('../../../routes/admin/piece/[...path]/source/+page.svelte', import.meta.url),
		'utf8'
	)
	expect(editor).toContain(
		'<PieceView file={data.file} hasPublishedVersion={data.hasPublishedVersion} {isSaving} />'
	)
	expect(editor).toContain(
		'$derived(shouldOfferPublish(data.hasPublishedVersion, data.savedMarkdown))'
	)
	expect(editor).toContain('$derived(editorHref(data.file))')
	for (const action of ['save', 'delete'])
		expect(editor).toContain(`action="{sourceUrl}?/${action}"`)
	expect(editor).toContain('fetch(`${sourceUrl}?/attach`, {')
	expect(editor).toContain(
		"if (isDirty && !bypassWarning && navigation.type !== 'form' && navigation.to)"
	)
	expect(editor).toContain('navigation.cancel()')
	expect(editor).toContain('onclick={confirmDiscard}')
})

test('real child menuitems connect instance-unique literal labels and visible descriptions', () => {
	expect(source).toContain('const id = $props.id()')
	for (const [view, label] of [
		['published', 'Published'],
		['preview', 'Preview']
	]) {
		expect(source).toContain(`<span id={\`\${id}-${view}-label\`}>${label}</span>`)
		expect(source).toContain(`id={\`\${id}-${view}-description\`} class="description"`)
		expect(source).toContain(`aria-labelledby={\`\${id}-${view}-label\`}`)
		expect(source).toContain(`aria-describedby={\`\${id}-${view}-description\`}`)
	}
	expect(source.match(/\{#snippet child\(\{ props \}\)\}\s*<div\s*\{\.\.\.props\}/g)).toHaveLength(
		2
	)
	expect(source.match(/Wait for saving to finish\./g)).toHaveLength(2)
	expect(source).toContain('No published version yet.')
	expect(source).toContain('Uses saved Markdown.')
})
