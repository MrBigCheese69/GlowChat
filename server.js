const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end("GlowChat Socket.IO Server");
});

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const port = process.env.PORT || 3000;
const db = new sqlite3.Database('glowchat.db');

const users = new Map(); // socket.id -> { username, avatar }

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

function updateActiveUsers() {
    const activeUsers = Array.from(users.values());
    io.emit('activeUsers', activeUsers);
}

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('registerUser', ({ username, avatar }) => {
        users.set(socket.id, { username, avatar });
        updateActiveUsers();
    });

    socket.on('getHistory', (channel) => {
        db.all(
            'SELECT * FROM messages WHERE channel = ? ORDER BY timestamp ASC',
            [channel],
            (err, rows) => {
                if (!err) socket.emit('messageHistory', rows);
            }
        );
    });

    socket.on('message', (data) => {
        const { channel, username, avatar, message } = data;
        db.run(
            'INSERT INTO messages (channel, username, avatar, message) VALUES (?, ?, ?, ?)',
            [channel, username, avatar, message],
            (err) => {
                if (!err) {
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

    socket.on('typing', ({ channel, username }) => {
        socket.broadcast.to(channel).emit('typing', username);
    });

    socket.on('joinChannel', (channel) => {
        socket.join(channel);
    });

    socket.on('disconnect', () => {
        users.delete(socket.id);
        updateActiveUsers();
        console.log('Client disconnected:', socket.id);
    });
});

server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
