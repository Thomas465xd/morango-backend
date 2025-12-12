import { Request, Response, NextFunction } from "express";
import jwt, { decode } from "jsonwebtoken";
import User, { Roles, UserInterface } from "../models/User";
import Token from "../models/Token";
import { RequestConflictError } from "../errors/conflict-error";

declare global {
    namespace Express {
        interface Request {
            user?: UserInterface;
        }
    }
}

// Validates for auth token
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        //console.log(authHeader);

        // Validar existencia del header
        if(!authHeader) {
            res.status(401).json({ message: "No autorizado o Token no proporcionado" });
            return
        }

        const token = authHeader.split(" ")[1];

        // Intentar decodificar el token con ambas claves
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.ADMIN_SECRET!);
        } catch {
            try {
                decoded = jwt.verify(token, process.env.JWT_SECRET!);
            } catch {
                res.status(401).json({ message: "Token inválido" });
                return
            }
        }

        // Verificar si el token tiene el formato esperado
        if (typeof decoded !== "object" || !decoded.id) {
            res.status(401).json({ message: "Token inválido" });
            return
        }

        // Buscar el usuario por el ID
        const user = await User.findById(decoded.id).select(
            "_id name businessName rut businessRut email phone address admin region city province reference postalCode country"
        );

        if(!user) {
            res.status(404).json({ message: "Usuario no encontrado" });
            return
        }

        // Agregar usuario a la petición
        req.user = user;

        next();
    } catch (error) {
        res.status(500).json({ message: "Error interno del servidor" });
    }
}

//! Validates for AdminToken
export const authorizeAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== Roles.Admin) {
        res.status(403).json({ message: "Acceso denegado. Se requieren permisos de administrador." });
        return
    }
    next();
};

// Validates for an already existing users when registering a new one
export const checkEmailExists = async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
        throw new RequestConflictError("Email ya registrado")
    }

    next();
};

// Checks if the user exists
export const checkUserStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { tokenRecord } = req.body;

        const user = await User.findById(tokenRecord.userId);

        if (!user) {
            res.status(404).json({ message: "Usuario no encontrado" });
            return
        }

        req.body.user = user; // Guardamos el usuario en la request

        next();
    } catch (error) {
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// Validates the token
export const validateToken = (type: "admin_confirmation" | "password_reset") => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { token } = req.params;

            const tokenRecord = await Token.findOne({ token, type });

            if (!tokenRecord) {
                res.status(404).json({ message: "Token no encontrado o inválido" });
                return
            }

            req.body.tokenRecord = tokenRecord; // Guardamos el token en la request
            next();
        } catch (error) {
            res.status(500).json({ message: "Error interno del servidor" });
        }
    };
};

// Validates if the user exists based on the id
export const userIdExists = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        if(!user) {
            const error = new Error("Usuario no Encontrado");
            res.status(404).json({ message: error.message });
            return
        }

        req.body.user = user;
        next();
    } catch (error) {
        res.status(500).json({ message: "Error Interno del Servidor"})
        return
    }
}