import type { Component, Snippet } from 'svelte';
import type { PublicWebPiece, PieceComponentHelpers } from '@luzzle/web.pieces';
import type { Static } from '@sinclair/typebox';
import type { PageDefinition } from './schema.js';

export type PageNavbarProps = {
	background?: string;
	color?: string;
	hoverColor?: string;
	showRandom?: boolean;
};

export type PageProps<Fields> = {
	piece: PublicWebPiece;
	fields: Fields;
	tags: Array<{ slug: string; tag: string }>;
	helpers: PieceComponentHelpers & {
		navBar: Snippet<[options: PageNavbarProps]>;
	};
};

// Preserve each template's field contract without importing the component catalog.
type ComponentFor<Definition extends PageDefinition> = Definition extends PageDefinition
	? Component<PageProps<Static<Definition['fields']>>>
	: never;

export type PageComponent = ComponentFor<PageDefinition>;
