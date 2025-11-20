import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

const $$css = {
	hash: 'svelte-hash',
	code: ''
};

export default function Test_hash($$renderer, $$props) {
	$$renderer.global.css.add($$css);

	$$renderer.component(($$renderer) => {
		let { data } = $$props;
		$$renderer.push(`hi`);
	});
}
