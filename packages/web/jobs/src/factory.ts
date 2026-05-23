import { Job, type JobClassType } from '@sidequest/core'

export type JobStub<Payload, Result> = (new () => Job & {
	run(payload: Payload): Promise<Result>
}) & JobClassType

export function createJobStub<Payload, Result>(
	name: string
): JobStub<Payload, Result> {
	const cls = class extends Job {
		async run(): Promise<Result> {
			throw new Error(
				`${name}: producer-side stub; real impl runs in @luzzle/web.worker`
			)
		}
	}
	Object.defineProperty(cls, 'name', { value: name })
	return cls as unknown as JobStub<Payload, Result>
}
