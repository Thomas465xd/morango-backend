import { Router } from "express";
import { body, param } from "express-validator";
import { AuthController } from "../controllers/AuthController";
import { handleInputErrors } from "../middleware/validation";
import { checkDuplicatedEmail, checkEmailExists, currentUser, requireAuth, validateToken } from "../middleware/auth";
import { Regions } from "../models/User";

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
    checkDuplicatedEmail, 
    AuthController.createAccount
)

//? Create account without password | from order checkout form
// This means that the account will be created with all address information already set,
// except for the password and the confirmed status, so a slightly different flow will be activated, 
// Once a new user is created, a confirmation merged with a set password email will be sent. 
// Set password can be covered by /reset-password/:token route and resetPasswordWithToken handler
router.post("/register/checkout", 
    body("name")
        .notEmpty().withMessage("El nombre no puede estar vacío")
        .trim(),
    body("surname")
        .notEmpty().withMessage("El apellido no puede estar vacío")
        .trim(),
    body("email")
        .notEmpty().withMessage("El Email es obligatorio")
        .isEmail().withMessage("El email no es válido"),
    body("phone")
        .optional()
        .matches(/^(\+56\s?9\d{8}|9\d{8})$/)
        .trim()
        .withMessage("Formato de teléfono inválido. Example: +56912345678 or 912345678"),
    // Address validations (nested)
    body("address.country")
        .notEmpty().withMessage("El país no puede estar vacío")
        .trim(),
    body("address.region")
        .isIn(Object.values(Regions)).withMessage("Región inválida"),
    body("address.city")
        .notEmpty().withMessage("La ciudad no puede estar vacía")
        .trim(),
    body("address.cityArea")
        .notEmpty().withMessage("La comuna no puede estar vacía")
        .trim(),
    body("address.street")
        .notEmpty().withMessage("La calle no puede estar vacía")
        .trim(),
    body("address.reference")
        .optional()
        .trim(),
    body("address.zipCode")
        .optional()
        .trim(),
    handleInputErrors,
    AuthController.createCheckoutAccount
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


// Resend verification email
router.post("/resend-verification", 
    body("email")
    .notEmpty().withMessage("Email no puede ir vacío")
    .isEmail().withMessage("Email inválido"),
    handleInputErrors, 
    checkEmailExists,
    AuthController.requestConfirmationEmail
)

// Forgot Password Email
router.post("/forgot-password", 
    body("email")
    .notEmpty().withMessage("Email no puede ir vacío")
    .isEmail().withMessage("Email inválido"),
    handleInputErrors, 
    checkEmailExists,
    AuthController.requestPasswordEmail
)

// Reset Password providing valid token
router.post("/reset-password/:token",
    param("token")
        .isJWT().withMessage("Invalid Token"),
    body("password")
        .isLength({ min: 8 }).withMessage("La Contraseña debe tener al menos 8 caracteres").trim(), 
    body("confirmPassword").custom((value, { req }) => {
        if(value !== req.body.password) {
            throw new Error("Las contraseñas no coinciden")
        }
        return true
    }),
    handleInputErrors, 
    validateToken("password_reset"), 
    AuthController.resetPasswordWithToken
)

//? AUTHENTICATHED ROUTES

// Get Current Auth User
router.get("/user", 
    currentUser, 
    requireAuth, 
    AuthController.getUser
)

// Update Profile info | including address info
router.patch("/profile", 
    currentUser,
    requireAuth,
    // Make fields optional and only validate if provided
    body("name")
        .optional()
        .notEmpty().withMessage("El nombre no puede estar vacío")
        .trim(),
    body("surname")
        .optional()
        .notEmpty().withMessage("El apellido no puede estar vacío")
        .trim(),
    body("email")
        .optional()
        .isEmail().withMessage("El email no es válido")
        .normalizeEmail(),
    body("phone")
        .optional()
        .matches(/^(\+56\s?9\d{8}|9\d{8})$/)
        .trim()
        .withMessage("Formato de teléfono inválido. Example: +56912345678 or 912345678"),
    // Address validations (nested)
    body("address.country")
        .optional()
        .notEmpty().withMessage("El país no puede estar vacío")
        .trim(),
    body("address.region")
        .optional()
        .isIn(Object.values(Regions)).withMessage("Región inválida"),
    body("address.city")
        .optional()
        .notEmpty().withMessage("La ciudad no puede estar vacía")
        .trim(),
    body("address.cityArea")
        .optional()
        .notEmpty().withMessage("La comuna no puede estar vacía")
        .trim(),
    body("address.street")
        .optional()
        .notEmpty().withMessage("La calle no puede estar vacía")
        .trim(),
    body("address.reference")
        .optional()
        .trim(),
    body("address.zipCode")
        .optional()
        .trim(),
    handleInputErrors, 
    AuthController.updateProfile
)

// Update Password providing old one & new one along with new one confirmation
router.patch("/update-password", 
    currentUser, 
    requireAuth, 
    body("current_password")
        .notEmpty().withMessage("Current Password is required"),
    body("password")
        .isLength({ min: 8 }).withMessage("Password must be at least 8 characters long").trim(), 
    body("confirmPassword").custom((value, { req }) => {
        if(value !== req.body.password) {
            throw new Error("Passwords do not match")
        }
        return true
    }), 
    handleInputErrors, 
    AuthController.updatePassword
)

export default router