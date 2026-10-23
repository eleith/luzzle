import DefaultIcon from './default/template.svelte';
import BookIcon from './book/template.svelte';
import BrowserWindowIcon from './browser-window/template.svelte';
import CodeSnippetIcon from './code-snippet/template.svelte';
import LinedNotebookPaperIcon from './lined-notebook-paper/template.svelte';
import PlayingCardsIcon from './playing-cards/template.svelte';
import PosterIcon from './poster/template.svelte';
import RecipeCardIcon from './recipe-card/template.svelte';
import VideoGameCartridgeIcon from './video-game-cartridge/template.svelte';
import VinylRecordIcon from './vinyl-record/template.svelte';

const icons = new Map(
	Object.entries({
		default: DefaultIcon,
		book: BookIcon,
		'browser-window': BrowserWindowIcon,
		'code-snippet': CodeSnippetIcon,
		'lined-notebook-paper': LinedNotebookPaperIcon,
		'playing-cards': PlayingCardsIcon,
		poster: PosterIcon,
		'recipe-card': RecipeCardIcon,
		'video-game-cartridge': VideoGameCartridgeIcon,
		'vinyl-record': VinylRecordIcon
	})
);

export function getIcon(name = 'default') {
	const component = icons.get(name);
	if (!component) throw new Error(`Unknown icon template: ${name}`);
	return component;
}
