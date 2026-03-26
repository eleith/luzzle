#! /usr/bin/env node

import { spawn } from 'child_process'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
	StreamMessageReader,
	StreamMessageWriter,
	Message,
	NotificationMessage,
} from 'vscode-jsonrpc/node.js'
import { discoverSchemas } from './schemas.js'
import { debug, error } from './log.js'
import {
	createContext,
	handleInitialize,
	handleDidOpen,
	handleDidChange,
	handleInitializeResponse,
	buildConfigurationResponse,
} from './handlers.js'

function getVersion(): string {
	try {
		const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json')
		const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>
		return (pkg['version'] as string) ?? 'unknown'
	} catch {
		return 'unknown'
	}
}

function printUsage(): void {
	const version = getVersion()
	process.stdout.write(`luzzle-lsp ${version}\n`)
	process.stdout.write('LSP proxy for YAML frontmatter validation in Luzzle markdown files\n\n')
	process.stdout.write('Usage: luzzle-lsp --stdio\n\n')
	process.stdout.write('Options:\n')
	process.stdout.write('  --stdio     Use stdin/stdout for LSP communication\n')
	process.stdout.write('  --version   Print version and exit\n')
	process.stdout.write('  --help      Print this help and exit\n\n')
	process.stdout.write('Environment:\n')
	process.stdout.write('  LUZZLE_LSP_ROOT      Override rootUri for schema discovery (e.g. /app/archive)\n')
	process.stdout.write('  LUZZLE_LSP_DEBUG=1   Enable debug logging to stderr\n')
}

function parseArgs(args: string[]): 'stdio' | 'version' | 'help' | 'error' {
	if (args.includes('--version') || args.includes('-v')) return 'version'
	if (args.includes('--help') || args.includes('-h')) return 'help'
	if (args.includes('--stdio')) return 'stdio'
	if (args.length === 0) return 'stdio'
	return 'error'
}

function main(): void {
	const args = process.argv.slice(2)
	const mode = parseArgs(args)

	if (mode === 'version') {
		process.stdout.write(`${getVersion()}\n`)
		process.exit(0)
	}

	if (mode === 'help') {
		printUsage()
		process.exit(0)
	}

	if (mode === 'error') {
		process.stderr.write(`Unknown arguments: ${args.join(' ')}\n\n`)
		printUsage()
		process.exit(1)
	}

	const ctx = createContext()

	const child = spawn('yaml-language-server', ['--stdio'], {
		stdio: ['pipe', 'pipe', 'inherit'],
	})

	child.on('error', (err) => {
		error(`failed to start yaml-language-server: ${err.message}`)
		process.exit(1)
	})

	const clientReader = new StreamMessageReader(process.stdin)
	const clientWriter = new StreamMessageWriter(process.stdout)
	const serverReader = new StreamMessageReader(child.stdout!)
	const serverWriter = new StreamMessageWriter(child.stdin!)

	clientReader.listen((msg: Message) => {
		if (Message.isRequest(msg)) {
			if (msg.method === 'initialize') {
				debug('intercepting initialize request')
				serverWriter.write(handleInitialize(msg, ctx, discoverSchemas))
			} else {
				serverWriter.write(msg)
			}
		} else if (Message.isNotification(msg)) {
			switch (msg.method) {
				case 'textDocument/didOpen':
					serverWriter.write(handleDidOpen(msg))
					break
				case 'textDocument/didChange':
					serverWriter.write(handleDidChange(msg))
					break
				default:
					serverWriter.write(msg)
					break
			}
		} else {
			serverWriter.write(msg)
		}
	})

	serverReader.listen((msg: Message) => {
		if (Message.isRequest(msg)) {
			if (msg.method === 'workspace/configuration') {
				debug('intercepting workspace/configuration request')
				const response = buildConfigurationResponse(msg, ctx)
				serverWriter.write(response)
			} else {
				clientWriter.write(msg)
			}
		} else if (Message.isResponse(msg)) {
			if (msg.id === ctx.initializeRequestId) {
				debug('intercepting initialize response, forcing full document sync')
				ctx.initializeRequestId = null
				clientWriter.write(handleInitializeResponse(msg))
			} else {
				clientWriter.write(msg)
			}
		} else {
			clientWriter.write(msg)
		}
	})

	const notifyClientError = (reason: string) => {
		error(reason)
		try {
			const notification: NotificationMessage = {
				jsonrpc: '2.0',
				method: 'window/showMessage',
				params: { type: 1, message: `[luzzle-lsp] ${reason}` },
			}
			clientWriter.write(notification)
		} catch {
			// Client may already be disconnected
		}
	}

	serverReader.onError((err) => {
		notifyClientError(`yaml-language-server stream error: ${err.message}`)
		child.kill()
		cleanup()
		process.exit(1)
	})

	serverReader.onClose(() => {
		debug('yaml-language-server stream closed')
	})

	const cleanup = () => { }

	child.on('exit', (code, signal) => {
		if (signal) {
			debug(`yaml-language-server killed by signal ${signal}`)
		} else if (code !== 0) {
			notifyClientError(`yaml-language-server exited with code ${code}`)
		}
		cleanup()
		process.exit(code ?? 1)
	})

	process.on('SIGTERM', () => {
		child.kill()
		cleanup()
	})

	process.on('SIGINT', () => {
		child.kill()
		cleanup()
	})

	clientReader.onClose(() => {
		child.kill()
		cleanup()
	})

	debug('proxy started')
}

main()
