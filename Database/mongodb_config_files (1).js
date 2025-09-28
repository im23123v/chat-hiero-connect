// =============================================================================
// 1. package.json
// =============================================================================
/*
{
  "name": "chat-app-mongodb",
  "version": "1.0.0", 
  "description": "Chat application with MongoDB backend",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "setup": "node scripts/setup-database.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongodb": "^6.1.0",
    "mongoose": "^7.5.0",
    "socket.io": "^4.7.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.10.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "joi": "^17.9.2",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
*/

// =============================================================================
// 2. .env (Environment Variables)
// =============================================================================
/*
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/chat_app
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/chat_app
JWT_SECRET=your_super_secure_jwt_secret_key_here
CORS_ORIGIN=http://localhost:3000
*/

// =============================================================================
// 3. config/database.js - Database Connection
// =============================================================================
const mongoose = require('mongoose');
require('dotenv').config();

const connectDatabase = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Setup change streams for real-time functionality
    const db = conn.connection.db;
    
    // Watch for changes in messages collection
    const messagesChangeStream = db.collection('messages').watch();
    messagesChangeStream.on('change', (change) => {
      console.log('Message change detected:', change.operationType);
      // Emit to Socket.IO clients
      if (global.io) {
        global.io.emit('message_change', change);
      }
    });

    // Watch for changes in conversations collection
    const conversationsChangeStream = db.collection('conversations').watch();
    conversationsChangeStream.on('change', (change) => {
      console.log('Conversation change detected:', change.operationType);
      if (global.io) {
        global.io.emit('conversation_change', change);
      }
    });

    // Watch for changes in users collection (online status)
    const usersChangeStream = db.collection('users').watch();
    usersChangeStream.on('change', (change) => {
      console.log('User change detected:', change.operationType);
      if (global.io) {
        global.io.emit('user_change', change);
      }
    });

    return conn;
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

module.exports = connectDatabase;

// =============================================================================
// 4. models/User.js - User Model
// =============================================================================
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    required: true,
    enum: ['super_admin', 'admin', 'teacher', 'student']
  },
  avatar_url: {
    type: String,
    default: null
  },
  is_online: {
    type: Boolean,
    default: false
  },
  last_seen: {
    type: Date,
    default: Date.now
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Update updated_at before saving
userSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Index for performance
userSchema.index({ role: 1 });
userSchema.index({ is_online: 1 });

const User = mongoose.model('User', userSchema);
module.exports = User;

// =============================================================================
// 5. models/Conversation.js - Conversation Model
// =============================================================================
const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  last_message_at: {
    type: Date,
    default: Date.now
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Ensure participants array has exactly 2 users and they're different
conversationSchema.pre('save', function(next) {
  if (this.participants.length !== 2) {
    return next(new Error('Conversation must have exactly 2 participants'));
  }
  if (this.participants[0].toString() === this.participants[1].toString()) {
    return next(new Error('Participants must be different users'));
  }
  next();
});

// Compound index to prevent duplicate conversations
conversationSchema.index({ participants: 1 }, { unique: true });
conversationSchema.index({ last_message_at: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);
module.exports = Conversation;

// =============================================================================
// 6. models/Group.js - Group Model
// =============================================================================
const mongoose = require('mongoose');

const groupMemberSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'member'],
    default: 'member'
  },
  joined_at: {
    type: Date,
    default: Date.now
  }
});

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: null
  },
  avatar_url: {
    type: String,
    default: null
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [groupMemberSchema],
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Update updated_at before saving
groupSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Indexes
groupSchema.index({ created_by: 1 });
groupSchema.index({ 'members.user_id': 1 });

const Group = mongoose.model('Group', groupSchema);
module.exports = Group;

// =============================================================================
// 7. models/Message.js - Message Model
// =============================================================================
const mongoose = require('mongoose');

const readBySchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  read_at: {
    type: Date,
    default: Date.now
  }
});

const messageSchema = new mongoose.Schema({
  sender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  message_type: {
    type: String,
    required: true,
    enum: ['conversation', 'group']
  },
  conversation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    default: null
  },
  group_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },
  is_read: {
    type: Boolean,
    default: false
  },
  read_by: [readBySchema],
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Ensure either conversation_id or group_id is set, but not both
messageSchema.pre('save', function(next) {
  const hasConversation = this.conversation_id != null;
  const hasGroup = this.group_id != null;
  
  if (!hasConversation && !hasGroup) {
    return next(new Error('Message must belong to either a conversation or a group'));
  }
  if (hasConversation && hasGroup) {
    return next(new Error('Message cannot belong to both conversation and group'));
  }
  next();
});

// Indexes for performance
messageSchema.index({ conversation_id: 1, created_at: -1 });
messageSchema.index({ group_id: 1, created_at: -1 });
messageSchema.index({ sender_id: 1 });
messageSchema.index({ created_at: -1 });

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;

// =============================================================================
// 8. models/ChatPermission.js - Chat Permission Model
// =============================================================================
const mongoose = require('mongoose');

const chatPermissionSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    unique: true,
    enum: ['super_admin', 'admin', 'teacher', 'student']
  },
  can_chat_with: [{
    type: String,
    enum: ['super_admin', 'admin', 'teacher', 'student']
  }],
  daily_message_limit: {
    type: Number,
    default: null // null means unlimited
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Update updated_at before saving
chatPermissionSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

const ChatPermission = mongoose.model('ChatPermission', chatPermissionSchema);
module.exports = ChatPermission;

// =============================================================================
// 9. controllers/userController.js - User Controller
// =============================================================================
const User = require('../models/User');
const ChatPermission = require('../models/ChatPermission');

const userController = {
  // Get all users
  getAllUsers: async (req, res) => {
    try {
      const users = await User.find().sort({ created_at: -1 });
      res.json({ success: true, data: users });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Get user by ID
  getUserById: async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Create new user
  createUser: async (req, res) => {
    try {
      const { name, role, avatar_url } = req.body;
      
      const user = new User({
        name,
        role,
        avatar_url
      });

      await user.save();
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Update user
  updateUser: async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { ...req.body, updated_at: Date.now() },
        { new: true, runValidators: true }
      );

      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      res.json({ success: true, data: user });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Update user online status
  updateOnlineStatus: async (req, res) => {
    try {
      const { is_online } = req.body;
      
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { 
          is_online,
          last_seen: Date.now(),
          updated_at: Date.now()
        },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Delete user
  deleteUser: async (req, res) => {
    try {
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = userController;

// =============================================================================
// 10. controllers/messageController.js - Message Controller
// =============================================================================
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Group = require('../models/Group');
const User = require('../models/User');

const messageController = {
  // Get messages for a conversation
  getConversationMessages: async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      
      const messages = await Message.find({ conversation_id: conversationId })
        .populate('sender_id', 'name avatar_url role')
        .sort({ created_at: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      res.json({ success: true, data: messages.reverse() });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Get messages for a group
  getGroupMessages: async (req, res) => {
    try {
      const { groupId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      
      const messages = await Message.find({ group_id: groupId })
        .populate('sender_id', 'name avatar_url role')
        .sort({ created_at: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      res.json({ success: true, data: messages.reverse() });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Send a message
  sendMessage: async (req, res) => {
    try {
      const { sender_id, content, message_type, conversation_id, group_id } = req.body;

      // Validate message type and target
      if (message_type === 'conversation' && !conversation_id) {
        return res.status(400).json({ success: false, error: 'Conversation ID required for conversation messages' });
      }
      if (message_type === 'group' && !group_id) {
        return res.status(400).json({ success: false, error: 'Group ID required for group messages' });
      }

      // Create the message
      const message = new Message({
        sender_id,
        content,
        message_type,
        conversation_id: message_type === 'conversation' ? conversation_id : null,
        group_id: message_type === 'group' ? group_id : null
      });

      await message.save();

      // Update conversation last_message_at if it's a conversation message
      if (message_type === 'conversation') {
        await Conversation.findByIdAndUpdate(conversation_id, {
          last_message_at: message.created_at
        });
      }

      // Update sender's last_seen and online status
      await User.findByIdAndUpdate(sender_id, {
        last_seen: Date.now(),
        is_online: true,
        updated_at: Date.now()
      });

      // Populate sender info
      await message.populate('sender_id', 'name avatar_url role');

      res.status(201).json({ success: true, data: message });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Mark message as read
  markMessageAsRead: async (req, res) => {
    try {
      const { messageId } = req.params;
      const { user_id } = req.body;

      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({ success: false, error: 'Message not found' });
      }

      // Check if user already marked as read
      const alreadyRead = message.read_by.some(read => read.user_id.toString() === user_id);
      
      if (!alreadyRead) {
        message.read_by.push({ user_id, read_at: new Date() });
        
        // For conversation messages, mark as read if both participants have read it
        if (message.message_type === 'conversation') {
          const conversation = await Conversation.findById(message.conversation_id);
          const allParticipantsRead = conversation.participants.every(participantId =>
            message.read_by.some(read => read.user_id.toString() === participantId.toString()) ||
            participantId.toString() === message.sender_id.toString()
          );
          
          if (allParticipantsRead) {
            message.is_read = true;
          }
        }
        
        await message.save();
      }

      res.json({ success: true, data: message });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Delete a message
  deleteMessage: async (req, res) => {
    try {
      const { messageId } = req.params;
      
      const message = await Message.findByIdAndDelete(messageId);
      if (!message) {
        return res.status(404).json({ success: false, error: 'Message not found' });
      }

      res.json({ success: true, message: 'Message deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = messageController;

// =============================================================================
// 11. controllers/conversationController.js - Conversation Controller
// =============================================================================
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const conversationController = {
  // Get all conversations for a user
  getUserConversations: async (req, res) => {
    try {
      const { userId } = req.params;
      
      const conversations = await Conversation.find({
        participants: userId
      })
      .populate('participants', 'name avatar_url role is_online last_seen')
      .sort({ last_message_at: -1 });

      // Get last message for each conversation
      const conversationsWithLastMessage = await Promise.all(
        conversations.map(async (conv) => {
          const lastMessage = await Message.findOne({
            conversation_id: conv._id
          }).sort({ created_at: -1 }).populate('sender_id', 'name');

          return {
            ...conv.toObject(),
            last_message: lastMessage
          };
        })
      );

      res.json({ success: true, data: conversationsWithLastMessage });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Create or get conversation between two users
  createOrGetConversation: async (req, res) => {
    try {
      const { participant1, participant2 } = req.body;

      if (participant1 === participant2) {
        return res.status(400).json({ success: false, error: 'Cannot create conversation with yourself' });
      }

      // Try to find existing conversation
      let conversation = await Conversation.findOne({
        $or: [
          { participants: [participant1, participant2] },
          { participants: [participant2, participant1] }
        ]
      }).populate('participants', 'name avatar_url role is_online last_seen');

      // If no conversation exists, create one
      if (!conversation) {
        conversation = new Conversation({
          participants: [participant1, participant2]
        });
        await conversation.save();
        await conversation.populate('participants', 'name avatar_url role is_online last_seen');
      }

      res.json({ success: true, data: conversation });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Get conversation by ID
  getConversationById: async (req, res) => {
    try {
      const conversation = await Conversation.findById(req.params.id)
        .populate('participants', 'name avatar_url role is_online last_seen');

      if (!conversation) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }

      res.json({ success: true, data: conversation });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Delete conversation
  deleteConversation: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Delete all messages in the conversation first
      await Message.deleteMany({ conversation_id: id });
      
      // Delete the conversation
      const conversation = await Conversation.findByIdAndDelete(id);
      
      if (!conversation) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }

      res.json({ success: true, message: 'Conversation and all messages deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = conversationController;

// =============================================================================
// 12. routes/users.js - User Routes
// =============================================================================
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// GET /api/users - Get all users
router.get('/', userController.getAllUsers);

// GET /api/users/:id - Get user by ID
router.get('/:id', userController.getUserById);

// POST /api/users - Create new user
router.post('/', userController.createUser);

// PUT /api/users/:id - Update user
router.put('/:id', userController.updateUser);

// PATCH /api/users/:id/online-status - Update online status
router.patch('/:id/online-status', userController.updateOnlineStatus);

// DELETE /api/users/:id - Delete user
router.delete('/:id', userController.deleteUser);

module.exports = router;

// =============================================================================
// 13. routes/messages.js - Message Routes
// =============================================================================
const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

// GET /api/messages/conversation/:conversationId - Get conversation messages
router.get('/conversation/:conversationId', messageController.getConversationMessages);

// GET /api/messages/group/:groupId - Get group messages
router.get('/group/:groupId', messageController.getGroupMessages);

// POST /api/messages - Send message
router.post('/', messageController.sendMessage);

// PATCH /api/messages/:messageId/read - Mark message as read
router.patch('/:messageId/read', messageController.markMessageAsRead);

// DELETE /api/messages/:messageId - Delete message
router.delete('/:messageId', messageController.deleteMessage);

module.exports = router;

// =============================================================================
// 14. routes/conversations.js - Conversation Routes
// =============================================================================
const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');

// GET /api/conversations/user/:userId - Get user's conversations
router.get('/user/:userId', conversationController.getUserConversations);

// POST /api/conversations - Create or get conversation
router.post('/', conversationController.createOrGetConversation);

// GET /api/conversations/:id - Get conversation by ID
router.get('/:id', conversationController.getConversationById);

// DELETE /api/conversations/:id - Delete conversation
router.delete('/:id', conversationController.deleteConversation);

module.exports = router;

// =============================================================================
// 15. server.js - Main Server File
// =============================================================================
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDatabase = require('./config/database');

// Import routes
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const conversationRoutes = require('./routes/conversations');

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

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user to their personal room
  socket.on('join_user', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined personal room`);
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
    const { conversationId, groupId, userId, userName } = data;
    const room = conversationId ? `conversation_${conversationId}` : `group_${groupId}`;
    
    socket.to(room).emit('user_typing', {
      userId,
      userName,
      conversationId,
      groupId
    });
  });

  socket.on('typing_stop', (data) => {
    const { conversationId, groupId, userId } = data;
    const room = conversationId ? `conversation_${conversationId}` : `group_${groupId}`;
    
    socket.to(room).emit('user_stopped_typing', {
      userId,
      conversationId,
      groupId
    });
  });

  // Handle user online status
  socket.on('user_online', (userId) => {
    socket.broadcast.emit('user_status_changed', {
      userId,
      is_online: true,
      last_seen: new Date()
    });
  });

  socket.on('user_offline', (userId) => {
    socket.broadcast.emit('user_status_changed', {
      userId,
      is_online: false,
      last_seen: new Date()
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
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
});

module.exports = app;