import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Verification disabled temporarily due to 535 BadCredentials crashing the server

/**
 * @desc Get email template based on type
 */
const getTemplate = (type, data) => {
    const { name, orderId, amount, productName, status } = data;
    const viewOrderLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/order/${orderId}`;

    switch (type) {
        case "ORDER_PLACED":
            return {
                subject: "Order Confirmation - Thank you for your purchase!",
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee;">
                        <h2 style="color: #2874f0;">Hello ${name},</h2>
                        <p>Thank you for shopping with us! Your order <strong>#${orderId}</strong> has been successfully placed.</p>
                        <p><strong>Amount to be paid:</strong> $${amount}</p>
                        <p>Current Status: Order Confirmed</p>
                        <a href="${viewOrderLink}" style="background: #fb641b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 2px; display: inline-block; margin-top: 10px;">View Order</a>
                    </div>
                `
            };
        case "ORDER_CANCELLED":
            return {
                subject: "Order Cancelled - Notification",
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee;">
                        <h2 style="color: #ff4d4f;">Hello ${name},</h2>
                        <p>Your order <strong>#${orderId}</strong> has been cancelled.</p>
                        <p>If you have already paid, a refund will be processed to your original payment method automatically.</p>
                        <a href="${viewOrderLink}" style="background: #212121; color: white; padding: 10px 20px; text-decoration: none; border-radius: 2px; display: inline-block; margin-top: 10px;">Check Status</a>
                    </div>
                `
            };
        case "ORDER_DELIVERED":
            return {
                subject: "Package Delivered - Your order has arrived!",
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee;">
                        <h2 style="color: #4caf50;">Hello ${name},</h2>
                        <p>Your order <strong>#${orderId}</strong> has been delivered. We hope you love your purchase!</p>
                        <a href="${viewOrderLink}" style="background: #fb641b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 2px; display: inline-block; margin-top: 10px;">Return or Replace</a>
                    </div>
                `
            };
        case "PAYMENT_SUCCESS":
            return {
                subject: "Payment Received - Success",
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee;">
                        <h2 style="color: #2874f0;">Hello ${name},</h2>
                        <p>Your payment for order <strong>#${orderId}</strong> of <strong>$${amount}</strong> was successful.</p>
                        <p>Your order is now being processed for shipping.</p>
                    </div>
                `
            };
        case "RETURN_APPROVED":
            return {
                subject: "Return Request Approved",
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee;">
                        <h2 style="color: #2874f0;">Hello ${name},</h2>
                        <p>Your return request for order <strong>#${orderId}</strong> has been approved.</p>
                        <p>Please follow the instructions in the app to return the product.</p>
                    </div>
                `
            };
        case "ORDER_SHIPPED":
            return {
                subject: "Order Shipped - Your item is on the way",
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee;">
                        <h2 style="color: #2874f0;">Hello ${name},</h2>
                        <p>Exciting news! Your order <strong>#${orderId}</strong> has been shipped.</p>
                        <a href="${viewOrderLink}" style="background: #fb641b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 2px; display: inline-block; margin-top: 10px;">Track Order</a>
                    </div>
                `
            };
        default:
            return {
                subject: `Notification regarding your order #${orderId}`,
                html: `<p>Hello ${name}, there is an update on your order #${orderId}. Please check the app for details.</p>`
            };
    }
};

export const sendEmail = async (email, type, data) => {
    // Disabled temporarily due to 535 BadCredentials crashing the server streams
    console.warn(`[SMTP] Email disabled temporarily due to Google 535 error.`);
    return { success: false, error: "Email disabled temporarily" };
};
