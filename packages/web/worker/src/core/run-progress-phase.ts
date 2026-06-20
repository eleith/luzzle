import type { Step, StepContext } from './step.js'
import type { JobProgress } from './job-progress.js'
import { PhaseLogger } from './phase-logger.js'

export type DurableStepApi = {
	run<Output>(
		config: { name: string },
		fn: () => Promise<Output | undefined> | Output | undefined
	): Promise<Output>
}

export async function runProgressPhase<I, O>(
	step: DurableStepApi,
	ctx: StepContext,
	jobId: string,
	progress: JobProgress,
	jobStep: Step<I, O>,
	input: I
): Promise<O | undefined> {
	return step.run<O | undefined>({ name: jobStep.name }, async () => {
		const { logger } = ctx

		if (logger instanceof PhaseLogger) {
			logger.setActivePhase({ jobId, phase: jobStep.name })
		}

		await progress.start(jobId, jobStep.name)

		try {
			const result = await jobStep.run(input, ctx)

			if (result.status === 'skipped') {
				await progress.skip(jobId, jobStep.name, result.message || 'skipped')
				return undefined
			}

			await progress.complete(jobId, jobStep.name)
			return result.value
		} catch (err) {
			await progress.fail(jobId, jobStep.name, err)
			throw err
		} finally {
			if (logger instanceof PhaseLogger) {
				logger.clearActivePhase()
			}
		}
	})
}
