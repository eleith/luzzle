import { fork } from 'node:child_process'
import { once } from 'node:events'
import { access, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { test as base } from '@playwright/test'

export { expect } from '@playwright/test'

type AppServer = { origin: string; output: () => string }

export const test = base.extend<{ serverLogs: void }, { appServer: AppServer }>({
	appServer: [
		// Playwright requires destructuring even without fixture dependencies.
		// eslint-disable-next-line no-empty-pattern
		async ({}, use) => {
			await access(new URL('../../build/handler.js', import.meta.url))
			const cache = fileURLToPath(new URL('../../node_modules/.cache/', import.meta.url))
			await mkdir(cache, { recursive: true })
			const directory = await mkdtemp(`${cache}e2e-`)
			const child = fork(new URL('../server.ts', import.meta.url), [], {
				cwd: directory,
				env: { PATH: process.env.PATH, NODE_ENV: 'production', TZ: 'UTC' },
				execArgv: [],
				stdio: ['ignore', 'pipe', 'pipe', 'ipc']
			})
			let output = ''
			child.stdout!.on('data', (chunk) => (output = (output + chunk).slice(-50000)))
			child.stderr!.on('data', (chunk) => (output = (output + chunk).slice(-50000)))
			try {
				const origin = await new Promise<string>((resolve, reject) => {
					const timeout = setTimeout(() => reject(new Error('E2E server startup timed out')), 30000)
					child.once('message', (message: { origin: string }) => {
						clearTimeout(timeout)
						resolve(message.origin)
					})
					child.once('error', (error) => {
						clearTimeout(timeout)
						reject(error)
					})
					child.once('exit', (code, signal) => {
						clearTimeout(timeout)
						reject(new Error(`E2E server exited (${code ?? signal})`))
					})
				})
				await use({ origin, output: () => output })
			} catch (error) {
				console.error(output)
				throw error
			} finally {
				if (child.exitCode === null && child.signalCode === null) {
					const exited = once(child, 'exit')
					child.kill('SIGTERM')
					const kill = setTimeout(() => child.kill('SIGKILL'), 6000)
					try {
						await exited
					} finally {
						clearTimeout(kill)
					}
				}
				await rm(directory, { recursive: true, force: true })
			}
		},
		{ scope: 'worker', timeout: 60000 }
	],
	baseURL: async ({ appServer }, use) => {
		await use(appServer.origin)
	},
	serverLogs: [
		async ({ appServer }, use, testInfo) => {
			await use()
			if (testInfo.status !== testInfo.expectedStatus) {
				await testInfo.attach('server.log', { body: appServer.output(), contentType: 'text/plain' })
			}
		},
		{ auto: true }
	]
})
