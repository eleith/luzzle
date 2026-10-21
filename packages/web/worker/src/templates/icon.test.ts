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
const icon: TemplateSource = {
	filename: 'configured-icon.svelte',
	source: `<svelte:options css="injected" />
<script>
	import { getContext, setContext } from 'svelte';
	const props = $props();
	const { data, options, helpers } = $derived(props);
	function setup() {
		if (data.piece.title === 'explode') throw new Error('selected icon failed');
		data.piece.inspect?.({ options, keys: Object.keys(helpers).sort(), props: Object.keys(props).sort(),
			label: getContext('page-label'), previous: getContext('icon-local'), getter: getContext });
		setContext('icon-local', data.piece.title);
	}
	setup();
</script>
<svelte:head><title>Icon {data.piece.title}</title><meta name="icon-title" content={data.piece.title} /></svelte:head>
<article class="configured">
	{data.piece.title}|{getContext('page-label')}|{options.size.width}x{options.size.height}|{String(options.lazy)}|{String(options.active)}
	<img alt="" src={helpers.forPiece(data.piece).getImageUrl('cover', options.size.width, 'jpg')} />
	<img alt="" src={helpers.getStaticAssetUrl('mark.svg')} />
</article>
<style>.configured { color: var(--fixture-icon); }</style>`,
}

const og: TemplateSource = {
	filename: 'icon-og.svelte',
	source: `<script>
	import { setContext } from 'svelte';
	let { data, options, helpers, components } = $props();
	setContext('page-label', 'Open Graph');
</script>
<section data-size={options.size.width + 'x' + options.size.height} data-helpers={Object.keys(helpers).sort().join(',')}>
	<components.PieceIcon piece={data.piece} size={{ width: 200 }} />
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

test('native icon components share SSR context, escaping, heads and injected styles without leaking helpers', async () => {
	await runArtifact(
		{ page, icon },
		{ pieces: { configured: { icon: 'icon' }, missing: { icon: 'absent' } }, site: {} },
		String.raw`
const seen = [];
const getters = [];
const configured = title => ({ ...piece('configured', title), inspect: value => seen.push(value) });
const first = render([
	input(configured('<LabelBodyRoot>&"')),
	input(configured('Second'), { width: 80, height: 45 }, { lazy: true, active: true }),
	input(piece('default', '<Default>&"', { cover: 'cover-key', image: 'ignored', poster: 'ignored' })),
	input(piece('missing', 'Fallback', { image: 'image-key' }), { width: 60, height: 42 }, { lazy: true, active: true }),
], '<Root>&"', getter => getters.push(getter));
assert.deepEqual(Object.keys(first).sort(), ['body', 'head']);
assert.equal(seen.length, 2);
assert.deepEqual(seen.map(({ options }) => options), [
	{ size: { width: 100, height: 150 }, lazy: false, active: false },
	{ size: { width: 80, height: 45 }, lazy: true, active: true },
]);
for (const entry of seen) {
	assert.deepEqual(entry.keys, ['forPiece', 'getStaticAssetUrl']);
	assert.deepEqual(entry.props, ['data', 'helpers', 'options']);
	assert.equal(entry.label, '<Root>&"');
	assert.equal(entry.previous, undefined);
	assert.equal(entry.getter, getters[0]);
}
assert.throws(() => getters[0]('page-label'), /lifecycle_outside_component/);
assert.match(first.body, /page-local:undefined/);
assert.match(first.body, /navigation:true/);
assert.match(first.body, /&lt;LabelBodyRoot>&amp;"/);
assert.match(first.body, /&lt;Default>&amp;"/);
assert.match(first.body, /&lt;Root>&amp;"/);
assert.doesNotMatch(first.body, /<LabelBodyRoot>|<Default>|<Root>/);
assert.match(first.body, /class="configured svelte-/);
assert.match(first.body, /class="default-icon svelte-[^ "]+"/);
assert.match(first.body, /class="default-icon svelte-[^"]+ active"/);
assert.match(first.body, /--piece-icon-width: 100px;/);
assert.match(first.body, /--piece-icon-height: 150px;/);
assert.match(first.body, /--piece-icon-width: 60px;/);
assert.match(first.body, /--piece-icon-height: 42px;/);
assert.match(first.body, /src="\/asset\/configured\/100.jpg"/);
assert.match(first.body, /src="\/static\/mark.svg"/);
assert.match(first.body, /srcset="\/asset\/default\/100.avif"/);
assert.match(first.body, /src="\/asset\/default\/100.jpg" loading="eager" fetchpriority="high"/);
assert.match(first.body, /src="\/asset\/missing\/60.jpg" loading="lazy" fetchpriority="auto"/);
assert.deepEqual(calls.filter(call => call.type !== 'configured'), [
	{ type: 'default', key: 'cover-key', width: 100, format: 'avif' },
	{ type: 'default', key: 'cover-key', width: 100, format: 'jpg' },
	{ type: 'missing', key: 'image-key', width: 60, format: 'avif' },
	{ type: 'missing', key: 'image-key', width: 60, format: 'jpg' },
]);
assert.equal((first.head.match(/<title>/g) ?? []).length, 1);
assert.match(first.head, /<title>Icon Second<\/title>/);
assert.match(first.head, /name="icon-title" content="&lt;LabelBodyRoot>&amp;&quot;"/);
assert.match(first.head, /name="icon-title" content="Second"/);
assert.match(first.head, /<style data-manual>.manual { color: red }<\/style>/);
const styles = [...first.head.matchAll(/<style id="([^"]+)"/g)].map(match => match[1]);
assert.equal(styles.length, 3);
assert.equal(new Set(styles).size, 3);
for (const token of ['--fixture-page', '--fixture-icon']) {
	assert.equal(first.head.split(token).length - 1, 1);
}
assert.match(first.head, /--piece-icon-scale/);
assert.doesNotMatch(first.body, /<style/);
const empty = render([], 'Empty');
assert.match(empty.head, /<title>Page Empty<\/title>/);
assert.doesNotMatch(empty.head, /--fixture-icon|--piece-icon-scale|icon-title/);
assert.equal((empty.head.match(/<style id=/g) ?? []).length, 1);
assert.throws(() => render([input(configured('Before failure')), input(piece('configured', 'explode'))], 'Broken'), /selected icon failed/);
const healthy = render([input(configured('Healthy'))], 'Fresh', getter => getters.push(getter));
assert.match(healthy.head, /<title>Icon Healthy<\/title>/);
assert.doesNotMatch(healthy.head + healthy.body, /Broken|Before failure|Second|--piece-icon-scale/);
assert.equal(seen.at(-1).label, 'Fresh');
assert.equal(seen.at(-1).previous, undefined);
assert.equal(getters[1], getters[0]);
assert.throws(() => getters[1]('page-label'), /lifecycle_outside_component/);
const malicious = render([input(configured('<LabelBodyRoot>&"'))]);
assert.match(malicious.head, /<title>Icon &lt;LabelBodyRoot>&amp;"<\/title>/);
// Values are deliberately not validated or coerced beyond the documented nullish defaults.
render([input(configured('Unvalidated'), { width: '12', height: 0 }, { lazy: 0, active: '' })]);
assert.deepEqual(seen.at(-1).options, { size: { width: '12', height: 0 }, lazy: 0, active: '' });
`
	)
})

test('native Open Graph consumers receive internal components without mutating or trusting caller components', async () => {
	await runArtifact(
		{ page, icon, og },
		{ pieces: { configured: { icon: 'icon' } }, site: {} },
		String.raw`
const seen = [];
const configured = { ...piece('configured', 'OG icon'), inspect: value => seen.push(value) };
const output = bundle.render('og', {
	data: { piece: configured },
	options: { size: { width: 1200, height: 630 } },
	helpers: base,
});
assert.deepEqual(Object.keys(output).sort(), ['body', 'head']);
assert.match(output.body, /data-size="1200x630"/);
assert.match(output.body, /data-helpers="forPiece,getStaticAssetUrl"/);
assert.match(output.body, /OG icon\|Open Graph\|200x300\|false\|false/);
assert.match(output.body, /src="\/asset\/configured\/200.jpg"/);
assert.match(output.body, /src="\/static\/mark.svg"/);
assert.match(output.head, /<title>Icon OG icon<\/title>/);
assert.equal(seen.length, 1);
assert.deepEqual(seen[0].keys, ['forPiece', 'getStaticAssetUrl']);
assert.deepEqual(seen[0].props, ['data', 'helpers', 'options']);
assert.deepEqual(seen[0].options, { size: { width: 200, height: 300 }, lazy: false, active: false });
assert.equal(seen[0].label, 'Open Graph');
assert.equal(seen[0].previous, undefined);
const fallback = bundle.render('og', {
	data: { piece: piece('unconfigured', 'OG fallback', { cover: 'og-cover' }) },
	options: { size: { width: 1200, height: 630 } },
	helpers: base,
});
assert.match(fallback.body, /class="default-icon svelte-/);
assert.match(fallback.body, /--piece-icon-width: 200px;/);
assert.match(fallback.body, /--piece-icon-height: 300px;/);
assert.match(fallback.body, /src="\/asset\/unconfigured\/200.jpg" loading="eager" fetchpriority="high"/);
assert.deepEqual(calls.filter(call => call.type === 'unconfigured'), [
	{ type: 'unconfigured', key: 'og-cover', width: 200, format: 'avif' },
	{ type: 'unconfigured', key: 'og-cover', width: 200, format: 'jpg' },
]);
assert.doesNotMatch(fallback.head, /--fixture-icon|name="icon-title"/);
let maliciousCalls = 0;
const maliciousPieceCtor = () => { maliciousCalls++; throw new Error('caller component executed'); };
const callerComponents = Object.freeze({ PieceIcon: maliciousPieceCtor });
for (const [name, data, roleHelpers] of [
	['page', { icons: [input(configured)], label: 'Caller' }, helpers],
	['og', { piece: configured }, base],
]) {
	const options = { size: { width: 1200, height: 630 } };
	const props = Object.freeze({ data, options, helpers: roleHelpers, components: callerComponents });
	const rendered = bundle.render(name, props);
	assert.match(rendered.body, /class="configured svelte-/);
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

test('native lookup handles own prototype names and script-closing names, but never inherited roles', async () => {
	const names = ['__proto__', 'constructor', 'toString', '</script>"\\\n']
	const templates = Object.fromEntries([['page', page], ...names.map((name) => [name, icon])])
	const pieces = Object.fromEntries(names.map((name) => [name, { icon: name }]))
	await runArtifact(
		templates,
		{ pieces, site: {} },
		String.raw`
const names = ${JSON.stringify(names)};
assert.deepEqual(Object.keys(bundle.templateLookup.pieces), names);
for (const name of names) {
	assert.equal(Object.hasOwn(bundle.templateLookup.pieces, name), true);
	const output = render([input(piece(name, 'Own key'))]);
	assert.match(output.body, /class="configured svelte-/);
	assert.match(output.body, /Own key\|Root\|100x150\|false\|false/);
	assert.doesNotMatch(output.body, /default-icon/);
}
Object.setPrototypeOf(bundle.templateLookup.pieces, { inherited: { icon: '__proto__' } });
for (const type of ['valueOf', 'hasOwnProperty', 'unconfigured', 'inherited']) {
	const output = render([input(piece(type, 'Fallback', { poster: 'poster-key' }))]);
	assert.match(output.body, /class="default-icon svelte-/);
	assert.doesNotMatch(output.head, /--fixture-icon/);
	assert.equal(calls.at(-1).key, 'poster-key');
}
`
	)
})
