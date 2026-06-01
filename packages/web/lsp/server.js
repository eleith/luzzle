import { createServer as httpServer } from "http";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import { toSocket } from "vscode-ws-jsonrpc";
import {
	createWebSocketConnection,
	createServerProcess,
} from "vscode-ws-jsonrpc/server";
import { route as frontmatterRoute } from "./luzzle-lsp.js";
import { route as markdownRoute } from "./markdownlint-lsp.js";

const PORT = 9001;
const ROUTES = [frontmatterRoute, markdownRoute];

function createMultiplex(wsConn, routes) {
	const servers = [];

	for (const route of routes) {
		const proc = createServerProcess(
			route.name,
			route.command,
			route.args,
			route.spawnOptions,
		);
		if (proc) {
			servers.push({ route, proc });
		} else {
			console.error(`Failed to start ${route.name}`);
		}
	}

	if (servers.length === 0) return null;

	const diagnosticStore = new Map();
	const documents = new Map();
	const pendingRequests = new Map();

	function getMergedDiagnostics(uri) {
		const merged = [];
		for (let i = 0; i < servers.length; i++) {
			const stored = diagnosticStore.get(`${i}:${uri}`);
			if (stored) merged.push(...stored);
		}
		return merged;
	}

	function isNotification(message) {
		return message.method !== undefined && message.id === undefined;
	}

	function trackDocument(message) {
		if (message.method === "textDocument/didOpen") {
			const { uri, text } = message.params.textDocument;
			documents.set(uri, text);
		} else if (message.method === "textDocument/didChange") {
			const uri = message.params.textDocument.uri;
			const text = message.params.contentChanges?.[0]?.text;
			if (text !== undefined) {
				documents.set(uri, text);
			}
		} else if (message.method === "textDocument/didClose") {
			documents.delete(message.params.textDocument.uri);
		}
	}

	function trackPositionRequest(message) {
		if (
			message.id !== undefined &&
			message.params?.position &&
			message.params?.textDocument?.uri
		) {
			pendingRequests.set(message.id, {
				uri: message.params.textDocument.uri,
				position: message.params.position,
			});
		}
	}

	function handleClientMessage(message) {
		trackDocument(message);
		trackPositionRequest(message);
		for (const { proc } of servers) {
			proc.writer.write(JSON.parse(JSON.stringify(message)));
		}
	}

	function handleDiagnostics(message, index) {
		const { uri, version } = message.params;
		diagnosticStore.set(`${index}:${uri}`, message.params.diagnostics || []);
		wsConn.writer.write({
			jsonrpc: "2.0",
			method: "textDocument/publishDiagnostics",
			params: { uri, diagnostics: getMergedDiagnostics(uri), version },
		});
	}

	function handlePrimaryResponse(message, index) {
		const req = pendingRequests.get(message.id);
		if (req) {
			pendingRequests.delete(message.id);
			const text = documents.get(req.uri);
			if (!servers[index].route.shouldRespond(text, req.position)) {
				wsConn.writer.write({ jsonrpc: "2.0", id: message.id, result: null });
				return;
			}
		}
		wsConn.writer.write(message);
	}

	function handleServerMessage(message, index) {
		if (message.method === "textDocument/publishDiagnostics") {
			handleDiagnostics(message, index);
			return;
		}

		if (isNotification(message)) {
			wsConn.writer.write(message);
			return;
		}

		if (index === 0) {
			handlePrimaryResponse(message, index);
		}
	}

	wsConn.reader.listen(handleClientMessage);
	servers.forEach(({ proc }, index) => {
		proc.reader.listen((message) => handleServerMessage(message, index));
	});

	wsConn.onClose(() => {
		for (const { proc } of servers) proc.dispose();
	});
	servers[0].proc.onClose(() => wsConn.dispose());

	return { servers, diagnosticStore, documents, pendingRequests };
}

function createServer(routes = ROUTES) {
	const wss = new WebSocketServer({ noServer: true });

	const server = httpServer((req, res) => {
		if (req.url === "/health") {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ status: "ok" }));
			return;
		}
		res.writeHead(404, { "Content-Type": "text/plain" });
		res.end("Not Found");
	});

	server.on("upgrade", (req, socket, head) => {
		const url = new URL(req.url || "", "http://localhost");

		if (url.pathname !== "/admin/lsp") {
			socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
			socket.destroy();
			return;
		}

		wss.handleUpgrade(req, socket, head, (ws) => {
			wss.emit("connection", ws);
		});
	});

	wss.on("connection", (ws) => {
		console.log(`[${new Date().toISOString()}] LSP client connected`);

		const socket = toSocket(ws);
		const wsConn = createWebSocketConnection(socket);
		const multiplex = createMultiplex(wsConn, routes);

		if (!multiplex) {
			console.error(
				`[${new Date().toISOString()}] Failed to start any LSP process`,
			);
			ws.close();
			return;
		}

		ws.on("close", () => {
			console.log(`[${new Date().toISOString()}] LSP client disconnected`);
		});
	});

	return server;
}

const server = createServer();

/* c8 ignore start */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	server.listen(PORT, "0.0.0.0", () => {
		console.log(`Luzzle Web LSP listening on port ${PORT}`);
	});
}
/* c8 ignore stop */

export { server, createServer, createMultiplex, ROUTES };
