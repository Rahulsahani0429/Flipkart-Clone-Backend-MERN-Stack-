import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import User from "./models/User.js";
import connectDB from "./config/db.js";

await connectDB();

// Check if admin already exists
const existing = await User.findOne({ isAdmin: true });
if (existing) {
  console.log(`Admin already exists: ${existing.email}`);
} else {
  const admin = await User.create({
    name: "Admin",
    email: "admin@flipkart.com",
    password: "admin123",
    isAdmin: true,
  });
  console.log(`Admin created: ${admin.email}`);
}

process.exit();
