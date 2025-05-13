const http = require('http');
const WebSocket = require('ws');
const { MongoClient } = require('mongodb');

// Setup HTTP server (needed for WSS to work on Render)
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end("GlowChat WebSocket Server is running");
});

// Attach WebSocket to HTTP server
const wss = new WebSocket.Server({ server });

const port = process.env.PORT || 3000;
const uri = "mongodb+srv://explodingcreper91:j3zd87jue9YASMjP@glowchat.jh5jzxu.mongodb.net/?retryWrites=true&w=majority&appName=GlowChat";
const client = new MongoClient(uri, {
    tls: true,
    tlsMinimumVersion: 'TLSv1.2', // Enforce TLS 1.2 for MongoDB Atlas
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db('glowchat');
        const messagesCollection = db.collection('messages');

        const clientChannels = new Map(); // Track each client's active channel

        wss.on('connection', async (ws) => {
            console.log('New client connected');

            // Default to 'general' on initial connect
            clientChannels.set(ws, 'general');

            // Send initial history for 'general'
            const history = await messagesCollection.find({ channel: 'general' }).toArray();
            history.forEach(msg => ws.send(JSON.stringify(msg)));

            ws.on('message', async (message) => {
                try {
                    const data = JSON.parse(message);

                    if (data.type === 'message') {
                        await messagesCollection.insertOne(data);

                        const senderChannel = data.channel;

                        wss.clients.forEach((client) => {
                            if (
                                client.readyState === WebSocket.OPEN &&
                                clientChannels.get(client) === senderChannel
                            ) {
                                client.send(JSON.stringify(data));
                            }
                        });

                    } else if (data.type === 'getHistory') {
                        // Update tracked channel
                        clientChannels.set(ws, data.channel);

                        const channelHistory = await messagesCollection
                            .find({ channel: data.channel })
                            .toArray();

                        channelHistory.forEach(msg => ws.send(JSON.stringify(msg)));
                    }
                } catch (error) {
                    console.error('Error processing message:', error);
                }
            });

            ws.on('close', () => {
                clientChannels.delete(ws);
                console.log('Client disconnected');
            });

            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
            });
        });

        wss.on('error', (error) => {
            console.error('WebSocket Server error:', error);
        });

        // Start HTTP server
        server.listen(port, () => {
            console.log(`Server listening on port ${port}`);
        });

    } catch (error) {
        console.error('MongoDB connection error:', error);
    }
}

run().catch(console.dir);

// Graceful shutdown
process.on('SIGTERM', () => {
    client.close();
    process.exit(0);
});