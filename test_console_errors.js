// Simple script to test console errors
import http from 'http';

// Create a simple server that will capture browser logs
const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/log') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const log = JSON.parse(body);
                console.log(`[${log.type.toUpperCase()}] ${log.message}`);
                if (log.stack) console.log(`  Stack: ${log.stack}`);
            } catch (e) {
                console.log('Raw log:', body);
            }
            res.writeHead(200, { 'Access-Control-Allow-Origin': '*' });
            res.end('OK');
        });
    } else if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(9999, () => {
    console.log('Log capture server running on http://localhost:9999');
    console.log('\nAdd this script to your browser console:');
    console.log(`
(function() {
    const logEndpoint = 'http://localhost:9999/log';
    const originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn
    };
    
    ['log', 'error', 'warn'].forEach(method => {
        console[method] = function(...args) {
            originalConsole[method].apply(console, args);
            
            fetch(logEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: method,
                    message: args.map(arg => {
                        try {
                            return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
                        } catch (e) {
                            return String(arg);
                        }
                    }).join(' '),
                    timestamp: new Date().toISOString()
                })
            }).catch(() => {});
        };
    });
    
    window.addEventListener('error', (event) => {
        fetch(logEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'error',
                message: event.message,
                stack: event.error ? event.error.stack : 'No stack trace',
                timestamp: new Date().toISOString()
            })
        }).catch(() => {});
    });
    
    console.log('Console logging redirected to server');
})();
    `);
});