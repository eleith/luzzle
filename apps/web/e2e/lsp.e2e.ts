import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Cookie, Page } from '@playwright/test'
import { ADMIN, fieldGuide, notebook } from './support/fixture.js'
import { routeLsp, type LspConnection } from './support/lsp.js'
import { expect, test } from './support/test.js'

const notebookUri = 'luzzle-web:///archive/reading/meteor%20notes.notes.md'
const fieldGuideUri = 'luzzle-web:///archive/reading/field%20guide.records.md'
const unavailable = 'Language assistance unavailable. Editing and saving still work.'
let lspSessionCookies: Cookie[] | undefined

async function signIn(page: Page) {
	if (lspSessionCookies) {
		await page.context().addCookies(lspSessionCookies)
		await page.goto(notebook.editorUrl)
		return
	}
	await page.goto(notebook.editorUrl)
	const destination = new URL(notebook.editorUrl, page.url()).href
	await page.locator('#svelte-announcer').waitFor({ state: 'attached' })
	await page.getByLabel('Username', { exact: true }).fill(ADMIN.username)
	await page.getByLabel('Password', { exact: true }).fill(ADMIN.password)
	await page.getByRole('button', { name: 'Sign in', exact: true }).click()
	await expect(page).toHaveURL(destination)
	lspSessionCookies = await page.context().cookies()
}

async function pendingConnection(connections: LspConnection[], index: number) {
	await expect.poll(() => connections[index]?.initialize).toBeDefined()
	return connections[index]
}

async function navigateToEditor(page: Page, href: string, discardDraft = false) {
	// No UI link joins these editors; a native anchor exercises SvelteKit navigation.
	await page.evaluate((destination) => {
		document.getElementById('lsp-editor-navigation')?.remove()
		const link = document.createElement('a')
		link.id = 'lsp-editor-navigation'
		link.href = destination
		link.textContent = 'Open another editor'
		document.body.append(link)
	}, href)
	await page.getByRole('link', { name: 'Open another editor', exact: true }).click()
	if (discardDraft) await page.getByRole('button', { name: 'discard', exact: true }).click()
	await expect(page).toHaveURL(new URL(href, page.url()).href)
}

test('delayed language assistance opens the live draft and recovers without losing replacement history', async ({
	page,
	appServer
}) => {
	const connections = await routeLsp(page)
	const errors: string[] = []
	page.on('pageerror', (error) => errors.push(error.message))
	let saveRequests = 0
	page.on('request', (request) => {
		if (request.method() === 'POST' && new URL(request.url()).searchParams.has('/save')) {
			saveRequests++
		}
	})
	const file = path.join(appServer.directory, 'archive', notebook.file)
	const diskSource = await readFile(file, 'utf8')
	await signIn(page)
	const editor = page.getByRole('textbox')
	const source = page.locator('input[name="content"]')
	const notice = page.getByRole('status').filter({ hasText: unavailable })
	const first = await pendingConnection(connections, 0)
	expect(first.initialize?.params?.rootUri).toBe('luzzle-web:///archive')

	await editor.press('ControlOrMeta+End')
	await page.keyboard.insertText('\n\nDraft typed before initialize.\n')
	const draft = await source.inputValue()
	await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled()
	await expect(notice).toHaveCount(0)
	expect(first.document).toBeUndefined()
	first.acceptInitialize()
	await expect.poll(() => first.document?.text).toBe(draft)
	expect(first.document?.uri).toBe(notebookUri)
	expect(
		first.messages.find((message) => message.method === 'textDocument/didOpen')?.params
	).toMatchObject({ textDocument: { uri: notebookUri, languageId: 'markdown', text: draft } })

	await editor.press('Control+Space')
	await expect(page.getByRole('option', { name: /LSP fixture suggestion/ })).toBeVisible()
	expect(
		first.messages.find((message) => message.method === 'textDocument/completion')?.params
	).toMatchObject({ textDocument: { uri: notebookUri } })
	await editor.press('Escape')
	first.diagnose('Draft typed before initialize.', 'Check this unsaved observation')
	await editor.press('ControlOrMeta+Shift+M')
	await expect(page.getByRole('listbox', { name: 'Diagnostics', exact: true })).toContainText(
		'Check this unsaved observation'
	)
	await page.getByRole('button', { name: 'close', exact: true }).click()

	const beforeReplacement = await source.inputValue()
	const replacement = `${beforeReplacement}\nA full-buffer replacement kept only in memory.\n`
	const openedVersion = first.document!.version
	await editor.press('ControlOrMeta+a')
	await page.keyboard.insertText(replacement)
	await expect(source).toHaveValue(replacement)
	await expect.poll(() => first.document?.text).toBe(replacement)
	const change = first.messages.findLast((message) => message.method === 'textDocument/didChange')
	expect(change?.params).toMatchObject({
		textDocument: { uri: notebookUri },
		contentChanges: [{ text: replacement }]
	})
	expect(change?.params?.contentChanges?.[0].range).toBeUndefined()
	expect(first.document!.version).toBeGreaterThan(openedVersion)

	const staleMessage = 'Diagnostic from the interrupted connection'
	first.diagnose('A full-buffer replacement kept only in memory.', staleMessage)
	await editor.press('ControlOrMeta+Shift+M')
	const diagnostics = page.getByRole('listbox', { name: 'Diagnostics', exact: true })
	await expect(diagnostics).toContainText(staleMessage)
	await first.close()
	const recovered = await pendingConnection(connections, 1)
	await expect(source).toHaveValue(replacement)
	await expect(notice).toHaveCount(0)
	expect(recovered.document).toBeUndefined()
	await expect(diagnostics).not.toContainText(staleMessage)
	await page.getByRole('button', { name: 'close', exact: true }).click()
	recovered.acceptInitialize()
	await expect.poll(() => recovered.document?.text).toBe(replacement)
	expect(recovered.document?.uri).toBe(notebookUri)
	await editor.press('ControlOrMeta+z')
	await expect(source).toHaveValue(beforeReplacement)
	await expect.poll(() => recovered.document?.text).toBe(beforeReplacement)
	await editor.press('Control+Space')
	await expect(page.getByRole('option', { name: /LSP fixture suggestion/ })).toBeVisible()
	await editor.press('Escape')
	await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled()
	expect(saveRequests).toBe(0)
	expect(await readFile(file, 'utf8')).toBe(diskSource)
	expect(connections).toHaveLength(2)
	expect(errors).toEqual([])
})

test('exhausted assistance retries manually and pending editors close cleanly on navigation', async ({
	page
}) => {
	const connections = await routeLsp(page)
	const errors: string[] = []
	page.on('pageerror', (error) => errors.push(error.message))
	await signIn(page)
	const editor = page.getByRole('textbox')
	const source = page.locator('input[name="content"]')
	const notice = page.getByRole('status').filter({ hasText: unavailable })
	const first = await pendingConnection(connections, 0)
	first.rejectInitialize()
	const automatic = await pendingConnection(connections, 1)
	await expect(notice).toHaveCount(0)
	expect(first.document).toBeUndefined()
	automatic.rejectInitialize()
	await expect(notice).toBeVisible()
	await expect(notice.getByRole('button', { name: 'Retry', exact: true })).toBeVisible()
	await expect.poll(() => first.closed && automatic.closed).toBe(true)

	expect(connections).toHaveLength(2)
	await editor.press('ControlOrMeta+End')
	await page.keyboard.insertText('\n\nEditing still works without language assistance.\n')
	const offlineDraft = await source.inputValue()
	await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled()
	await notice.getByRole('button', { name: 'Retry', exact: true }).click()
	const manual = await pendingConnection(connections, 2)
	manual.acceptInitialize()
	await expect.poll(() => manual.document?.text).toBe(offlineDraft)
	expect(manual.document?.uri).toBe(notebookUri)
	await expect(notice).toHaveCount(0)
	await editor.press('Control+Space')
	await expect(page.getByRole('option', { name: /LSP fixture suggestion/ })).toBeVisible()
	await editor.press('Escape')

	await page.evaluate(() => {
		document.documentElement.dataset.lspNavigation = 'same-document'
	})
	await navigateToEditor(page, fieldGuide.editorUrl, true)
	const pending = await pendingConnection(connections, 3)
	await expect(source).toHaveValue(new RegExp(fieldGuide.title))
	await expect.poll(() => manual.closed).toBe(true)
	expect(pending.document).toBeUndefined()
	await expect(notice).toHaveCount(0)

	// Leave before initialize resolves. A real closed WebSocket cannot deliver a late reply.
	await navigateToEditor(page, notebook.editorUrl)
	const current = await pendingConnection(connections, 4)
	await expect.poll(() => pending.closed).toBe(true)
	current.acceptInitialize()
	await expect.poll(() => current.document?.uri).toBe(notebookUri)
	await expect(source).toHaveValue(current.document!.text)
	await expect(source).not.toHaveValue(/Editing still works without language assistance/)
	await expect(page.locator('html')).toHaveAttribute('data-lsp-navigation', 'same-document')
	await editor.press('Control+Space')
	await expect(page.getByRole('option', { name: /LSP fixture suggestion/ })).toBeVisible()
	expect(
		current.messages.find((message) => message.method === 'textDocument/completion')?.params
	).toMatchObject({ textDocument: { uri: notebookUri } })
	expect(pending.messages.some((message) => message.method === 'textDocument/didOpen')).toBe(false)
	expect(
		current.messages.some((message) => message.params?.textDocument?.uri === fieldGuideUri)
	).toBe(false)
	expect(connections).toHaveLength(5)
	expect(errors).toEqual([])
})
