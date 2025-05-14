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

const db = new sqlite3.Database('glowchat.db', (err) => {
    if (err) {
        console.error('SQLite connection error:', err);
    } else {
        console.log('Connected to SQLite');
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
    let activeChannel = 'general';
    socket.join(activeChannel);

    // Fetch history when a client connects to the channel
    db.all('SELECT * FROM messages WHERE channel = ?', [activeChannel], (err, rows) => {
        if (err) return console.error('Error fetching history:', err);
        rows.forEach((row) => socket.emit('message', {
            id: row.id,
            channel: row.channel, 
            username: row.username, 
            avatar: row.avatar, 
            message: row.message, 
            timestamp: row.timestamp
        }));
    });

    // Register user with their username and avatar
    socket.on('registerUser', (data) => {
        socket.username = data.username;
        socket.avatar = data.avatar;
    });

    // Handle new messages
    socket.on('message', (data) => {
        const { channel, username, avatar, message } = data;
        activeChannel = channel;
        socket.join(channel);
        db.run('INSERT INTO messages (channel, username, avatar, message) VALUES (?, ?, ?, ?)',
            [channel, username, avatar, message],
            (err) => {
                if (err) return console.error('Error saving message:', err);
                io.to(channel).emit('message', { 
                    id: this.lastID, 
                    channel, 
                    username, 
                    avatar, 
                    message, 
                    timestamp: new Date().toISOString() 
                });
            }
        );
    });

    // Handle fetching message history
    socket.on('getHistory', (channel) => {
        activeChannel = channel;
        socket.join(channel);
        db.all('SELECT * FROM messages WHERE channel = ?', [channel], (err, rows) => {
            if (err) return console.error('Error fetching history:', err);
            rows.forEach((row) => socket.emit('message', {
                id: row.id,
                channel: row.channel, 
                username: row.username, 
                avatar: row.avatar, 
                message: row.message, 
                timestamp: row.timestamp
            }));
        });
    });

    // Handle message editing
    socket.on('editMessage', ({ id, newMessage }) => {
        db.get('SELECT * FROM messages WHERE id = ?', [id], (err, row) => {
            if (err || !row) return;
            if (row.username === socket.username) {
                db.run('UPDATE messages SET message = ? WHERE id = ?', [newMessage, id], (err) => {
                    if (!err) {
                        io.to(row.channel).emit('messageEdited', { id, newMessage });
                    }
                });
            }
        });
    });

    // Handle message deletion
    socket.on('deleteMessage', (id) => {
        db.get('SELECT * FROM messages WHERE id = ?', [id], (err, row) => {
            if (err || !row) return;
            if (row.username === socket.username) {
                db.run('DELETE FROM messages WHERE id = ?', [id], (err) => {
                    if (!err) {
                        io.to(row.channel).emit('messageDeleted', id);
                    }
                });
            }
        });
    });

    socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

server.listen(port, () => console.log(`Server listening on port ${port}`));

process.on('SIGTERM', () => {
    db.close();
    server.close();
    process.exit(0);
});
