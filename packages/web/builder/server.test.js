import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

describe('Builder Server', () => {
	let server;
	let baseUrl;
	let mockSpawn;
	const TEST_PORT = 0; // Random port

	beforeEach(async () => {
		vi.resetModules();

		// Setup env vars
		process.env.LUZZLE_BUILD_TOKEN = 'test-token';
		process.env.LUZZLE_BUILD_SCRIPT = '/tmp/test.sh';

		// Create mock spawn
		mockSpawn = vi.fn().mockImplementation(() => {
			const child = new EventEmitter();
			child.stdout = new EventEmitter();
			child.stderr = new EventEmitter();

			setTimeout(() => {
				child.stdout.emit('data', 'log output\n');
				child.emit('close', 0);
			}, 10);

			return child;
		});

		// Import the factory
		const { createServer } = await import('./server.js');

		// Create fresh server with mock spawn
		server = createServer(mockSpawn);

		await new Promise((resolve) => server.listen(TEST_PORT, '127.0.0.1', resolve));
		const address = server.address();
		baseUrl = `http://127.0.0.1:${address.port}`;
	});

	afterEach(async () => {
		delete process.env.LUZZLE_BUILD_TOKEN;
		delete process.env.LUZZLE_BUILD_SCRIPT;
		if (server) {
			await new Promise((resolve) => server.close(resolve));
		}
	});

	const requestOptions = {
		method: 'POST',
		headers: { Connection: 'close' },
	};

	it('should return 404 for unknown routes', async () => {
		const res = await fetch(`${baseUrl}/unknown`, requestOptions);
		expect(res.status).toBe(404);
	});

	it('should return 401 without token', async () => {
		const res = await fetch(`${baseUrl}/hooks/build`, requestOptions);
		expect(res.status).toBe(401);
	});

	it('should return 401 with invalid token', async () => {
		const res = await fetch(`${baseUrl}/hooks/build?token=wrong`, requestOptions);
		expect(res.status).toBe(401);
	});

	it('should trigger build with valid token', async () => {
		const res = await fetch(`${baseUrl}/hooks/build?token=test-token`, requestOptions);

		expect(res.status).toBe(200);
		expect(res.headers.get('Transfer-Encoding')).toBe('chunked');

		const text = await res.text();
		expect(text).toContain('Starting deployment script');
		expect(text).toContain('log output');
		expect(text).toContain('Build finished');

		expect(mockSpawn).toHaveBeenCalledWith('bash', ['/tmp/test.sh']);
	});

	it('should handle child process stderr output', async () => {
		mockSpawn.mockImplementation(() => {
			const child = new EventEmitter();
			child.stdout = new EventEmitter();
			child.stderr = new EventEmitter();

			setTimeout(() => {
				child.stderr.emit('data', 'error log output\n');
				child.emit('close', 1);
			}, 10);

			return child;
		});

		const res = await fetch(`${baseUrl}/hooks/build?token=test-token`, requestOptions);

		const text = await res.text();
		expect(text).toContain('error log output');
		expect(text).toContain('Build finished with exit code 1');
	});

	it('should handle spawn error', async () => {
		mockSpawn.mockImplementation(() => {
			const child = new EventEmitter();
			child.stdout = new EventEmitter();
			child.stderr = new EventEmitter();

			setTimeout(() => {
				child.emit('error', new Error('Failed to start'));
			}, 10);

			return child;
		});

		const res = await fetch(`${baseUrl}/hooks/build?token=test-token`, requestOptions);

		const text = await res.text();
		expect(text).toContain('Error: Failed to start script');

		// Verify we can build again (isBuilding was reset)
		mockSpawn.mockImplementation(() => {
			const child = new EventEmitter();
			child.stdout = new EventEmitter();
			child.stderr = new EventEmitter();
			setTimeout(() => child.emit('close', 0), 10);
			return child;
		});

		const res2 = await fetch(`${baseUrl}/hooks/build?token=test-token`, requestOptions);
		expect(res2.status).toBe(200);
	});

	it('should reject concurrent builds', async () => {
		// Override mock for this test to hang
		let finishBuild;
		const buildFinishedPromise = new Promise((resolve) => {
			finishBuild = resolve;
		});

		mockSpawn.mockImplementation(() => {
			const child = new EventEmitter();
			child.stdout = new EventEmitter();
			child.stderr = new EventEmitter();

			// Wait for manual trigger to finish
			buildFinishedPromise.then(() => {
				child.emit('close', 0);
			});

			return child;
		});

		const req1 = fetch(`${baseUrl}/hooks/build?token=test-token`, requestOptions);

		// Wait a bit to ensure server processes first request
		await new Promise((r) => setTimeout(r, 50));

		const req2 = await fetch(`${baseUrl}/hooks/build?token=test-token`, requestOptions);

		expect(req2.status).toBe(429);
		const text = await req2.text();
		expect(text).toContain('Build already in progress');

		// Finish the first build so we don't hang
		finishBuild();
		await req1;
	});
});