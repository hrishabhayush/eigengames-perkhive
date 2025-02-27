const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { createProxyServer } = require('http-proxy');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const proxy = createProxyServer({
ws: true,
target: 'http://localhost:8000', // Your Flask WebSocket server
});

app.prepare().then(() => {
createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    
    // Proxy WebSocket connections
    if (parsedUrl.pathname.startsWith('/ws')) {
    proxy.web(req, res);
    } else {
    handle(req, res, parsedUrl);
    }
}).listen(3000, (err) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:3000');
}).on('upgrade', (req, socket, head) => {
    // Handle WebSocket upgrade
    if (req.url.startsWith('/ws')) {
    proxy.ws(req, socket, head);
    }
});
});

