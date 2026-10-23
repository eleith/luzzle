import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapPieceTemplates, mapOpengraphTemplate } from '@luzzle/web.templates/pieces/fields';

function piece() {
	return {
		id: 'one',
		key: 'one',
		type: 'clippings',
		slug: 'one',
		title: 'An arbitrary record',
		note: 'A note',
		date_added: 1,
		assets: [],
		metadata: {
			art: { thumbnail: 'thumb-key', cover: 'cover-key', share: 'share-key' },
			credits: [{ display: 'Ada' }],
			film: { released: '2024-01-01', minutes: 90 }
		}
	};
}

const config = {
	type: 'clippings',
	fields: { title: 'headline', date_consumed: 'read' },
	templates: {
		icon: { name: 'default', mapping: { image: 'art.thumbnail' } },
		page: {
			name: 'default',
			mapping: {
				image: 'art.cover',
				people: { each: 'credits', fields: { name: 'display' } }
			}
		},
		opengraph: {
			name: 'default',
			mapping: {
				image: 'art.share',
				dateReleased: 'film.released',
				runtime: 'film.minutes'
			}
		}
	}
};

test('independent defaults receive independent fields from arbitrary metadata', () => {
	const source = piece();
	const result = mapPieceTemplates(source, config);
	assert.deepEqual(result.templates.icon.fields, { image: 'thumb-key' });
	assert.deepEqual(result.templates.page.fields, { image: 'cover-key', people: [{ name: 'Ada' }] });
	assert.deepEqual(result.templates.opengraph.fields, {
		image: 'share-key',
		dateReleased: '2024-01-01',
		runtime: 90
	});
	assert.deepEqual(result.metadata, source.metadata);
	assert.equal(Object.hasOwn(result.templates.icon, 'mapping'), false);
});

test('missing mappings do not guess poster metadata names', () => {
	const source = piece();
	source.metadata.poster = 'not-implicitly-selected';
	const result = mapPieceTemplates(source);
	for (const role of ['icon', 'page', 'opengraph']) {
		assert.equal(result.templates[role].name, 'default');
		assert.deepEqual(result.templates[role].fields, {});
	}
});

test('invalid mapped values fall back only for the affected role', (t) => {
	t.mock.method(console, 'warn', () => {});
	const source = piece();
	source.metadata.art.thumbnail = 42;
	const result = mapPieceTemplates(source, config);
	assert.deepEqual(result.templates.icon.fields, {});
	assert.equal(result.templates.page.fields.image, 'cover-key');
	assert.equal(result.templates.opengraph.fields.image, 'share-key');
});

test('worker OG mapping does not evaluate unrelated page bindings', (t) => {
	const warning = t.mock.method(console, 'warn', () => {});
	const unrelated = {
		...config,
		templates: {
			...config.templates,
			page: {
				name: 'default',
				mapping: { people: { each: 'film.minutes', fields: { name: '$' } } }
			}
		}
	};
	assert.equal(mapOpengraphTemplate(piece(), unrelated).fields.image, 'share-key');
	assert.equal(warning.mock.callCount(), 0);
});

test('mapped data contains no source-component dispatch state', () => {
	const result = mapPieceTemplates(piece(), config);
	assert.equal(Object.hasOwn(result.templates.icon, 'legacy'), false);
	assert.equal(Object.hasOwn(result.templates.page, 'legacy'), false);
	assert.equal(Object.hasOwn(result.templates.opengraph, 'legacy'), false);
});
