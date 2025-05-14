const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();

// Create HTTP server
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end("GlowChat Socket.IO Server");
});

// Create Socket.IO server
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const port = process.env.PORT || 3000;

// Connect to SQLite database
const db = new sqlite3.Database('glowchat.db', (err) => {
    if (err) {
        console.error('SQLite connection error:', err);
    } else {
        console.log('Connected to SQLite');
        db.run(`
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel TEXT,
                username TEXT,
                avatar TEXT,
                message TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }
});

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('getHistory', (channel) => {
        socket.join(channel);
        db.all(
            'SELECT * FROM messages WHERE channel = ? ORDER BY timestamp ASC',
            [channel],
            (err, rows) => {
                if (err) {
                    console.error('Error fetching history:', err);
                } else {
                    socket.emit('messageHistory', rows); // Send entire history in one payload
                }
            }
        );
    });

    socket.on('message', (data) => {
        const { channel, username, avatar, message } = data;
        socket.join(channel);

        db.run(
            'INSERT INTO messages (channel, username, avatar, message) VALUES (?, ?, ?, ?)',
            [channel, username, avatar, message],
            (err) => {
                if (err) {
                    console.error('Error saving message:', err);
                } else {
                    io.to(channel).emit('message', {
                        channel,
                        username,
                        avatar,
                        message,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        );
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    db.close();
    server.close();
    process.exit(0);
});

// Start server
server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
