import { Request, Response, NextFunction } from "express";
import jwt, { decode } from "jsonwebtoken";
import User, { Roles, UserInterface } from "../models/User";
import Token, { TokenInterface } from "../models/Token";
import { RequestConflictError } from "../errors/conflict-error";
import { ForbiddenError } from "../errors/forbidden-error";
import { NotFoundError } from "../errors/not-found";
import { NotAuthorizedError } from "../errors/not-authorized";

interface UserPayload {
    id: string; 
    role: string; 
}

declare global {
    namespace Express {
        interface Request {
            user?: UserInterface;
            token?: TokenInterface; 
        }
    }
}

//? Get current logged user
export const currentUser = async (req: Request, res: Response, next: NextFunction) => {
    if(!req.session?.jwt) {
        return next();
    }

    try {
        const payload = jwt.verify(
            req.session.jwt, 
            process.env.JWT_SECRET! // Already validated existence of JWT_SECRET
        ) as UserPayload; 

        // Find Current User
        const user = await User.findById(payload.id); 
        if(!user) {
            //throw new NotFoundError("Usuario no Encontrado")
            // User was deleted = treat as unauthenticated
            return next(); 
        }

        // Set user to the req object
        req.user = user

    } catch (error) {
        //throw new NotAuthorizedError("Invalid or Expired Token");

        // Invalid or expired token → silently ignore
        req.user = undefined;
    }

    next();
}

//? Require auth for accessing a resource
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    if(!req.user) {
        throw new NotAuthorizedError("Not Authorized")
    }

    next();
}

//! Validates for AdminToken
export const authorizeAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== Roles.Admin) {
        throw new ForbiddenError("Acceso denegado. Se requieren permisos de administrador.")
    }
    next();
};

// Validates for an already existing users when registering a new one
export const checkDuplicatedEmail = async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
        throw new RequestConflictError("Email ya registrado")
    }

    next();
};

// Checks if the user exists based on email
export const checkEmailExists = async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        throw new NotFoundError("Usuario no Encontrado")
    }

    req.user = user; // Guardamos el usuario en la request

    next();
};

// Validates the token
export const validateToken = (type: "email_verification" | "password_reset") => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const { token } = req.params;

        const tokenRecord = await Token.findOne({ token, type });

        if (!tokenRecord) {
            throw new NotFoundError("Tóken no Encontrado")
        }

        req.token = tokenRecord; // Guardamos el token en la request
        next();
    };
};

// Validates if the user exists based on the id
export const userIdExists = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const user = await User.findById(id);
    if(!user) {
        throw new NotFoundError("Usuario no Encontrado")
    }

    req.user = user;
    next();
}