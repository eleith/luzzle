export const MODEL_NAME = 'gemini-3.8-flash'
export const REQUEST_TIMEOUT_MS = 5 * 60 * 1000
export const FILE_POLL_MS = 5000
export const CLEANUP_TIMEOUT_MS = 10_000

export const DEFAULT_GENERATION_LIMITS = {
	maxFiles: 10,
	maxFileBytes: 50_000_000,
	maxTotalFileBytes: 100_000_000,
	maxOutputBytes: 1_000_000,
	maxFileProcessingMs: 5 * 60 * 1000,
} as const
