const pages = new Map(
	Object.entries({
		default: () => import('./default/template.svelte'),
		article: () => import('./article/template.svelte'),
		book: () => import('./book/template.svelte'),
		film: () => import('./film/template.svelte'),
		music: () => import('./music/template.svelte'),
		note: () => import('./note/template.svelte'),
		recipe: () => import('./recipe/template.svelte'),
		snippet: () => import('./snippet/template.svelte'),
		'tabletop-game': () => import('./tabletop-game/template.svelte'),
		'video-game': () => import('./video-game/template.svelte')
	})
);

export async function loadPage(name = 'default') {
	const load = pages.get(name);
	if (!load) throw new Error(`Unknown page template: ${name}`);
	return (await load()).default;
}
