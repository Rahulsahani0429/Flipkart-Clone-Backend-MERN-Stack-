import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import Product from "./models/Product.js";

dotenv.config();

const cleanBrokenProducts = async () => {
    try {
        await connectDB();

        const products = await Product.find({});
        console.log(`Checking ${products.length} products...`);

        let removedCount = 0;
        for (const product of products) {
            try {
                const response = await fetch(product.image, { method: 'HEAD' });
                if (!response.ok) {
                    console.log(`Broken image found for: ${product.name} (${product.image}). Removing...`);
                    await Product.findByIdAndDelete(product._id);
                    removedCount++;
                }
            } catch (error) {
                console.log(`Error checking image for ${product.name}: ${error.message}. Removing as precaution.`);
                await Product.findByIdAndDelete(product._id);
                removedCount++;
            }
        }

        console.log(`Cleanup complete. Removed ${removedCount} products.`);
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

cleanBrokenProducts();
