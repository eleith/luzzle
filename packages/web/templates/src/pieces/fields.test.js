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

test('a missing film backdrop keeps the poster in every selected role without warnings', (t) => {
	const warning = t.mock.method(console, 'warn', () => {});
	const source = piece();
	source.type = 'films';
	source.metadata = { poster: 'poster-key', backdrop: null };
	const result = mapPieceTemplates(source, {
		type: 'films',
		templates: {
			icon: { name: 'poster', mapping: { image: 'poster' } },
			page: { name: 'film', mapping: { image: 'poster', backdrop: 'backdrop' } },
			opengraph: { name: 'poster', mapping: { image: 'poster', backdrop: 'backdrop' } }
		}
	});
	for (const role of ['icon', 'page', 'opengraph']) {
		assert.equal(result.templates[role].fields.image, 'poster-key');
		assert.equal(Object.hasOwn(result.templates[role].fields, 'backdrop'), false);
	}
	assert.equal(source.metadata.backdrop, null);
	assert.equal(warning.mock.callCount(), 0);
});

test('a missing snippet update date keeps its mapped files and file defaults', (t) => {
	const warning = t.mock.method(console, 'warn', () => {});
	const source = piece();
	source.type = 'snippets';
	source.metadata = {
		files: [{ file: 'code-key', name: null, format: 'rust', type: null }],
		date_updated: null
	};
	const result = mapPieceTemplates(source, {
		type: 'snippets',
		templates: {
			page: {
				name: 'snippet',
				mapping: {
					files: {
						each: 'files',
						fields: { file: 'file', name: 'name', format: 'format', type: 'type' }
					},
					dateUpdated: 'date_updated'
				}
			}
		}
	});
	assert.deepEqual(result.templates.page.fields, {
		files: [{ file: 'code-key', format: 'rust', type: 'snippet' }]
	});
	assert.equal(source.metadata.files[0].name, null);
	assert.equal(source.metadata.date_updated, null);
	assert.equal(warning.mock.callCount(), 0);
});

test('a missing article image keeps its publication date without warnings in any role', (t) => {
	const warning = t.mock.method(console, 'warn', () => {});
	const source = piece();
	source.type = 'words';
	source.metadata = { representative_image: null, date_published: 1700000000000 };
	const result = mapPieceTemplates(source, {
		type: 'words',
		templates: {
			icon: { name: 'browser-window', mapping: { image: 'representative_image' } },
			page: {
				name: 'article',
				mapping: { image: 'representative_image', datePublished: 'date_published' }
			},
			opengraph: { name: 'browser-window', mapping: { image: 'representative_image' } }
		}
	});
	for (const role of ['icon', 'page', 'opengraph']) {
		assert.equal(Object.hasOwn(result.templates[role].fields, 'image'), false);
	}
	assert.equal(result.templates.page.fields.datePublished, 1700000000000);
	assert.equal(source.metadata.representative_image, null);
	assert.equal(warning.mock.callCount(), 0);
});

test('mapped data contains no source-component dispatch state', () => {
	const result = mapPieceTemplates(piece(), config);
	assert.equal(Object.hasOwn(result.templates.icon, 'legacy'), false);
	assert.equal(Object.hasOwn(result.templates.page, 'legacy'), false);
	assert.equal(Object.hasOwn(result.templates.opengraph, 'legacy'), false);
});
