const opengraphs = new Map(
	Object.entries({
		default: () => import('./default/template.svelte'),
		book: () => import('./book/template.svelte'),
		'browser-window': () => import('./browser-window/template.svelte'),
		'code-snippet': () => import('./code-snippet/template.svelte'),
		'lined-notebook-paper': () => import('./lined-notebook-paper/template.svelte'),
		'playing-cards': () => import('./playing-cards/template.svelte'),
		poster: () => import('./poster/template.svelte'),
		'recipe-card': () => import('./recipe-card/template.svelte'),
		'video-game-cartridge': () => import('./video-game-cartridge/template.svelte'),
		'vinyl-record': () => import('./vinyl-record/template.svelte')
	})
);

export async function loadOpengraph(name = 'default') {
	const load = opengraphs.get(name);
	if (!load) throw new Error(`Unknown opengraph template: ${name}`);
	return (await load()).default;
}
