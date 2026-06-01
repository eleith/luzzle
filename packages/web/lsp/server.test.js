import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import WebSocket from "ws";

let mockServerReaderCallbacks;
let mockWsConnDispose;
let mockServerDisposes;

function setupMocks({ failedProcesses = [] } = {}) {
	mockServerReaderCallbacks = [];
	mockWsConnDispose = vi.fn();
	mockServerDisposes = [];

	let serverIndex = 0;

	vi.doMock("vscode-ws-jsonrpc", () => ({
		toSocket: vi.fn((ws) => ws),
	}));

	vi.doMock("vscode-ws-jsonrpc/server", () => ({
		createWebSocketConnection: vi.fn(() => ({
			reader: {
				listen: vi.fn(),
			},
			writer: { write: vi.fn() },
			onClose: vi.fn(),
			dispose: mockWsConnDispose,
		})),
		createServerProcess: vi.fn((name) => {
			if (failedProcesses.includes(name)) return null;

			const idx = serverIndex++;
			const dispose = vi.fn();
			mockServerDisposes[idx] = dispose;
			const readerCallback = { fn: null };
			mockServerReaderCallbacks[idx] = readerCallback;

			return {
				reader: {
					listen: vi.fn((cb) => {
						readerCallback.fn = cb;
					}),
				},
				writer: { write: vi.fn() },
				onClose: vi.fn(),
				dispose,
			};
		}),
	}));
}

async function startServer(routes) {
	const { createServer } = await import("./server.js");
	const server = routes ? createServer(routes) : createServer();
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	const address = server.address();
	return {
		server,
		baseUrl: `http://127.0.0.1:${address.port}`,
		wsUrl: `ws://127.0.0.1:${address.port}`,
	};
}

describe("LSP WebSocket Server", () => {
	let server;
	let baseUrl;
	let wsUrl;

	beforeEach(async () => {
		vi.resetModules();
		setupMocks();
		({ server, baseUrl, wsUrl } = await startServer());
	});

	afterEach(async () => {
		if (server) {
			await new Promise((resolve) => server.close(resolve));
		}
	});

	it("should return 404 for HTTP requests", async () => {
		const res = await fetch(`${baseUrl}/admin/lsp`, { method: "GET" });
		expect(res.status).toBe(404);
	});

	it("should reject WebSocket upgrade on wrong path", async () => {
		const ws = new WebSocket(`${wsUrl}/unknown`);

		const error = await new Promise((resolve) => {
			ws.on("error", resolve);
			ws.on("unexpected-response", (_req, res) => resolve(res));
		});

		expect(error.statusCode).toBe(404);
	});

	it("should handle upgrade with no url", async () => {
		const net = await import("net");
		const socket = new net.Socket();
		const destroySpy = vi.spyOn(socket, "destroy");
		const writeSpy = vi.spyOn(socket, "write").mockReturnValue(true);

		server.emit(
			"upgrade",
			{ url: undefined, headers: {} },
			socket,
			Buffer.alloc(0),
		);

		expect(writeSpy).toHaveBeenCalledWith("HTTP/1.1 404 Not Found\r\n\r\n");
		expect(destroySpy).toHaveBeenCalled();
	});

	it("should reject old sub-routes", async () => {
		const ws = new WebSocket(`${wsUrl}/admin/lsp/frontmatter`);

		const error = await new Promise((resolve) => {
			ws.on("error", resolve);
			ws.on("unexpected-response", (_req, res) => resolve(res));
		});

		expect(error.statusCode).toBe(404);
	});

	it("should accept WebSocket on /admin/lsp and spawn both processes", async () => {
		const { createServerProcess } = await import("vscode-ws-jsonrpc/server");

		const ws = new WebSocket(`${wsUrl}/admin/lsp`);
		await new Promise((resolve) => ws.on("open", resolve));

		expect(ws.readyState).toBe(WebSocket.OPEN);
		expect(createServerProcess).toHaveBeenCalledTimes(2);
		expect(createServerProcess).toHaveBeenCalledWith(
			"luzzle-lsp",
			"luzzle-lsp",
			["--stdio"],
			undefined,
		);
		expect(createServerProcess).toHaveBeenCalledWith(
			"markdownlint-lsp",
			"node",
			expect.arrayContaining([expect.stringContaining("markdownlint-lsp.js")]),
			undefined,
		);

		ws.close();
		await new Promise((resolve) => ws.on("close", resolve));
	});

	it("should handle client disconnect", async () => {
		const ws = new WebSocket(`${wsUrl}/admin/lsp`);
		await new Promise((resolve) => ws.on("open", resolve));

		ws.close();
		await new Promise((resolve) => ws.on("close", resolve));
	});

	it("should close WebSocket when all processes fail", async () => {
		await new Promise((resolve) => server.close(resolve));

		vi.resetModules();
		setupMocks({ failedProcesses: ["luzzle-lsp", "markdownlint-lsp"] });

		const started = await startServer();
		server = started.server;

		const ws = new WebSocket(`${started.wsUrl}/admin/lsp`);
		await new Promise((resolve) => ws.on("open", resolve));
		await new Promise((resolve) => ws.on("close", resolve));

		expect(ws.readyState).toBe(WebSocket.CLOSED);
	});

	it("should work with custom routes", async () => {
		await new Promise((resolve) => server.close(resolve));

		vi.resetModules();
		setupMocks();

		const customRoutes = [
			{
				name: "test-lsp",
				command: "echo",
				args: ["hello"],
				spawnOptions: {},
				shouldRespond: () => true,
			},
		];

		const started = await startServer(customRoutes);
		server = started.server;

		const ws = new WebSocket(`${started.wsUrl}/admin/lsp`);
		await new Promise((resolve) => ws.on("open", resolve));

		const { createServerProcess } = await import("vscode-ws-jsonrpc/server");
		expect(createServerProcess).toHaveBeenCalledWith(
			"test-lsp",
			"echo",
			["hello"],
			{},
		);

		ws.close();
		await new Promise((resolve) => ws.on("close", resolve));
	});
});

describe("createMultiplex", () => {
	let createMultiplex;
	let mockWsConn;
	let mockCreateServerProcess;
	let readerCallbacks;
	let writerMocks;

	beforeEach(async () => {
		vi.resetModules();
		readerCallbacks = {};
		writerMocks = {};

		const serverIdx = { value: 0 };

		vi.doMock("vscode-ws-jsonrpc", () => ({
			toSocket: vi.fn(),
		}));

		vi.doMock("vscode-ws-jsonrpc/server", () => ({
			createWebSocketConnection: vi.fn(),
			createServerProcess: vi.fn((_name) => {
				const idx = serverIdx.value++;
				const writerWrite = vi.fn();
				writerMocks[idx] = writerWrite;
				const readerCb = { fn: null };
				readerCallbacks[idx] = readerCb;
				return {
					reader: { listen: vi.fn((cb) => (readerCb.fn = cb)) },
					writer: { write: writerWrite },
					onClose: vi.fn(),
					dispose: vi.fn(),
				};
			}),
		}));

		const mod = await import("./server.js");
		createMultiplex = mod.createMultiplex;
		mockCreateServerProcess = (await import("vscode-ws-jsonrpc/server"))
			.createServerProcess;

		const wsReaderCb = { fn: null };
		readerCallbacks.ws = wsReaderCb;
		const wsWriterWrite = vi.fn();
		writerMocks.ws = wsWriterWrite;
		mockWsConn = {
			reader: { listen: vi.fn((cb) => (wsReaderCb.fn = cb)) },
			writer: { write: wsWriterWrite },
			onClose: vi.fn(),
			dispose: vi.fn(),
		};
	});

	function makeRoutes(...names) {
		return names.map((name) => ({
			name,
			command: name,
			args: [],
			spawnOptions: {},
			shouldRespond: () => true,
		}));
	}

	function openDocument(uri, text) {
		readerCallbacks.ws.fn({
			jsonrpc: "2.0",
			method: "textDocument/didOpen",
			params: { textDocument: { uri, languageId: "markdown", version: 1, text } },
		});
	}

	function sendCompletion(id, uri, line, character = 0) {
		readerCallbacks.ws.fn({
			jsonrpc: "2.0",
			id,
			method: "textDocument/completion",
			params: { textDocument: { uri }, position: { line, character } },
		});
	}

	it("should return null when all processes fail", () => {
		mockCreateServerProcess.mockReturnValue(null);
		const result = createMultiplex(mockWsConn, makeRoutes("a"));
		expect(result).toBeNull();
	});

	it("should broadcast client messages to all servers", () => {
		createMultiplex(mockWsConn, makeRoutes("a", "b"));

		const notification = {
			jsonrpc: "2.0",
			method: "textDocument/didOpen",
			params: { textDocument: { uri: "file:///t.md", text: "" } },
		};
		readerCallbacks.ws.fn(notification);

		expect(writerMocks[0]).toHaveBeenCalledWith(notification);
		expect(writerMocks[1]).toHaveBeenCalledWith(notification);
	});

	it("should forward responses from primary server", () => {
		createMultiplex(mockWsConn, makeRoutes("primary", "secondary"));

		const response = { jsonrpc: "2.0", id: 1, result: { capabilities: {} } };
		readerCallbacks[0].fn(response);

		expect(writerMocks.ws).toHaveBeenCalledWith(response);
	});

	it("should drop responses from secondary servers", () => {
		createMultiplex(mockWsConn, makeRoutes("primary", "secondary"));

		const response = { jsonrpc: "2.0", id: 1, result: { capabilities: {} } };
		readerCallbacks[1].fn(response);

		expect(writerMocks.ws).not.toHaveBeenCalled();
	});

	it("should forward notifications from all servers", () => {
		createMultiplex(mockWsConn, makeRoutes("primary", "secondary"));

		const notification = {
			jsonrpc: "2.0",
			method: "window/logMessage",
			params: { message: "hi" },
		};
		readerCallbacks[1].fn(notification);

		expect(writerMocks.ws).toHaveBeenCalledWith(notification);
	});

	it("should merge diagnostics from all servers", () => {
		createMultiplex(mockWsConn, makeRoutes("primary", "secondary"));

		const uri = "file:///test.md";
		const primaryDiag = {
			range: {},
			message: "frontmatter error",
			source: "yaml",
		};
		const secondaryDiag = {
			range: {},
			message: "markdown error",
			source: "markdownlint",
		};

		readerCallbacks[0].fn({
			jsonrpc: "2.0",
			method: "textDocument/publishDiagnostics",
			params: { uri, diagnostics: [primaryDiag], version: 1 },
		});

		expect(writerMocks.ws).toHaveBeenCalledWith({
			jsonrpc: "2.0",
			method: "textDocument/publishDiagnostics",
			params: { uri, diagnostics: [primaryDiag], version: 1 },
		});

		writerMocks.ws.mockClear();

		readerCallbacks[1].fn({
			jsonrpc: "2.0",
			method: "textDocument/publishDiagnostics",
			params: { uri, diagnostics: [secondaryDiag], version: 1 },
		});

		expect(writerMocks.ws).toHaveBeenCalledWith({
			jsonrpc: "2.0",
			method: "textDocument/publishDiagnostics",
			params: { uri, diagnostics: [primaryDiag, secondaryDiag], version: 1 },
		});
	});

	it("should handle empty diagnostics in merge", () => {
		createMultiplex(mockWsConn, makeRoutes("primary", "secondary"));

		readerCallbacks[0].fn({
			jsonrpc: "2.0",
			method: "textDocument/publishDiagnostics",
			params: { uri: "file:///test.md", version: 1 },
		});

		expect(writerMocks.ws).toHaveBeenCalledWith(
			expect.objectContaining({
				params: expect.objectContaining({ diagnostics: [] }),
			}),
		);
	});

	it("should update diagnostics when a server republishes", () => {
		createMultiplex(mockWsConn, makeRoutes("primary", "secondary"));

		const uri = "file:///test.md";
		const diag1 = { range: {}, message: "error1" };
		const diag2 = { range: {}, message: "error2" };

		readerCallbacks[0].fn({
			jsonrpc: "2.0",
			method: "textDocument/publishDiagnostics",
			params: { uri, diagnostics: [diag1], version: 1 },
		});

		readerCallbacks[1].fn({
			jsonrpc: "2.0",
			method: "textDocument/publishDiagnostics",
			params: { uri, diagnostics: [diag2], version: 1 },
		});

		writerMocks.ws.mockClear();

		readerCallbacks[0].fn({
			jsonrpc: "2.0",
			method: "textDocument/publishDiagnostics",
			params: { uri, diagnostics: [], version: 2 },
		});

		expect(writerMocks.ws).toHaveBeenCalledWith({
			jsonrpc: "2.0",
			method: "textDocument/publishDiagnostics",
			params: { uri, diagnostics: [diag2], version: 2 },
		});
	});

	it("should dispose all servers on client close", () => {
		const result = createMultiplex(mockWsConn, makeRoutes("a", "b"));

		const onCloseCallback = mockWsConn.onClose.mock.calls[0][0];
		onCloseCallback();

		for (const { proc } of result.servers) {
			expect(proc.dispose).toHaveBeenCalled();
		}
	});

	it("should dispose client when primary server closes", () => {
		const result = createMultiplex(
			mockWsConn,
			makeRoutes("primary", "secondary"),
		);

		const primaryOnClose = result.servers[0].proc.onClose.mock.calls[0][0];
		primaryOnClose();

		expect(mockWsConn.dispose).toHaveBeenCalled();
	});

	it("should suppress response when shouldRespond returns false", () => {
		const routes = [
			{
				name: "rejecting",
				command: "a",
				args: [],
				spawnOptions: {},
				shouldRespond: () => false,
			},
		];
		createMultiplex(mockWsConn, routes);

		const uri = "file:///test.md";
		openDocument(uri, "some text");
		sendCompletion(42, uri, 0);

		readerCallbacks[0].fn({
			jsonrpc: "2.0",
			id: 42,
			result: { items: [{ label: "wrong" }] },
		});

		expect(writerMocks.ws).toHaveBeenCalledWith({
			jsonrpc: "2.0",
			id: 42,
			result: null,
		});
	});

	it("should forward response when shouldRespond returns true", () => {
		createMultiplex(mockWsConn, makeRoutes("accepting"));

		const uri = "file:///test.md";
		openDocument(uri, "some text");
		sendCompletion(43, uri, 0);

		const response = {
			jsonrpc: "2.0",
			id: 43,
			result: { items: [{ label: "good" }] },
		};
		readerCallbacks[0].fn(response);

		expect(writerMocks.ws).toHaveBeenCalledWith(response);
	});

	it("should pass document text and position to shouldRespond", () => {
		const shouldRespond = vi.fn(() => true);
		const routes = [
			{
				name: "spy",
				command: "a",
				args: [],
				spawnOptions: {},
				shouldRespond,
			},
		];
		createMultiplex(mockWsConn, routes);

		const uri = "file:///test.md";
		const text = "---\ntitle: Hello\n---\n# Heading";
		openDocument(uri, text);
		sendCompletion(1, uri, 3, 5);

		readerCallbacks[0].fn({ jsonrpc: "2.0", id: 1, result: {} });

		expect(shouldRespond).toHaveBeenCalledWith(text, { line: 3, character: 5 });
	});

	it("should forward non-position-based responses without calling shouldRespond", () => {
		const shouldRespond = vi.fn(() => true);
		const routes = [
			{
				name: "spy",
				command: "a",
				args: [],
				spawnOptions: {},
				shouldRespond,
			},
		];
		createMultiplex(mockWsConn, routes);

		readerCallbacks.ws.fn({
			jsonrpc: "2.0",
			id: 1,
			method: "initialize",
			params: { capabilities: {} },
		});

		const response = { jsonrpc: "2.0", id: 1, result: { capabilities: {} } };
		readerCallbacks[0].fn(response);

		expect(shouldRespond).not.toHaveBeenCalled();
		expect(writerMocks.ws).toHaveBeenCalledWith(response);
	});

	it("should track document updates via didChange", () => {
		const shouldRespond = vi.fn(() => true);
		const routes = [
			{
				name: "spy",
				command: "a",
				args: [],
				spawnOptions: {},
				shouldRespond,
			},
		];
		createMultiplex(mockWsConn, routes);

		const uri = "file:///test.md";
		openDocument(uri, "original");

		readerCallbacks.ws.fn({
			jsonrpc: "2.0",
			method: "textDocument/didChange",
			params: {
				textDocument: { uri },
				contentChanges: [{ text: "updated" }],
			},
		});

		sendCompletion(1, uri, 0);
		readerCallbacks[0].fn({ jsonrpc: "2.0", id: 1, result: {} });

		expect(shouldRespond).toHaveBeenCalledWith("updated", { line: 0, character: 0 });
	});

	it("should clean up document tracking on didClose", () => {
		createMultiplex(mockWsConn, makeRoutes("primary"));

		const uri = "file:///test.md";
		openDocument(uri, "some text");

		readerCallbacks.ws.fn({
			jsonrpc: "2.0",
			method: "textDocument/didClose",
			params: { textDocument: { uri } },
		});

		const result = createMultiplex(mockWsConn, makeRoutes("primary"));
		expect(result.documents.has(uri)).toBe(false);
	});

	it("should work when some processes fail", () => {
		let callCount = 0;
		mockCreateServerProcess.mockImplementation(() => {
			callCount++;
			if (callCount === 1) return null;
			return {
				reader: { listen: vi.fn() },
				writer: { write: vi.fn() },
				onClose: vi.fn(),
				dispose: vi.fn(),
			};
		});

		const result = createMultiplex(
			mockWsConn,
			makeRoutes("failing", "working"),
		);

		expect(result).not.toBeNull();
		expect(result.servers).toHaveLength(1);
		expect(result.servers[0].route.name).toBe("working");
	});
});
