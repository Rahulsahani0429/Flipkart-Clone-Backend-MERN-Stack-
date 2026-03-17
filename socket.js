import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

let io;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
            methods: ["GET", "POST"],
            credentials: true,
        },
        // Only use websocket – avoids the 400 polling error
        transports: ["websocket"],
    });

    // ── Auth middleware ──────────────────────────────────────────────────────────
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(new Error("No token provided"));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            return next();
        } catch (err) {
            console.error(`[Socket] Auth failed – ${err.message}`);
            return next(new Error("Authentication failed"));
        }
    });

    // ── Connection handler ───────────────────────────────────────────────────────
    io.on("connection", (socket) => {
        console.log(`[Socket] Connected: ${socket.id}`);

        // Join personal room
        const userId = socket.user?.id?.toString();
        if (userId) {
            socket.join(userId);

            // Join adminRoom if admin
            if (socket.user?.isAdmin) {
                socket.join("adminRoom");
                console.log(`[Socket] Admin ${userId} → adminRoom`);
            }
        }

        // Order details request
        socket.on("getOrderDetails", async (orderId) => {
            try {
                const db = mongoose.connection.db;
                const order = await db
                    .collection("orders")
                    .findOne({ _id: new mongoose.Types.ObjectId(orderId) });

                if (!order) {
                    return socket.emit("orderDetailsResponse", {
                        success: false,
                        message: "Order not found",
                    });
                }

                const isOwner = order.user?.toString() === userId;
                if (!isOwner && !socket.user?.isAdmin) {
                    return socket.emit("orderDetailsResponse", {
                        success: false,
                        message: "Not authorized",
                    });
                }

                socket.emit("orderDetailsResponse", { success: true, data: order });
            } catch (error) {
                console.error("[Socket] getOrderDetails error:", error);
                socket.emit("orderDetailsResponse", { success: false, message: "Server error" });
            }
        });

        // Shipment room
        socket.on("joinShipmentRoom", (orderId) => {
            socket.join(`shipment_${orderId}`);
        });

        socket.on("disconnect", () => {
            console.log(`[Socket] Disconnected: ${socket.id}`);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) throw new Error("Socket.io not initialized!");
    return io;
};
