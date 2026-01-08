require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { PrismaClient } = require("@prisma/client");
const { initializeSocket } = require("./src/services/socketService");

const app = express();
const prisma = new PrismaClient();

// Create HTTP server
const httpServer = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const authRoutes = require("./src/routes/authRoutes");
const profileRoutes = require("./src/routes/profileRoutes");
const photoRoutes = require("./src/routes/photoRoutes");
const userRoutes = require("./src/routes/userRoutes");
const userMeRoutes = require("./src/routes/userMeRoutes");
const searchRoutes = require("./src/routes/searchRoutes");
const recommendationRoutes = require("./src/routes/recommendationRoutes");
const interestRoutes = require("./src/routes/interestRoutes");
const messageRoutes = require("./src/routes/messageRoutes");
const settingsRoutes = require("./src/routes/settingsRoutes");
const blockRoutes = require("./src/routes/blockRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");
const shortlistRoutes = require("./src/routes/shortlistRoutes");
const faceVerificationRoutes = require("./src/routes/faceVerificationRoutes");
const walletRoutes = require("./src/routes/walletRoutes");
const paymentRoutes = require("./src/routes/paymentRoutes");
const reportRoutes = require("./src/routes/reportRoutes");

// Basic route
app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "Matrimonial App API is running",
    version: "1.0.0",
  });
});

// Health check route
app.get("/health", (req, res) => {
  res.json({
    status: "success",
    message: "Server is healthy",
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users/me/profile", profileRoutes);
app.use("/api/users/me/photos", photoRoutes);
app.use("/api/users/me/settings", settingsRoutes);
app.use("/api/users/me/blocks", blockRoutes);
app.use("/api/users/me/notifications", notificationRoutes);
app.use("/api/users/me", userMeRoutes);
app.use("/api/users", userRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/interests", interestRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/shortlist", shortlistRoutes);
app.use("/api/users/me/face-verification", faceVerificationRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reports", reportRoutes);

// Error handling middleware
const {
  errorHandler,
  notFoundHandler,
} = require("./src/middleware/errorHandler");
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// Initialize Socket.io
const io = initializeSocket(httpServer);

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Socket.io server initialized`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
