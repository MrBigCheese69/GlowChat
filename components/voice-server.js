const { Server } = require('socket.io');

const io = new Server(3001, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  socket.on('join-voice', ({ roomId }) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-joined', { socketId: socket.id });

    socket.on('offer', ({ to, offer }) => {
      io.to(to).emit('offer', { from: socket.id, offer });
    });

    socket.on('answer', ({ to, answer }) => {
      io.to(to).emit('answer', { from: socket.id, answer });
    });

    socket.on('ice-candidate', ({ to, candidate }) => {
      io.to(to).emit('ice-candidate', { from: socket.id, candidate });
    });

    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-left', socket.id);
    });
  });
});

console.log('Voice server listening on http://localhost:3001');
