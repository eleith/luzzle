import { type AppConfigPublic } from '$lib/server/config'
import type { Session } from '@auth/core/types'

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			auth(): Promise<Session | null>
		}
		interface PageData {
			session: Session | null
			config: AppConfigPublic
			meta: {
				title?: string
				description?: string
				image?: string
				type?: string
				canonical?: string
				locale?: string
			}
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {}
