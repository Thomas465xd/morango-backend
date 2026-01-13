import type { Request, Response } from "express";
import Token from "../models/Token";
import User, { Roles } from "../models/User";
import { generateConfirmationToken, generateJWT, generatePasswordResetToken } from "../utils/jwt";
import { RequestConflictError } from "../errors/conflict-error";
import { NotFoundError } from "../errors/not-found";
import { NotAuthorizedError } from "../errors/not-authorized";
import { comparePassword } from "../utils/auth";
import { AuthEmails } from "../emails/auth";
import Order from "../models/Order";
import { formatLean } from "../utils/json";


export class AuthController {
    //* ADMIN - Get Users
    // Supports pagination, filtering by account status (confirmed or not)
    // searching by email and name & filtering by name in Alphabetical order.
    static getUsers = async (req: Request, res: Response) => {
        // Get the page and perPage query parameters (default values if not provided)
        const page = parseInt(req.query.page as string) || 1;
        const perPage = parseInt(req.query.perPage as string) || 10;

        // Destructure possible search queries
        // Search query param could be either email or name
        const { confirmed, search } = req.query; 

        const filters : any = {}; 

        //* Filter by account status (confirmed = false || true)
        if(confirmed === "true" || confirmed === "false") {
            filters.confirmed = confirmed === "true"
        }

        //* Search by email or name
        if (search) {
            filters.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Calculate skip and limit for pagination
        const skip = (page - 1) * perPage;
        const limit = perPage;

        //? Sorting logic
        const sortBy = req.query.sortBy as string 
        const sortOrder: 1 | -1 = req.query.sortOrder === "asc" ? 1 : -1;

        let sort : Record<string, 1 | -1> = { name: 1 } // default sorting criteria

        //? Sorting options
        if (sortBy === "name") {
            sort = { name: sortOrder }; 
        }

        // Get the total number of users
        const totalUsers = await User.countDocuments(filters);

        //* Sort users by 
        // Fetch the users for the current page with pagination
        const users = await User.find(filters)
            .skip(skip)
            .limit(limit)
            .sort(sort)
            .lean() // Optimized JS object

        // Calculate the total number of pages
        const totalPages = Math.ceil(totalUsers / perPage);
        
        res.status(200).json({
            users: users.map(formatLean), 
            totalUsers,
            totalPages, 
            perPage, 
            currentPage: page, 
            filters: {
                confirmed: confirmed || null,
                search: search || null, 
                sortBy: sortBy || 'name',
                sortOrder
            }
        });
    }

    
    //* ADMIN - Get User by Id
    static getUserById = async (req: Request, res: Response) => {
        const { userId } = req.params; 

        const user = await User.findById(userId).lean(); 
        if(!user) {
            throw new NotFoundError("Usuario no Encontrado")
        }

        res.status(200).json(formatLean(user));
    };

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

        //! Link all previous guest orders to this user
        await Order.updateMany(
            { 
                'customer.email': email,
                'customer.isGuest': true,
                'customer.userId': null
            },
            { 
                $set: { 
                    'customer.userId': user._id,
                    'customer.isGuest': false
                } 
            }
        );

        // Generate a verification token
        const token = new Token();

        token.userId = user.id;
        token.token = generateConfirmationToken({ id: user.id });
        
        // Save the user in the DB
        await user.save()
        await token.save()

        //* Send Confirmation Email
        await AuthEmails.ConfirmAccount.send(user, token.token)

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

        //! Check wether user is confirmed (confirmed: true) and has a password set (password field defined), 
        //! if not continue with the flow, otherwise return early
        const userExists = await User.findOne({ email }); 
        if(userExists) { 
            if (userExists.confirmed && userExists.password) {
                // Link order to existing user
                await Order.updateMany(
                    {
                        'customer.email': email,
                        'customer.userId': null
                    },
                    {
                        $set: {
                            'customer.userId': userExists._id,
                            'customer.isGuest': false
                        }
                    }
                );
                res.status(200).json({
                    message: "Usuario ya existente. Orden asociada correctamente.",
                    user: {
                        id: userExists.id,
                        email: userExists.email
                    }
                });
            }
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

        // Link all orders with this email
        await Order.updateMany(
            {
                'customer.email': email,
                'customer.userId': null
            },
            {
                $set: {
                    'customer.userId': user._id,
                    'customer.isGuest': false
                }
            }
        );

        // Save the user in the DB
        await user.save()

        // Generate a password_reset token
        const token = generatePasswordResetToken({ id: user.id })

        await Token.create({
            userId: user.id, 
            token,
            type: "password_reset"
        })

        //* Reset password email
        // as of now the user has confirmed: false, but resetPasswordWithToken method
        // ensures to set user.confirmed to true after setting up password, this for checkout accounts
        // the Reset password email with the unique password token will serve the purpose of the confirm account 
        // email. 
        await AuthEmails.ResetPassword.send(user, token)

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

        res.status(201).json({ message: "Cuenta confirmada Existosamente." })
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
            
            // Save token
            await token.save(); 

            //* Send Confirmation Email
            await AuthEmails.ConfirmAccount.send(user, token.token)

            throw new NotAuthorizedError("Cuenta no confirmada, hemos enviado un email de verficación.")
        }

        // Check if passwords match
        const isMatch = await comparePassword(password, user.password); 
        if(!isMatch) {
            throw new NotAuthorizedError("Credenciales Inválidas")
        }

        //! CRITICAL - If user is admin, generate Admin JWT
        const isAdmin = user.role === Roles.Admin; 
        const payload = { id: user.id, role: user.role };

        const token = generateJWT(payload);

        //~ Store the jwt in session object
        req.session = {
            jwt: token,
        };

        res.status(200).json({
            message: "Inicio de sesión exitoso",
            admin: isAdmin,
        });
    }

    static getUser = async (req: Request, res: Response) => {
        const user = req.user
        res.status(200).json( user );
    }

    static logout = async (req: Request, res: Response) => {
        req.session = null; 
        res.status(200).json({ message: "Successfully logged out" })
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

        // See if there is already an active "email_verification" token to delete it
        const tokenRecord = await Token.findOne({ userId: user.id, type: "email_verification" })
        if(tokenRecord) {
            await tokenRecord.deleteOne(); 
        }

        const confirmationToken = await Token.create({
            userId: user.id, 
            token: generateConfirmationToken({ id: user.id }), 
            type: "email_verification"
        })

        //* Resend confirmation email to the user
        await AuthEmails.ConfirmAccount.send(user, confirmationToken.token)

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
            
            // Save token
            await token.save(); 

            //* Send Confirmation Email
            await AuthEmails.ConfirmAccount.send(user, token.token)

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

        //* Resend reset password email to the user
        await AuthEmails.ResetPassword.send(user, passwordResetToken.token)

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

        const token = generateJWT(payload);

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

    //? PROFILE - Update Password 
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