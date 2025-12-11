import express from "express"; 
import bodyParser from "body-parser";
import morgan from "morgan";
import cors from "cors"; 
import dotenv from "dotenv";
import { connectDB } from "./config/db";
import cookieSession from "cookie-session";
import { errorHandler, NotFoundError } from "@thomas-ticketx/common";
import authRouter from "./routes";

dotenv.config();

//? Check if necessary env variables are present | Define them in .env file
if(!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET must be defined")
}

if(!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be defined")
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

//? Trigger not-found error | before Error Handler & after router declarations
app.all("/{*splat}/" , async (req, res, next) => {
    throw new NotFoundError("Resource not Found")
});

//? Error Handler | has to be after all the route handlers
app.use(errorHandler);

export default app;
