import mongoose from "mongoose";

const emailLogSchema = mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        eventType: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ["SENT", "FAILED"],
            default: "SENT",
        },
        error: {
            type: String,
        },
        sentAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

const EmailLog = mongoose.model("EmailLog", emailLogSchema);

export default EmailLog;
