const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();

// Setup HTTP server
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end("GlowChat Socket.IO Server");
});

// Attach Socket.IO to the server
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for testing; restrict in production
        methods: ["GET", "POST"]
    }
});

const port = process.env.PORT || 3000;

// Initialize SQLite database
const db = new sqlite3.Database('glowchat.db', (err) => {
    if (err) {
        console.error('SQLite connection error:', err);
    } else {
        console.log('Connected to SQLite');
        // Create messages table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel TEXT,
            username TEXT,
            avatar TEXT,
            message TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Track client's active channel
    let activeChannel = 'general';
    socket.join(activeChannel);

    // Send message history for the client's channel
    db.all('SELECT * FROM messages WHERE channel = ?', [activeChannel], (err, rows) => {
        if (err) {
            console.error('Error fetching history:', err);
            return;
        }
        rows.forEach((row) => {
            socket.emit('message', {
                channel: row.channel,
                username: row.username,
                avatar: row.avatar,
                message: row.message,
                timestamp: row.timestamp
            });
        });
    });

    // Handle incoming messages
    socket.on('message', (data) => {
        const { channel, username, avatar, message } = data;
        activeChannel = channel;
        socket.join(channel);

        // Save message to SQLite
        db.run(
            'INSERT INTO messages (channel, username, avatar, message) VALUES (?, ?, ?, ?)',
            [channel, username, avatar, message],
            (err) => {
                if (err) {
                    console.error('Error saving message:', err);
                    return;
                }
                // Broadcast message to all clients in the same channel
                io.to(channel).emit('message', {
                    channel,
                    username,
                    avatar,
                    message,
                    timestamp: new Date().toISOString()
                });
            }
        );
    });

    // Handle channel switch and history request
    socket.on('getHistory', (channel) => {
        activeChannel = channel;
        socket.join(channel);
        db.all('SELECT * FROM messages WHERE channel = ?', [channel], (err, rows) => {
            if (err) {
                console.error('Error fetching history:', err);
                return;
            }
            rows.forEach((row) => {
                socket.emit('message', {
                    channel: row.channel,
                    username: row.username,
                    avatar: row.avatar,
                    message: row.message,
                    timestamp: row.timestamp
                });
            });
        });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Start the server
server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    db.close();
    server.close();
    process.exit(0);
});