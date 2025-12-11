import type { Request, Response } from "express";
import Token from "../models/Token";
import User from "../models/User";
import { generateConfirmationToken } from "../utils/jwt";


export class AuthController {
    static createAccount = async (req: Request, res: Response) => {
        try {
            const user = new User(req.body)

            // Generate a verification token
            const token = new Token();

            token.userId = user.id;
            token.token = generateConfirmationToken({ id: user.id });

            /** Send the Confirmation Email to the Admin */

            // Save the user in the DB
            await Promise.allSettled([user.save(), token.save()]);

            res.status(201).json({ message: "Usuario Creado Exitosamente, Hemos enviado su solicitud de verificación." })
        } catch (error) {
            res.status(500).json({ message: "Internal Server Error" })
        }
    }
}