import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './models/Order.js';

dotenv.config();

const migratePayments = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected for migration...');

        const orders = await Order.find({});
        console.log(`Found ${orders.length} orders to check.`);

        let updatedCount = 0;

        for (let order of orders) {
            const oldStatus = order.paymentStatus;
            let newStatus = oldStatus;

            // Mapping logic
            if (oldStatus === 'PAID' || oldStatus === 'Success') {
                newStatus = 'SUCCESS';
            } else if (oldStatus === 'NOT_PAID' || oldStatus === 'Pending') {
                newStatus = 'PENDING';
            } else if (oldStatus === 'Failed') {
                newStatus = 'FAILED';
            } else if (oldStatus === 'Refunded') {
                newStatus = 'REFUNDED';
            } else if (['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'].includes(oldStatus)) {
                // Already migrated or correct
                continue;
            } else {
                // Default fallback if unknown
                newStatus = 'PENDING';
            }

            if (newStatus !== oldStatus) {
                order.paymentStatus = newStatus;
                await order.save();
                updatedCount++;
                console.log(`Updated Order ${order._id}: ${oldStatus} -> ${newStatus}`);
            }
        }

        console.log(`Migration completed. ${updatedCount} orders updated.`);
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migratePayments();
