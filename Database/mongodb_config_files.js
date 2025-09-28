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
          updated_at: Date.