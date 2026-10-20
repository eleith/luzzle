export interface RenderedTemplate {
	body: string;
	head: string;
}

export interface TemplateLookup {
	pieces: Record<string, { page?: string; icon?: string; opengraph?: string }>;
	site: { root?: string; feed?: string; '404'?: string; error?: string };
}

/** Exports of the standalone server module produced by the worker. */
export interface TemplateBundleModule {
	templateLookup: TemplateLookup;
	render(name: string, props: object): RenderedTemplate;
}
