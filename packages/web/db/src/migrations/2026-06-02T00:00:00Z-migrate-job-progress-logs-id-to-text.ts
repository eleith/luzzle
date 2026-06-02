import { Kysely } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('job_progress_logs').execute()
	await db.schema.dropTable('job_progress').execute()

	await db.schema
		.createTable('job_progress')
		.addColumn('job_id', 'text', (col) => col.notNull())
		.addColumn('phase', 'text', (col) => col.notNull())
		.addColumn('status', 'text', (col) => col.notNull())
		.addColumn('started_at', 'integer', (col) => col.notNull())
		.addColumn('finished_at', 'integer')
		.addColumn('message', 'text')
		.addPrimaryKeyConstraint('job_progress_pk', ['job_id', 'phase'])
		.execute()

	await db.schema
		.createTable('job_progress_logs')
		.addColumn('job_id', 'text', (col) => col.notNull())
		.addColumn('phase', 'text', (col) => col.notNull())
		.addColumn('line_number', 'integer', (col) => col.notNull())
		.addColumn('ts', 'integer', (col) => col.notNull())
		.addColumn('level', 'text', (col) => col.notNull())
		.addColumn('message', 'text', (col) => col.notNull())
		.addPrimaryKeyConstraint('job_progress_logs_pk', ['job_id', 'phase', 'line_number'])
		.execute()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('job_progress_logs').execute()
	await db.schema.dropTable('job_progress').execute()

	await db.schema
		.createTable('job_progress')
		.addColumn('job_id', 'integer', (col) => col.notNull())
		.addColumn('phase', 'text', (col) => col.notNull())
		.addColumn('status', 'text', (col) => col.notNull())
		.addColumn('started_at', 'integer', (col) => col.notNull())
		.addColumn('finished_at', 'integer')
		.addColumn('message', 'text')
		.addPrimaryKeyConstraint('job_progress_pk', ['job_id', 'phase'])
		.execute()

	await db.schema
		.createTable('job_progress_logs')
		.addColumn('job_id', 'integer', (col) => col.notNull())
		.addColumn('phase', 'text', (col) => col.notNull())
		.addColumn('line_number', 'integer', (col) => col.notNull())
		.addColumn('ts', 'integer', (col) => col.notNull())
		.addColumn('level', 'text', (col) => col.notNull())
		.addColumn('message', 'text', (col) => col.notNull())
		.addPrimaryKeyConstraint('job_progress_logs_pk', ['job_id', 'phase', 'line_number'])
		.execute()
}
