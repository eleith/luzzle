import { PUBLIC_SITE_URL } from '$env/static/public';
import { getPiecesForFeed, rememberHasSeenHtmlFeed,  } from '$lib/feeds/utils'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, cookies, url }) => {
	const { piece: type } = params;
	const pieces = await getPiecesForFeed(type);

	rememberHasSeenHtmlFeed(cookies);

	return {
		pieces,
		type,
		rssUrl: `https://${PUBLIC_SITE_URL}${url.pathname.replace(/\.html\/?$/, '.xml')}`,
	};
};

