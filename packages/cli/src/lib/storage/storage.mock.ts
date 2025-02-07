import { vi } from 'vitest'
import StorageFs from './fs.js'

vi.mock('./fs')

function mockStorage(root: string) {
	const storage = new StorageFs(root)
	return vi.mocked(storage)
}

export { mockStorage }
