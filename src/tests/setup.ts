// Set environment variables BEFORE importing anything
process.env.JWT_SECRET = "testsecret";
process.env.DATABASE_URL = "mongodb://tickets-mongo-srv:27017/tickets";
process.env.RESEND_API_KEY = "mock_resend_key"
process.env.MP_ACCESS_TOKEN="test_access_token"
process.env.MP_PUBLIC_KEY="test_public_key"
process.env.MP_WEBHOOK_SECRET="test_webhook_secret"
process.env.FRONTEND_URL="http://localhost:3000"
process.env.BACKEND_URL="http://localhost:4000"

import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User, { Regions, Roles, UserInterface } from "../models/User";
import Token, { TokenInterface } from "../models/Token";
import { generateConfirmationToken, generatePasswordResetToken } from "../utils/jwt";
import Product, { ProductInterface, ProductTypes } from "../models/Product";
import Order, { OrderInterface, OrderStatus } from "../models/Order";
import { generateOrderNumber } from "../utils/order";

type CreateProductArgs = {
    category?: string;
    isActive?: boolean;
    name?: string;
    description?: string;
    basePrice?: number;
    productType?: ProductTypes;
    stock?: number;
    tags?: string[];
    discount?: {
        percentage: number 
        isActive: boolean 
        startDate?: Date
        endDate?: Date
    }
};

declare global {
	var setCookie: (userId?: mongoose.Types.ObjectId) => string[];
    var createUser: (confirmed: boolean, admin?: boolean, email?: string) => Promise<UserInterface>;
    var createToken: (userId: mongoose.Types.ObjectId, type: string) => Promise<TokenInterface>;
    var createProduct: (args?: CreateProductArgs) => Promise<ProductInterface>
    var createOrder: (user?: UserInterface, status?: OrderStatus, createdAt?: Date) => Promise<{order: OrderInterface, firstProduct: ProductInterface, secondProduct: ProductInterface}>
}

// Mock the connectDB function before importing server
jest.mock("../config/db", () => ({
	connectDB: jest.fn(),
}));

// Own Custom Implementation by Mocking the resend function
jest.mock("../config/resend");

// ReplSet allows transactions in tests
let mongo: MongoMemoryReplSet;

beforeAll(async () => {
    mongo = await MongoMemoryReplSet.create({
        replSet: {
            count: 1,                 // single-node replica set
            storageEngine: "wiredTiger",
        },
    });
    
    const mongoUri = mongo.getUri();
    
    await mongoose.connect(mongoUri);
});

beforeEach(async () => {
	jest.clearAllMocks(); // Resets mock implementations in between tests so that they are not polluted

	if (mongoose.connection.db) {
		const collections = await mongoose.connection.db.collections();

		for (let collection of collections) {
			await collection.deleteMany({});
		}
	}
});

afterAll(async () => {
    // Temporarily silence EVERYTHING | This is for some annoying unknown warning console log
    const noop = () => {};
    const originalWarn = console.warn;
    const originalError = console.error;

    console.warn = noop;
    console.error = noop;

    try {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }

        if (mongo) {
            await mongo.stop();
        }
    } finally {
        // Restore console
        console.warn = originalWarn;
        console.error = originalError;
    }
});


//* Declare auth Helper Function
global.setCookie = (userId?: mongoose.Types.ObjectId) => {
	// 1. Build a JWT payload. { id, email }
	const payload = {
		id: userId ? userId : new mongoose.Types.ObjectId().toHexString(),
		email: "test@test.com",
	};

	// 2. Create the JWT
	const token = jwt.sign(payload, process.env.JWT_SECRET);

	// 3. Build session object { jwt: MY_JWT }
	const session = { jwt: token };

	// 4. Turn that session into JSON
	const sessionJSON = JSON.stringify(session);

	// 5. Take JSON and encode it as base64
	const base64 = Buffer.from(sessionJSON).toString("base64");

	// 6. return a string thats the cookie with the encoded data
	return [`session=${base64}`];
};

//* Declare Create User function
global.createUser = async (confirmed: boolean, admin?: boolean, email?: string) => {
    const name = "Thomas"
    const surname = "Schrödinger"
    const uniqueEmail = email ? email : "test@test.com"
    const password = "password"

    const user = User.build({
        name, 
        surname, 
        email: uniqueEmail, 
        password, 
    })

    if(confirmed) {
        user.confirmed = true; 
    }

    if(admin) {
        user.role = Roles.Admin; 
    }

    await user.save(); 

    return user; 
} 

//* Declare create confirmation token function
global.createToken = async (userId : mongoose.Types.ObjectId, type: string) => {
    // Generate verification token (defaults to email_verification)
    const token = await Token.create({
        userId, 
        token: type === "email_verification" ? generateConfirmationToken({ id: userId }) :  generatePasswordResetToken({ id: userId }),
        type
    }); 

    await token.save()

    return token; 
}

//* Declare Create Product Helper Function
global.createProduct = async ({
    category = "Collares", 
    isActive = true, 
    name = "Collar Test", 
    description = "Descripción Test", 
    basePrice = 20000, 
    productType = ProductTypes.Necklace, 
    stock = 8, 
    tags = ["rojo", "plata", "elegante"],
    discount = {
        percentage: 0, 
        isActive: false
    }
} : CreateProductArgs = {}) => {
    const images = [
        "https://cloudinary.com/images-1", 
        "https://cloudinary.com/images-2", 
        "https://cloudinary.com/images-3", 
    ]

    const product = Product.build({
        name, 
        description, 
        basePrice, 
        productType, 
        images, 
        stock, 
        category, 
        tags, 
        isActive, 
        discount,
        attributes: {
            length: "15cm", 
            material: "Oro",
            claspType: "De Langosta" , 
            chainType: "Tipo |Barbada"
        }
    })

    await product.save(); 

    return product; 
} 

//* Declare Create Order Helper Function
global.createOrder = async (user?: UserInterface, status?: OrderStatus, createdAt?: Date) => {
    const firstProduct = await global.createProduct(); 
    const secondProduct = await global.createProduct(); 

    const trackingNumber = await generateOrderNumber();

    // Create order with 20-minute expiration
    const expirationTime = new Date(Date.now() + 20 * 60000); // 20 minutes

    const shipping = 5990
    const subtotal = firstProduct.finalPrice + secondProduct.finalPrice
    const total = shipping + subtotal

    const order = await Order.build({
        trackingNumber, 
        customer: {
            userId: user ? user.id : null,
            email: user ? user.email : "test@test.com", 
            name: user ? user.name : "John", 
            surname: user ? user.surname : "Doe", 
            phone: user ? user.phone : "912345678", 
            isGuest: !user  
        }, 
        shippingAddress: {
            country: "Chile", 
            region: Regions["Metropolitana de Santiago"], 
            city: "Santiago",
            cityArea: "Vitacura", 
            street: "John Doe 4312", 
            reference: "Torre B condominio Lagos", 
            zipCode: ""
        }, 
        items: [{
            productId: firstProduct.id, 
            productName: firstProduct.name,
            productImage: firstProduct.images[0],
            basePrice: firstProduct.basePrice,
            discount: firstProduct.discount.percentage,
            finalPrice: firstProduct.discount.percentage !== 0 ? Math.round(firstProduct.basePrice * (1 - firstProduct.discount.percentage / 100)) : firstProduct.basePrice,
            quantity: 1,
            itemTotal: firstProduct.discount.percentage !== 0 ? Math.round(firstProduct.basePrice * (1 - firstProduct.discount.percentage / 100)) : firstProduct.basePrice * 1
        }, {
            productId: secondProduct.id, 
            productName: secondProduct.name,
            productImage: secondProduct.images[0],
            basePrice: secondProduct.basePrice,
            discount: secondProduct.discount.percentage,
            finalPrice: secondProduct.discount.percentage !== 0 ? Math.round(secondProduct.basePrice * (1 - secondProduct.discount.percentage / 100)) : secondProduct.basePrice,
            quantity: 1,
            itemTotal: secondProduct.discount.percentage !== 0 ? Math.round(secondProduct.basePrice * (1 - secondProduct.discount.percentage / 100)) : firstProduct.basePrice * 1
        }], 
        subtotal, 
        shipping , 
        total, 
        saveData: !user,
        stockReservedAt: new Date(), 
        stockReservationExpiresAt: expirationTime
    })

    if(status) {
        order.status = status
    }

    if(createdAt) {
        order.createdAt = createdAt
        order.updatedAt = createdAt
    }

    await order.save(); 

    //! Reserve stock for each product
    await Product.updateOne(
        { _id: firstProduct.id },
        { $inc: { reserved: 1 } }
    );
    
    await Product.updateOne(
        { _id: secondProduct.id },
        { $inc: { reserved: 1 } }
    );

    // If order status is Processing, Sent or Delivered, then release stock and decrease real product stock
    if(order.status !== OrderStatus.Pending && order.status !== OrderStatus.Cancelled && order.status !== OrderStatus.Expired) {
        await Product.updateOne(
            { _id: firstProduct.id },
            {
                $inc: {
                    stock: -1,
                    reserved: -1
                }
            }
        );

        await Product.updateOne(
            { _id: secondProduct.id },
            {
                $inc: {
                    stock: -1,
                    reserved: -1
                }
            }
        );
    }

    // If order status is Expired or Cancelled then just release reserved stock without updating real price
    if(order.status === OrderStatus.Expired || order.status === OrderStatus.Cancelled) {
        await Product.updateOne(
            { _id: firstProduct.id },
            {
                $inc: {
                    reserved: -1
                }
            }
        );

        await Product.updateOne(
            { _id: secondProduct.id },
            {
                $inc: {
                    reserved: -1
                }
            }
        );
    }

    return { firstProduct, secondProduct, order }; 
} 