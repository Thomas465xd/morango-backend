import jwt from "jsonwebtoken";
import { Types } from "mongoose";

// Define the payload structure
type UserPayLoad = {
    id: Types.ObjectId;  // The payload contains a MongoDB ObjectId (user ID)
}

// Token for Authentication (Login)
export const generateJWT = (payload: UserPayLoad) => {
    const token = jwt.sign(payload, process.env.JWT_SECRET!, { 
        expiresIn: "7d"  // Token expires in 12 hours
    });
    return token;
}

// Token for Admin
export const generateAdminJWT = (payload: UserPayLoad) => {
    const token = jwt.sign(payload, process.env.ADMIN_SECRET!, { 
        expiresIn: "7d"  // Token expires in 7 days
    });
    return token;
}

// Token for Account Confirmation
export const generateConfirmationToken = (payload: UserPayLoad) => {
    const token = jwt.sign(payload, process.env.CONFIRMATION_SECRET!, { 
        expiresIn: "7d"  // Token expires in 7 days
    });
    return token;
}


// Token for Password reset
export const generatePasswordResetToken = (payload: UserPayLoad) => {
    const token = jwt.sign(payload, process.env.PASSWORD_RESET_SECRET!, { 
        expiresIn: "7d"  // Token expires in 7 days
    });
    return token;
}