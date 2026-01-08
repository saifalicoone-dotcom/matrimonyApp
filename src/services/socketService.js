const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { canChatWithUser } = require("./subscriptionService");

const prisma = new PrismaClient();

// Store active connections
const activeConnections = new Map(); // userId -> socketId
const userRooms = new Map(); // userId -> Set of roomIds (chat rooms)

/**
 * Initialize Socket.io server
 */
const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.token;

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, isActive: true },
      });

      if (!user || !user.isActive) {
        return next(new Error("Invalid or inactive user"));
      }

      socket.userId = user.id;
      socket.userEmail = user.email;
      next();
    } catch (error) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.userId;

    console.log(`User connected: ${userId} (Socket: ${socket.id})`);

    // Store connection
    activeConnections.set(userId, socket.id);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Handle join chat room
    socket.on("join_chat", async (data) => {
      try {
        const { targetUserId } = data;

        if (!targetUserId) {
          socket.emit("error", { message: "Target user ID is required" });
          return;
        }

        // Check if users are blocked
        const isBlocked = await prisma.blockList.findFirst({
          where: {
            OR: [
              { userId: userId, blockedUserId: targetUserId },
              { userId: targetUserId, blockedUserId: userId },
            ],
          },
        });

        if (isBlocked) {
          socket.emit("error", { message: "Cannot chat with blocked user" });
          return;
        }

        // Check subscription and chat limits
        const chatCheck = await canChatWithUser(userId, targetUserId);

        if (!chatCheck.canChat) {
          socket.emit("error", {
            message: chatCheck.reason || "Chat not allowed",
            code: "CHAT_NOT_ALLOWED",
          });
          return;
        }

        // Create room ID (sorted to ensure same room for both users)
        const roomId = [userId, targetUserId].sort().join("_");

        // Join room
        socket.join(`chat:${roomId}`);

        // Track room
        if (!userRooms.has(userId)) {
          userRooms.set(userId, new Set());
        }
        userRooms.get(userId).add(roomId);

        socket.emit("joined_chat", {
          roomId: roomId,
          targetUserId: targetUserId,
        });

        // Notify other user
        const targetSocketId = activeConnections.get(targetUserId);
        if (targetSocketId) {
          io.to(targetSocketId).emit("user_joined_chat", {
            userId: userId,
            roomId: roomId,
          });
        }
      } catch (error) {
        console.error("Join chat error:", error);
        socket.emit("error", { message: "Failed to join chat" });
      }
    });

    // Handle send message
    socket.on("send_message", async (data) => {
      try {
        const { targetUserId, content, roomId } = data;

        if (!targetUserId || !content) {
          socket.emit("error", { message: "Target user ID and content are required" });
          return;
        }

        // Validate room ID
        const expectedRoomId = [userId, targetUserId].sort().join("_");
        if (roomId !== expectedRoomId) {
          socket.emit("error", { message: "Invalid room ID" });
          return;
        }

        // Check subscription again
        const chatCheck = await canChatWithUser(userId, targetUserId);
        if (!chatCheck.canChat) {
          socket.emit("error", {
            message: chatCheck.reason || "Chat not allowed",
            code: "CHAT_NOT_ALLOWED",
          });
          return;
        }

        // Check if users are blocked
        const isBlocked = await prisma.blockList.findFirst({
          where: {
            OR: [
              { userId: userId, blockedUserId: targetUserId },
              { userId: targetUserId, blockedUserId: userId },
            ],
          },
        });

        if (isBlocked) {
          socket.emit("error", { message: "Cannot send message to blocked user" });
          return;
        }

        // Save message to database
        const message = await prisma.message.create({
          data: {
            fromUserId: userId,
            toUserId: targetUserId,
            content: content,
            isRead: false,
          },
          include: {
            fromUser: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        });

        // Prepare message data
        const messageData = {
          id: message.id,
          fromUserId: message.fromUserId,
          toUserId: message.toUserId,
          content: message.content,
          isRead: message.isRead,
          createdAt: message.createdAt,
          sender: {
            id: message.fromUser.id,
            email: message.fromUser.email,
            name: `${message.fromUser.profile?.firstName || ""} ${message.fromUser.profile?.lastName || ""}`.trim(),
          },
        };

        // Emit to room
        io.to(`chat:${roomId}`).emit("new_message", messageData);

        // Send notification to target user if not in room
        const targetSocketId = activeConnections.get(targetUserId);
        if (targetSocketId) {
          // Check if target user is in the room
          const targetSocket = io.sockets.sockets.get(targetSocketId);
          if (targetSocket && !targetSocket.rooms.has(`chat:${roomId}`)) {
            io.to(targetSocketId).emit("new_message_notification", {
              message: messageData,
              roomId: roomId,
            });
          }
        }

        // Create notification
        try {
          await prisma.notification.create({
            data: {
              userId: targetUserId,
              type: "message",
              title: "New Message",
              message: `You have a new message from ${messageData.sender.name}`,
              relatedUserId: userId,
            },
          });
        } catch (notifError) {
          console.error("Notification creation error:", notifError);
        }
      } catch (error) {
        console.error("Send message error:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle mark as read
    socket.on("mark_read", async (data) => {
      try {
        const { messageId } = data;

        if (!messageId) {
          socket.emit("error", { message: "Message ID is required" });
          return;
        }

        // Update message as read
        const message = await prisma.message.update({
          where: { id: messageId },
          data: { isRead: true },
        });

        // Notify sender
        const senderSocketId = activeConnections.get(message.fromUserId);
        if (senderSocketId) {
          io.to(senderSocketId).emit("message_read", {
            messageId: messageId,
            readBy: userId,
          });
        }
      } catch (error) {
        console.error("Mark read error:", error);
        socket.emit("error", { message: "Failed to mark message as read" });
      }
    });

    // Handle typing indicator
    socket.on("typing", (data) => {
      const { roomId, targetUserId } = data;
      if (roomId) {
        socket.to(`chat:${roomId}`).emit("user_typing", {
          userId: userId,
          isTyping: true,
        });
      }
    });

    socket.on("stop_typing", (data) => {
      const { roomId } = data;
      if (roomId) {
        socket.to(`chat:${roomId}`).emit("user_typing", {
          userId: userId,
          isTyping: false,
        });
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${userId} (Socket: ${socket.id})`);
      
      // Notify all rooms user was in before removing
      const rooms = userRooms.get(userId);
      if (rooms) {
        rooms.forEach((roomId) => {
          socket.to(`chat:${roomId}`).emit("user_offline", {
            userId: userId,
          });
        });
      }
      
      activeConnections.delete(userId);
      userRooms.delete(userId);
    });
  });

  return io;
};

module.exports = {
  initializeSocket,
};

