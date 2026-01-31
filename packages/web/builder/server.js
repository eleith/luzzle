const http = require('http');
const { spawn } = require('child_process');
const url = require('url');

const PORT = 9000;
const BUILD_SCRIPT = process.env.LUZZLE_BUILD_SCRIPT || '/app/scripts/build.sh';
const BUILD_SECRET_TOKEN = process.env.LUZZLE_BUILD_TOKEN;

// Concurrency Lock
let isDeploying = false;

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    
    // 1. Basic Routing
    if (req.method !== 'POST' || parsedUrl.pathname !== '/hooks/deploy') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Not Found');
    }

    // 2. Authentication
    const requestToken = parsedUrl.query.token;
    if (!BUILD_SECRET_TOKEN || requestToken !== BUILD_SECRET_TOKEN) {
        console.warn(`[${new Date().toISOString()}] Unauthorized access attempt from ${req.socket.remoteAddress}`);
        res.writeHead(401, { 'Content-Type': 'text/plain' });
        return res.end('Unauthorized');
    }

    // 3. Concurrency Check
    if (isDeploying) {
        console.warn(`[${new Date().toISOString()}] Deployment rejected: already running.`);
        res.writeHead(429, { 'Content-Type': 'text/plain' });
        return res.end('Deployment already in progress. Please wait.');
    }

    // 4. Start Deployment
    isDeploying = true;
    console.log(`[${new Date().toISOString()}] Starting deployment...`);

    // Set headers for streaming text
    res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Transfer-Encoding': 'chunked',
        'X-Content-Type-Options': 'nosniff'
    });

    res.write(`Starting deployment script at ${new Date().toISOString()}...
`);

    const child = spawn('bash', [BUILD_SCRIPT]);

    // Stream stdout
    child.stdout.on('data', (data) => {
        process.stdout.write(data); // Log to Docker
        if (!res.writableEnded && !res.closed) {
             res.write(data, (err) => { if (err) console.error("Client disconnected, stopped streaming to HTTP"); });
        }
    });

    // Stream stderr
    child.stderr.on('data', (data) => {
        process.stderr.write(data); // Log to Docker
        if (!res.writableEnded && !res.closed) {
             res.write(data, (err) => { if (err) console.error("Client disconnected, stopped streaming to HTTP"); });
        }
    });

    // Handle Client Disconnect
    req.on('close', () => {
        console.log(`[${new Date().toISOString()}] Client disconnected from stream. Script continues in background.`);
    });

    // Handle Error
    child.on('error', (error) => {
        console.error(`[${new Date().toISOString()}] Failed to start script: ${error.message}`);
        res.write(`
Error: Failed to start script: ${error.message}
`);
        isDeploying = false;
        res.end();
    });

    // Handle Exit
    child.on('close', (code) => {
        console.log(`[${new Date().toISOString()}] Script exited with code ${code}`);
        res.write(`
Deployment finished with exit code ${code} at ${new Date().toISOString()}
`);
        isDeploying = false;
        res.end();
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Deploy sidecar listening on port ${PORT}`);
    if (!BUILD_SECRET_TOKEN) {
        console.error("WARNING: DEPLOY_TOKEN env var is not set! Auth will fail.");
    }
});
