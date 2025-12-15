import toJSON from "../utils/json";
import mongoose, { Schema, Document, Model, Types } from "mongoose";
import Order from "./Order";

export enum PaymentStatus {
    Pending = "pending",
    Approved = "approved",
    Rejected = "rejected", 
    Cancelled = "cancelled", 
    Refunded = "refunded", 
}

// Document interface = what exists after saving in Mongo
// An interface that describes the properties that a Payment Document has
export interface PaymentInterface extends Document {
    // Base payment info
    orderId: Types.ObjectId, 
    provider: "mercadopago"

    // Mercado Pago Specific Fields
    mpPaymentId: string
    mpPreferenceId: string 
    mpStatus: string 

    amount: number 
    currency: string 

    status: PaymentStatus

    paymentMethod: string // credit_card, debit_card, etc... 

    metadta: Object // Store Additional MP data

    createdAt: Date; 
    updatedAt: Date; 
}

// Attributes interface = what you must provide to create a payment
export interface PaymentAttrs {
    orderId: Types.ObjectId
    provider: "mercadopago"
    mpPaymentId: string
    mpPreferenceId: string 
    mpStatus: string 
    amount: number 
    currency: string 
    status: PaymentStatus
    paymentMethod: string
}

// Model interface = adds a build method that uses PaymentAttrs
// An interface that describes the properties that are required to create a new Payment
export interface PaymentModel extends Model<PaymentInterface> {
    build(attrs: PaymentAttrs): PaymentInterface;
}

// Define the Payment document Schema
const paymentSchema : Schema = new Schema(
    {
        orderId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "Order",
            index: true,
        },
        provider: {
            type: String,
            required: true,
            enum: ["mercadopago"],
            default: "mercadopago",
        },
        
        // Mercado Pago Specific Fields
        mpPaymentId: {
            type: String,
            required: false, // Not set until payment is processed
            index: true,
        },
        mpPreferenceId: {
            type: String,
            required: true,
            index: true,
        },
        mpStatus: {
            type: String,
            required: false,
        },
        
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            required: true,
            default: "CLP",
            enum: ["CLP"], // Add currencies that are supported
        },
        
        status: {
            type: String,
            required: true,
            enum: Object.values(PaymentStatus),
            default: PaymentStatus.Pending,
        },
        
        paymentMethod: {
            type: String,
            required: false, // Will be set after payment
        },
        
        metadata: {
            type: Schema.Types.Mixed,
            required: false,
        }
    },
    {
        timestamps: true,
    }
);

//? Indexes | Single Field Type
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ mpPaymentId: 1 });
paymentSchema.index({ mpPreferenceId: 1 });

// Use the toJSON function from json.ts file
toJSON(paymentSchema);

// Add  custom static "build" method
paymentSchema.statics.build = (attrs: PaymentAttrs) => {
    return new Payment(attrs);
}

// Now when we call the Payment constructor it already has typescript validation
const Payment = mongoose.model<PaymentInterface, PaymentModel>('Payment', paymentSchema)

export default Payment