import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { createPieceHelpers } from '@luzzle/web.pieces';

let server;
let render;
let createRawSnippet;

before(async () => {
	server = await createServer({
		configFile: false,
		root: fileURLToPath(new URL('../', import.meta.url)),
		cacheDir: fileURLToPath(new URL('../node_modules/.cache/rendering', import.meta.url)),
		server: { middlewareMode: true, hmr: false },
		optimizeDeps: { noDiscovery: true },
		plugins: [svelte({ configFile: false })]
	});
	({ render } = await server.ssrLoadModule('svelte/server'));
	({ createRawSnippet } = await server.ssrLoadModule('svelte'));
});

after(async () => {
	await server?.close();
});

function piece() {
	return {
		id: 'record',
		key: 'record',
		type: 'inventory',
		slug: 'record',
		title: 'Mapped <Record>&',
		summary: '<Description>&',
		note: 'Source note',
		date_added: 1,
		keywords: '[]',
		metadata: {
			image: 'cover',
			poster: 'cover',
			url: 'https://unmapped.example',
			people: ['Unmapped person']
		},
		assets: [
			{
				asset_key: 'cover',
				transformation: 'image.original',
				asset_path: 'cover.jpg',
				mime_type: 'image/jpeg'
			},
			{
				asset_key: 'record',
				transformation: 'markdown',
				content: '<p>Rendered <strong>note</strong></p>',
				mime_type: 'text/html'
			}
		]
	};
}

function helpers(current) {
	return createPieceHelpers(
		current.assets,
		(path) => `/assets/${path}`,
		() => 'https://garden.example/pieces/inventory/record'
	);
}

async function html(path, props) {
	const { default: Template } = await server.ssrLoadModule(
		fileURLToPath(new URL(path, import.meta.url))
	);
	return (await render(Template, { props })).body;
}

test('default page renders normalized content and injected navigation, not raw metadata', async () => {
	const current = piece();
	const navigation = [];
	const body = await html('./pages/default/template.svelte', {
		piece: current,
		fields: { people: [{ name: 'Grace <Hopper>' }], category: 'A <category>' },
		tags: [{ slug: 'a tag', tag: 'READING<&' }],
		helpers: {
			...helpers(current),
			navBar: createRawSnippet((options) => ({
				render: () => {
					navigation.push(options());
					return '<nav aria-label="Template navigation"></nav>';
				}
			}))
		}
	});

	assert.ok(body.includes('Mapped &lt;Record>&amp;'));
	assert.ok(body.includes('&lt;Description>&amp;'));
	assert.ok(body.includes('Grace &lt;Hopper>'));
	assert.ok(body.includes('A &lt;category>'));
	assert.ok(body.includes('<p>Rendered <strong>note</strong></p>'));
	assert.ok(body.includes('href="/tags/a%20tag"'));
	assert.ok(body.includes('#reading&lt;&amp;'));
	assert.ok(body.includes('aria-label="Template navigation"'));
	assert.equal(navigation.length, 1);
	assert.equal(navigation[0].showRandom, true);
	assert.ok(!body.includes('Unmapped person'));
	assert.ok(!body.includes('unmapped.example'));
	assert.ok(!body.includes('<img'));
});

test('recipe instructions escape explicit text while preserving authored HTML', async () => {
	const current = piece();
	const body = await html('./pages/recipe/template.svelte', {
		piece: current,
		fields: {
			ingredients: [{ item: 'Flour', quantity: '1/2', unit: 'cup' }],
			instructions: [{ text: '<em>plain</em>' }, { html: '<strong>rich</strong>' }]
		},
		tags: [],
		helpers: {
			...helpers(current),
			navBar: createRawSnippet(() => ({ render: () => '<nav></nav>' }))
		}
	});

	assert.ok(body.includes('Flour'));
	assert.ok(body.includes('1/2'));
	assert.ok(body.includes('&lt;em>plain&lt;/em>'));
	assert.ok(!body.includes('<em>plain</em>'));
	assert.ok(body.includes('<strong>rich</strong>'));
});

test('default icon uses supplied image fields and keeps its title without an available image', async () => {
	const current = piece();
	const props = { piece: current, helpers: helpers(current), size: { width: 125 } };
	const mapped = await html('./icons/default/template.svelte', {
		...props,
		fields: { image: 'cover' }
	});
	assert.ok(mapped.includes('src="/assets/cover.jpg"'));

	const unmapped = await html('./icons/default/template.svelte', { ...props, fields: {} });
	assert.ok(unmapped.includes('Mapped &lt;Record>&amp;'));
	assert.ok(!unmapped.includes('<img'));

	const missing = await html('./icons/default/template.svelte', {
		...props,
		fields: { image: 'missing' }
	});
	assert.ok(missing.includes('Mapped &lt;Record>&amp;'));
	assert.ok(!missing.includes('<img'));
});
