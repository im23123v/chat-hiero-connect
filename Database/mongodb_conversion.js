// MongoDB Database Setup and Collections
// Run this script in MongoDB shell or use with a Node.js MongoDB driver

// 1. Users Collection - FROM FRONTED ENDPOINT TAKE INPUT ROLE
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "role"],
      properties: {
        _id: { bsonType: "objectId" },
        name: { bsonType: "string" },
        role: { 
          bsonType: "string",
          enum: ["super_admin", "admin", "teacher", "student"]
        },
        avatar_url: { bsonType: ["string", "null"] },
        is_online: { bsonType: "bool" },
        last_seen: { bsonType: "date" },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  }
});

// Create indexes for users
db.users.createIndex({ "role": 1 });
db.users.createIndex({ "is_online": 1 });
db.users.createIndex({ "created_at": 1 });

// 2. Conversations Collection (for 1-on-1 chats)
db.createCollection("conversations", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["participants"],
      properties: {
        _id: { bsonType: "objectId" },
        participants: {
          bsonType: "array",
          minItems: 2,
          maxItems: 2,
          items: { bsonType: "objectId" }
        },
        last_message_at: { bsonType: "date" },
        created_at: { bsonType: "date" }
      }
    }
  }
});

// Create compound unique index to prevent duplicate conversations
db.conversations.createIndex({ "participants": 1 }, { unique: true });
db.conversations.createIndex({ "last_message_at": -1 });

// 3. Groups Collection
db.createCollection("groups", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "created_by"],
      properties: {
        _id: { bsonType: "objectId" },
        name: { bsonType: "string" },
        description: { bsonType: ["string", "null"] },
        avatar_url: { bsonType: ["string", "null"] },
        created_by: { bsonType: "objectId" },
        members: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["user_id", "role"],
            properties: {
              user_id: { bsonType: "objectId" },
              role: { 
                bsonType: "string",
                enum: ["admin", "member"]
              },
              joined_at: { bsonType: "date" }
            }
          }
        },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  }
});

// Create indexes for groups
db.groups.createIndex({ "created_by": 1 });
db.groups.createIndex({ "members.user_id": 1 });
db.groups.createIndex({ "created_at": 1 });

// 4. Messages Collection (handles both conversation and group messages)
db.createCollection("messages", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["sender_id", "content", "message_type"],
      properties: {
        _id: { bsonType: "objectId" },
        sender_id: { bsonType: "objectId" },
        content: { bsonType: "string" },
        message_type: { 
          bsonType: "string",
          enum: ["conversation", "group"]
        },
        conversation_id: { bsonType: ["objectId", "null"] },
        group_id: { bsonType: ["objectId", "null"] },
        is_read: { bsonType: "bool" },
        read_by: {
          bsonType: "array",
          items: {
            bsonType: "object",
            properties: {
              user_id: { bsonType: "objectId" },
              read_at: { bsonType: "date" }
            }
          }
        },
        created_at: { bsonType: "date" }
      }
    }
  }
});

// Create indexes for messages
db.messages.createIndex({ "conversation_id": 1, "created_at": -1 });
db.messages.createIndex({ "group_id": 1, "created_at": -1 });
db.messages.createIndex({ "sender_id": 1 });
db.messages.createIndex({ "created_at": -1 });

// 5. Chat Permissions Collection
db.createCollection("chat_permissions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["role", "can_chat_with"],
      properties: {
        _id: { bsonType: "objectId" },
        role: { 
          bsonType: "string",
          enum: ["super_admin", "admin", "teacher", "student"]
        },
        can_chat_with: {
          bsonType: "array",
          items: { 
            bsonType: "string",
            enum: ["super_admin", "admin", "teacher", "student"]
          }
        },
        daily_message_limit: { bsonType: ["int", "null"] },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  }
});

// Create unique index on role
db.chat_permissions.createIndex({ "role": 1 }, { unique: true });

// 6. Permissions Collection
db.createCollection("permissions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "category"],
      properties: {
        _id: { bsonType: "objectId" },
        name: { bsonType: "string" },
        description: { bsonType: ["string", "null"] },
        category: { bsonType: "string" },
        created_at: { bsonType: "date" }
      }
    }
  }
});

// Create unique index on permission name
db.permissions.createIndex({ "name": 1 }, { unique: true });
db.permissions.createIndex({ "category": 1 });

// 7. Role Permissions Collection
db.createCollection("role_permissions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["role", "permissions"],
      properties: {
        _id: { bsonType: "objectId" },
        role: { 
          bsonType: "string",
          enum: ["super_admin", "admin", "teacher", "student"]
        },
        permissions: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["permission_id"],
            properties: {
              permission_id: { bsonType: "objectId" },
              granted_by: { bsonType: ["objectId", "null"] },
              granted_at: { bsonType: "date" }
            }
          }
        },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  }
});

// Create unique index on role
db.role_permissions.createIndex({ "role": 1 }, { unique: true });
db.role_permissions.createIndex({ "permissions.permission_id": 1 });

// 8. Role Settings Collection
db.createCollection("role_settings", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["role", "settings"],
      properties: {
        _id: { bsonType: "objectId" },
        role: { 
          bsonType: "string",
          enum: ["super_admin", "admin", "teacher", "student"]
        },
        settings: { bsonType: "object" },
        created_by: { bsonType: ["objectId", "null"] },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  }
});

// Create unique index on role
db.role_settings.createIndex({ "role": 1 }, { unique: true });

// Insert Sample Data
// Sample Users
const sampleUsers = [
  {
    name: "Emma Wilson",
    role: "super_admin",
    is_online: true,
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
    last_seen: new Date(),
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: "Michael Chen", 
    role: "admin",
    is_online: true,
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael",
    last_seen: new Date(),
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: "Sarah Johnson",
    role: "teacher", 
    is_online: false,
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    last_seen: new Date(Date.now() - 3600000), // 1 hour ago
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: "David Rodriguez",
    role: "teacher",
    is_online: true, 
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
    last_seen: new Date(),
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: "Alice Brown",
    role: "student",
    is_online: true,
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice", 
    last_seen: new Date(),
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: "Tom Williams",
    role: "student",
    is_online: false,
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tom",
    last_seen: new Date(Date.now() - 7200000), // 2 hours ago
    created_at: new Date(),
    updated_at: new Date()
  }
];

const userInsertResult = db.users.insertMany(sampleUsers);
const userIds = Object.values(userInsertResult.insertedIds);

// Sample Permissions
const samplePermissions = [
  {
    name: "chat_with_any_role",
    description: "Can chat with users of any role",
    category: "communication",
    created_at: new Date()
  },
  {
    name: "chat_cross_hierarchy", 
    description: "Can chat across role hierarchy levels",
    category: "communication",
    created_at: new Date()
  },
  {
    name: "create_users",
    description: "Can create new users",
    category: "user_management", 
    created_at: new Date()
  },
  {
    name: "manage_lower_roles",
    description: "Can manage users of lower roles",
    category: "user_management",
    created_at: new Date()
  },
  {
    name: "view_all_conversations",
    description: "Can view all conversations in the system", 
    category: "administration",
    created_at: new Date()
  },
  {
    name: "delete_messages",
    description: "Can delete messages",
    category: "moderation",
    created_at: new Date()
  },
  {
    name: "ban_users",
    description: "Can ban or suspend users",
    category: "moderation", 
    created_at: new Date()
  },
  {
    name: "modify_user_roles",
    description: "Can modify user roles",
    category: "administration",
    created_at: new Date()
  },
  {
    name: "access_admin_panel",
    description: "Can access administrative panel", 
    category: "administration",
    created_at: new Date()
  },
  {
    name: "broadcast_messages",
    description: "Can send broadcast messages to all users",
    category: "communication",
    created_at: new Date()
  }
];

const permissionInsertResult = db.permissions.insertMany(samplePermissions);
const permissionIds = Object.values(permissionInsertResult.insertedIds);

// Sample Chat Permissions
const chatPermissions = [
  {
    role: "super_admin",
    can_chat_with: ["super_admin", "admin", "teacher", "student"],
    daily_message_limit: null,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    role: "admin", 
    can_chat_with: ["super_admin", "admin", "teacher", "student"],
    daily_message_limit: 500,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    role: "teacher",
    can_chat_with: ["admin", "teacher", "student"], 
    daily_message_limit: 200,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    role: "student",
    can_chat_with: ["teacher"],
    daily_message_limit: 50,
    created_at: new Date(),
    updated_at: new Date()
  }
];

db.chat_permissions.insertMany(chatPermissions);

// Sample Role Permissions
const rolePermissions = [
  {
    role: "super_admin",
    permissions: permissionIds.map(id => ({
      permission_id: id,
      granted_by: userIds[0], // Emma Wilson (super_admin)
      granted_at: new Date()
    })),
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    role: "admin",
    permissions: permissionIds.slice(0, 4).map(id => ({
      permission_id: id,
      granted_by: userIds[0],
      granted_at: new Date()
    })),
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    role: "teacher", 
    permissions: permissionIds.slice(0, 3).map(id => ({
      permission_id: id,
      granted_by: userIds[0],
      granted_at: new Date()
    })),
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    role: "student",
    permissions: [], // No special permissions
    created_at: new Date(),
    updated_at: new Date()
  }
];

db.role_permissions.insertMany(rolePermissions);

// Sample Role Settings
const roleSettings = [
  {
    role: "super_admin",
    settings: {
      chat_restrictions: {
        can_chat_with: ["super_admin", "admin", "teacher", "student"],
        max_daily_messages: null
      }
    },
    created_by: userIds[0],
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    role: "admin",
    settings: {
      chat_restrictions: {
        can_chat_with: ["super_admin", "admin", "teacher", "student"], 
        max_daily_messages: 500
      }
    },
    created_by: userIds[0],
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    role: "teacher",
    settings: {
      chat_restrictions: {
        can_chat_with: ["admin", "teacher", "student"],
        max_daily_messages: 200
      }
    },
    created_by: userIds[0],
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    role: "student",
    settings: {
      chat_restrictions: {
        can_chat_with: ["teacher"],
        max_daily_messages: 50
      }
    },
    created_by: userIds[0],
    created_at: new Date(), 
    updated_at: new Date()
  }
];

db.role_settings.insertMany(roleSettings);

// Create a sample conversation
const conversation = {
  participants: [userIds[2], userIds[4]], // Sarah Johnson (teacher) and Alice Brown (student)
  last_message_at: new Date(),
  created_at: new Date()
};

const conversationResult = db.conversations.insertOne(conversation);

// Create a sample message
const message = {
  sender_id: userIds[2], // Sarah Johnson
  content: "Hello Alice! How are you doing with your studies?",
  message_type: "conversation",
  conversation_id: conversationResult.insertedId,
  group_id: null,
  is_read: false,
  read_by: [],
  created_at: new Date()
};

db.messages.insertOne(message);

console.log("MongoDB collections and sample data created successfully!");
console.log("User IDs:", userIds);
console.log("Permission IDs:", permissionIds);
console.log("Conversation ID:", conversationResult.insertedId);