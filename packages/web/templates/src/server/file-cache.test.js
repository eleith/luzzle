import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createTemplateFileCache } from '@luzzle/web.templates/server';

async function templateFile(t, source = '<script>let { title } = $props()</script><p>{title}</p>') {
	const directory = await mkdtemp(join(tmpdir(), 'luzzle-template-'));
	t.after(() => rm(directory, { recursive: true, force: true }));
	const filename = join(directory, 'icon.svelte');
	await writeFile(filename, source);
	return filename;
}

test('without reloading, concurrent loads share a template and later renders need no file', async (t) => {
	const filename = await templateFile(t);
	const cache = createTemplateFileCache({ reloadOnChange: false });
	const [first, second] = await Promise.all([cache.load(filename), cache.load(filename)]);
	assert.equal(second, first);
	assert.match(first.render({ title: 'Dune' }), /<p>Dune<\/p>/);
	await rm(filename);
	assert.match((await cache.load(filename)).render({ title: 'Solaris' }), /<p>Solaris<\/p>/);
});

test('same-named templates in different directories stay independent during and after concurrent loads', async (t) => {
	const book = await templateFile(t, '<p>Book</p>');
	const album = await templateFile(t, '<p>Album</p>');
	const cache = createTemplateFileCache({ reloadOnChange: false });
	const [bookIcon, albumIcon] = await Promise.all([cache.load(book), cache.load(album)]);
	assert.match(bookIcon.render({}), /<p>Book<\/p>/);
	assert.match(albumIcon.render({}), /<p>Album<\/p>/);
	assert.equal(await cache.load(book), bookIcon);
	assert.equal(await cache.load(album), albumIcon);
});

test('with reloading, unchanged source is reused and fixing a bad edit restores rendering', async (t) => {
	const filename = await templateFile(t);
	const cache = createTemplateFileCache({ reloadOnChange: true });
	const original = await cache.load(filename);
	assert.equal(await cache.load(filename), original);
	await writeFile(filename, '<p></aside>');
	await assert.rejects(cache.load(filename), /icon\.svelte/);
	await writeFile(filename, '<p>Revised</p>');
	assert.match((await cache.load(filename)).render({}), /<p>Revised<\/p>/);
});
