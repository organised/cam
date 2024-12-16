const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Map();

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket connection handling
wss.on('connection', (ws) => {
    const clientId = generateClientId();
    clients.set(ws, clientId);

    // Handle incoming messages
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        handleWebSocketMessage(ws, data);
    });

    // Handle client disconnect
    ws.on('close', () => {
        clients.delete(ws);
        broadcastDisconnect(clientId);
    });
});

function handleWebSocketMessage(ws, data) {
    switch(data.type) {
        case 'offer':
        case 'answer':
        case 'ice-candidate':
            // Forward the message to the other peer
            relay(ws, data);
            break;
    }
}

function relay(sender, data) {
    const senderId = clients.get(sender);
    clients.forEach((clientId, client) => {
        if (client !== sender) {
            client.send(JSON.stringify({
                ...data,
                from: senderId
            }));
        }
    });
}

server.listen(3000, () => {
    console.log('Server running on port 3000');
});
