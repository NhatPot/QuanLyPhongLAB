import { createServer } from 'http';
import { Server } from 'socket.io';

const PORT = 3001;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const connectedAgents = new Map();
const latestMetrics = new Map();

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Dashboard clients request initial metrics
  socket.on('dashboard:join', () => {
    socket.emit('metrics:initial', Object.fromEntries(latestMetrics));
  });

  // Device Agent sends metrics
  socket.on('metrics:update', (payload) => {
    // payload structure: { deviceId, status, timestamp, ... }
    if (payload && payload.deviceId) {
      if (!connectedAgents.has(socket.id)) {
        connectedAgents.set(socket.id, payload.deviceId);
        console.log(`[Socket] Agent registered: ${payload.deviceId}`);
      }
      latestMetrics.set(payload.deviceId, payload);
      // Broadcast to all clients (Dashboard)
      io.emit('metrics:broadcast', payload);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
    const deviceId = connectedAgents.get(socket.id);
    if (deviceId) {
      console.log(`[Socket] Agent offline: ${deviceId}`);
      connectedAgents.delete(socket.id);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Standalone Socket.IO Server running on port ${PORT}`);
});
