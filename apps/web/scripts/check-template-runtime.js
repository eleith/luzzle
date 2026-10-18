import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build, createServer, resolveConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { render } from '@luzzle/web.templates/runtime/server'
import { getContext } from '@luzzle/web.templates/runtime/svelte'
import { renderTemplate, components } from '@luzzle/web.templates'
import {
	prepareFixtures,
	checkPreparedFixtures
} from '../../../packages/web/templates/test/support/index.js'

const web = fileURLToPath(new URL('..', import.meta.url))
const fixture = fileURLToPath(new URL('./fixtures/templates-runtime.js', import.meta.url))
const cache = path.join(web, 'node_modules/.cache')
const originalDirectory = process.cwd()

async function checkBridge(bridge, directory) {
	// Equality matters: successful imports alone cannot detect another SSR graph.
	assert.equal(bridge.render, render)
	assert.equal(bridge.getContext, getContext)
	assert.notEqual(bridge.applicationGetContext, getContext)
	assert.equal(bridge.renderTemplate, renderTemplate)
	assert.equal(bridge.components, components)
	const result = await checkPreparedFixtures({ directory, ...bridge })
	const html = bridge.renderHost(result.body)
	assert.ok(html.includes('data-template-host'))
	assert.ok(html.includes('application runtime'))
	assert.ok(html.includes(result.body))
}

await mkdir(cache, { recursive: true })
const output = await mkdtemp(path.join(cache, 'template-runtime-'))
let server
try {
	// The real application config resolves config.yaml relative to its cwd.
	process.chdir(web)
	const prepared = await prepareFixtures(path.join(output, 'prepared/revision'))
	server = await createServer({
		configFile: path.join(web, 'vite.config.ts'),
		server: { middlewareMode: true, hmr: false, watch: null },
		logLevel: 'error'
	})
	await checkBridge(await server.ssrLoadModule(fixture), prepared.directory)

	const production = await resolveConfig(
		{ configFile: path.join(web, 'vite.config.ts'), logLevel: 'error' },
		'build'
	)
	const { default: svelteConfig } = await import(
		pathToFileURL(path.join(web, 'svelte.config.js')).href
	)
	assert.ok(production.ssr.external.includes('@luzzle/web.templates'))
	// Standalone Vite SSR bridge, using the app's production policy/compiler options.
	// This does not replace an end-to-end SvelteKit adapter/server smoke.
	await build({
		root: web,
		configFile: false,
		plugins: [
			svelte({ configFile: false, hot: false, compilerOptions: svelteConfig.compilerOptions })
		],
		ssr: production.ssr,
		logLevel: 'error',
		build: {
			ssr: fixture,
			outDir: path.join(output, 'server'),
			emptyOutDir: true,
			rollupOptions: { output: { entryFileNames: 'bridge.mjs' } }
		}
	})
	await checkBridge(
		await import(pathToFileURL(path.join(output, 'server/bridge.mjs')).href),
		prepared.directory
	)
	console.log(
		'PASS: native, Vite dev, and built SSR share the prepared runtime; application SSR stays separate.'
	)
} finally {
	await server?.close()
	process.chdir(originalDirectory)
	await rm(output, { recursive: true, force: true })
}
