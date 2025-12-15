// Set environment variables BEFORE importing anything
process.env.JWT_SECRET = "testsecret";
process.env.DATABASE_URL = "mongodb://tickets-mongo-srv:27017/tickets";
process.env.RESEND_API_KEY = "mock_resend_key"

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User, { Roles, UserInterface } from "../models/User";
import Token, { TokenInterface } from "../models/Token";
import { generateConfirmationToken, generatePasswordResetToken } from "../utils/jwt";

declare global {
	var setCookie: (userId?: mongoose.Types.ObjectId) => string[];
    var createUser: (confirmed: boolean, admin?: boolean) => Promise<UserInterface>; 
    var createToken: (userId: mongoose.Types.ObjectId, type: string) => Promise<TokenInterface>;
}

// Mock the connectDB function before importing server
jest.mock("../config/db", () => ({
	connectDB: jest.fn(),
}));

// Own Custom Implementation by Mocking the resend function
jest.mock("../config/resend");

let mongo: MongoMemoryServer;

beforeAll(async () => {
	mongo = await MongoMemoryServer.create();
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
	if (mongo) {
		await mongo.stop();
	}

	await mongoose.connection.close();
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
global.createUser = async (confirmed: boolean, admin?: boolean) => {
    const name = "Thomas"
    const surname = "Schrödinger"
    const email = "test@test.com"
    const password = "password"

    const user = User.build({
        name, 
        surname, 
        email, 
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