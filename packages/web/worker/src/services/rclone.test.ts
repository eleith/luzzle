/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest'
import { RcloneClient } from './rclone.js'
import type { Logger } from './logger.js'
import { EventEmitter } from 'events'

vi.mock('child_process', () => {
	return {
		spawn: vi.fn()
	}
})

describe('RcloneClient line buffering', () => {
	it('should route subprocess output line-by-line to logger.stdout and logger.stderr', async () => {
		const logger = {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			stdout: vi.fn(),
			stderr: vi.fn(),
		} as unknown as Logger

		const { spawn } = await import('child_process')

		const mockChild = new EventEmitter() as any
		mockChild.stdout = new EventEmitter()
		mockChild.stderr = new EventEmitter()
		vi.mocked(spawn).mockReturnValue(mockChild)

		const client = new RcloneClient(logger)

		// Start run but don't await yet
		const runPromise = (client as any).run('rclone', ['args'])

		// Emit chunks that don't end in newline
		mockChild.stdout.emit('data', Buffer.from('hello '))
		mockChild.stdout.emit('data', Buffer.from('world\nand another '))
		
		// Expect only complete lines logged so far
		expect(logger.stdout).toHaveBeenCalledTimes(1)
		expect(logger.stdout).toHaveBeenCalledWith('hello world')

		// Emit the rest of the second line and a third line
		mockChild.stdout.emit('data', Buffer.from('line\n'))
		expect(logger.stdout).toHaveBeenCalledTimes(2)
		expect(logger.stdout).toHaveBeenCalledWith('and another line')

		// Emit to stderr with multiple lines at once
		mockChild.stderr.emit('data', Buffer.from('err1\nerr2\nerr3'))
		expect(logger.stderr).toHaveBeenCalledTimes(2)
		expect(logger.stderr).toHaveBeenCalledWith('err1')
		expect(logger.stderr).toHaveBeenCalledWith('err2')

		// End process, should flush trailing buffer
		mockChild.emit('close', 0)
		await runPromise

		expect(logger.stderr).toHaveBeenCalledTimes(3)
		expect(logger.stderr).toHaveBeenCalledWith('err3')
	})
})
