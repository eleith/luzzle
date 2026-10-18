// Intentionally runtime-only: this file is also copied into isolated host/container proofs.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertCompatible } from '@luzzle/web.templates/compatibility';

export async function checkPreparedFixtures({ directory, renderTemplate, render, components }) {
	const metadata = JSON.parse(await readFile(path.join(directory, 'compatibility.json'), 'utf8'));
	// This must precede ALL executable prepared-module imports.
	assertCompatible(metadata);
	assert.equal(typeof render, 'function');
	assert.equal(typeof renderTemplate, 'function');
	assert.equal(typeof components.NavBanner, 'function');
	assert.equal(typeof components.PieceIcon, 'function');
	const load = async (name) =>
		(await import(pathToFileURL(path.join(directory, `${name}.js`)).href)).default;
	const [Page, Icon, Throwing, NoNavigation, DuplicateNavigation, ContextProbe] = await Promise.all(
		['Page', 'Icon', 'Throwing', 'NoNavigation', 'DuplicateNavigation', 'ContextProbe'].map(load)
	);

	// The compiler's internal-server import, public getContext, and the supplied
	// server render must all reach the same context stack. Use real compiled code.
	const probe = render(ContextProbe, { context: new Map([['fixture-probe', 'shared-facades']]) });
	assert.match(probe.body, /data-probe="shared-facades"/);
	assert.match(probe.body, />shared-facades<\/p>/);

	const pieces = [
		{ id: 'first', type: 'arbitrary-one', title: 'First <unsafe>&"' },
		{ id: 'second', type: 'another-type', title: 'Second <unsafe>&"' }
	];
	function request(token, extra = {}) {
		const destroyed = [];
		const helpers = {
			forPiece(piece) {
				// Each closure remains bound after later forPiece calls.
				const url = `/request/${token}/${piece.id}?q=<"&`;
				return { getUrl: () => url };
			},
			destroyed(value) {
				destroyed.push(value);
			},
			fail() {
				throw new Error('intentional fixture failure');
			}
		};
		const options = {
			props: { data: { pieces, title: `Title ${token} <script>&"`, background: token }, helpers },
			iconForPiece: () => Icon,
			context: new Map([['fixture-request', token]]),
			...extra
		};
		return { options, destroyed };
	}
	let requestsChecked = 0;
	function check(token) {
		requestsChecked++;
		const { options, destroyed } = request(token);
		const result = renderTemplate(Page, options);
		assert.equal(result.usedFallback, false);
		assert.equal(result.navigation.background, token);
		assert.equal(result.navigation.showRandom, true);
		assert.equal(result.navigation.showSearch, true);
		assert.equal(result.navigation.color, 'var(--color-on-surface)');
		assert.match(result.body, new RegExp(`data-request="${token}"`));
		assert.equal((result.body.match(new RegExp(`data-parent="${token}"`, 'g')) ?? []).length, 2);
		assert.match(result.body, /data-width="80"/);
		assert.match(result.body, /class="custom-icon[^"]*\bactive\b/);
		assert.doesNotMatch(result.body, /class="piece-icon/); // no required styling wrapper
		assert.ok(result.body.includes(`Title ${token} &lt;script>&amp;"`));
		assert.ok(result.body.includes('First &lt;unsafe>&amp;"'));
		assert.ok(!result.body.includes('<script>'));
		const escapedUrl = (id) => `/request/${token}/${id}?q=&lt;"&amp;`;
		assert.ok(
			result.body.includes(`${escapedUrl('first')}|${escapedUrl('second')}|${escapedUrl('first')}`)
		);
		assert.ok(result.body.includes(`/request/${token}/first?q=&lt;&quot;&amp;`));
		assert.ok(result.body.includes('svelte/internal/server')); // ordinary string was NOT rewritten
		assert.ok(result.head.includes(`<title>Title ${token} &lt;script>&amp;"</title>`));
		assert.match(result.head, /name="fixture-icon" content="first"/);
		assert.match(result.head, /name="fixture-icon" content="second"/);
		// Base and active selectors each appear once, despite two icon instances.
		assert.equal((result.head.match(/\.custom-icon/g) ?? []).length, 2);
		assert.equal((result.head.match(/\.helper-output/g) ?? []).length, 1);
		assert.deepEqual(destroyed, [token]);
		assert.equal(options.context.size, 1); // caller context was not mutated
		return result;
	}

	const first = check('first-request');
	check('second-request');
	assert.equal(first.navigation.background, 'first-request');
	const scheduled = await Promise.all(
		Array.from({ length: 16 }, (_, index) =>
			Promise.resolve().then(() => check(`scheduled-${index}`))
		)
	);
	for (let index = 0; index < scheduled.length; index++) {
		assert.ok(!scheduled[index].body.includes(`/request/scheduled-${(index + 1) % 16}/`));
	}

	const defaults = request('default-icon', { iconForPiece: () => undefined });
	const defaultResult = renderTemplate(Page, defaults.options);
	assert.match(defaultResult.body, /default-icon/);
	assert.match(defaultResult.head, /\.default-icon/);
	assert.doesNotMatch(defaultResult.head, /fixture-icon|\.custom-icon/);

	const failing = request('failure');
	assert.throws(() => renderTemplate(Throwing, failing.options), /intentional fixture failure/);
	const fallback = renderTemplate(Throwing, { ...failing.options, fallback: NoNavigation });
	assert.equal(fallback.usedFallback, true);
	assert.equal(fallback.navigation, null);
	assert.match(fallback.body, /class="fallback" data-request="failure"/);
	assert.doesNotMatch(fallback.head + fallback.body, /discarded/);
	assert.throws(
		() => renderTemplate(Throwing, { ...failing.options, fallback: Throwing }),
		/intentional fixture failure/
	);
	assert.throws(() => renderTemplate(DuplicateNavigation, failing.options), /Only one NavBanner/);
	const absent = renderTemplate(NoNavigation, request('no-navigation').options);
	assert.equal(absent.navigation, null);
	check('after-failure');

	// Nested synchronous renders restore the outer runtime context too.
	const nested = request('outer');
	const original = nested.options.props.helpers.forPiece;
	nested.options.props.helpers.forPiece = (piece) => {
		const inner = renderTemplate(NoNavigation, request('inner').options);
		assert.match(inner.body, /data-request="inner"/);
		return original(piece);
	};
	const outer = renderTemplate(Page, nested.options);
	assert.equal(outer.navigation.background, 'outer');
	assert.equal((outer.body.match(/data-parent="outer"/g) ?? []).length, 2);
	return { requestsChecked, body: first.body, head: first.head, navigation: first.navigation };
}
