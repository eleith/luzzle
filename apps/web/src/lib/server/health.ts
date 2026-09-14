import type { AppConfig } from './config.js'

export interface ConfigEntry {
	name: string
	value: string
}

export interface PieceTypeSummary {
	type: string
	fields: ConfigEntry[]
	components: ConfigEntry[]
}

export interface AuthSummary {
	enabled: boolean
	type: string
	issuer: string | null
	clientId: string | null
	username: string | null
}

export interface SyncTargetSummary {
	configured: boolean
	remote: string | null
	path: string | null
}

export interface WorkerSummary {
	address: string | null
	queuePath: string | null
}

export interface HealthConfigSummary {
	pieceTypes: PieceTypeSummary[]
	auth: AuthSummary
	archiveSync: SyncTargetSummary
	cdnSync: SyncTargetSummary & { strategy: string | null }
	worker: WorkerSummary
	ai: { configured: boolean; provider: string | null }
}

function configuredEntries(obj: object | undefined): ConfigEntry[] {
	if (!obj) return []
	return Object.entries(obj)
		.filter(([, value]) => value !== undefined)
		.map(([name, value]) => ({
			name,
			value: Array.isArray(value) ? value.join(', ') : String(value)
		}))
}

export function buildHealthConfigSummary(config: AppConfig): HealthConfigSummary {
	return {
		pieceTypes: config.pieces.map((piece) => ({
			type: piece.type,
			fields: configuredEntries(piece.fields),
			components: configuredEntries(piece.components)
		})),
		auth: {
			enabled: config.auth.enabled,
			type: config.auth.type,
			issuer: config.auth.oidc?.issuer ?? null,
			clientId: config.auth.oidc?.clientId ?? null,
			username: config.auth.credentials?.username ?? null
		},
		archiveSync: {
			configured: Boolean(config.sync.archive?.remote),
			remote: config.sync.archive?.remote ?? null,
			path: config.sync.archive?.path ?? null
		},
		cdnSync: {
			configured: Boolean(config.sync.cdn?.remote),
			remote: config.sync.cdn?.remote ?? null,
			path: config.sync.cdn?.path ?? null,
			strategy: config.sync.cdn?.strategy ?? null
		},
		worker: {
			address: config.network?.internal?.worker ?? null,
			queuePath: config.worker?.queue?.path ?? null
		},
		ai: {
			configured: Boolean(config.ai?.api_key),
			provider: config.ai?.provider ?? null
		}
	}
}
