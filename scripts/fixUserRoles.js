/**
 * One-time migration script to sync the `role` field with `isAdmin` 
 * for all existing users in the database.
 *
 * Run with: node scripts/fixUserRoles.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
console.log("✅ Connected to MongoDB");

const result = await mongoose.connection.db.collection("users").bulkWrite([
    {
        updateMany: {
            filter: { isAdmin: true },
            update: { $set: { role: "Admin" } }
        }
    },
    {
        updateMany: {
            filter: { isAdmin: false },
            update: { $set: { role: "Client" } }
        }
    }
]);

console.log(`✅ Fixed ${result.modifiedCount} user(s).`);
console.log("   - All isAdmin:true users now have role:'Admin'");
console.log("   - All isAdmin:false users now have role:'Client'");

await mongoose.disconnect();
process.exit(0);
