import { type AppConfigPublic } from '$lib/server/config'

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		interface PageData {
			config: AppConfigPublic,
			meta: {
				title?: string,
				description?: string,
				image?: string,
				type?: string,
				canonical?: string
				locale?: string
			}
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {}
