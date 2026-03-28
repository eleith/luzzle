import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DiagnosticSeverity, CodeActionKind } from 'vscode-languageserver/node.js'

describe('markdownlint-lsp', () => {
	let lintErrorToDiagnostic, lintErrorToQuickFix, validateDocument, createServer, route

	beforeEach(async () => {
		vi.resetModules()
		const mod = await import('./markdownlint-lsp.js')
		lintErrorToDiagnostic = mod.lintErrorToDiagnostic
		lintErrorToQuickFix = mod.lintErrorToQuickFix
		validateDocument = mod.validateDocument
		createServer = mod.createServer
		route = mod.route
	})

	describe('route', () => {
		it('exports correct shape', () => {
			expect(route).toMatchObject({
				name: 'markdownlint-lsp',
				command: 'node',
			})
			expect(route.args[0]).toMatch(/markdownlint-lsp\.js$/)
		})
	})

	describe('lintErrorToDiagnostic', () => {
		it('converts error with errorRange (ignores lines)', () => {
			const error = {
				lineNumber: 5,
				ruleNames: ['MD013', 'line-length'],
				ruleDescription: 'Line length',
				errorRange: [10, 5],
				fixInfo: null,
			}
			const lines = ['', '', '', '', 'a]long line here for testing']

			const diag = lintErrorToDiagnostic(error, lines)

			expect(diag.range.start.line).toBe(4)
			expect(diag.range.start.character).toBe(9)
			expect(diag.range.end.line).toBe(4)
			expect(diag.range.end.character).toBe(14)
			expect(diag.severity).toBe(DiagnosticSeverity.Warning)
			expect(diag.source).toBe('markdownlint')
			expect(diag.code).toBe('MD013')
			expect(diag.message).toBe('line-length: Line length')
			expect(diag.data).toBeUndefined()
		})

		it('uses full line length when no errorRange', () => {
			const error = {
				lineNumber: 3,
				ruleNames: ['MD025', 'single-title'],
				ruleDescription: 'Multiple top-level headings',
				errorRange: null,
				fixInfo: null,
			}
			const lines = ['# First', '', '# Second heading']

			const diag = lintErrorToDiagnostic(error, lines)

			expect(diag.range.start.line).toBe(2)
			expect(diag.range.start.character).toBe(0)
			expect(diag.range.end.character).toBe(16)
		})

		it('falls back to 0 when line index is out of bounds', () => {
			const error = {
				lineNumber: 10,
				ruleNames: ['MD025', 'single-title'],
				ruleDescription: 'Multiple top-level headings',
				errorRange: null,
				fixInfo: null,
			}

			const diag = lintErrorToDiagnostic(error, ['only one line'])

			expect(diag.range.end.character).toBe(0)
		})

		it('falls back to 0 when lines not provided', () => {
			const error = {
				lineNumber: 1,
				ruleNames: ['MD025', 'single-title'],
				ruleDescription: 'Multiple top-level headings',
				errorRange: null,
				fixInfo: null,
			}

			const diag = lintErrorToDiagnostic(error, null)

			expect(diag.range.end.character).toBe(0)
		})

		it('attaches fixInfo to data when present', () => {
			const error = {
				lineNumber: 1,
				ruleNames: ['MD047', 'single-trailing-newline'],
				ruleDescription: 'Files should end with a single newline character',
				errorRange: [5, 1],
				fixInfo: { editColumn: 6, insertText: '\n' },
			}

			const diag = lintErrorToDiagnostic(error, null)

			expect(diag.data).toEqual({ editColumn: 6, insertText: '\n' })
		})
	})

	describe('lintErrorToQuickFix', () => {
		it('creates action with insertText only', () => {
			const error = {
				lineNumber: 8,
				ruleNames: ['MD047', 'single-trailing-newline'],
				ruleDescription: 'Files should end with a single newline character',
				fixInfo: { editColumn: 10, insertText: '\n' },
			}

			const action = lintErrorToQuickFix(error, 'file:///test.md', 1)

			expect(action.title).toBe('Fix MD047 (single-trailing-newline)')
			expect(action.kind).toBe(CodeActionKind.QuickFix)
			const edit = action.edit.documentChanges[0].edits[0]
			expect(edit.range.start.line).toBe(7)
			expect(edit.range.start.character).toBe(9)
			expect(edit.range.end.character).toBe(9)
			expect(edit.newText).toBe('\n')
		})

		it('creates action with deleteCount only', () => {
			const error = {
				lineNumber: 3,
				ruleNames: ['MD009', 'no-trailing-spaces'],
				ruleDescription: 'Trailing spaces',
				fixInfo: { editColumn: 5, deleteCount: 3 },
			}

			const action = lintErrorToQuickFix(error, 'file:///test.md', 2)

			const edit = action.edit.documentChanges[0].edits[0]
			expect(edit.range.start.character).toBe(4)
			expect(edit.range.end.character).toBe(7)
			expect(edit.newText).toBe('')
		})

		it('creates action with replace (deleteCount + insertText)', () => {
			const error = {
				lineNumber: 1,
				ruleNames: ['MD004', 'ul-style'],
				ruleDescription: 'Unordered list style',
				fixInfo: { editColumn: 1, deleteCount: 1, insertText: '-' },
			}

			const action = lintErrorToQuickFix(error, 'file:///test.md', 3)

			const edit = action.edit.documentChanges[0].edits[0]
			expect(edit.range.start.character).toBe(0)
			expect(edit.range.end.character).toBe(1)
			expect(edit.newText).toBe('-')
		})

		it('uses error lineNumber when fixInfo has no lineNumber', () => {
			const error = {
				lineNumber: 10,
				ruleNames: ['MD009', 'no-trailing-spaces'],
				ruleDescription: 'Trailing spaces',
				fixInfo: { editColumn: 1, deleteCount: 2 },
			}

			const action = lintErrorToQuickFix(error, 'file:///test.md', 1)

			const edit = action.edit.documentChanges[0].edits[0]
			expect(edit.range.start.line).toBe(9)
		})

		it('uses fixInfo lineNumber when provided', () => {
			const error = {
				lineNumber: 10,
				ruleNames: ['MD009', 'no-trailing-spaces'],
				ruleDescription: 'Trailing spaces',
				fixInfo: { lineNumber: 5, editColumn: 1, deleteCount: 2 },
			}

			const action = lintErrorToQuickFix(error, 'file:///test.md', 1)

			const edit = action.edit.documentChanges[0].edits[0]
			expect(edit.range.start.line).toBe(4)
		})

		it('defaults editColumn to 1 when not provided', () => {
			const error = {
				lineNumber: 1,
				ruleNames: ['MD047', 'single-trailing-newline'],
				ruleDescription: 'Files should end with a single newline character',
				fixInfo: { insertText: '\n' },
			}

			const action = lintErrorToQuickFix(error, 'file:///test.md', 1)

			const edit = action.edit.documentChanges[0].edits[0]
			expect(edit.range.start.character).toBe(0)
		})
	})

	describe('validateDocument', () => {
		it('sends diagnostics for lint errors', async () => {
			const mockConnection = { sendDiagnostics: vi.fn() }
			const { TextDocument } = await import('vscode-languageserver-textdocument')
			const doc = TextDocument.create('file:///test.md', 'markdown', 1, '# Hello\n\n# World\n')

			await validateDocument(doc, mockConnection, null)

			expect(mockConnection.sendDiagnostics).toHaveBeenCalledOnce()
			const call = mockConnection.sendDiagnostics.mock.calls[0][0]
			expect(call.uri).toBe('file:///test.md')
			expect(call.version).toBe(1)
			expect(call.diagnostics.length).toBeGreaterThan(0)
			expect(call.diagnostics[0].source).toBe('markdownlint')
		})

		it('sends empty diagnostics for clean document', async () => {
			const mockConnection = { sendDiagnostics: vi.fn() }
			const { TextDocument } = await import('vscode-languageserver-textdocument')
			const doc = TextDocument.create('file:///test.md', 'markdown', 1, '# Hello\n\nSome text.\n')

			await validateDocument(doc, mockConnection, null)

			const call = mockConnection.sendDiagnostics.mock.calls[0][0]
			expect(call.diagnostics).toEqual([])
		})

		it('sends empty diagnostics when uri not in results', async () => {
			vi.resetModules()

			vi.doMock('markdownlint/promise', () => ({
				lint: vi.fn().mockResolvedValue({}),
			}))

			const mod = await import('./markdownlint-lsp.js')
			const mockConnection = { sendDiagnostics: vi.fn() }
			const { TextDocument } = await import('vscode-languageserver-textdocument')
			const doc = TextDocument.create('file:///test.md', 'markdown', 1, '# Hello\n')

			await mod.validateDocument(doc, mockConnection, null)

			const call = mockConnection.sendDiagnostics.mock.calls[0][0]
			expect(call.diagnostics).toEqual([])
		})

		it('sends empty diagnostics on lint error', async () => {
			vi.resetModules()

			vi.doMock('markdownlint/promise', () => ({
				lint: vi.fn().mockRejectedValue(new Error('lint failed')),
			}))

			const mod = await import('./markdownlint-lsp.js')
			const mockConnection = { sendDiagnostics: vi.fn() }
			const { TextDocument } = await import('vscode-languageserver-textdocument')
			const doc = TextDocument.create('file:///test.md', 'markdown', 1, '# Hello\n')

			await mod.validateDocument(doc, mockConnection, null)

			const call = mockConnection.sendDiagnostics.mock.calls[0][0]
			expect(call.diagnostics).toEqual([])
		})

		it('passes config to markdownlint when provided', async () => {
			// Re-import fresh module after the previous test's doMock
			vi.resetModules()
			const freshMod = await import('./markdownlint-lsp.js')

			const mockConnection = { sendDiagnostics: vi.fn() }
			const { TextDocument } = await import('vscode-languageserver-textdocument')
			const doc = TextDocument.create(
				'file:///test.md',
				'markdown',
				1,
				'# Hello\n\n# World\n'
			)

			await freshMod.validateDocument(doc, mockConnection, { MD025: false })

			const call = mockConnection.sendDiagnostics.mock.calls[0][0]
			const md025 = call.diagnostics.find((d) => d.code === 'MD025')
			expect(md025).toBeUndefined()
		})
	})

	describe('loadConfig', () => {
		it('returns parsed config when file exists', async () => {
			vi.resetModules()
			vi.doMock('fs/promises', () => ({
				readFile: vi.fn().mockResolvedValue('{"MD013": false}'),
			}))

			const mod = await import('./markdownlint-lsp.js')
			const config = await mod.loadConfig('/tmp/archive')

			expect(config).toEqual({ MD013: false })
		})

		it('returns null when file does not exist', async () => {
			vi.resetModules()
			vi.doUnmock('fs/promises')
			const mod = await import('./markdownlint-lsp.js')

			const config = await mod.loadConfig('/tmp/nonexistent')

			expect(config).toBeNull()
		})

		it('returns null for invalid JSON', async () => {
			vi.resetModules()
			vi.doMock('fs/promises', () => ({
				readFile: vi.fn().mockResolvedValue('not json'),
			}))

			const mod = await import('./markdownlint-lsp.js')
			const config = await mod.loadConfig('/tmp/archive')

			expect(config).toBeNull()
		})
	})

	describe('createServer', () => {
		function mockConnection() {
			const handlers = {}
			return {
				onInitialize: vi.fn((h) => (handlers.initialize = h)),
				onDidOpenTextDocument: vi.fn((h) => (handlers.didOpen = h)),
				onDidChangeTextDocument: vi.fn((h) => (handlers.didChange = h)),
				onDidCloseTextDocument: vi.fn((h) => (handlers.didClose = h)),
				onCodeAction: vi.fn((h) => (handlers.codeAction = h)),
				sendDiagnostics: vi.fn(),
				listen: vi.fn(),
				_handlers: handlers,
			}
		}

		it('registers all handlers', () => {
			const conn = mockConnection()
			createServer(() => conn)

			expect(conn.onInitialize).toHaveBeenCalledOnce()
			expect(conn.onDidOpenTextDocument).toHaveBeenCalledOnce()
			expect(conn.onDidChangeTextDocument).toHaveBeenCalledOnce()
			expect(conn.onDidCloseTextDocument).toHaveBeenCalledOnce()
			expect(conn.onCodeAction).toHaveBeenCalledOnce()
		})

		it('returns correct capabilities on initialize', () => {
			const conn = mockConnection()
			createServer(() => conn)

			const result = conn._handlers.initialize({
				workspaceFolders: [{ uri: 'file:///app/archive', name: 'archive' }],
			})

			expect(result.capabilities.textDocumentSync).toBe(1)
			expect(result.capabilities.codeActionProvider.codeActionKinds).toContain(
				CodeActionKind.QuickFix
			)
			expect(result.capabilities.codeActionProvider.codeActionKinds).toContain(
				CodeActionKind.SourceFixAll
			)
		})

		it('falls back to rootUri when workspaceFolders absent', () => {
			const conn = mockConnection()
			createServer(() => conn)

			const result = conn._handlers.initialize({ rootUri: 'file:///app/archive' })

			expect(result.capabilities.textDocumentSync).toBe(1)
		})

		it('handles initialize without rootUri or workspaceFolders', () => {
			const conn = mockConnection()
			createServer(() => conn)

			const result = conn._handlers.initialize({})

			expect(result.capabilities.textDocumentSync).toBe(1)
		})

		it('handles initialize with non-file rootUri', () => {
			const conn = mockConnection()
			createServer(() => conn)

			const result = conn._handlers.initialize({ rootUri: '/some/path' })

			expect(result.capabilities.textDocumentSync).toBe(1)
		})

		it('tracks documents on didOpen and validates', async () => {
			const conn = mockConnection()
			const { documents } = createServer(() => conn)

			conn._handlers.didOpen({
				textDocument: {
					uri: 'file:///test.md',
					languageId: 'markdown',
					version: 1,
					text: '# Hello\n',
				},
			})

			expect(documents.has('file:///test.md')).toBe(true)
			// Wait for async validation
			await vi.waitFor(() => expect(conn.sendDiagnostics).toHaveBeenCalled())
		})

		it('updates documents on didChange and validates', async () => {
			const conn = mockConnection()
			const { documents } = createServer(() => conn)

			conn._handlers.didOpen({
				textDocument: {
					uri: 'file:///test.md',
					languageId: 'markdown',
					version: 1,
					text: '# Hello\n',
				},
			})

			await vi.waitFor(() => expect(conn.sendDiagnostics).toHaveBeenCalled())

			conn._handlers.didChange({
				textDocument: { uri: 'file:///test.md', version: 2 },
				contentChanges: [{ text: '# Updated\n' }],
			})

			expect(documents.get('file:///test.md').version).toBe(2)
			await vi.waitFor(() => expect(conn.sendDiagnostics).toHaveBeenCalledTimes(2))
		})

		it('ignores didChange for unknown documents', () => {
			const conn = mockConnection()
			createServer(() => conn)

			conn._handlers.didChange({
				textDocument: { uri: 'file:///unknown.md', version: 1 },
				contentChanges: [{ text: 'hello' }],
			})

			expect(conn.sendDiagnostics).not.toHaveBeenCalled()
		})

		it('clears diagnostics on didClose', () => {
			const conn = mockConnection()
			const { documents } = createServer(() => conn)

			conn._handlers.didOpen({
				textDocument: {
					uri: 'file:///test.md',
					languageId: 'markdown',
					version: 1,
					text: '# Hello\n',
				},
			})

			conn._handlers.didClose({
				textDocument: { uri: 'file:///test.md' },
			})

			expect(documents.has('file:///test.md')).toBe(false)
			expect(conn.sendDiagnostics).toHaveBeenCalledWith({
				uri: 'file:///test.md',
				diagnostics: [],
			})
		})

		it('returns empty actions for unknown document', () => {
			const conn = mockConnection()
			createServer(() => conn)

			const result = conn._handlers.codeAction({
				textDocument: { uri: 'file:///unknown.md' },
				context: { diagnostics: [] },
			})

			expect(result).toEqual([])
		})

		it('returns QuickFix actions for fixable diagnostics', () => {
			const conn = mockConnection()
			createServer(() => conn)

			conn._handlers.didOpen({
				textDocument: {
					uri: 'file:///test.md',
					languageId: 'markdown',
					version: 1,
					text: '# Hello  \n',
				},
			})

			const result = conn._handlers.codeAction({
				textDocument: { uri: 'file:///test.md' },
				context: {
					diagnostics: [
						{
							range: { start: { line: 0, character: 7 }, end: { line: 0, character: 9 } },
							source: 'markdownlint',
							code: 'MD009',
							message: 'no-trailing-spaces: Trailing spaces',
							data: { editColumn: 8, deleteCount: 2 },
						},
					],
				},
			})

			expect(result.length).toBe(1)
			expect(result[0].kind).toBe(CodeActionKind.QuickFix)
			expect(result[0].title).toContain('MD009')
		})

		it('returns FixAll action when 2+ fixable diagnostics', () => {
			const conn = mockConnection()
			createServer(() => conn)

			conn._handlers.didOpen({
				textDocument: {
					uri: 'file:///test.md',
					languageId: 'markdown',
					version: 1,
					text: '# Hello  \nworld  \n',
				},
			})

			const result = conn._handlers.codeAction({
				textDocument: { uri: 'file:///test.md' },
				context: {
					diagnostics: [
						{
							range: { start: { line: 0, character: 7 }, end: { line: 0, character: 9 } },
							source: 'markdownlint',
							code: 'MD009',
							message: 'no-trailing-spaces: Trailing spaces',
							data: { editColumn: 8, deleteCount: 2 },
						},
						{
							range: { start: { line: 1, character: 5 }, end: { line: 1, character: 7 } },
							source: 'markdownlint',
							code: 'MD009',
							message: 'no-trailing-spaces: Trailing spaces',
							data: { editColumn: 6, deleteCount: 2 },
						},
					],
				},
			})

			const fixAll = result.find((a) => a.kind === CodeActionKind.SourceFixAll)
			expect(fixAll).toBeDefined()
			expect(fixAll.title).toBe('Fix all markdownlint issues')
		})

		it('skips non-markdownlint diagnostics in code actions', () => {
			const conn = mockConnection()
			createServer(() => conn)

			conn._handlers.didOpen({
				textDocument: {
					uri: 'file:///test.md',
					languageId: 'markdown',
					version: 1,
					text: '# Hello\n',
				},
			})

			const result = conn._handlers.codeAction({
				textDocument: { uri: 'file:///test.md' },
				context: {
					diagnostics: [
						{
							range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
							source: 'yaml',
							code: 'something',
							message: 'some yaml error',
						},
					],
				},
			})

			expect(result).toEqual([])
		})

		it('skips diagnostics without fixInfo data', () => {
			const conn = mockConnection()
			createServer(() => conn)

			conn._handlers.didOpen({
				textDocument: {
					uri: 'file:///test.md',
					languageId: 'markdown',
					version: 1,
					text: '# Hello\n',
				},
			})

			const result = conn._handlers.codeAction({
				textDocument: { uri: 'file:///test.md' },
				context: {
					diagnostics: [
						{
							range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
							source: 'markdownlint',
							code: 'MD025',
							message: 'single-title: Multiple top-level headings',
							data: undefined,
						},
					],
				},
			})

			expect(result).toEqual([])
		})
	})
})
