import express from "express"; 
import bodyParser from "body-parser";
import morgan from "morgan";
import cors from "cors"; 
import dotenv from "dotenv";
import { connectDB } from "./config/db";
import cookieSession from "cookie-session";
import { NotFoundError } from "./errors/not-found";
import { errorHandler } from "./middleware/error";
import authRouter from "./routes/authRouter"; 
import productRouter from "./routes/productRouter"; 
import orderRouter from "./routes/orderRouter"; 
import paymentRouter from "./routes/paymentRouter"; 

dotenv.config();

//? Check if necessary env variables are present | Define them in .env file
if(!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET must be defined")
}

if(!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be defined")
}

if(!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY must be defined")
}

if(!process.env.MP_ACCESS_TOKEN) {
    throw new Error("MP_ACCESS_TOKEN must be defined")
}

if(!process.env.MP_PUBLIC_KEY) {
    throw new Error("MP_PUBLIC_KEY must be defined")
}

if(!process.env.MP_WEBHOOK_SECRET) {
    throw new Error("MP_WEBHOOK_SECRET must be defined")
}

if(!process.env.FRONTEND_URL) {
    throw new Error("FRONTEND_URL must be defined")
}

if(!process.env.BACKEND_URL) {
    throw new Error("BACKEND_URL must be defined")
}



connectDB()

const app = express(); 

//? Traffic is being proxied by ingress-nginx to our app | Disabled proxied request blocking
app.set("trust proxy", true);

//? Middleware to parse JSON bodies
app.use(bodyParser.json());

//? Cookies config middleware
app.use(cookieSession({
    signed: false, 
    secure: process.env.NODE_ENV !== "test",
    httpOnly: true
}))

//? Logs
app.use(morgan("dev"));

//? CORS Setup
app.use(cors());

//? Routes
app.use("/api/auth", authRouter)
app.use("/api/products", productRouter)
app.use("/api/orders", orderRouter)
app.use("/api/payments", paymentRouter)

//? Trigger not-found error | before Error Handler & after router declarations
app.all("/{*splat}/" , async (req, res, next) => {
    throw new NotFoundError("Resource not Found")
});

//? Error Handler | has to be after all the route handlers
app.use(errorHandler);

export default app;
