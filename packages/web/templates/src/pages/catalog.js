import DefaultPage from './default/template.svelte';
import ArticlePage from './article/template.svelte';
import BookPage from './book/template.svelte';
import FilmPage from './film/template.svelte';
import MusicPage from './music/template.svelte';
import NotePage from './note/template.svelte';
import RecipePage from './recipe/template.svelte';
import SnippetPage from './snippet/template.svelte';
import TabletopGamePage from './tabletop-game/template.svelte';
import VideoGamePage from './video-game/template.svelte';

const pages = new Map(
	Object.entries({
		default: DefaultPage,
		article: ArticlePage,
		book: BookPage,
		film: FilmPage,
		music: MusicPage,
		note: NotePage,
		recipe: RecipePage,
		snippet: SnippetPage,
		'tabletop-game': TabletopGamePage,
		'video-game': VideoGamePage
	})
);

export function getPage(name = 'default') {
	const component = pages.get(name);
	if (!component) throw new Error(`Unknown page template: ${name}`);
	return component;
}
