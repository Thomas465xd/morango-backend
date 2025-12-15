import toJSON from "../utils/json";
import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { Regions } from "./User";

export enum OrderStatus {
    PendingPayment = "Esperando Pago",
    Processing = "Procesando", 
    Sent = "En Transito", 
    Delivered = "Entregado", 
    Cancelled = "Cancelado", 
    Expired = "Orden Expirada"
}

interface Customer {
    userId: mongoose.Types.ObjectId // Reference to User model 
    email: string 
    name: string
    surname: string 
    phone: string 
    isGuest: boolean // True if order was placed without an account
}

interface Address {
    country: string // e.g. Chile
    region: Regions // e.g. Metropolitana de Santiago
    city: string // e.g. Puerto Varas
    cityArea: string // e.g. Providencia
    street: string // e.g. San Carlos de Apoquindo 1203
    reference: string // e.g. 106 Torre A
    zipCode: string 
}

interface Item {
    productId: mongoose.Types.ObjectId // Reference to Product Model 
    productName: string 
    productImage: string 
    basePrice: number // Original price at time of order
    discount: number // Discount percentage applied (0-100)
    finalPrice: number // Price actually paid per unit
    quantity: number 
    itemTotal: number // finalPrice * quantity
}

// Document interface = what exists after saving in Mongo
// An interface that describes the properties that a Order Document has
export interface OrderInterface extends Document {
    // Base order info
    trackingNumber: string // Given by the courier, can be set later by the admin
    customer: Customer 
    shippingAdress: Address 
    status: OrderStatus;
    items: Item[]

    subtotal: number 
    shipping: number, // Shipping cost
    shippingMethod: string // FedEx, Chilexpress, Mercadolibre, etc... 
    total: number // subtotal + shipping

    paymentId: Types.ObjectId; // Reference to Payment model 

    // Date at which the stock was reserved and date at which it will come back to normal numbers
    stockReservedAt: Date
    stockReservationExpiresAt: Date 

    // Delivered At is setted by the admin once the order has been delivered
    deliveredAt: Date

    // Tells wether an user wanted to save his data for future orders,
    // thus registering a new user & triggering the rest of the register flow or 
    // If it is not tapped, then the Notification Emails will be sent using the Order Reference. 
    saveData: boolean, 

    // Automatic Timestamps
    createdAt: Date; 
    updatedAt: Date; 
}

// Attributes interface = what you must provide to create a order
export interface OrderAttrs {
    trackingNumber: string
    customer: Customer 
    shippingAdress: Address 
    status: OrderStatus
    items: Item[]
    subototal: number 
    shipping: number 
    shippingMethod: string 
    total: number 
    paymentId: Types.ObjectId
    stockReservedAt: Date
    stockReservationExpiresAt: Date 
    saveData: boolean, 
}

// Model interface = adds a build method that uses OrderAttrs
// An interface that describes the properties that are required to create a new Order
export interface OrderModel extends Model<OrderInterface> {
    build(attrs: OrderAttrs): OrderInterface;
}

// Define the Order document Schema
const orderSchema : Schema = new Schema(
    {
        customer: {
            userId: {
                type: Schema.Types.ObjectId, 
                required: true, 
                ref: "User", 
            },
            email: {
                type: String, 
                required: true, 
                ref: "User"
            }, 
            name: {
                type: String, 
                required: true, 
                trim: true, 
            },
            surname: {
                type: String, 
                required: true, 
                trim: true, 
            }, 
            phone: {
                type: String, 
                requried: false, 
                trim: true, 
            },
            isGuest: {
                type: Boolean, 
                default: true 
            }, 
        },
        shippingAddress: {
            country: {
                type: String, 
                required: true, 
                trim: true, 
                default: "Chile", 
            }, 
            region: {
                type: String, 
                required: true, 
                enum: Regions, 
            }, 
            city: {
                type: String, 
                required: true, 
                trim: true, 
            }, 
            cityArea: {
                type: String, 
                required: true, 
                trim: true, 
            }, 
            street: {
                type: String, 
                required: true, 
                trim: true, 
            }, 
            reference: {
                type: String, 
                required: false, 
                trim: true, 
            }, 
            zipCode: {
                type: String, 
                required: false, 
                trim: true
            }
        },
        items: [{
            productId: {
                type: Schema.Types.ObjectId, 
                required: true, 
                ref: "Product", 
            }, 
            productName: {
                type: String, 
                required: true, 
                trim: true, 
            }, 
            productImage: {
                type: String, 
                required: true, 
                trim: true, 
            }, 
            basePrice: {
                type: Number, 
                required: true,
            }, 
            discount: {
                type: Number, 
                default: 0, 
            }, 
            finalPrice: {
                type: Number, 
                required: true, 
            }, 
            quantity: {
                type: Number, 
                required: true, 
            }, 
            itemTotal: {
                type: Number, 
                required: true, 
            },
        }],
        status: {
            type: String, 
            enum: OrderStatus, 
            default: OrderStatus.PendingPayment, 
        }, 
        trackingNumber: {
            type: String, 
            required: false, 
            trim: true, 
        }, 
        subtotal: {
            type: Number, 
            required: true, 
            min: 0
        }, 
        shipping: {
            type: Number,
            required: true, 
            min: 0,
            default: 0, 
        }, 
        shippingMethod: {
            type: String, 
            required: true, 
            trim: true, 
        }, 
        total: {
            type: Number, 
            required: true, 
            min: 0
        }, 
        saveData: {
            type: Boolean, 
            required: true, 
            default: false
        },
        paymentId: {
            type: Schema.Types.ObjectId, 
            required: false, // Not set untin payment is created 
            ref: "Payment", 
        }, 
        stockReservedAt: {
            type: Date,
            required: true,
            default: Date.now,
        },
        stockReservationExpiresAt: {
            type: Date,
            required: true,
            index: true, // Important for background job
        },
        deliveredAt: {
            type: Date, 
            required: false, 
            default: null
        }
    }, 
    {
        timestamps: true,
        // toJSON: {
        //     transform(doc, ret) {
        //         (ret as any).id = ret._id;
        //         delete ret._id;
        //         delete ret.password;
        //         delete ret.__v;
        //     },
        // },
    }
);

// Use the toJSON function from json.ts file
toJSON(orderSchema);

//? Indexes

//^ Compound Indexes
orderSchema.index({ 'customer.email': 1, createdAt: -1 });
orderSchema.index({ 'customer.userId': 1, createdAt: -1 });
orderSchema.index({ status: 1, stockReservationExpiresAt: 1 }); // Critical for cleanup job

//* Single Field Indexes
orderSchema.index({ trackingNumber: 1 }); // For order tracking

// Add  custom static "build" method
orderSchema.statics.build = (attrs: OrderAttrs) => {
    return new Order(attrs);
}

// Now when we call the Order constructor it already has typescript validation
const Order = mongoose.model<OrderInterface, OrderModel>('Order', orderSchema)

export default Order