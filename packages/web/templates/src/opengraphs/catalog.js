import DefaultOpengraph from './default/template.svelte';
import BookOpengraph from './book/template.svelte';
import BrowserWindowOpengraph from './browser-window/template.svelte';
import CodeSnippetOpengraph from './code-snippet/template.svelte';
import LinedNotebookPaperOpengraph from './lined-notebook-paper/template.svelte';
import PlayingCardsOpengraph from './playing-cards/template.svelte';
import PosterOpengraph from './poster/template.svelte';
import RecipeCardOpengraph from './recipe-card/template.svelte';
import VideoGameCartridgeOpengraph from './video-game-cartridge/template.svelte';
import VinylRecordOpengraph from './vinyl-record/template.svelte';

const opengraphs = new Map(
	Object.entries({
		default: DefaultOpengraph,
		book: BookOpengraph,
		'browser-window': BrowserWindowOpengraph,
		'code-snippet': CodeSnippetOpengraph,
		'lined-notebook-paper': LinedNotebookPaperOpengraph,
		'playing-cards': PlayingCardsOpengraph,
		poster: PosterOpengraph,
		'recipe-card': RecipeCardOpengraph,
		'video-game-cartridge': VideoGameCartridgeOpengraph,
		'vinyl-record': VinylRecordOpengraph
	})
);

export function getOpengraph(name = 'default') {
	const component = opengraphs.get(name);
	if (!component) throw new Error(`Unknown opengraph template: ${name}`);
	return component;
}
