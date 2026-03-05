const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

class SocketServer {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId
    this.userSockets = new Map(); // socketId -> userId
  }

  // Initialize socket server
  initialize(server) {
    try {
      this.io = socketIO(server, {
        cors: {
          // Waxaan ku daray 127.0.0.1 si looga fogaado CORS errors
          origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : ['http://localhost:3000', 'http://127.0.0.1:3000'],
          credentials: true,
          methods: ['GET', 'POST']
        },
        pingTimeout: 60000,
        pingInterval: 25000
      });

      // Authentication middleware
      this.io.use(async (socket, next) => {
        try {
          const token = socket.handshake.auth.token || socket.handshake.query.token;
          
          if (!token) {
            socket.user = null;
            return next();
          }

          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          // Hubi in User model-kaagu halkan ku yaal
          const user = await User.findById(decoded.id).select('-passwordHash');

          if (!user || user.status !== 'active') {
            socket.user = null;
            return next();
          }

          socket.user = user;
          next();
        } catch (error) {
          console.error('Socket authentication error:', error.message);
          socket.user = null;
          next();
        }
      });

      // Connection handler
      this.io.on('connection', (socket) => {
        this.handleConnection(socket);
      });

      console.log('✅ Socket server initialized');
      return this.io;
    } catch (error) {
      console.error('❌ Socket server initialization failed:', error.message);
      return null;
    }
  }

  handleConnection(socket) {
    const user = socket.user;
    
    if (user && user.id) {
      this.connectedUsers.set(user.id, socket.id);
      this.userSockets.set(socket.id, user.id);
      socket.join(`user:${user.id}`);
      socket.join(`role:${user.role}`);
      console.log(`👤 User connected: ${user.name} (${socket.id})`);
    } else {
      console.log(`👻 Anonymous connected: ${socket.id}`);
    }

    this.registerEventHandlers(socket);

    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });
  }

  registerEventHandlers(socket) {
    const user = socket.user;

    socket.on('join-conversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`Joined conversation: ${conversationId}`);
    });

    socket.on('send-message', (data) => {
      try {
        const { conversationId, message, recipientId } = data;
        
        this.io.to(`conversation:${conversationId}`).emit('new-message', {
          conversationId,
          message,
          senderId: user?.id || 'anonymous',
          senderName: user?.name || 'Anonymous',
          timestamp: new Date()
        });

        if (recipientId && this.connectedUsers.has(recipientId)) {
          this.io.to(`user:${recipientId}`).emit('notification', {
            type: 'new-message',
            data: { conversationId, message: message.substring(0, 50), senderName: user?.name || 'Anonymous' }
          });
        }
      } catch (error) {
        console.error('Error sending message:', error.message);
      }
    });
  }

  handleDisconnection(socket) {
    const userId = this.userSockets.get(socket.id);
    if (userId) {
      this.connectedUsers.delete(userId);
      this.userSockets.delete(socket.id);
      console.log(`👋 User disconnected: ${userId}`);
    }
  }

  shutdown() {
    if (this.io) {
      this.io.close();
      console.log('Socket server shut down');
    }
  }
}

// Export the instance
module.exports = new SocketServer();
