import { readFile } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { compileTemplate } from './compile.ts';

type Template = Awaited<ReturnType<typeof compileTemplate>>;

/** Reuse one cache across renders. Callers supply absolute paths from trusted configuration. */
export function createTemplateFileCache({ reloadOnChange }: { reloadOnChange: boolean }) {
	const compiled = new Map<string, { source?: string; template: Template }>();
	const inFlightLoads = new Map<string, Promise<Template>>();

	async function prepare(filename: string) {
		const previous = compiled.get(filename);
		if (previous && !reloadOnChange) return previous.template;
		const source = await readFile(filename, 'utf8');
		if (previous?.source === source) return previous.template;
		const template = await compileTemplate(filename, source);
		compiled.set(filename, { source: reloadOnChange ? source : undefined, template });
		return template;
	}

	async function load(filename: string): Promise<Template> {
		if (!isAbsolute(filename)) throw new Error(`Expected an absolute template path: ${filename}`);
		const existing = inFlightLoads.get(filename);
		if (existing) return existing;
		const newLoad = prepare(filename).finally(() => inFlightLoads.delete(filename));
		inFlightLoads.set(filename, newLoad);
		return newLoad;
	}

	return { load };
}
