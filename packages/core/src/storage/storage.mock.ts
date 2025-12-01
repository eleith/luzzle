import { vi } from "vitest";
import LuzzleStorage from "./abstract";

export function makeStorage(root: string): LuzzleStorage {
	return {
		root,
		type: 'fs',
		parseArgPath: vi.fn(),
		readFile: vi.fn(),
		writeFile: vi.fn(),
		getFilesIn: vi.fn(),
		exists: vi.fn(),
		delete: vi.fn(),
		stat: vi.fn(),
		createReadStream: vi.fn(),
		createWriteStream: vi.fn(),
		makeDirectory: vi.fn(),
	} as unknown as LuzzleStorage
}
