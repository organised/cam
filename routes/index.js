const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files - Fix the path to point to the correct directory
app.use(express.static(path.join(__dirname, 'public')));

// Store connected clients
const clients = new Map();
let waitingClient = null;

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// WebSocket connection handling
wss.on('connection', (ws) => {
    const clientId = uuidv4();
    clients.set(ws, { id: clientId, paired: false });
    console.log(`Client ${clientId} connected`);

    // Try to pair with waiting client
    if (waitingClient && waitingClient.readyState === WebSocket.OPEN) {
        // Pair the clients
        clients.get(waitingClient).paired = true;
        clients.get(ws).paired = true;

        // Notify both clients about pairing
        waitingClient.send(JSON.stringify({ type: 'paired', initiator: true }));
        ws.send(JSON.stringify({ type: 'paired', initiator: false }));

        waitingClient = null;
    } else {
        waitingClient = ws;
        ws.send(JSON.stringify({ type: 'waiting' }));
    }

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleWebSocketMessage(ws, data);
        } catch (error) {
            console.error('Error handling message:', error);
        }
    });

    ws.on('close', () => {
        const client = clients.get(ws);
        console.log(`Client ${client.id} disconnected`);
        if (waitingClient === ws) {
            waitingClient = null;
        }
        clients.delete(ws);
    });
});

function handleWebSocketMessage(sender, data) {
    // Forward messages to the other paired client
    for (const [client, info] of clients.entries()) {
        if (client !== sender && info.paired) {
            client.send(JSON.stringify(data));
        }
    }
}

// Use the PORT environment variable provided by Railway
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
