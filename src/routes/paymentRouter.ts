import { Router } from "express";
import { body, param, query } from "express-validator";
import { handleInputErrors } from "../middleware/validation";
import { currentUser, requireAdmin, requireAuth } from "../middleware/auth";
import { PaymentController } from "../controllers/PaymentController";
import { PaymentStatus } from "../models/Payment";

// Payment Flow
// Order (Pending)
//    ↓
// Create Preference
//    ↓
// User pays (MP UI)
//    ↓
// User redirected (success | pending | failure)
//    ↓
// Webhook arrives (authoritative)
//    ↓
// Payment updated
//    ↓
// Order updated

const router = Router();

//& 🛠️ Core Payment Flow 🛠️ &//

//! CRITICAL
//^ 1.- POST - Create Preference
// Generates MP preference with order details and returns preferenceId for Bricks
// Returns init_point URL to redirect user
// Creates initial Payment record/document in DB
router.post("/create-preference", 
    currentUser, 
    body("orderId")
        .isMongoId().withMessage("ID de la orden Inválido")
        .notEmpty().withMessage("El ID de la orden es Obligatorio"), 
    handleInputErrors,
    PaymentController.createPreference
)

//^ 2.- POST - Mercado Pago webhook
// Receives payment notifications from MP, validates MP signature, 
// updates payment status, updates order status to processing, converts reserved stock to sold stock, 
// sends processing order email
router.post("/webhook", 
    PaymentController.mpWebhook
)

//! 🔒 ADMIN PAYMENT MANAGEMENT 🔒 !// 

//* 3.- GET - List all payments (admin)
// Pagination support
// Filter by status, date range
// Search by order number or email
router.get("/admin", 
    currentUser, 
    requireAdmin,
    query("status")
        .optional()
        .notEmpty().withMessage("El estado no puede ir vacío")
        .isIn(Object.values(PaymentStatus)).withMessage("Estado inválido proporcionado."),
    query('search')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 2, max: 50 })
        .matches(/^[a-zA-Z0-9@._\- ]+$/)
        .withMessage('Parámetro de búsqueda inválido'),
    query("startDate")
        .optional()
        .isISO8601().withMessage("La fecha de inicio debe ser una fecha válida"),
    query("endDate")
        .optional()
        .isISO8601().withMessage("La fecha de fin debe ser una fecha válida")
        .custom((value, { req }) => {
            if (req.query.startDate && value) {
                if (new Date(req.query.startDate) > new Date(value)) {
                    throw new Error("La fecha de fin debe ser posterior a la fecha de inicio");
                }
            }
            return true;
        }),
    query("sortBy")
        .optional()
        .isIn(["date"])
        .withMessage("Invalid sorting criteria. use 'date'"),
    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("sort order must be either 'asc' or 'desc'"),
    handleInputErrors,
    PaymentController.getPaymentsAdmin
)

//* 4.- GET - Get payment details (admin)
// Full payment information
// MP transaction details
// Associated order info
router.get("/admin/:paymentId", 
    currentUser, 
    requireAdmin,
    param("paymentId")
        .isMongoId().withMessage("ID de la orden Inválido")
        .notEmpty().withMessage("El ID de la orden es Obligatorio"), 
    handleInputErrors,
    PaymentController.getPaymentByIdAdmin
)

//^ 5.- POST - Process refund (admin)
// Initiate refund through MP API
// Update payment status
// Update order status
// Return stock to inventory
router.post("/admin/refund/:paymentId", 
    currentUser, 
    requireAdmin,
    param("paymentId")
        .isMongoId().withMessage("ID de la orden Inválido")
        .notEmpty().withMessage("El ID de la orden es Obligatorio"), 
    handleInputErrors,
    PaymentController.processRefund
)

//~ 🚚 PAYMENT STATUS & MANAGEMENT 🚚 ~//

//* 6.- GET - get payment status for order
// Check current payment status, used for polling on frontend, 
// returns payment info and order status
router.get("/order/status/:orderId", 
    currentUser, 
    param("orderId")
        .isMongoId().withMessage("ID de la orden Inválido")
        .notEmpty().withMessage("El ID de la orden es Obligatorio"), 
    handleInputErrors,
    PaymentController.getOrderPaymentStatus
)

//^ 7.- POST - Retry failed payment
// Create new MP preference for same order
// Only allowed if order not expired
// Updates payment record with new preference
router.post("/order/retry/:orderId", 
    currentUser, 
    param("orderId")
        .isMongoId().withMessage("ID de la orden Inválido")
        .notEmpty().withMessage("El ID de la orden es Obligatorio"), 
    body("email")
        .notEmpty().withMessage("El Email es obligatorio")
        .isEmail().withMessage("El email no es válido"),
    handleInputErrors,
    PaymentController.retryPayment
)

//* 8.- GET - Get payment details User
// Get detailed payment information
// Includes MP transaction data
// Admin and order owner can access
router.get("/:paymentId", 
    currentUser, 
    requireAuth,
    param("paymentId")
        .isMongoId().withMessage("ID de la orden Inválido")
        .notEmpty().withMessage("El ID de la orden es Obligatorio"), 
    handleInputErrors,
    PaymentController.getPaymentById
)

export default router