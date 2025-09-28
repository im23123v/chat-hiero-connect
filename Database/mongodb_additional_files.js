// =============================================================================
// 16. scripts/setup-database.js - Database Setup Script
// =============================================================================
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const ChatPermission = require('../models/ChatPermission');
const connectDatabase = require('../config/database');

const setupDatabase = async () => {
  try {
    console.log('Setting up MongoDB database...');
    
    // Connect to database
    await connectDatabase();

    // Clear existing data (optional - remove in production)
    // await User.deleteMany({});
    // await ChatPermission.deleteMany({});

    // Sample Users
    const sampleUsers = [
      {
        name: "Emma Wilson",
        role: "super_admin",
        is_online: true,
        avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma"
      },
      {
        name: "Michael Chen", 
        role: "admin",
        is_online: true,
        avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael"
      },
      {
        name: "Sarah Johnson",
        role: "teacher", 
        is_online: false,
        avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah"
      },
      {
        name: "David Rodriguez",
        role: "teacher",
        is_online: true, 
        avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=David"
      },
      {
        name: "Alice Brown",
        role: "student",
        is_online: true,
        avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice"
      },
      {
        name: "Tom Williams",
        role: "student",
        is_online: false,
        avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tom"
      }
    ];

    console.log('Creating sample users...');
    const users = await User.insertMany(sampleUsers);
    console.log(`Created ${users.length} users`);

    // Sample Chat Permissions -- NEED TO UPDATE LATER ABHIRAM ANNA FRONTEND LINKED 
    const chatPermissions = [
      {
        role: "super_admin",
        can_chat_with: ["super_admin", "admin", "teacher", "student"],
        daily_message_limit: null
      },
      {
        role: "admin", 
        can_chat_with: ["super_admin", "admin", "teacher", "student"],
        daily_message_limit: 500
      },
      {
        role: "teacher",
        can_chat_with: ["admin", "teacher", "student"], 
        daily_message_limit: 200
      },
      {
        role: "student",
        can_chat_with: ["teacher"],
        daily_message_limit: 50
      }
    ];

    console.log('Creating chat permissions...');
    await ChatPermission.insertMany(chatPermissions);
    console.log('Chat permissions created');

    console.log('Database setup completed successfully!');
    console.log('\nSample users created:');
    users.forEach(user => {
      console.log(`- ${user.name} (${user.role}): ${user._id}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  }
};

setupDatabase();

// =============================================================================
// 17. middleware/auth.js - Authentication Middleware (Basic Implementation)
// =============================================================================
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid token.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token.' });
  }
};

// Role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied. Insufficient permissions.' 
      });
    }
    next();
  };
};

module.exports = { auth, authorize };

// =============================================================================
// 18. controllers/authController.js - Authentication Controller
// =============================================================================
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authController = {
  // Simple login (in real app, you'd validate password)
  login: async (req, res) => {
    try {
      const { userId } = req.body;
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      // Update user online status
      user.is_online = true;
      user.last_seen = new Date();
      await user.save();

      // Generate JWT token
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user._id,
            name: user.name,
            role: user.role,
            avatar_url: user.avatar_url,
            is_online: user.is_online
          }
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Logout
  logout: async (req, res) => {
    try {
      const { userId } = req.body;
      
      await User.findByIdAndUpdate(userId, {
        is_online: false,
        last_seen: new Date()
      });

      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Verify token
  verifyToken: async (req, res) => {
    try {
      const user = req.user; // From auth middleware
      res.json({
        success: true,
        data: {
          user: {
            id: user._id,
            name: user.name,
            role: user.role,
            avatar_url: user.avatar_url,
            is_online: user.is_online
          }
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = authController;

// =============================================================================
// 19. routes/auth.js - Authentication Routes
// =============================================================================
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');

// POST /api/auth/login - Login user
router.post('/login', authController.login);

// POST /api/auth/logout - Logout user
router.post('/logout', authController.logout);

// GET /api/auth/verify - Verify token
router.get('/verify', auth, authController.verifyToken);

module.exports = router;

// =============================================================================
// 20. utils/socketHelpers.js - Socket.IO Helper Functions
// =============================================================================
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

const socketHelpers = {
  // Emit new message to relevant rooms
  emitNewMessage: (io, message) => {
    if (message.message_type === 'conversation') {
      io.to(`conversation_${message.conversation_id}`).emit('new_message', message);
    } else if (message.message_type === 'group') {
      io.to(`group_${message.group_id}`).emit('new_message', message);
    }
  },

  // Emit message read status update
  emitMessageRead: (io, message, userId) => {
    const room = message.message_type === 'conversation' 
      ? `conversation_${message.conversation_id}`
      : `group_${message.group_id}`;
    
    io.to(room).emit('message_read', {
      messageId: message._id,
      readBy: userId,
      readAt: new Date()
    });
  },

  // Emit user online status change
  emitUserStatusChange: (io, userId, isOnline) => {
    io.emit('user_status_changed', {
      userId,
      is_online: isOnline,
      last_seen: new Date()
    });
  },

  // Emit typing indicators
  emitTyping: (io, data) => {
    const room = data.conversationId 
      ? `conversation_${data.conversationId}`
      : `group_${data.groupId}`;
    
    io.to(room).emit('user_typing', data);
  },

  emitStoppedTyping: (io, data) => {
    const room = data.conversationId 
      ? `conversation_${data.conversationId}`
      : `group_${data.groupId}`;
    
    io.to(room).emit('user_stopped_typing', data);
  }
};

module.exports = socketHelpers;

// =============================================================================
// 21. utils/validation.js - Input Validation Helpers
// =============================================================================
const Joi = require('joi');
const mongoose = require('mongoose');

const validationSchemas = {
  // User validation
  createUser: Joi.object({
    name: Joi.string().trim().min(2).max(50).required(),
    role: Joi.string().valid('super_admin', 'admin', 'teacher', 'student').required(),
    avatar_url: Joi.string().uri().allow(null, '')
  }),

  updateUser: Joi.object({
    name: Joi.string().trim().min(2).max(50),
    role: Joi.string().valid('super_admin', 'admin', 'teacher', 'student'),
    avatar_url: Joi.string().uri().allow(null, ''),
    is_online: Joi.boolean(),
    last_seen: Joi.date()
  }),

  // Message validation
  sendMessage: Joi.object({
    sender_id: Joi.string().custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    }).required(),
    content: Joi.string().trim().min(1).max(1000).required(),
    message_type: Joi.string().valid('conversation', 'group').required(),
    conversation_id: Joi.string().custom((value, helpers) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    }).allow(null),
    group_id: Joi.string().custom((value, helpers) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    }).allow(null)
  }),

  // Conversation validation
  createConversation: Joi.object({
    participant1: Joi.string().custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    }).required(),
    participant2: Joi.string().custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    }).required()
  }),

  // Authentication validation
  login: Joi.object({
    userId: Joi.string().custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    }).required()
  })
};

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    next();
  };
};

module.exports = { validationSchemas, validate };

// =============================================================================
// 22. utils/permissions.js - Permission Helper Functions
// =============================================================================
const ChatPermission = require('../models/ChatPermission');
const User = require('../models/User');

const permissionHelpers = {
  // Check if user can chat with another user
  canChatWith: async (senderRole, recipientRole) => {
    try {
      const senderPermissions = await ChatPermission.findOne({ role: senderRole });
      
      if (!senderPermissions) {
        return false;
      }

      return senderPermissions.can_chat_with.includes(recipientRole);
    } catch (error) {
      console.error('Error checking chat permissions:', error);
      return false;
    }
  },

  // Check daily message limit
  checkDailyMessageLimit: async (userId) => {
    try {
      const user = await User.findById(userId);
      if (!user) return false;

      const permissions = await ChatPermission.findOne({ role: user.role });
      if (!permissions || permissions.daily_message_limit === null) {
        return true; // Unlimited
      }

      // Count messages sent today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const Message = require('../models/Message');
      const messageCount = await Message.countDocuments({
        sender_id: userId,
        created_at: { $gte: today }
      });

      return messageCount < permissions.daily_message_limit;
    } catch (error) {
      console.error('Error checking daily message limit:', error);
      return false;
    }
  },

  // Get user's remaining messages for today
  getRemainingMessages: async (userId) => {
    try {
      const user = await User.findById(userId);
      if (!user) return 0;

      const permissions = await ChatPermission.findOne({ role: user.role });
      if (!permissions || permissions.daily_message_limit === null) {
        return null; // Unlimited
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const Message = require('../models/Message');
      const messageCount = await Message.countDocuments({
        sender_id: userId,
        created_at: { $gte: today }
      });

      return Math.max(0, permissions.daily_message_limit - messageCount);
    } catch (error) {
      console.error('Error getting remaining messages:', error);
      return 0;
    }
  }
};

module.exports = permissionHelpers;

// =============================================================================
// 23. middleware/validation.js - Validation Middleware with Permissions
// =============================================================================
const { validate, validationSchemas } = require('../utils/validation');
const permissionHelpers = require('../utils/permissions');
const User = require('../models/User');

// Enhanced message validation with permission checks
const validateMessage = async (req, res, next) => {
  // First, validate the basic structure
  const { error } = validationSchemas.sendMessage.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  try {
    const { sender_id, conversation_id, group_id, message_type } = req.body;

    // Check daily message limit
    const canSendMessage = await permissionHelpers.checkDailyMessageLimit(sender_id);
    if (!canSendMessage) {
      return res.status(429).json({
        success: false,
        error: 'Daily message limit exceeded'
      });
    }

    // For conversation messages, check if sender can chat with recipient
    if (message_type === 'conversation' && conversation_id) {
      const Conversation = require('../models/Conversation');
      const conversation = await Conversation.findById(conversation_id).populate('participants');
      
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found'
        });
      }

      // Find the other participant
      const otherParticipant = conversation.participants.find(
        p => p._id.toString() !== sender_id
      );

      if (otherParticipant) {
        const sender = await User.findById(sender_id);
        const canChat = await permissionHelpers.canChatWith(sender.role, otherParticipant.role);
        
        if (!canChat) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to chat with this user'
          });
        }
      }
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error validating message permissions'
    });
  }
};

module.exports = {
  validateUser: validate(validationSchemas.createUser),
  validateUserUpdate: validate(validationSchemas.updateUser),
  validateMessage,
  validateConversation: validate(validationSchemas.createConversation),
  validateLogin: validate(validationSchemas.login)
};

// =============================================================================
// 24. Enhanced server.js with validation and auth
// =============================================================================
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDatabase = require('./config/database');
const socketHelpers = require('./utils/socketHelpers');

// Import routes
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const conversationRoutes = require('./routes/conversations');
const authRoutes = require('./routes/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
  }
});

// Make io globally available
global.io = io;

// Connect to database
connectDatabase();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/conversations', conversationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// Enhanced Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user to their personal room
  socket.on('join_user', (userId) => {
    socket.join(`user_${userId}`);
    socket.userId = userId;
    console.log(`User ${userId} joined personal room`);
    
    // Update user online status
    const User = require('./models/User');
    User.findByIdAndUpdate(userId, { 
      is_online: true, 
      last_seen: new Date() 
    }).exec();
    
    // Broadcast online status
    socket.broadcast.emit('user_status_changed', {
      userId,
      is_online: true,
      last_seen: new Date()
    });
  });

  // Join conversation room
  socket.on('join_conversation', (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
  });

  // Leave conversation room
  socket.on('leave_conversation', (conversationId) => {
    socket.leave(`conversation_${conversationId}`);
    console.log(`Socket ${socket.id} left conversation ${conversationId}`);
  });

  // Join group room
  socket.on('join_group', (groupId) => {
    socket.join(`group_${groupId}`);
    console.log(`Socket ${socket.id} joined group ${groupId}`);
  });

  // Leave group room
  socket.on('leave_group', (groupId) => {
    socket.leave(`group_${groupId}`);
    console.log(`Socket ${socket.id} left group ${groupId}`);
  });

  // Handle typing indicators
  socket.on('typing_start', (data) => {
    socketHelpers.emitTyping(io, data);
  });

  socket.on('typing_stop', (data) => {
    socketHelpers.emitStoppedTyping(io, data);
  });

  // Handle real-time message sending
  socket.on('send_message', async (data) => {
    try {
      const Message = require('./models/Message');
      const Conversation = require('./models/Conversation');
      const permissionHelpers = require('./utils/permissions');
      
      // Check permissions
      const canSend = await permissionHelpers.checkDailyMessageLimit(data.sender_id);
      if (!canSend) {
        socket.emit('message_error', { error: 'Daily message limit exceeded' });
        return;
      }

      // Create message
      const message = new Message(data);
      await message.save();
      await message.populate('sender_id', 'name avatar_url role');

      // Update conversation timestamp
      if (data.message_type === 'conversation') {
        await Conversation.findByIdAndUpdate(data.conversation_id, {
          last_message_at: message.created_at
        });
      }

      // Emit to relevant rooms
      socketHelpers.emitNewMessage(io, message);
      
      // Confirm to sender
      socket.emit('message_sent', { 
        messageId: message._id, 
        tempId: data.tempId 
      });

    } catch (error) {
      console.error('Socket message error:', error);
      socket.emit('message_error', { error: error.message });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Update user offline status
    if (socket.userId) {
      const User = require('./models/User');
      User.findByIdAndUpdate(socket.userId, { 
        is_online: false, 
        last_seen: new Date() 
      }).exec();
      
      // Broadcast offline status
      socket.broadcast.emit('user_status_changed', {
        userId: socket.userId,
        is_online: false,
        last_seen: new Date()
      });
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route not found' 
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`MongoDB URI: ${process.env.MONGODB_URI}`);
});

module.exports = app;

// =============================================================================
// 25. Docker Configuration (docker-compose.yml)
// =============================================================================
/*
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: chat_app_mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password123
      MONGO_INITDB_DATABASE: chat_app
    volumes:
      - mongodb_data:/data/db
      - ./mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    networks:
      - chat_app_network

  app:
    build: .
    container_name: chat_app_server
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://admin:password123@mongodb:27017/chat_app?authSource=admin
      JWT_SECRET: your_super_secure_jwt_secret_key_here
      CORS_ORIGIN: http://localhost:3000
    depends_on:
      - mongodb
    volumes:
      - .:/app
      - /app/node_modules
    networks:
      - chat_app_network

volumes:
  mongodb_data:

networks:
  chat_app_network:
    driver: bridge
*/

// =============================================================================
// 26. Dockerfile
// =============================================================================
/*
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000

CMD ["npm", "start"]
*/

// =============================================================================
// 27. README.md Instructions
// =============================================================================
/*
# Chat Application with MongoDB

A real-time chat application built with Node.js, Express, Socket.IO, and MongoDB.

## Features

- Real-time messaging with Socket.IO
- User roles (super_admin, admin, teacher, student)
- Role-based chat permissions
- Daily message limits
- Online/offline status tracking
- Conversation and group messaging
- Message read receipts
- Typing indicators

## Setup Instructions

### Prerequisites
- Node.js 18+ 
- MongoDB 4.4+
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install