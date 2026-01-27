import { Router } from "express";
import { body, param, query } from "express-validator";
import { handleInputErrors } from "../middleware/validation";
import { currentUser, requireAdmin, requireAuth } from "../middleware/auth";
import { OrderController } from "../controllers/OrderController";
import { Regions } from "../models/User";
import { OrderStatus } from "../models/Order";
import { isString } from "util";

const router = Router();

//& 📦 PUBLIC ROUTES 📦 &//

//* 1.- Get order by order number (public tracking)
// Used for guest order tracking, returns order status, items, shipping info
router.get("/public/:trackingNumber", 
    param("trackingNumber")
        .notEmpty().withMessage("El Número de la orden no puede ir vacío"), 
    currentUser, 
    handleInputErrors,
    OrderController.getOrderByNumber
)

//^ 2.- POST - Create Order
// Check all products exist and are active, verify sufficient stock
// return availability status for each item,
// order expiration time set by CRON job
router.post("/",
    // items must be a non-empty array
    body("items")
        .isArray({ min: 1 })
        .withMessage("La orden debe contener al menos un producto"),

    // productId
    body("items.*.productId")
        .notEmpty()
        .withMessage("El ID del producto es obligatorio")
        .isMongoId()
        .withMessage("El ID del producto no es válido"),

    // quantity
    body("items.*.quantity")
        .notEmpty()
        .withMessage("La cantidad del producto no puede ir vacía")
        .isInt({ min: 1 })
        .withMessage("La cantidad debe ser al menos 1"),

    currentUser,
    handleInputErrors,
    OrderController.createOrder
);

//? 3.- PATCH set Order Checkout Info
// Sets the customer info and shipping address info 
// Payment preference is only created when this info is set 
router.patch("/checkout/:orderId", 
    param("orderId")
        .isMongoId().withMessage("ID de la orden Inválido")
        .notEmpty().withMessage("El ID de la orden es Obligatorio"), 

    // OPTIONAL - customer.userId
    body("customer.userId")
        .optional()
        .notEmpty().withMessage("El ID del usuario no puede ir vacío")
        .isMongoId().withMessage("ID inválido"), 

    // customer.email
    body("customer.email")
        .notEmpty().withMessage("El Email es obligatorio")
        .isEmail().withMessage("El email no es válido"),
    
    // customer.name
    body("customer.name")
        .notEmpty().withMessage("El nombre no puede estar vacío")
        .trim(),

    // customer.surname
    body("customer.surname")
        .notEmpty().withMessage("El Apellido no puede ir vacío")
        .trim(), 

    // customer.phone
    body("customer.phone")
        .optional()
        .matches(/^(\+56\s?9\d{8}|9\d{8})$/)
        .trim()
        .withMessage("Formato de teléfono inválido. Example: +56912345678 or 912345678"),

    // This request validation errors should not be seen by the client,
    // because isGuest will always be sent
    body("customer.isGuest")
        .optional()
        .notEmpty().withMessage("isGuest cannot be empty")
        .isBoolean().withMessage("isGuest should be either true or false"), 

    // shippingAddress validations
    body("shippingAddress.country")
        .notEmpty().withMessage("El país no puede estar vacío")
        .trim(),
    body("shippingAddress.region")
        .isIn(Object.values(Regions)).withMessage("Región inválida"),
    body("shippingAddress.city")
        .notEmpty().withMessage("La ciudad no puede estar vacía")
        .trim(),
    body("shippingAddress.cityArea")
        .notEmpty().withMessage("La comuna no puede estar vacía")
        .trim(),
    body("shippingAddress.street")
        .notEmpty().withMessage("La calle no puede estar vacía")
        .trim(),
    body("shippingAddress.reference")
        .optional()
        .trim(),
    body("shippingAddress.zipCode")
        .optional()
        .trim(),

    // shipping = costs will be predefined options in the frontend
    body("shipping")
        .notEmpty()
        .withMessage("El valor del envío no puede ir vacío")
        .isFloat({ min: 0 })
        .withMessage("El valor del envío debe ser mayor o igual a 0"),

    body("shippingMethod")
        .notEmpty()
        .withMessage("El valor del envío no puede ir vacío")
        .isString()
        .withMessage("shippingMethod must be a string"),

    // saveData
    body("saveData")
        .notEmpty().withMessage("saveData needs to be send")
        .isBoolean().withMessage("saveData should be either true or false"), 

    currentUser, 
    handleInputErrors, 
    OrderController.setOrderCheckoutInfo
)

//! 🔒 Admin Order Routes 🔒 !//

//* 4.- Get All registered orders with filtering & sorting
// Filter by status, date range, customer email and order number. Allow sorting. 
router.get("/admin", 
    currentUser, 
    requireAdmin,
    query("trackingNumber")
        .optional()
        .notEmpty().withMessage("El trackingNumber no puede ir vacío"),
    query("status")
        .optional()
        .notEmpty().withMessage("El estado no puede ir vacío")
        .isIn(Object.keys(OrderStatus)).withMessage("Estado inválido proporcionado. Usar llaves."),
    query("email")
        .optional()
        .notEmpty().withMessage("El Email no puede ir vacío")
        .isEmail().withMessage("Email inválido"),
    query("hasPayment")
        .optional()
        .isBoolean().withMessage("hasPayment debe ser true o false"),

    query("isGuest")
        .optional()
        .isBoolean().withMessage("isGuest debe ser true o false"),
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
    OrderController.getOrdersAdmin
)

//* 5.- Get a single order by it's id
// Full order info, customer details, payment details, stock reservation info
router.get("/admin/:orderId", 
    currentUser, 
    requireAdmin,
    param("orderId")
        .isMongoId().withMessage("ID de la orden Inválido")
        .notEmpty().withMessage("El ID de la orden es Obligatorio"), 
    handleInputErrors,
    OrderController.getOrderByIdAdmin
)

//? 6.- PATCH - Edit Order Status
// Change order status manually, set deliveredAt when marking as delivered, prevent invalid status transitions
// Cancel transition can be made in any status. Cancel status change releases order products stock
router.patch("/admin/status/:orderId", 
    currentUser, 
    requireAdmin,
    param("orderId")
        .isMongoId().withMessage("ID de la orden Inválido")
        .notEmpty().withMessage("El ID de la orden es Obligatorio"), 
    body("status")
        .notEmpty().withMessage("El estado no puede ir vacío")
        .isIn(Object.keys(OrderStatus)).withMessage("Estado inválido proporcionado. Usar llaves."),
    body("deliveredAt")
        .optional()
        .notEmpty().withMessage("La fecha de entrega no puede ir vacía")
        .isISO8601().withMessage("La fecha de entrega debe ser en formato YYYY-MM-DD"),
    handleInputErrors,
    OrderController.updateOrderStatus
)

//! 7.- DELETE - Delete order entirely
router.delete("/admin/:orderId", 
    currentUser, 
    requireAdmin,
    param("orderId")
        .isMongoId().withMessage("ID de la orden Inválido")
        .notEmpty().withMessage("El ID de la orden es Obligatorio"), 
    handleInputErrors,
    OrderController.deleteOrder
)

//* 🗣️ Auth User Order Management 🗣️ *//

//* 8.- Get current authenticated user registered orders
// pagination support, filter by status, sort by date (desc)
router.get("/", 
    currentUser, 
    requireAuth, 
    query("status")
        .optional()
        .notEmpty().withMessage("El estado no puede ir vacío")
        .isIn(Object.keys(OrderStatus)).withMessage("Estado inválido proporcionado. Usar llaves."),
    query("sortBy")
        .optional()
        .isIn(["date"])
        .withMessage("Invalid sorting criteria. use 'date'"),
    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("sort order must be either 'asc' or 'desc'"),
    handleInputErrors,
    OrderController.getAuthUserOrders
)

//* 9.- Get single order details authenticated
// User can only see their own orders, more detailed than public tracking, 
// includes payment info 
router.get("/:orderId", 
    currentUser, 
    requireAuth, 
    param("orderId")
        .isMongoId().withMessage("ID de la orden Inválido")
        .notEmpty().withMessage("El ID de la orden es Obligatorio"), 
    handleInputErrors,
    OrderController.getAuthUserOrderById
)

//? 10.- PATCH - Cancel order before payment | USER
// Only allowed if status is "Esperando pago", release reserved stock,
// cannot cancel after payment 
router.patch("/cancel/:orderId", 
    currentUser, 
    requireAuth,
    param("orderId")
        .isMongoId().withMessage("ID de la orden Inválido")
        .notEmpty().withMessage("El ID de la orden es Obligatorio"), 
    handleInputErrors,
    OrderController.cancelOrder
)


export default router