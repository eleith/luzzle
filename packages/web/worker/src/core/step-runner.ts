import type { Step } from './step.js'
import type { JobProgress } from './job-progress.js'
import type { PhaseLogger } from './phase-logger.js'
import type { WorkerContext } from '../services/context.js'

export class StepRunner {
	constructor(
		private readonly ctx: WorkerContext,
		private readonly progress: JobProgress,
		private readonly jobId: string
	) {}

	async run<I, O>(step: Step<I, O>, input: I): Promise<O | undefined> {
		const phaseLogger = this.ctx.logger as PhaseLogger
		await this.progress.start(this.jobId, step.name)
		phaseLogger.setActivePhase({ jobId: this.jobId, phase: step.name })
		try {
			const result = await step.run(input, this.ctx)
			if (result.status === 'skipped') {
				await this.progress.skip(this.jobId, step.name, result.message ?? 'skipped')
				return undefined
			}
			await this.progress.complete(this.jobId, step.name, result.message)
			return result.value
		} catch (err) {
			await this.progress.fail(this.jobId, step.name, err)
			throw err
		} finally {
			phaseLogger.clearActivePhase()
		}
	}
}
