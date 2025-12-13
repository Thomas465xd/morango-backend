import { Router } from "express";
import { body, param } from "express-validator";
import { AuthController } from "../controllers/AuthController";
import { handleInputErrors } from "../middleware/validation";
import { checkEmailExists } from "../middleware/auth";

const router = Router();

// Client Auth Routes

/* Create Account */
router.post("/register", 
    body("name")
        .notEmpty().withMessage("El Nombre no puede ir vacío"),
    body("surname")
        .notEmpty().withMessage("El Apellido no puede ir vacío"),
    body("email")
        .notEmpty().withMessage("El Email es obligatorio")
        .isEmail().withMessage("El Email no es válido"), 
    body("password")
        .isLength({ min: 8 }).withMessage("La Contraseña debe tener al menos 8 caracteres").trim(), 
    body("confirmPassword").custom((value, { req }) => {
        if(value !== req.body.password) {
            throw new Error("Las Contraseñas no Coinciden")
        }
        return true
    }),
    handleInputErrors,
    AuthController.createAccount
)

// Confirm Token
router.post("/confirm/:token", 
    param("token")
        .notEmpty().withMessage("Token vacío"),
    handleInputErrors,
    AuthController.confirmAccount
)

// Login
router.post("/login", 
    body("email")
        .notEmpty().withMessage("email is required")
        .isEmail().withMessage("email is not valid"),
    body("password")
        .notEmpty().withMessage("password is required"), 
    handleInputErrors, 
    AuthController.login
)


export default router