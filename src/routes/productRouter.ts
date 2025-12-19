import { Router } from "express";
import { body, param, query } from "express-validator";
import { ProductController } from "../controllers/ProductController";
import { handleInputErrors } from "../middleware/validation";
import { currentUser, requireAdmin } from "../middleware/auth";
import { ProductTypes } from "../models/Product";
import { validateProductAttributes } from "../types/validators";

const router = Router();

//* --- SEARCH ENDPOINTS --- *//
/** All of the search endpoints will probably have pagination integrated */

//* Get Products (category, productType, minPrice, maxPrice, tags) | Pagination
// Sort by: createdAt, basePrice, name (A-Z)
router.get("/",
    currentUser,  
    query("productType")
        .optional()
        .isIn(Object.values(ProductTypes)).withMessage("Tipo de producto inválido"),
    query("tags")
        .optional()
        .custom((value) => {
            // ?tags=gold,silver
            if (typeof value === "string") {
                return value
                    .split(",")
                    .every(tag => typeof tag === "string" && tag.trim().length > 0);
            }

            // ?tags=gold&tags=silver
            if (Array.isArray(value)) {
                return value.every(
                    tag => typeof tag === "string" && tag.trim().length > 0
                );
            }

            return false;
        })
        .withMessage("tags must be a comma-separated string or an array of strings"),
    query("category")
        .optional()
        .notEmpty().withMessage("La Categoría no puede ir vacía"),
    query("sale")
        .optional()
        .isBoolean().withMessage("El filtro por descuento debe ser boolean")
        .notEmpty().withMessage("El filtro por descuento no puede ir vacío"), 
    query("minPrice")
        .optional()
        .isInt({min: 0})
        .withMessage("El precio minimo no puede ser menor a cero"), 
    query("maxPrice")
        .optional()
        .isInt({min: 0})
        .withMessage("El Precio máximo no puede ser menor a cero"),
    query("isActive")
        .optional()
        .notEmpty().withMessage("El estado del producto no puede ir vacío")
        .isBoolean().withMessage("El Estado debe ser verdadero o falso"), 
    query("sortBy")
        .optional()
        .isIn(["basePrice", "name", "category"])
        .withMessage("The sort criteria selected does not exist"),
    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("sort order must be either 'asc' or 'desc'"),
    handleInputErrors,
    ProductController.getProducts
)

//* Get Products Categories with product count per category (List all unique categories) | Pagination
// Returns array of available categories with product count per category
router.get("/categories",
    currentUser,
    handleInputErrors,
    ProductController.getProductCategories
)

// TODO: Might not be added, since getProducts kind of covers it already
//* Get Products Search Text (name, description, tags)
// Returns ranked results by relevance

//* Get newest products (products added in the last 30 days)
// Sorted by createdAt descending

//* Get Products in a Category by Category Name
// Returns all products that belong to a category
router.get("/categories/:categoryName",
    currentUser,   
    param("categoryName")
        .notEmpty().withMessage("El nombre de la categoría es Obligatoria")
        .isString().withMessage("La Categoría debe ser una cadena de texto válida"), 
    handleInputErrors,
    ProductController.getProductCategoryByName
)

//* Get Product by ID - get single product details
// Also return related products (same category/type)
router.get("/:productId",
    currentUser,   
    param("productId")
        .isMongoId().withMessage("ID del producto Inválido")
        .notEmpty().withMessage("El ID del producto es Obligatorio"), 
    handleInputErrors,
    ProductController.getProductById
)

// TODO
// //^ POST | Validate Stock before checkout 
// router.post("/stock",
//     currentUser, 

//     handleInputErrors,
//     ProductController.validateStock
// )

//! --- Admin Product Routes | Will possible be moved to adminRouter --- !// 

/** Product Management */

//^ POST | Create Product
router.post("/",
    currentUser, 
    requireAdmin,
    body("name")
        .notEmpty().withMessage("El Nombre no puede ir vacío")
        .trim(),
    body("description")
        .notEmpty().withMessage("La Descripción no puede ir vacía")
        .trim(), 
    body("basePrice")
        .notEmpty().withMessage("El Precio base no puede ir vacío")
        .isFloat({ min: 0 }).withMessage("El Precio debe ser un número decimal mayor a 0")
        .trim(), 
    body("productType")
        .isIn(Object.values(ProductTypes)).withMessage("Tipo de producto inválido"),
    body("images")
        .isArray({ min: 3, max: 10 }).withMessage("Debes agregar almenos 3 a 10 imágenes")
        .notEmpty().withMessage("Debes agregar imágenes al producto"),
    body("images.*")
        .isURL().withMessage("Cada imagen debe ser una URL válida"),
    body("stock")
        .isInt({ min: 0 }).withMessage("El Stock debe ser un número mayor o igual a 0")
        .notEmpty().withMessage("El Stock del producto no puede ir vacíó"), 
    body("category")
        .notEmpty().withMessage("La Categoría no puede ir vacía")
        .trim(),
    body("tags")
        .isArray({ min: 1, max: 10 }).withMessage("Debes agregar al menos un tag"),
    body("tags.*")
        .isString().withMessage("Cada tag debe ser texto")
        .trim()
        .notEmpty().withMessage("Los tags no pueden estar vacíos"), 
    body("isActive")
        .optional()
        .notEmpty().withMessage("El estado del producto no puede ir vacío")
        .isBoolean().withMessage("El Estado debe ser verdadero o falso"), 

    //? Custom validator for attributes
    validateProductAttributes(true), 
    handleInputErrors,
    ProductController.createProduct
)

//? PATCH | Edit Product
router.patch("/:productId",
    currentUser, 
    requireAdmin,  
    param("productId")
        .isMongoId().withMessage("ID del producto inválido")
        .notEmpty().withMessage("El ID del producto es obligatorio"), 
    
    // All fields optional for PATCH
    body("name")
        .optional()
        .notEmpty().withMessage("El nombre no puede ir vacío")
        .trim(),
    body("description")
        .optional()
        .notEmpty().withMessage("La descripción no puede ir vacía")
        .trim(), 
    body("basePrice")
        .optional()
        .isFloat({ min: 0 }).withMessage("El precio debe ser un número decimal mayor a 0"), 
    body("productType")
        .optional()
        .isIn(Object.values(ProductTypes)).withMessage("Tipo de producto inválido"),
    body("images")
        .optional()
        .isArray({ min: 3, max: 10 }).withMessage("Debes tener entre 3 a 10 imágenes"),
    body("images.*")
        .optional()
        .isURL().withMessage("Cada imagen debe ser una URL válida"),
    body("stock")
        .optional()
        .isInt({ min: 0 }).withMessage("El stock debe ser un número entero mayor o igual a 0"), 
    body("category")
        .optional()
        .notEmpty().withMessage("La categoría no puede ir vacía")
        .trim(),
    body("tags")
        .optional()
        .isArray({ min: 1, max: 10 }).withMessage("Debes tener entre 1 a 10 tags"),
    body("tags.*")
        .optional()
        .isString().withMessage("Cada tag debe ser texto")
        .trim()
        .notEmpty().withMessage("Los tags no pueden estar vacíos"), 
    body("isActive")
        .optional()
        .isBoolean().withMessage("El estado debe ser verdadero o falso"), 

    //? Custom validator for attributes
    validateProductAttributes(false), 
    handleInputErrors,
    ProductController.updateProduct
)

//! DEL | Delete Product
router.delete("/:productId",
    currentUser, 
    requireAdmin,  
    param("productId")
        .isMongoId().withMessage("ID del producto Inválido")
        .notEmpty().withMessage("El ID del producto es Obligatorio"), 
    handleInputErrors,
    ProductController.deleteProduct
)

//? --- STOCK MANAGEMENT --- ?//

//? PATCH | Update Product Stock
router.patch("/stock/:productId",
    currentUser, 
    requireAdmin,  
    param("productId")
        .isMongoId().withMessage("ID del producto Inválido")
        .notEmpty().withMessage("El ID del producto es Obligatorio"), 
    body("stock")
        .notEmpty().withMessage("El Stock del Producto no puede ir vacío")
        .isInt({ min: 0 }).withMessage("El Stock debe ser un número entero mayor a 0"),
    handleInputErrors,
    ProductController.updateProductStock
)

//* Get Low Stock Products

//* Get Out of Stock

//^ --- DISCOUNT MANAGEMENT --- ^// 

//? Set/update Product discount 
// if set to 0 set "isActive: false (discount object)"
router.patch("/discounts/:productId",
    currentUser, 
    requireAdmin,  
    param("productId")
        .isMongoId().withMessage("ID del producto Inválido")
        .notEmpty().withMessage("El ID del producto es Obligatorio"), 
    body("percentage")
        .notEmpty().withMessage("El porcentaje no puede ir vacío")
        .isInt({ min: 0, max: 100 }).withMessage("El porcentaje debe ser un número del 0 al 100"),
    body("isActive")
        .notEmpty().withMessage("El Estado del Producto no puede ir vacío")
        .isBoolean().withMessage("El Estado del producto debe ser boolean"),
    body("startDate")
        .optional()
        .isISO8601().withMessage("La fecha de inicio debe ser una fecha válida"),
    body("endDate")
        .optional()
        .isISO8601().withMessage("La fecha de fin debe ser una fecha válida")
        .custom((value, { req }) => {
            if (req.body.startDate && value) {
                if (new Date(req.body.startDate) > new Date(value)) {
                    throw new Error("La fecha de fin debe ser posterior a la fecha de inicio");
                }
            }
            return true;
        }),
    handleInputErrors,
    ProductController.setProductDiscount
)

// TODO
//? Bulk Assign Discounts

//& --- PRODUCT VISIBILITY --- TODO //

//? PATCH | Set Product status to "isActive: false" | Soft Delete
router.patch("/status/:productId",
    currentUser, 
    requireAdmin,  
    param("productId")
        .isMongoId().withMessage("ID del producto Inválido")
        .notEmpty().withMessage("El ID del producto es Obligatorio"), 
    body("isActive")
        .notEmpty().withMessage("El Estado del Producto no puede ir vacío")
        .isBoolean().withMessage("El Estado del producto debe ser boolean"),
    handleInputErrors,
    ProductController.updateProductStatus
)

export default router