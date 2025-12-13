import type { Request, Response } from "express";
import Token from "../models/Token";
import User, { Roles } from "../models/User";
import { generateAdminJWT, generateConfirmationToken, generateJWT } from "../utils/jwt";
import { InternalServerError } from "../errors/server-error";
import { RequestConflictError } from "../errors/conflict-error";
import { NotFoundError } from "../errors/not-found";
import { NotAuthorizedError } from "../errors/not-authorized";
import { comparePassword } from "../utils/auth";


export class AuthController {
    static createAccount = async (req: Request, res: Response) => {
        const { name, surname, email, password } = req.body; 

        const userExists = await User.findOne({ email }); 
        if(userExists) { 
            throw new RequestConflictError("Hay otra cuenta registrada con ese Email")
        }

        // Create user & save it to the DB
        const user = User.build({
            name, 
            surname, 
            email, 
            password
        }); 

        // Generate a verification token
        const token = new Token();

        token.userId = user.id;
        token.token = generateConfirmationToken({ id: user.id });

        //TODO Send the Confirmation Email to the user

        // Save the user in the DB
        await user.save()
        await token.save()

        res.status(201).json({ message: "Usuario Registrado Exitosamente, hemos enviado un Email de Verificación a tu Correo." })
    }

    static confirmAccount = async (req: Request, res: Response) => {
        const { token } = req.params; 

        const tokenExists = await Token.findOne({ token, type: "email_verification" }); 
        if(!tokenExists) { 
            throw new NotFoundError("Tóken no Encontrado")
        }

        const user = await User.findById(tokenExists.userId); 
        if(!user) {
            throw new NotFoundError("El Usurio no Existe")
        }

        user.confirmed = true; 

        await user.save()
        await tokenExists.deleteOne()

        res.status(201).json({ message: "Cuenta confirmada Existosamente" })
    }

    static login = async (req: Request, res: Response) => {
        const { email, password } = req.body; 

        const user = await User.findOne({ email }); 
        if(!user) {
            throw new NotFoundError("Usuario no Encontrado")
        }

        // If user is not confirmed, trigger account confirmation flow
        if(!user.confirmed) {
            // Generate a confirmation token
            const token = new Token()

            token.token = generateConfirmationToken({ id: user.id }); 
            token.userId = user.id 

            // TODO Send Confirmation Email

            // Save token
            await token.save(); 

            throw new NotAuthorizedError("Cuenta no confirmada, hemos enviado un email de verficación")
        }

        // Check if passwords match
        const isMatch = await comparePassword(password, user.password); 
        if(!isMatch) {
            throw new NotAuthorizedError("Credenciales Inválidas")
        }

        //! CRITICAL - If user is admin, generate Admin JWT
        const isAdmin = user.role === Roles.Admin; 
        const payload = { id: user.id, role: user.role };

        const token = isAdmin ? generateAdminJWT(payload) : generateJWT(payload);

        //~ Store the jwt in session object
        req.session = {
            jwt: token
        }

        res.status(200).json({
            message: "Inicio de sesión exitoso",
            admin: isAdmin,
        });
    }
}