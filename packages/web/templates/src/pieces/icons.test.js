import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapPieceTemplates } from '@luzzle/web.templates/pieces/fields';

const piece = {
	id: 'one',
	key: 'one',
	type: 'inventory',
	slug: 'one',
	title: 'An arbitrary record',
	date_added: 1,
	assets: [],
	metadata: {
		art: { jacket: 'cover-key', page: 'page-key', social: 'social-key' },
		credits: { maker: 'Ada' },
		edition: { leaves: 320 }
	}
};

const config = {
	type: 'inventory',
	fields: { title: 'name', date_consumed: 'date' },
	templates: {
		icon: {
			name: 'book',
			mapping: { image: 'art.jacket', author: 'credits.maker', pages: 'edition.leaves' }
		},
		page: { name: 'default', mapping: { image: 'art.page' } },
		opengraph: { name: 'default', mapping: { image: 'art.social' } }
	}
};

test('a book icon uses its own schema on an arbitrary archive type', () => {
	const result = mapPieceTemplates(piece, config);
	assert.deepEqual(result.templates.icon, {
		name: 'book',
		fields: { image: 'cover-key', author: 'Ada', pages: 320 }
	});
	assert.deepEqual(result.templates.page, { name: 'default', fields: { image: 'page-key' } });
	assert.deepEqual(result.templates.opengraph, {
		name: 'default',
		fields: { image: 'social-key' }
	});
	assert.deepEqual(result.metadata, piece.metadata);
});

test('selecting named poster changes only the icon association', () => {
	const result = mapPieceTemplates(piece, {
		...config,
		templates: { ...config.templates, icon: { name: 'poster', mapping: { image: 'art.jacket' } } }
	});
	assert.deepEqual(result.templates.icon, { name: 'poster', fields: { image: 'cover-key' } });
	assert.equal(result.templates.page.name, 'default');
	assert.equal(result.templates.opengraph.name, 'default');
});

test('missing book page counts use the book contract default', () => {
	const result = mapPieceTemplates(piece, {
		...config,
		templates: { ...config.templates, icon: { name: 'book', mapping: { author: 'credits.maker' } } }
	});
	assert.deepEqual(result.templates.icon.fields, { author: 'Ada', pages: 100 });
});
