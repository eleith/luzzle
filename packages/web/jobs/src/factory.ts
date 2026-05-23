import { Job } from '@sidequest/core'

export type JobStubClass = typeof Job

export function createJobStub<Payload, Result>(name: string): JobStubClass {
	const cls = class extends Job {
		async run(_payload: Payload): Promise<Result> {
			throw new Error(
				`${name}: producer-side stub; real impl runs in @luzzle/web.worker`
			)
		}
	}
	Object.defineProperty(cls, 'name', { value: name })
	return cls
}
