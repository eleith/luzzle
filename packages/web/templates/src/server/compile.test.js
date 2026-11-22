import assert from 'node:assert/strict';
import { parse } from 'node:path';
import { test } from 'node:test';
import { compileTemplate as compile } from '@luzzle/web.templates/server';

test('one template with a type-only props import renders different titles with the same scoped stylesheet', async () => {
	const source = `<script lang="ts">
  import type { PageProps } from '@luzzle/web.templates/pages/props';
  let { fields }: Pick<PageProps<{ title: string }>, 'fields'> = $props();
</script>
<h2>{fields.title}</h2>
<style>h2 { color: teal; }</style>`;
	const template = await compile('heading.svelte', source);

	const first = template.render({ fields: { title: 'Dune' } });
	const second = template.render({ fields: { title: 'Solaris' } });

	const scope = /<h2 class="([\w-]+)">Dune<\/h2>/.exec(first)?.[1];
	assert.ok(scope, 'expected a scope class on the first heading');
	assert.ok(second.includes(`<h2 class="${scope}">Solaris</h2>`));
	assert.ok(template.css.includes(`.${scope}`));
	assert.match(template.css, /color:\s*teal/);
});

test('the generated module resolves Svelte independently of the working directory', async () => {
	const cwd = process.cwd();
	try {
		process.chdir(parse(cwd).root);
		const template = await compile('cwd.svelte', '<p>OK</p>');
		assert.match(template.render({}), /<p>OK<\/p>/);
	} finally {
		process.chdir(cwd);
	}
});

test('recompiling an edited file gives each version its own module', async () => {
	const before = await compile('title.svelte', '<p>Before</p>');
	const after = await compile('title.svelte', '<p>After</p>');
	assert.match(after.render({}), /<p>After<\/p>/);
	assert.match(before.render({}), /<p>Before<\/p>/);
});

test('an event handler is rejected with its filename, line and reason', async () => {
	const source = `<h2>Controls</h2>
<button onclick={() => {}}>Save</button>`;

	await assert.rejects(
		async () => compile('controls.svelte', source),
		(error) => {
			assert.match(error.message, /controls\.svelte:2:\d+/);
			assert.match(error.message, /event handler|onclick/i);
			return true;
		}
	);
});

test('component props starting with on are not DOM event handlers', async () => {
	const source = `<script>let { only = false } = $props();</script>
		{#if only}<p>Child</p>{:else}<svelte:self only={true} />{/if}`;
	const template = await compile('child.svelte', source);
	assert.match(template.render({}), /<p>Child<\/p>/);
});

test('a callback prop named onMount is not a Svelte lifecycle import', async () => {
	const template = await compile(
		'label.svelte',
		'<script>let { onMount } = $props()</script><p>{onMount()}</p>'
	);
	assert.match(template.render({ onMount: () => 'label' }), /<p>label<\/p>/);
});

for (const tag of ['<sCrIpT></sCrIpT>', '<svelte:element this="script" />']) {
	test(`rejects a statically named browser script: ${tag}`, async () => {
		await assert.rejects(
			compile('script.svelte', `<div>${tag}</div>`),
			/script\.svelte:1:6: Remove the browser script/
		);
	});
}

test('ordinary data properties named $effect are not runes', async () => {
	const template = await compile(
		'field.svelte',
		'<script>let { data } = $props()</script><p>{data.$effect}</p>'
	);
	assert.match(template.render({ data: { $effect: 'label' } }), /<p>label<\/p>/);
});

for (const rune of ['$effect', '$effect.pre']) {
	test(`${rune} calls get a server-only diagnostic`, async () => {
		await assert.rejects(
			compile('effect.svelte', `<script>${rune}(() => {});</script>`),
			/effect\.svelte:1:\d+: \$effect does not run on the server/
		);
	});
}

test('even a resolvable runtime import is rejected', async () => {
	const source = `<script>
  import { basename } from 'node:path';
</script>
<p>{basename('/a/b')}</p>`;

	await assert.rejects(compile('path.svelte', source), /path\.svelte:2:3:.*runtime import/i);
});

test('malformed source reports the filename and source position', async () => {
	await assert.rejects(
		compile('broken.svelte', '<p>Before</p>\n  </aside>'),
		/broken\.svelte:2:3:/
	);
});

test('module initialization errors retain their cause and identify the template', async () => {
	const source = `<script module>throw new Error('setup failed');</script>`;

	await assert.rejects(compile('setup.svelte', source), (error) => {
		assert.match(error.message, /setup\.svelte/);
		assert.equal(error.cause?.message, 'setup failed');
		return true;
	});
});

test('render errors retain their cause and identify the template', async () => {
	const template = await compile(
		'detail.svelte',
		'<script>let { failure } = $props(); throw failure;</script>'
	);
	const failure = new Error('bad input');

	assert.throws(
		() => template.render({ failure }),
		(error) => {
			assert.match(error.message, /detail\.svelte/);
			assert.equal(error.cause, failure);
			return true;
		}
	);
});

test('idPrefix gives each render a distinct $props.id()', async () => {
	const template = await compile(
		'item.svelte',
		'<script>const id = $props.id();</script><p {id}>Item</p>'
	);

	assert.match(template.render({}, { idPrefix: 'first' }), /<p id="first[^"]*"/);
	assert.match(template.render({}, { idPrefix: 'second' }), /<p id="second[^"]*"/);
});
