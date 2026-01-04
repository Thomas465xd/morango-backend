import { Router } from "express";
import { body, param } from "express-validator";
import { handleInputErrors } from "../middleware/validation";
import { currentUser, requireAdmin, requireAuth } from "../middleware/auth";
import { PaymentController } from "../controllers/PaymentController";

const router = Router();

//& 🛠️ Core Payment Flow 🛠️ &//

//! CRITICAL
//^ POST - Create Preference
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

//^ POST - Mercado Pago webhook
// Receives payment notifications from MP, validates MP signature, 
// updates payment status, updates order status to processing, converts reserved stock to sold stock, 
// sends processing order email
router.post("/webhook", 
    currentUser, 
    body("orderId")
        .isMongoId().withMessage("ID de la orden Inválido")
        .notEmpty().withMessage("El ID de la orden es Obligatorio"), 
    handleInputErrors,
    PaymentController.mpWebhook
)

//** ✨ FRONTEND UX Endpoints ✨ **/

//* GET - Payment success redirect page
// user redirected here after successful payment
// shows order confirmation
// displays order number and details
router.get("/success", 
    currentUser, 
    handleInputErrors,
    PaymentController.redirectSuccess
)

//* GET - Payment failure redirect page
// User redirected here if payment fails
// shows error message
// option to retry payment
router.get("/failure", 
    currentUser, 
    handleInputErrors,
    PaymentController.redirectFailure
)

//* GET - Payment Pending redirect page
// User redirected here for pending payments, shows pending status
// instruction for what to do next
router.get("/pending", 
    currentUser, 
    handleInputErrors,
    PaymentController.redirectPending
)

//~ 🚚 PAYMENT STATUS & MANAGEMENT 🚚 ~//

//* GET - get payment status for order
// Check current payment status, used for polling on frontend, 
// returns payment info and order status
router.get("/order/:orderId/status", 
    currentUser, 
    requireAuth, 
    param("orderId")
        .isMongoId().withMessage("ID de la orden Inválido")
        .notEmpty().withMessage("El ID de la orden es Obligatorio"), 
    handleInputErrors,
    PaymentController.getOrderPaymentStatus
)

//^ POST - Retry failed payment
// Create new MP preference for same order
// Only allowed if order not expired
// Updates payment record with new preference
router.get("/order/:orderId/retry", 
    currentUser, 
    param("orderId")
        .isMongoId().withMessage("ID de la orden Inválido")
        .notEmpty().withMessage("El ID de la orden es Obligatorio"), 
    handleInputErrors,
    PaymentController.retryPayment
)

//* GET - Get payment details
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

//! 🔒 ADMIN PAYMENT MANAGEMENT 🔒 !// 

//* GET - List all payments (admin)
// Pagination support
// Filter by status, date range
// Search by order number or email
router.get("/admin", 
    currentUser, 
    requireAdmin,
    handleInputErrors,
    PaymentController.getPaymentsAdmin
)

//* GET - Get payment details (admin)
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

//^ POST - Process refund (admin)
// Initiate refund through MP API
// Update payment status
// Update order status
// Return stock to inventory
router.post("/admin/:paymentId", 
    currentUser, 
    requireAdmin,
    param("paymentId")
        .isMongoId().withMessage("ID de la orden Inválido")
        .notEmpty().withMessage("El ID de la orden es Obligatorio"), 
    handleInputErrors,
    PaymentController.processRefund
)

export default router