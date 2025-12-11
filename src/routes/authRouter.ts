import { Router } from "express";
import { body, param } from "express-validator";
import { AuthController } from "../controllers/AuthController";
import { handleInputErrors } from "../middleware/validation";
import { checkExistingUser } from "../middleware/auth";

const router = Router();

// Client Auth Routes

/* Create Account */
router.post("/create-account", 
    body("name")
        .notEmpty().withMessage("El Nombre es obligatorio"),
    body("businessName")
        .notEmpty().withMessage("El Nombre de la Empresa es obligatorio"),
    body("phone")
        .matches(/^(\+56\s?9\d{8}|9\d{8})$/)
        .trim()
        .withMessage("Formato de teléfono inválido. Example: +56912345678 or 912345678"),
    body("email")
        .notEmpty().withMessage("El Email es obligatorio")
        .isEmail().withMessage("El Email no es válido"), 
    body("address")
        .notEmpty().withMessage("La Dirección es obligatoria"),
    handleInputErrors,
    checkExistingUser,
    AuthController.createAccount
)


export default router