import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapPieceTemplates } from '@luzzle/web.templates/pieces/fields';

const piece = {
	id: 'one',
	key: 'one',
	type: 'records',
	slug: 'one',
	title: 'An arbitrary record',
	date_added: 1,
	assets: [],
	metadata: {
		art: { icon: 'icon-key', page: 'page-key', social: 'social-key' },
		edition: { maker: 'Ada', leaves: 320, year: 2001 },
		cinema: { release: '2024-01-01', minutes: 90, cast: [{ label: 'Grace' }] }
	}
};
const config = {
	type: 'records',
	fields: { title: 'name', date_consumed: 'date' },
	templates: {
		icon: { name: 'poster', mapping: { image: 'art.icon' } },
		page: {
			name: 'book',
			mapping: {
				image: 'art.page',
				author: 'edition.maker',
				pages: 'edition.leaves',
				publicationYear: 'edition.year'
			}
		},
		opengraph: { name: 'default', mapping: { image: 'art.social' } }
	}
};

test('a book page uses its own schema while icon and OG remain independently mapped', () => {
	const result = mapPieceTemplates(piece, config);
	assert.deepEqual(result.templates.page, {
		name: 'book',
		fields: { image: 'page-key', author: 'Ada', pages: 320, publicationYear: 2001 }
	});
	assert.deepEqual(result.templates.icon, { name: 'poster', fields: { image: 'icon-key' } });
	assert.deepEqual(result.templates.opengraph, {
		name: 'default',
		fields: { image: 'social-key' }
	});
	assert.equal(result.metadata.edition.leaves, 320);
});

test('film receives its fields from renamed and nested metadata', () => {
	const result = mapPieceTemplates(piece, {
		...config,
		templates: {
			...config.templates,
			page: {
				name: 'film',
				mapping: {
					image: 'art.page',
					dateReleased: 'cinema.release',
					runtime: 'cinema.minutes',
					people: { each: 'cinema.cast', fields: { name: 'label' } }
				}
			}
		}
	});
	assert.deepEqual(result.templates.page, {
		name: 'film',
		fields: {
			image: 'page-key',
			dateReleased: '2024-01-01',
			runtime: 90,
			people: [{ name: 'Grace' }]
		}
	});
	assert.equal(result.templates.icon.name, 'poster');
	assert.equal(result.templates.opengraph.name, 'default');
});
