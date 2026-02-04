import { CorsOptions } from "cors";

export const corsConfig: CorsOptions = {
    origin: function (origin, callback) {
        const whitelist = [
            process.env.FRONTEND_URL, 
            "https://morangojoyas.cl", 
            "https://www.morangojoyas.cl"
        ];

        // Allow requests with no origin (e.g., Postman, cURL)
        if (!origin || whitelist.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true, // Allow cookies
};