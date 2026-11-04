import { readFileSync } from 'node:fs'
import { parse } from 'yaml'
import { expect, test } from 'vitest'

// Deployment-contract coverage, not a running-container smoke test.
test.each([
	['../docker-compose.yml', './demo/assets'],
	['../../../docs/web/docker-compose.yml', './assets']
])('%s shares preview storage between worker and web', (file, assets) => {
	const { services } = parse(readFileSync(new URL(file, import.meta.url), 'utf8'))
	expect(services['luzzle-worker'].volumes).toContain(`${assets}:/app/assets`)
	expect(services['luzzle-web'].volumes).toContain(`${assets}/previews:/app/assets/previews:ro`)
	expect(services['luzzle-web'].volumes).toContain(`${assets}/pieces:/app/assets/pieces`)
})
