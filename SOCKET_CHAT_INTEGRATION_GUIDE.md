# Socket.io Real-Time Chat Integration Guide

## Overview
Real-time chat system using Socket.io with subscription-based access control. Only paid members can chat, with different limits based on their subscription plan.

## Subscription Plans & Chat Limits

### 1. BASIC PLAN
- **Price:** ₹99
- **Duration:** 30 days
- **Chat:** ❌ NOT allowed
- **Interests:** 30
- **Shortlist:** 10

### 2. MEDIUM PLAN
- **Price:** ₹299
- **Duration:** 90 days
- **Chat:** ✅ Allowed with **20 unique users** only
- **Interests:** 150
- **Shortlist:** 50

### 3. HIGH PLAN
- **Price:** ₹999
- **Duration:** 120 days
- **Chat:** ✅ **Unlimited** users
- **Interests:** Unlimited
- **Shortlist:** Unlimited

## Socket.io Events

### Client → Server Events

#### 1. Connection
```javascript
// Connect with JWT token
const socket = io("http://your-server.com", {
  auth: {
    token: "your_jwt_token"
  }
});
```

#### 2. Join Chat Room
```javascript
socket.emit("join_chat", {
  targetUserId: "user-uuid"
});
```

**Response:**
```javascript
socket.on("joined_chat", (data) => {
  console.log(data);
  // { roomId: "user1_user2", targetUserId: "user-uuid" }
});
```

#### 3. Send Message
```javascript
socket.emit("send_message", {
  targetUserId: "user-uuid",
  content: "Hello!",
  roomId: "user1_user2"
});
```

**Response:**
```javascript
socket.on("new_message", (message) => {
  console.log(message);
  // {
  //   id: "message-id",
  //   fromUserId: "sender-id",
  //   toUserId: "receiver-id",
  //   content: "Hello!",
  //   isRead: false,
  //   createdAt: "2024-01-01T00:00:00.000Z",
  //   sender: { id, email, name }
  // }
});
```

#### 4. Typing Indicator
```javascript
// Start typing
socket.emit("typing", {
  roomId: "user1_user2",
  targetUserId: "user-uuid"
});

// Stop typing
socket.emit("stop_typing", {
  roomId: "user1_user2"
});
```

#### 5. Mark Message as Read
```javascript
socket.emit("mark_read", {
  messageId: "message-uuid"
});
```

### Server → Client Events

#### 1. Error
```javascript
socket.on("error", (error) => {
  console.error(error);
  // { message: "Chat not allowed", code: "CHAT_NOT_ALLOWED" }
});
```

#### 2. New Message
```javascript
socket.on("new_message", (message) => {
  // Handle new message
});
```

#### 3. New Message Notification (when not in room)
```javascript
socket.on("new_message_notification", (data) => {
  // { message: {...}, roomId: "user1_user2" }
});
```

#### 4. User Joined Chat
```javascript
socket.on("user_joined_chat", (data) => {
  // { userId: "user-id", roomId: "user1_user2" }
});
```

#### 5. User Typing
```javascript
socket.on("user_typing", (data) => {
  // { userId: "user-id", isTyping: true/false }
});
```

#### 6. Message Read
```javascript
socket.on("message_read", (data) => {
  // { messageId: "message-id", readBy: "user-id" }
});
```

#### 7. User Offline
```javascript
socket.on("user_offline", (data) => {
  // { userId: "user-id" }
});
```

## Frontend Integration Example

### React Example

```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function ChatComponent({ targetUserId, token }) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [roomId, setRoomId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    // Connect to Socket.io
    const newSocket = io('http://your-server.com', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Connected to chat server');
      
      // Join chat room
      newSocket.emit('join_chat', { targetUserId });
    });

    newSocket.on('joined_chat', (data) => {
      setRoomId(data.roomId);
    });

    newSocket.on('new_message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('error', (error) => {
      alert(error.message);
    });

    newSocket.on('user_typing', (data) => {
      if (data.userId === targetUserId) {
        setIsTyping(data.isTyping);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [targetUserId, token]);

  const sendMessage = (content) => {
    if (socket && roomId) {
      socket.emit('send_message', {
        targetUserId,
        content,
        roomId
      });
    }
  };

  const handleTyping = () => {
    if (socket && roomId) {
      socket.emit('typing', { roomId, targetUserId });
    }
  };

  const handleStopTyping = () => {
    if (socket && roomId) {
      socket.emit('stop_typing', { roomId });
    }
  };

  return (
    <div>
      {/* Chat UI */}
      <div>
        {messages.map(msg => (
          <div key={msg.id}>{msg.content}</div>
        ))}
      </div>
      {isTyping && <div>User is typing...</div>}
      <input
        onKeyPress={handleTyping}
        onBlur={handleStopTyping}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            sendMessage(e.target.value);
            e.target.value = '';
          }
        }}
      />
    </div>
  );
}
```

## Error Handling

### Common Errors

1. **"Chat not allowed"**
   - User doesn't have active subscription
   - User has BASIC plan (no chat)
   - User has reached MEDIUM plan limit (20 users)

2. **"Cannot chat with blocked user"**
   - Either user has blocked the other

3. **"Authentication failed"**
   - Invalid or expired JWT token

## Chat Limits Logic

### MEDIUM Plan (20 Users Limit)

1. When user joins chat with a new user:
   - System checks if user already chatting with this user
   - If new, checks total unique users count
   - If count < 20, allows chat and creates entry
   - If count >= 20, blocks chat with error message

2. Tracking:
   - Each unique chat user is stored in `ChatUser` table
   - Automatically created when first message sent
   - Counted to enforce 20 user limit

### HIGH Plan (Unlimited)

- No limit checking
- Can chat with unlimited users

## Database Schema

### ChatUser Model
Tracks unique users for MEDIUM plan limit:
```prisma
model ChatUser {
  id        String   @id @default(uuid())
  userId    String   // User with subscription
  chatUserId String  // User they are chatting with
  createdAt DateTime @default(now())
  
  @@unique([userId, chatUserId])
}
```

## Environment Variables

Add to `.env`:
```env
CLIENT_URL=http://localhost:3000  # Frontend URL for CORS
```

## Testing

1. **Test BASIC Plan:**
   - User with BASIC plan should get "Chat not allowed" error

2. **Test MEDIUM Plan:**
   - User can chat with up to 20 unique users
   - 21st user should get limit error

3. **Test HIGH Plan:**
   - User can chat with unlimited users

4. **Test Real-time:**
   - Open two browser windows
   - Send message from one
   - Should appear instantly in other

## Notes

- Messages are persisted in database
- Chat rooms are automatically created (sorted user IDs)
- Typing indicators work in real-time
- Read receipts are supported
- Online/offline status is tracked
- Blocked users cannot chat with each other

