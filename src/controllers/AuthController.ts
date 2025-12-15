import type { Request, Response } from "express";
import Token from "../models/Token";
import User, { Roles } from "../models/User";
import { generateAdminJWT, generateConfirmationToken, generateJWT, generatePasswordResetToken } from "../utils/jwt";
import { RequestConflictError } from "../errors/conflict-error";
import { NotFoundError } from "../errors/not-found";
import { NotAuthorizedError } from "../errors/not-authorized";
import { comparePassword } from "../utils/auth";


export class AuthController {
    //? Create new account & trigger confirmation flow
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

        res.status(201).json({ 
            message: "Usuario Registrado Exitosamente, hemos enviado un Email de Verificación a tu Correo.", 
            user
        })
    }

    //? Create new Account without password | for "save info" in order checkout form
    static createCheckoutAccount = async (req: Request, res: Response) => {
        const { 
            name, 
            surname, 
            email, 
            phone,  
            address,
        } = req.body; 

        const userExists = await User.findOne({ email }); 
        if(userExists) { 
            //! Check wether user is confirmed (confirmed: true) and has a password set (password field defined), 
            //! if not continue with the flow, otherwise return early
            if (userExists.confirmed && userExists.password) {
                throw new RequestConflictError("Ya existe una cuenta con este email. Por favor inicia sesión.")
            }

            // User exists but hasn't set password yet - resend email
            if (!userExists.password) {
                // Delete old password reset token
                await Token.deleteMany({ 
                    userId: userExists.id, 
                    type: "password_reset" 
                });

                // Generate new token
                const token = generatePasswordResetToken({ id: userExists.id }); // Use crypto.randomBytes

                await Token.create({
                    userId: userExists.id,
                    token,
                    type: "password_reset"
                });

                // TODO: Resend set password email
                // await sendSetPasswordEmail(email, name, token);

                res.status(200).json({
                    message: "Te hemos reenviado el correo para configurar tu contraseña."
                });
            }

            // Any other existing-user state
            throw new RequestConflictError(
                "Ya existe una cuenta con este email."
            );
        }

        // Create user & save it to the DB
        const user = new User({
            name, 
            surname, 
            email, 
            phone, 
            password: null,
            confirmed: false, 
            address
        }); 

        // Save the user in the DB
        await user.save()

        // Generate a password_reset token
        const token = generatePasswordResetToken({ id: user.id })

        await Token.create({
            userId: user.id, 
            token,
            type: "password_reset"
        })

        //TODO Send the Set Password Email to the user


        res.status(201).json({ 
            message: "Usuario Registrado Exitosamente. Hemos enviado un correo para configurar tu contraseña.", 
            user
        })
    }

    //? Confirm account by verifying token
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

    //? Login if valid credentials are provided (email, password)
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

    static getUser = async (req: Request, res: Response) => {
        const user = req.user
        res.status(200).json( user );
    }

    //? Resend account confirmation email
    static requestConfirmationEmail = async (req: Request, res: Response) => {
        const user = req.user; 

        //* Validated in middleware
        // const user = await User.findOne({ email }); 
        // if(!user) {
        //     throw new NotFoundError("Usuario no Encontrado")
        // }

        // verify if the user is already confirmed
        if(user.confirmed) {
            throw new RequestConflictError("El usuario ya esta confirmado.")
        }

        // See if there is already an active "password_reset" token to delete it
        const tokenRecord = await Token.findOne({ userId: user.id, type: "email_verification" })
        if(tokenRecord) {
            await tokenRecord.deleteOne(); 
        }

        const confirmationToken = await Token.create({
            userId: user.id, 
            token: generatePasswordResetToken({ id: user.id }), 
            type: "email_verification"
        })

        // TODO: Resend confirmation email to the user
        // ConfirmEmail.sendConfirmationEmailToUser({
        //     email: user.email,
        //     name: user.name,
        //     token: confirmationToken.token
        // })

        res.status(200).json({
            message: "Email de verificación enviado exitosamente.",
        });
    }

    //? Send reset password email instructions
    static requestPasswordEmail = async (req: Request, res: Response) => {
        const user = req.user; 

        //* Validated in the middleware
        // const user = await User.findOne({ email }); 
        // if(!user) {
        //     throw new NotFoundError("Usuario no Encontrado")
        // }

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

        // See if there is already an active "password_reset" token to delete it
        const tokenRecord = await Token.findOne({ userId: user.id, type: "password_reset" })
        if(tokenRecord) {
            await tokenRecord.deleteOne(); 
        }

        const passwordResetToken = await Token.create({
            userId: user.id, 
            token: generatePasswordResetToken({ id: user.id }), 
            type: "password_reset"
        })

        // TODO: Resend confirmation email to the user
        // ConfirmEmail.sendConfirmationEmailToUser({
        //     email: user.email,
        //     name: user.name,
        //     token: confirmationToken.token
        // })

        res.status(200).json({
            message: "Hemos enviado las instrucciones a tu email.",
        });
    }

    static resetPasswordWithToken = async (req: Request, res: Response) => {
        // Destructure token from req body
        const { password } = req.body; 
        const tokenRecord = req.token; 

        //* Handled by validateToken() middleware
        // const tokenExists = await Token.findOne({ token, type: "password_reset" }); 
        // if(!tokenExists) {
        //     throw new RequestConflictError("Tóken inválido o expirado.")
        // }

        const user = await User.findById(tokenRecord.userId); 
        if(!user) {
            throw new NotFoundError("Usuario no Encontrado") 
        }

        //! password hashing is handled by mongoose (this is defined in the User model)
        user.confirmed = true; // For account register at checkout | confirmed is set to false
        user.password = password; 

        await user.save();
        await tokenRecord.deleteOne();
        
        //? Generate JWT for immediate login | if user is admin generate Admin JWT
        const isAdmin = user.role === Roles.Admin; 
        const payload = { id: user.id, role: user.role };

        const token = isAdmin ? generateAdminJWT(payload) : generateJWT(payload);

        //~ Store the jwt in session object
        req.session = {
            jwt: token
        }

        res.status(200).json({
            message: "Contraseña configurada exitosamente, inicia sesión.",
            isAdmin
        });
    }

    //? Update Profile | Allows for partial updates
    static updateProfile = async (req: Request, res: Response) => {
        try {
            const user = req.user; 

            // Define allowed top-level updates
            const allowedUpdates = ['name', 'surname', 'email', 'phone'];
            
            // Build update object for top-level fields
            const updates : any = {};
            
            allowedUpdates.forEach(field => {
                if (req.body[field] !== undefined) {
                    updates[field] = req.body[field];
                }
            });

            // Handle nested address updates
            if (req.body.address) {
                const allowedAddressFields = [
                    'country',
                    'region', 
                    'city',
                    'cityArea',
                    'street',
                    'reference',
                    'zipCode'
                ];

                // Update individual address fields (partial update)
                allowedAddressFields.forEach(field => {
                    if (req.body.address[field] !== undefined) {
                        updates[`address.${field}`] = req.body.address[field];
                    }
                });
            }

            // Update user in database
            const updatedUser = await User.findByIdAndUpdate(
                user.id,
                { $set: updates },
                { 
                    new: true,  // Return updated document
                    runValidators: true  // Run schema validators
                }
            );

            if (!updatedUser) {
                throw new NotFoundError("Usuario no Encontrado")
            }

            res.status(200).json({ 
                message: "Perfil actualizado exitosamente", 
                user: updatedUser
            });

        } catch (error) {
            console.error('Error updating profile:', error);
            res.status(500).json({
                success: false,
                message: "Error al actualizar el perfil",
                error: error.message
            });
        }
    }

    static updatePassword = async (req: Request, res: Response) => {
        const user = req.user; 

        const { current_password, password } = req.body; 

        const isPasswordCorrect = await comparePassword(current_password, user.password); 
        if(!isPasswordCorrect) {
            throw new NotAuthorizedError("Constraseña actual Equivocada")
        }

        user.password = password; 
        await user.save(); 

        res.status(200).json({
            message: "Contraseña Actualizada exitosamente.",
        });
    }
}