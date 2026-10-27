import type { Kysely } from 'kysely'
import type { AppDatabase } from '../services/db.js'

export class JobProgress {
	private readonly db: Kysely<AppDatabase>

	constructor(db: Kysely<AppDatabase>) {
		this.db = db
	}

	async listJobIds(): Promise<string[]> {
		const rows = await this.db
			.selectFrom('job_progress')
			.select('job_id')
			.union(this.db.selectFrom('job_progress_logs').select('job_id'))
			.execute()
		return rows.map((row) => row.job_id)
	}

	async purgeJobs(jobIds: string[]): Promise<void> {
		if (jobIds.length === 0) return
		await this.db.transaction().execute(async (trx) => {
			for (let offset = 0; offset < jobIds.length; offset += 100) {
				const batch = jobIds.slice(offset, offset + 100)
				await trx.deleteFrom('job_progress_logs').where('job_id', 'in', batch).execute()
				await trx.deleteFrom('job_progress').where('job_id', 'in', batch).execute()
			}
		})
	}

	async start(jobId: string, phase: string): Promise<void> {
		await this.db
			.insertInto('job_progress')
			.values({
				job_id: jobId,
				phase,
				status: 'running',
				started_at: Date.now(),
			})
			.onConflict((oc) =>
				oc.columns(['job_id', 'phase']).doUpdateSet({
					status: 'running',
					started_at: Date.now(),
					finished_at: null,
					message: null,
				})
			)
			.execute()
	}

	async complete(jobId: string, phase: string, message?: string): Promise<void> {
		await this.db
			.updateTable('job_progress')
			.set({
				status: 'completed',
				finished_at: Date.now(),
				message: message ?? null,
			})
			.where('job_id', '=', jobId)
			.where('phase', '=', phase)
			.execute()
	}

	async skip(jobId: string, phase: string, reason: string): Promise<void> {
		await this.db
			.updateTable('job_progress')
			.set({
				status: 'skipped',
				finished_at: Date.now(),
				message: reason,
			})
			.where('job_id', '=', jobId)
			.where('phase', '=', phase)
			.execute()
	}

	async fail(jobId: string, phase: string, err: Error | unknown): Promise<void> {
		const message = err instanceof Error ? err.message : String(err)
		await this.db
			.updateTable('job_progress')
			.set({
				status: 'failed',
				finished_at: Date.now(),
				message,
			})
			.where('job_id', '=', jobId)
			.where('phase', '=', phase)
			.execute()
	}
}
