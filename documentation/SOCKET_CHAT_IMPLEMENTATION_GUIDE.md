# 🚀 Socket.io Real-time Chat Implementation Guide (Hinglish)

## 📋 Complete User Flow Step-by-Step

### 1. User Login (JWT Token)
**Kaise kaam karta hai:**
- User apna email/password se login karta hai
- Backend se JWT token milta hai
- Ye token hum socket connection ke liye use karenge

```javascript
// Login API call
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { token } = await loginResponse.json();
localStorage.setItem('authToken', token);
```

### 2. Socket Connection with Auth Token
**Kaise kaam karta hai:**
- Socket server se connect karte waqt auth token bhejna padta hai
- Server token verify karta hai aur user ko authenticate karta hai

### 3. Join Chat with Target User
**Kaise kaam karta hai:**
- Jis user se chat karni hai, uski ID ke saath `join_chat` event emit karna padta hai
- Backend room create karta hai aur `roomId` return karta hai

### 4. Receive RoomId
**Kaise kaam karta hai:**
- `joined_chat` event se roomId mil jaati hai
- Is roomId ko future messages ke liye use karenge

### 5. Fetch Old Messages (REST API)
**Kaise kaam karta hai:**
- `/api/messages/:userId` endpoint se purane messages fetch karo
- Ye ek baar hi karna padta hai - jab chat screen open ho

### 6. Send Message via Socket
**Kaise kaam karta hai:**
- `send_message` event ke through message bhejo
- Message backend pe save hota hai aur doosre user ko real-time deliver hota hai

### 7. Receive New Message in Real-time
**Kaise kaam karta hai:**
- `new_message` event listen karo
- Jab koi message aaye, UI me display karo

### 8. Typing Indicator
**Kaise kaam karta hai:**
- User type karta hai to `typing` event bhejo
- User stop karta hai to `stop_typing` event bhejo
- Doosre user ko `user_typing` event milta hai

### 9. Read Receipts
**Kaise kaam karta hai:**
- Message read hote hi `mark_read` event bhejo
- Sender ko `message_read` event milta hai

### 10. Online/Offline Status
**Kaise kaam karta hai:**
- User connect ho to `user_online` event
- User disconnect ho to `user_offline` event

---

## 🛠️ Frontend Integration Steps (Angular)

### Step 1: Install Socket.io Client

```bash
npm install socket.io-client
```

### Step 2: Create Socket Service

**File: `src/app/services/socket.service.ts`**

```typescript
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  private isConnected = new BehaviorSubject<boolean>(false);
  private currentRoomId: string | null = null;

  // Observables for different events
  public newMessage$ = new BehaviorSubject<any>(null);
  public userTyping$ = new BehaviorSubject<any>(null);
  public messageRead$ = new BehaviorSubject<any>(null);
  public userOnline$ = new BehaviorSubject<any>(null);
  public userOffline$ = new BehaviorSubject<any>(null);
  public error$ = new BehaviorSubject<any>(null);

  constructor() {}

  // Initialize socket connection
  connect(token: string): void {
    if (this.socket?.connected) return;

    // Replace with your backend URL
    const BACKEND_URL = 'http://localhost:3000';
    
    this.socket = io(BACKEND_URL, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id);
      this.isConnected.next(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      this.isConnected.next(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.isConnected.next(false);
    });

    // Chat events
    this.setupChatEvents();
  }

  // Setup all chat event listeners
  private setupChatEvents(): void {
    if (!this.socket) return;

    // New message received
    this.socket.on('new_message', (message) => {
      console.log('📩 New message received:', message);
      this.newMessage$.next(message);
    });

    // User typing indicator
    this.socket.on('user_typing', (data) => {
      console.log('✍️ User typing:', data);
      this.userTyping$.next(data);
    });

    // Message read receipt
    this.socket.on('message_read', (data) => {
      console.log('✅ Message read:', data);
      this.messageRead$.next(data);
    });

    // User online/offline
    this.socket.on('user_online', (data) => {
      console.log('🟢 User online:', data);
      this.userOnline$.next(data);
    });

    this.socket.on('user_offline', (data) => {
      console.log('🔴 User offline:', data);
      this.userOffline$.next(data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.error$.next(error);
    });
  }

  // Join chat with target user
  joinChat(targetUserId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject('Socket not connected');
        return;
      }

      this.socket.emit('join_chat', { targetUserId }, (response: any) => {
        if (response?.error) {
          reject(response.error);
        } else {
          this.currentRoomId = response.roomId;
          console.log('🚪 Joined chat room:', response.roomId);
          resolve(response.roomId);
        }
      });
    });
  }

  // Send message
  sendMessage(targetUserId: string, content: string): void {
    if (!this.socket || !this.currentRoomId) {
      console.error('Socket not connected or room not joined');
      return;
    }

    const messageData = {
      targetUserId,
      content,
      roomId: this.currentRoomId
    };

    this.socket.emit('send_message', messageData);
    console.log('📤 Message sent:', messageData);
  }

  // Typing indicator
  sendTyping(targetUserId: string): void {
    if (!this.socket || !this.currentRoomId) return;
    
    this.socket.emit('typing', {
      roomId: this.currentRoomId,
      targetUserId
    });
  }

  // Stop typing indicator
  sendStopTyping(targetUserId: string): void {
    if (!this.socket || !this.currentRoomId) return;
    
    this.socket.emit('stop_typing', {
      roomId: this.currentRoomId,
      targetUserId
    });
  }

  // Mark message as read
  markAsRead(messageId: string): void {
    if (!this.socket) return;
    
    this.socket.emit('mark_read', { messageId });
    console.log('✅ Marked as read:', messageId);
  }

  // Disconnect socket
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected.next(false);
      this.currentRoomId = null;
    }
  }

  // Get connection status
  getConnectionStatus(): Observable<boolean> {
    return this.isConnected.asObservable();
  }

  // Cleanup on destroy
  ngOnDestroy(): void {
    this.disconnect();
  }
}
```

### Step 3: Create Chat Component

**File: `src/app/components/chat/chat.component.ts`**

```typescript
import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  
  targetUserId: string = '';
  messages: any[] = [];
  newMessage: string = '';
  isTyping: boolean = false;
  typingUserId: string = '';
  isConnected: boolean = false;
  
  private authToken: string = '';

  constructor(
    private route: ActivatedRoute,
    private socketService: SocketService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // Get target user ID from route
    this.targetUserId = this.route.snapshot.paramMap.get('userId') || '';
    
    // Get auth token
    this.authToken = localStorage.getItem('authToken') || '';
    
    if (!this.authToken) {
      console.error('No auth token found');
      return;
    }

    // Initialize socket connection
    this.initializeChat();
  }

  ngOnDestroy(): void {
    this.socketService.disconnect();
  }

  private async initializeChat(): Promise<void> {
    try {
      // 1. Connect to socket
      this.socketService.connect(this.authToken);
      
      // 2. Subscribe to connection status
      this.socketService.getConnectionStatus().subscribe(status => {
        this.isConnected = status;
        console.log('Connection status:', status ? '🟢 Connected' : '🔴 Disconnected');
      });

      // 3. Subscribe to new messages
      this.socketService.newMessage$.subscribe(message => {
        if (message) {
          this.messages.push(message);
          this.scrollToBottom();
        }
      });

      // 4. Subscribe to typing indicators
      this.socketService.userTyping$.subscribe(data => {
        if (data) {
          this.isTyping = data.isTyping;
          this.typingUserId = data.userId;
        }
      });

      // 5. Subscribe to read receipts
      this.socketService.messageRead$.subscribe(data => {
        if (data) {
          // Update message read status in UI
          const message = this.messages.find(m => m.id === data.messageId);
          if (message) {
            message.isRead = true;
          }
        }
      });

      // 6. Subscribe to errors
      this.socketService.error$.subscribe(error => {
        if (error) {
          console.error('Chat error:', error);
          // Show error to user
        }
      });

      // 7. Join chat room
      const roomId = await this.socketService.joinChat(this.targetUserId);
      console.log('Joined room:', roomId);

      // 8. Fetch old messages
      await this.fetchOldMessages();

    } catch (error) {
      console.error('Failed to initialize chat:', error);
    }
  }

  private async fetchOldMessages(): Promise<void> {
    try {
      const response: any = await this.http.get(
        `/api/messages/${this.targetUserId}`
      ).toPromise();
      
      if (response.status === 'success') {
        this.messages = response.data.messages || [];
        this.scrollToBottom();
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.isConnected) return;

    // Send message via socket
    this.socketService.sendMessage(this.targetUserId, this.newMessage.trim());
    
    // Clear input
    this.newMessage = '';
    
    // Stop typing indicator
    this.socketService.sendStopTyping(this.targetUserId);
  }

  onTyping(): void {
    if (this.newMessage.trim() && this.isConnected) {
      this.socketService.sendTyping(this.targetUserId);
    }
  }

  markAsRead(messageId: string): void {
    this.socketService.markAsRead(messageId);
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = 
          this.messagesContainer.nativeElement.scrollHeight;
      }
    }, 100);
  }
}
```

**File: `src/app/components/chat/chat.component.html`**

```html
<div class="chat-container">
  <!-- Header -->
  <div class="chat-header">
    <h3>Chat with User {{ targetUserId }}</h3>
    <div class="connection-status">
      <span [class.connected]="isConnected" [class.disconnected]="!isConnected">
        {{ isConnected ? '🟢 Online' : '🔴 Offline' }}
      </span>
    </div>
  </div>

  <!-- Messages Container -->
  <div class="messages-container" #messagesContainer>
    <div 
      *ngFor="let message of messages" 
      class="message"
      [class.own-message]="message.fromUserId === getCurrentUserId()"
    >
      <div class="message-content">
        {{ message.content }}
      </div>
      <div class="message-meta">
        <span class="timestamp">{{ message.createdAt | date:'short' }}</span>
        <span 
          *ngIf="message.isRead && message.fromUserId !== getCurrentUserId()" 
          class="read-indicator"
        >
          ✓✓
        </span>
      </div>
    </div>

    <!-- Typing indicator -->
    <div *ngIf="isTyping" class="typing-indicator">
      {{ typingUserId }} is typing...
    </div>
  </div>

  <!-- Input Area -->
  <div class="input-container">
    <input
      type="text"
      [(ngModel)]="newMessage"
      (keyup.enter)="sendMessage()"
      (input)="onTyping()"
      placeholder="Type a message..."
      [disabled]="!isConnected"
    />
    <button 
      (click)="sendMessage()" 
      [disabled]="!newMessage.trim() || !isConnected"
      class="send-button"
    >
      Send
    </button>
  </div>
</div>
```

**File: `src/app/components/chat/chat.component.css`**

```css
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 600px;
  margin: 0 auto;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

.chat-header {
  background: #007bff;
  color: white;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.connection-status .connected {
  color: #28a745;
}

.connection-status .disconnected {
  color: #dc3545;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  background: #f8f9fa;
}

.message {
  margin-bottom: 15px;
  max-width: 70%;
}

.own-message {
  margin-left: auto;
}

.message-content {
  background: white;
  padding: 10px 15px;
  border-radius: 18px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.own-message .message-content {
  background: #007bff;
  color: white;
}

.message-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
  margin-top: 5px;
}

.read-indicator {
  color: #007bff;
}

.typing-indicator {
  font-style: italic;
  color: #666;
  padding: 5px 10px;
}

.input-container {
  display: flex;
  padding: 15px;
  background: white;
  border-top: 1px solid #ddd;
}

.input-container input {
  flex: 1;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 20px;
  margin-right: 10px;
}

.send-button {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 20px;
  cursor: pointer;
}

.send-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
```

### Step 4: Update App Module

**File: `src/app/app.module.ts`**

```typescript
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { ChatComponent } from './components/chat/chat.component';

@NgModule({
  declarations: [
    AppComponent,
    ChatComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

### Step 5: Add Route

**File: `src/app/app-routing.module.ts`**

```typescript
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChatComponent } from './components/chat/chat.component';

const routes: Routes = [
  { path: 'chat/:userId', component: ChatComponent },
  { path: '', redirectTo: '/chat', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
```

---

## 📱 React Implementation Example

### Socket Service (React)

**File: `src/services/socketService.js`**

```javascript
import { io } from 'socket.io-client';
import { useState, useEffect } from 'react';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = {};
  }

  connect(token) {
    if (this.socket?.connected) return;

    const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
    
    this.socket = io(BACKEND_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  // Event listeners
  on(event, callback) {
    if (!this.socket) return;
    
    this.socket.on(event, callback);
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  // Remove listener
  off(event, callback) {
    if (!this.socket) return;
    
    this.socket.off(event, callback);
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  // Emit events
  emit(event, data) {
    if (!this.socket) return;
    this.socket.emit(event, data);
  }

  // Join chat
  joinChat(targetUserId) {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject('Socket not connected');
        return;
      }

      this.socket.emit('join_chat', { targetUserId }, (response) => {
        if (response?.error) {
          reject(response.error);
        } else {
          resolve(response.roomId);
        }
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// Singleton instance
const socketService = new SocketService();
export default socketService;

// React Hook for socket
export const useSocket = (token) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (token) {
      socketService.connect(token);
      
      socketService.on('connect', () => setIsConnected(true));
      socketService.on('disconnect', () => setIsConnected(false));
      
      return () => {
        socketService.disconnect();
      };
    }
  }, [token]);

  return { socketService, isConnected };
};
```

### Chat Component (React)

**File: `src/components/Chat.jsx`**

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import socketService, { useSocket } from '../services/socketService';

const Chat = () => {
  const { userId: targetUserId } = useParams();
  const token = localStorage.getItem('authToken');
  const { isConnected } = useSocket(token);
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!token || !targetUserId) return;

    const initializeChat = async () => {
      try {
        // Join chat room
        const roomId = await socketService.joinChat(targetUserId);
        setRoomId(roomId);
        
        // Fetch old messages
        fetchOldMessages();
        
        // Listen for new messages
        socketService.on('new_message', (message) => {
          setMessages(prev => [...prev, message]);
        });

        // Listen for typing
        socketService.on('user_typing', (data) => {
          setIsTyping(data.isTyping);
        });

        // Listen for errors
        socketService.on('error', (error) => {
          console.error('Chat error:', error);
        });

      } catch (error) {
        console.error('Failed to join chat:', error);
      }
    };

    initializeChat();

    return () => {
      // Cleanup listeners
      socketService.off('new_message');
      socketService.off('user_typing');
      socketService.off('error');
    };
  }, [token, targetUserId]);

  const fetchOldMessages = async () => {
    try {
      const response = await fetch(`/api/messages/${targetUserId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        setMessages(data.data.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !isConnected) return;
    
    socketService.emit('send_message', {
      targetUserId,
      content: newMessage.trim(),
      roomId
    });
    
    setNewMessage('');
    socketService.emit('stop_typing', { roomId, targetUserId });
  };

  const handleTyping = () => {
    if (newMessage.trim() && isConnected) {
      socketService.emit('typing', { roomId, targetUserId });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>Chat with {targetUserId}</h3>
        <span className={isConnected ? 'connected' : 'disconnected'}>
          {isConnected ? '🟢 Online' : '🔴 Offline'}
        </span>
      </div>

      <div className="messages-container">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`message ${msg.fromUserId === getCurrentUserId() ? 'own' : ''}`}
          >
            <div className="message-content">{msg.content}</div>
            <div className="message-meta">
              <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
            </div>
          </div>
        ))}
        
        {isTyping && <div className="typing-indicator">User is typing...</div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onInput={handleTyping}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          disabled={!isConnected}
        />
        <button onClick={sendMessage} disabled={!newMessage.trim() || !isConnected}>
          Send
        </button>
      </div>
    </div>
  );
};

const getCurrentUserId = () => {
  // Implement your user ID retrieval logic
  return localStorage.getItem('userId') || 'current-user-id';
};

export default Chat;
```

---

## 🔧 Local Testing Steps

### Method 1: Two Browser Tabs Testing

**Steps:**
1. **Tab 1 (User A):**
   - Login as User A
   - Go to: `http://localhost:4200/chat/USER_B_ID`
   - Keep this tab open

2. **Tab 2 (User B):**
   - Login as User B (use incognito/private window)
   - Go to: `http://localhost:4200/chat/USER_A_ID`
   - Keep this tab open

3. **Testing:**
   - Send message from Tab 1 → Should appear in Tab 2 instantly
   - Send message from Tab 2 → Should appear in Tab 1 instantly
   - Type in one tab → Should see typing indicator in other tab
   - Check online/offline status

### Method 2: Node.js Test Script

**File: `test-socket-client.js`**

```javascript
const io = require('socket.io-client');

// User A credentials
const USER_A_TOKEN = 'your-user-a-jwt-token';
const USER_B_ID = 'user-b-uuid';

// User B credentials
const USER_B_TOKEN = 'your-user-b-jwt-token';
const USER_A_ID = 'user-a-uuid';

// Test User A
const socketA = io('http://localhost:3000', {
  auth: { token: USER_A_TOKEN }
});

socketA.on('connect', async () => {
  console.log('🟢 User A connected:', socketA.id);
  
  // Join chat with User B
  socketA.emit('join_chat', { targetUserId: USER_B_ID }, (response) => {
    console.log('🚪 User A joined room:', response.roomId);
    
    // Send test message
    setTimeout(() => {
      socketA.emit('send_message', {
        targetUserId: USER_B_ID,
        content: 'Hello from User A!',
        roomId: response.roomId
      });
      console.log('📤 Message sent from User A');
    }, 1000);
  });
});

socketA.on('new_message', (message) => {
  console.log('📩 User A received:', message.content);
});

socketA.on('error', (error) => {
  console.error('❌ User A error:', error);
});

// Test User B
const socketB = io('http://localhost:3000', {
  auth: { token: USER_B_TOKEN }
});

socketB.on('connect', async () => {
  console.log('🟢 User B connected:', socketB.id);
  
  // Join chat with User A
  socketB.emit('join_chat', { targetUserId: USER_A_ID }, (response) => {
    console.log('🚪 User B joined room:', response.roomId);
    
    // Send test message
    setTimeout(() => {
      socketB.emit('send_message', {
        targetUserId: USER_A_ID,
        content: 'Hello from User B!',
        roomId: response.roomId
      });
      console.log('📤 Message sent from User B');
    }, 2000);
  });
});

socketB.on('new_message', (message) => {
  console.log('📩 User B received:', message.content);
});

socketB.on('error', (error) => {
  console.error('❌ User B error:', error);
});

// Keep script running
setTimeout(() => {
  socketA.disconnect();
  socketB.disconnect();
  console.log('Test completed');
}, 5000);
```

**Run the test:**
```bash
node test-socket-client.js
```

---

## 📋 Backend Event Names Summary

### ✅ Client to Server Events:
1. `join_chat` - Chat room join karna
2. `send_message` - Message bhejna
3. `typing` - Typing indicator start
4. `stop_typing` - Typing indicator stop
5. `mark_read` - Message read mark karna

### ✅ Server to Client Events:
1. `joined_chat` - Room join hone ke baad roomId milna
2. `new_message` - Naya message aane par
3. `user_typing` - Koi user type kar raha hai
4. `message_read` - Message read hua hai
5. `user_online` - User online hua
6. `user_offline` - User offline hua
7. `error` - Koi error aaye

---

## ⚠️ Important Notes

1. **Authentication:** Har request me JWT token bhejna zaroori hai
2. **Interest System:** Free users sirf unhi ke saath chat kar sakte hain jinke interest bheja ho
3. **Room ID:** Har user pair ke liye ek unique roomId generate hoti hai
4. **Reconnection:** Socket.io automatically reconnect karta hai
5. **Error Handling:** Har error properly handle karo UI me

---

## 🎯 Best Practices

1. **Connection Management:** Component destroy hone par socket disconnect karo
2. **Memory Leaks:** Event listeners cleanup karo
3. **Loading States:** Connection/loading states dikhao user ko
4. **Error Messages:** Proper error messages dikhao
5. **Offline Support:** Local storage me messages save karo internet nahi hone par

This guide provides everything a frontend developer needs to implement real-time chat using Socket.io in your matrimonial app!