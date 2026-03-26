import "./env.js";
import express from "express";
import cors from "cors";
import http from "http";
import connectDB from "./config/db.js";
import { initSocket } from "./socket.js";
import { globalSearch } from "./controllers/searchController.js";
import { protect, admin } from "./middleware/authMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import shipmentRoutes from "./routes/shipmentRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO (must be before routes)
initSocket(server);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

// CORS – allow any localhost origin in development
const allowedOrigins = [
  "http://localhost:5173", "http://localhost:5174", "http://localhost:5175",
  "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5175",
];
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      // In development, allow any localhost origin
      if (origin.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/", (_req, res) => res.send("API is running..."));

// ── Routes  ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/user/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin/settings", settingsRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/shipment", shipmentRoutes);
app.use("/api/cart", cartRoutes);

// Global search (admin-protected)
app.get("/api/search", protect, admin, (req, res) => globalSearch(req, res));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
});

// ── Start server  ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n✅ Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`🔑 JWT_SECRET loaded: ${process.env.JWT_SECRET ? "YES (len=" + process.env.JWT_SECRET.length + ")" : "❌ MISSING"}`);
});

export default app;
