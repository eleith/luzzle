import { expect, test } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { compileTemplateBundle, type TemplateSource } from './compile.js'
import type { TemplateLookup } from './types.js'

const exec = promisify(execFile)
const page: TemplateSource = {
	filename: 'icon-page.svelte',
	source: `<svelte:options css="injected" />
<script>
	import { getContext, setContext } from 'svelte';
	let { data, helpers, components } = $props();
	function setup() {
		setContext('page-label', data.label);
		data.capture?.(getContext);
	}
	setup();
</script>
<svelte:head>
	<title>Page {data.label}</title>
	<meta name="page-label" content={data.label} />
	{@html '<style data-manual>.manual { color: red }</style>'}
</svelte:head>
<main class="page">
	{#each data.icons as input}<components.PieceIcon {...input} />{/each}
	<p>page-local:{String(getContext('icon-local'))}</p>
	<p>navigation:{String(helpers.showNavBanner())}</p>
</main>
<style>.page { color: var(--fixture-page); }</style>`,
}
const feed: TemplateSource = {
	filename: 'icon-feed.svelte',
	source: `<script>
	let { data, helpers, components } = $props();
</script>
<section data-helpers={Object.keys(helpers).sort().join(',')}>
	{#each data.pieces as piece}<components.PieceIcon {piece} size={{ width: 200 }} />{/each}
</section>`,
}

async function runArtifact(
	templates: Record<string, TemplateSource>,
	lookup: TemplateLookup,
	assertions: string
) {
	const compiled = await compileTemplateBundle(templates, lookup)
	expect(compiled.warnings).toEqual([])
	const cache = fileURLToPath(new URL('../../node_modules/.cache/', import.meta.url))
	await mkdir(cache, { recursive: true })
	const directory = await mkdtemp(path.join(cache, 'icon-'))
	try {
		const modulePath = path.join(directory, 'renderer.mjs')
		await writeFile(modulePath, compiled.moduleCode)
		// Native Node must not resolve Svelte or any other workspace dependency at runtime.
		await exec(process.execPath, [
			'--input-type=module',
			'-e',
			`
import assert from 'node:assert/strict';
import { isBuiltin, registerHooks } from 'node:module';
const moduleUrl = process.argv[1];
registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier !== moduleUrl && !isBuiltin(specifier)) {
			throw new Error('Artifact has an external dependency: ' + specifier);
		}
		return nextResolve(specifier, context);
	}
});
const bundle = await import(moduleUrl);
assert.deepEqual(Object.keys(bundle).sort(), ['render', 'templateLookup']);
const calls = [];
const base = {
	forPiece: piece => ({ getImageUrl: (key, width, format) => {
		calls.push({ type: piece.type, key, width, format });
		return '/asset/' + piece.type + '/' + width + '.' + format;
	} }),
	getStaticAssetUrl: name => '/static/' + name,
};
const helpers = { ...base, showNavBanner: () => true };
const piece = (type, title = 'Title', metadata = {}) => ({ type, title, metadata });
const input = (piece, size = { width: 100 }, extra = {}) => ({ piece, size, ...extra });
const render = (icons, label = 'Root', capture) => bundle.render('page', { data: { icons, label, capture }, helpers });
${assertions}
`,
			pathToFileURL(modulePath).href,
		])
	} finally {
		await rm(directory, { recursive: true, force: true })
	}
}

test('native site icons use the default with escaped output, sizing, and isolated SSR styles', async () => {
	await runArtifact(
		{ page },
		{ site: { root: 'page' } },
		String.raw`
const getters = [];
const first = render([
	input(piece('books', '<Default>&"', { cover: 'cover-key', image: 'ignored', poster: 'ignored' })),
	input(piece('arbitrary-kind', 'Image', { image: 'image-key' }), { width: 60, height: 42 }, { lazy: true, active: true }),
	input(piece('__proto__', 'Poster', { poster: 'poster-key' }), { width: 80 }),
	input(piece('notes', 'No image')),
], '<Root>&"', getter => getters.push(getter));
assert.deepEqual(bundle.templateLookup, { site: { root: 'page' } });
assert.deepEqual(Object.keys(first).sort(), ['body', 'head']);
assert.throws(() => getters[0]('page-label'), /lifecycle_outside_component/);
assert.match(first.body, /page-local:undefined/);
assert.match(first.body, /navigation:true/);
assert.match(first.body, /&lt;Default>&amp;"/);
assert.doesNotMatch(first.body, /<Default>/);
assert.equal((first.body.match(/class="default-icon svelte-/g) ?? []).length, 4);
assert.match(first.body, /class="default-icon svelte-[^"]+ active"/);
assert.match(first.body, /--piece-icon-width: 100px;/);
assert.match(first.body, /--piece-icon-height: 150px;/);
assert.match(first.body, /--piece-icon-width: 60px;/);
assert.match(first.body, /--piece-icon-height: 42px;/);
assert.match(first.body, /--piece-icon-width: 80px;/);
assert.match(first.body, /--piece-icon-height: 120px;/);
assert.match(first.body, /srcset="\/asset\/books\/100.avif"/);
assert.match(first.body, /src="\/asset\/books\/100.jpg" loading="eager" fetchpriority="high"/);
assert.match(first.body, /src="\/asset\/arbitrary-kind\/60.jpg" loading="lazy" fetchpriority="auto"/);
assert.deepEqual(calls, [
	{ type: 'books', key: 'cover-key', width: 100, format: 'avif' },
	{ type: 'books', key: 'cover-key', width: 100, format: 'jpg' },
	{ type: 'arbitrary-kind', key: 'image-key', width: 60, format: 'avif' },
	{ type: 'arbitrary-kind', key: 'image-key', width: 60, format: 'jpg' },
	{ type: '__proto__', key: 'poster-key', width: 80, format: 'avif' },
	{ type: '__proto__', key: 'poster-key', width: 80, format: 'jpg' },
]);
assert.equal((first.head.match(/<title>/g) ?? []).length, 1);
assert.match(first.head, /<title>Page &lt;Root>&amp;"<\/title>/);
assert.match(first.head, /name="page-label" content="&lt;Root>&amp;&quot;"/);
assert.match(first.head, /<style data-manual>.manual { color: red }<\/style>/);
const styles = [...first.head.matchAll(/<style id="([^"]+)"/g)].map(match => match[1]);
assert.equal(styles.length, 2);
assert.equal(new Set(styles).size, 2);
assert.equal(first.head.split('--fixture-page').length - 1, 1);
assert.match(first.head, /--piece-icon-scale/);
assert.doesNotMatch(first.body, /<style/);
const empty = render([], 'Empty');
assert.match(empty.head, /<title>Page Empty<\/title>/);
assert.doesNotMatch(empty.head, /--piece-icon-scale|Root/);
assert.equal((empty.head.match(/<style id=/g) ?? []).length, 1);
const failingHelpers = { ...helpers, forPiece: () => { throw new Error('image helper failed'); } };
assert.throws(() => bundle.render('page', {
	data: { icons: [input(piece('broken', 'Broken', { cover: 'cover' }))], label: 'Broken' },
	helpers: failingHelpers,
}), /image helper failed/);
const healthy = render([input(piece('healthy', 'Healthy', { cover: 'cover' }))], 'Fresh', getter => getters.push(getter));
assert.match(healthy.head, /<title>Page Fresh<\/title>/);
assert.doesNotMatch(healthy.head + healthy.body, /Broken|Empty|Default|Root/);
assert.equal(getters[1], getters[0]);
assert.throws(() => getters[1]('page-label'), /lifecycle_outside_component/);
`
	)
})

test('native site and feed templates receive default icons without trusting or mutating caller components', async () => {
	await runArtifact(
		{ page, feed },
		{ site: { root: 'page', feed: 'feed' } },
		String.raw`
const entry = piece('books', 'Feed icon', { cover: 'feed-cover' });
const output = bundle.render(bundle.templateLookup.site.feed, {
	data: { pieces: [entry] },
	helpers: base,
});
assert.deepEqual(Object.keys(output).sort(), ['body', 'head']);
assert.match(output.body, /data-helpers="forPiece,getStaticAssetUrl"/);
assert.match(output.body, /class="default-icon svelte-/);
assert.match(output.body, /--piece-icon-width: 200px;/);
assert.match(output.body, /--piece-icon-height: 300px;/);
assert.match(output.body, /src="\/asset\/books\/200.jpg" loading="eager" fetchpriority="high"/);
assert.deepEqual(calls, [
	{ type: 'books', key: 'feed-cover', width: 200, format: 'avif' },
	{ type: 'books', key: 'feed-cover', width: 200, format: 'jpg' },
]);
assert.match(output.head, /--piece-icon-scale/);
assert.doesNotMatch(output.head, /--fixture-page/);
let maliciousCalls = 0;
const maliciousPieceCtor = () => { maliciousCalls++; throw new Error('caller component executed'); };
const callerComponents = Object.freeze({ PieceIcon: maliciousPieceCtor });
for (const [name, data, roleHelpers] of [
	[bundle.templateLookup.site.root, { icons: [input(entry)], label: 'Caller' }, helpers],
	[bundle.templateLookup.site.feed, { pieces: [entry] }, base],
]) {
	const options = { marker: 'unchanged' };
	const props = Object.freeze({ data, options, helpers: roleHelpers, components: callerComponents });
	const rendered = bundle.render(name, props);
	assert.match(rendered.body, /class="default-icon svelte-/);
	assert.equal(props.components, callerComponents);
	assert.equal(props.components.PieceIcon, maliciousPieceCtor);
	assert.equal(props.data, data);
	assert.equal(props.options, options);
	assert.equal(props.helpers, roleHelpers);
	assert.deepEqual(Object.keys(props).sort(), ['components', 'data', 'helpers', 'options']);
	assert.deepEqual(Object.keys(callerComponents), ['PieceIcon']);
}
assert.equal(maliciousCalls, 0);
`
	)
})

test('native site lookup selects reserved and script-closing template names safely', async () => {
	const names = ['__proto__', 'constructor', 'toString', '</script>"\\\n']
	const templates = Object.fromEntries(names.map((name) => [name, page]))
	const site = Object.fromEntries(
		['root', 'feed', '404', 'error'].map((slot, index) => [slot, names[index]])
	)
	await runArtifact(
		templates,
		{ site },
		String.raw`
const names = ${JSON.stringify(names)};
assert.deepEqual(bundle.templateLookup.site, ${JSON.stringify(site)});
for (const name of names) {
	const output = bundle.render(name, {
		data: { icons: [input(piece('arbitrary', 'Own key'))], label: 'Safe' }, helpers,
	});
	assert.match(output.body, /Own key/);
	assert.match(output.body, /class="default-icon svelte-/);
}
assert.throws(() => bundle.render('valueOf', { helpers }), /Unknown template: valueOf/);
`
	)
})
