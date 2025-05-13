const WebSocket = require('ws');

const port = process.env.PORT || 3000;
// Store messages by channel
const messages = {
    general: [],
    random: []
};

const wss = new WebSocket.Server({ port }, () => {
    console.log(`WebSocket server running on port ${port}`);
});

wss.on('connection', (ws) => {
    console.log('New client connected');
    // Send history for all channels to new client
    Object.entries(messages).forEach(([channel, msgs]) => {
        msgs.forEach(msg => ws.send(JSON.stringify(msg)));
    });

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'message') {
                if (!messages[data.channel]) messages[data.channel] = [];
                messages[data.channel].push(data); // Store by channel
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(data));
                    }
                });
            } else if (data.type === 'getHistory') {
                const channelHistory = messages[data.channel] || [];
                channelHistory.forEach(msg => ws.send(JSON.stringify(msg)));
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

wss.on('error', (error) => {
    console.error('Server error:', error);
});