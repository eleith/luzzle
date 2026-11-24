import { resolve } from 'node:path';
import type { FieldMappings } from '@luzzle/web.config/mapping';
import {
	formatPieceDate,
	getOpengraphTitleSize,
	type PieceComponentHelpers,
	type PublicWebPiece
} from '@luzzle/web.pieces';
import { resolveTemplateFields } from '@luzzle/web.templates/mapping';
import type { TemplateConfig } from '../config/index.js';
import type { createTemplateFileCache } from './file-cache.ts';

type TemplateCache = ReturnType<typeof createTemplateFileCache>;

export async function preloadAuthoredOpengraphFiles(
	caches: { published: TemplateCache; preview: TemplateCache },
	pieces: TemplateConfig['pieces']
) {
	const seen = new Set<string>();
	for (const piece of pieces) {
		if (seen.has(piece.type)) continue;
		seen.add(piece.type);
		const selection = piece.templates?.opengraph;
		if (!selection || !('file' in selection)) continue;
		const filename = resolve(selection.file);
		await Promise.all([caches.published.load(filename), caches.preview.load(filename)]);
	}
}

/** Both browser previews and worker images render the same trusted local file on the server. */
export async function renderAuthoredOpengraph(
	cache: TemplateCache,
	selection: { file: string; mapping?: FieldMappings },
	piece: PublicWebPiece,
	helpers: PieceComponentHelpers
) {
	const template = await cache.load(resolve(selection.file));
	const fields = resolveTemplateFields(piece.metadata, selection.mapping);
	const html = template.render({
		piece,
		fields,
		helpers: { ...helpers, formatPieceDate, getOpengraphTitleSize }
	});
	return { html, css: template.css };
}
