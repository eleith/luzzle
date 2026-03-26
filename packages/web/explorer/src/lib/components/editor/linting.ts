import { linter, type Diagnostic } from '@codemirror/lint'
import { parseDocument } from 'yaml'
import type { EditorView } from 'codemirror'
import type { ValidationResponse } from '$lib/types/validation'
import { getFrontmatterInfo } from './utils'

export function createFrontmatterLinter(type: string) {
	return linter(
		async (view: EditorView) => {
			const info = getFrontmatterInfo(view.state)
			if (!info.exists) return []

			const yamlDoc = parseDocument(info.content)
			const diagnostics: Diagnostic[] = []

			// Skip YAML syntax errors — the LSP handles frontmatter diagnostics
			if (yamlDoc.errors.length > 0) {
				return diagnostics
			}

			const data = yamlDoc.toJSON()
			const validData = data || {}

			// Extract body content: Everything after the Frontmatter node
			let bodyStartPos = info.to
			const doc = view.state.doc
			const docString = doc.toString()

			// Skip optional newline immediately after frontmatter
			if (docString[bodyStartPos] === '\n') {
				bodyStartPos += 1
			}
			const bodyContent = docString.slice(bodyStartPos)

			try {
				const response = await fetch('/api/editor/validate', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ type, data: validData, markdown: bodyContent })
				})

				if (!response.ok) {
					return []
				}

				const result: ValidationResponse = await response.json()

				if (!result.valid && result.errors) {
					for (const err of result.errors) {
						// Frontmatter diagnostics are handled by the LSP
						if (err.source === 'markdown' && err.line) {
							const startLineNumber = doc.lineAt(bodyStartPos).number
							const targetLineNumber = startLineNumber + err.line - 1

							if (targetLineNumber <= doc.lines) {
								const line = doc.line(targetLineNumber)
								diagnostics.push({
									from: line.from,
									to: line.to,
									severity: 'warning',
									message: err.message,
									source: 'markdown'
								})
							}
						}
					}
				}
			} catch (error) {
				console.error('Error validation:', error)
			}

			return diagnostics
		},
		{
			delay: 500
		}
	)
}
