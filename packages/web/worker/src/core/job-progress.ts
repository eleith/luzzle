import type { Kysely } from 'kysely'
import type { AppDatabase } from '../services/db.js'

export class JobProgress {
	private readonly db: Kysely<AppDatabase>
	private readonly retentionDays: number

	constructor(db: Kysely<AppDatabase>, retentionDays: number = 2) {
		this.db = db
		this.retentionDays = retentionDays
	}

	async purgeOld(): Promise<void> {
		try {
			const cutoffMs = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000

			const oldJobs = await this.db
				.selectFrom('job_progress')
				.select('job_id')
				.where('started_at', '<', cutoffMs)
				.execute()

			const oldJobIds = oldJobs.map(row => row.job_id)

			if (oldJobIds.length > 0) {
				await this.db
					.deleteFrom('job_progress_logs')
					.where('job_id', 'in', oldJobIds)
					.execute()

				await this.db
					.deleteFrom('job_progress')
					.where('job_id', 'in', oldJobIds)
					.execute()
			}
		} catch (err) {
			console.error('JobProgress purgeOld failed:', err)
		}
	}

	async start(jobId: number, phase: string): Promise<void> {
		await this.db
			.insertInto('job_progress')
			.values({
				job_id: jobId,
				phase,
				status: 'running',
				started_at: Date.now()
			})
			.onConflict((oc) =>
				oc.columns(['job_id', 'phase']).doUpdateSet({
					status: 'running',
					started_at: Date.now(),
					finished_at: null,
					message: null
				})
			)
			.execute()
	}

	async complete(jobId: number, phase: string, message?: string): Promise<void> {
		await this.db
			.updateTable('job_progress')
			.set({
				status: 'completed',
				finished_at: Date.now(),
				message: message ?? null
			})
			.where('job_id', '=', jobId)
			.where('phase', '=', phase)
			.execute()
	}

	async skip(jobId: number, phase: string, reason: string): Promise<void> {
		await this.db
			.updateTable('job_progress')
			.set({
				status: 'skipped',
				finished_at: Date.now(),
				message: reason
			})
			.where('job_id', '=', jobId)
			.where('phase', '=', phase)
			.execute()
	}

	async fail(jobId: number, phase: string, err: Error | unknown): Promise<void> {
		const message = err instanceof Error ? err.message : String(err)
		await this.db
			.updateTable('job_progress')
			.set({
				status: 'failed',
				finished_at: Date.now(),
				message
			})
			.where('job_id', '=', jobId)
			.where('phase', '=', phase)
			.execute()
	}
}
