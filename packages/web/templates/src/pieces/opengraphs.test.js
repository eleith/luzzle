import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapPieceTemplates, mapOpengraphTemplate } from '@luzzle/web.templates/pieces/fields';

const piece = {
	id: 'one',
	key: 'one',
	type: 'inventory',
	slug: 'one',
	title: 'An arbitrary record',
	date_added: 1,
	assets: [],
	metadata: {
		art: { icon: 'icon-key', page: 'page-key', share: 'share-key' },
		edition: { maker: 'Ada', leaves: 320 },
		film: { maker: 'Grace', minutes: 90 }
	}
};
const config = {
	type: 'inventory',
	fields: { title: 'name', date_consumed: 'date' },
	templates: {
		icon: { name: 'poster', mapping: { image: 'art.icon' } },
		page: { name: 'film', mapping: { image: 'art.page' } },
		opengraph: {
			name: 'book',
			mapping: { image: 'art.share', author: 'edition.maker', pages: 'edition.leaves' }
		}
	}
};

test('OG selection and fields remain independent of icon, page and archive type', () => {
	const mapped = mapPieceTemplates(piece, config);
	assert.deepEqual(mapped.templates.opengraph, {
		name: 'book',
		fields: { image: 'share-key', author: 'Ada', pages: 320 }
	});
	assert.deepEqual(mapped.templates.icon, { name: 'poster', fields: { image: 'icon-key' } });
	assert.deepEqual(mapped.templates.page, { name: 'film', fields: { image: 'page-key' } });
	assert.equal(mapped.metadata.edition.leaves, 320);
});

test('named poster uses its own contract without reading unrelated role bindings', () => {
	const cfg = {
		...config,
		templates: {
			...config.templates,
			page: { name: 'not-evaluated' },
			opengraph: {
				name: 'poster',
				mapping: { image: 'art.share', director: 'film.maker', runtime: 'film.minutes' }
			}
		}
	};
	assert.deepEqual(mapOpengraphTemplate(piece, cfg), {
		name: 'poster',
		fields: { image: 'share-key', director: 'Grace', runtime: 90 }
	});
});
