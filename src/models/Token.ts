import mongoose, { Schema, Document, Types } from 'mongoose';

export interface TokenInterface extends Document {
    userId: Types.ObjectId
    token: string
    type: string
    createdAt: Date
}

const tokenSchema : Schema = new Schema({ 
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true, 
        index: true, 
    },
    token: {
        type: String, 
        required: true, 
        index: true, // Index for faster lookups
    },
    type: {
        type: String, 
        enum: ["password_reset", "email_verification"],
        default: "email_verification",
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: "7d"
    }
})

//? Compound index
// This index optimizes queries that look up a token by both its value and type.
// It's especially useful when different token types exist (e.g., "email-confirmation",
// "password-reset", "refresh-token"), allowing MongoDB to quickly find the correct
// token record without scanning unrelated token types.
tokenSchema.index({ token: 1, type: 1 });

const Token = mongoose.model<TokenInterface>("Token", tokenSchema);

export default Token;