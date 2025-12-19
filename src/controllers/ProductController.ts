import type { Request, Response } from "express";
import Product from "../models/Product";
import { NotFoundError } from "../errors/not-found";
import { AllowedProductAttributes } from "../types/validators";
import { enrichProducts } from "../utils/product";


export class ProductController {
    //* Get Products
    static getProducts = async (req: Request, res: Response) => {
        // Get the page and perPage query parameters (default values if not provided)
        const page = parseInt(req.query.page as string) || 1;
        const perPage = parseInt(req.query.perPage as string) || 10;

        // Destructure possible search queries
        const { productType, category, minPrice, maxPrice, tags, sale, isActive } = req.query; 

        // Search Filters
        const filters: any = {};

        //* Only search products that are active
        if(isActive) {
            filters.isActive = true 
        }

        //* ?productType="ProductTypes"
        if (productType) {
            const productTypeMap: Record<string, string> = {
                'collar': 'Collar',
                'aros': 'Aros',
                'pulsera': 'Pulsera',
                'anillo': 'Anillo'
            };
            
            const normalizedProductType = productTypeMap[String(productType).toLowerCase()];
            if (normalizedProductType) {
                filters.productType = normalizedProductType;
            }
        }

        //* ?category=
        if(category) {
            filters.category = category; 
        }

        //* ?minPrice=&maxPrice=
        if(minPrice && maxPrice) {
            filters.basePrice = { $gte: Number(minPrice), $lte: Number(maxPrice) }
        } else if (minPrice) {
            filters.basePrice = { $gte: Number(minPrice) }
        } else if (maxPrice) {
            filters.basePrice = { $lte: Number(maxPrice) }
        }

        //? Parse Tags
        const parsedTags =
            typeof tags === "string" ? 
                tags.split(",").map(t => t.trim()) :
                Array.isArray(tags) ? 
                tags.filter((t): t is string => typeof t === "string") :
                undefined;

        //* ?tags=minimalist,gift
        if (parsedTags?.length) {
            filters.tags = { $in: parsedTags }; // $in searches inside of the array of the field
        }

        //* ?sale=true (filter products with active discounts)
        if (sale === 'true') {
            filters['discount.isActive'] = true;
            filters['discount.percentage'] = { $gt: 0 };
        }

        // Calculate skip and limit for pagination
        const skip = (page - 1) * perPage;
        const limit = perPage;

        //? Sorting logic
        const sortBy = req.query.sortBy as string 
        const sortOrder: 1 | -1 = req.query.sortOrder === "asc" ? 1 : -1;

        let sort : Record<string, 1 | -1> = { createdAt: -1 } // default sorting criteria

        //? Sorting options
        if (sortBy === "basePrice" || sortBy === "price") {
            sort = { basePrice: sortOrder }; 
        } else if (sortBy === "name") {
            sort = { name: sortOrder };
        } else if (sortBy === "category") {
            sort = { category: sortOrder };
        }

        // Get the total number of unconfirmed products
        const totalProducts = await Product.countDocuments(filters);

        //* Sort products by createdAt, basePrice & name
        // Fetch the products for the current page with pagination
        const products = await Product.find(filters) 
            .skip(skip)
            .limit(limit)
            .sort(sort) // Sort by createdAt in descending product
            .lean() // Optimized JS object

        //! Calculate finalPrice for each product
        const productsWithPrices = enrichProducts(products); 

        // Calculate the total number of pages
        const totalPages = Math.ceil(totalProducts / perPage);

        res.status(200).json({ 
            products: productsWithPrices, 
            totalProducts,
            totalPages, 
            perPage, 
            currentPage: page, 
            filters: {
                productType: productType || null,
                category: category || null,
                priceRange: minPrice || maxPrice ? { min: minPrice, max: maxPrice } : null,
                tags: parsedTags || null,
                onSale: sale === 'true',
                sortBy: sortBy || 'createdAt',
                sortOrder: req.query.sortOrder || 'desc'
            }
        });
    }

    //* Get Products Categories Sorted & with category product count
    static getProductCategories = async (req: Request, res: Response) => {
        // Use aggregation to group by category and count products
        const categories = await Product.aggregate([
            // 1: Only include active products
            {
                $match: { isActive: true }
            },
            // 2: Group by category and count
            {
                $group: {
                    _id: '$category',
                    productCount: { $sum: 1 },
                }
            },
            // 3: Use Project to rename _id to category
            {
                $project: {
                    _id: 0,
                    category: '$_id',
                    productCount: 1,
                }
            },
            // Stage 4: Sort by product count (most products first)
            {
                $sort: { productCount: -1 }
            }
        ]);

        // If no categories found
        if (!categories || categories.length === 0) {
            throw new NotFoundError("No se encontraron categorías")
        }

        // Calculate total products across all categories
        const totalProducts = categories.reduce((sum, cat) => sum + cat.productCount, 0);

        res.status(200).json({
            categories,
            totalCategories: categories.length,
            totalProducts
        });
    }

    //* Get a single Category and it's products by category name | Pagination
    static getProductCategoryByName = async (req: Request, res: Response) => {
        const { categoryName } = req.params; 

        // Get the page and perPage query parameters (default values if not provided)
        const page = parseInt(req.query.page as string) || 1;
        const perPage = parseInt(req.query.perPage as string) || 10;

        // Calculate skip and limit for pagination
        const skip = (page - 1) * perPage;
        const limit = perPage;

        // Get the total number of unconfirmed products
        // This search is indexed
        const totalProducts = await Product.countDocuments({ isActive: true, category: categoryName });

        // Calculate the total number of pages
        const totalPages = Math.ceil(totalProducts / perPage);
        
        // This search is indexed
        const products = await Product.find({ isActive: true, category: categoryName })
            .skip(skip)
            .limit(limit)
            .sort({ name: 1 })
            .lean(); 

        res.status(200).json({
            products, 
            totalProducts, 
            totalPages, 
            perPage,
            currentPage: page, 
            categoryName
        })
    }

    //* Get Product by ID
    static getProductById = async (req: Request, res: Response) => {
        const { productId } = req.params; 

        const product = await Product.findById(productId); 
        if (!product) {
            throw new NotFoundError("Producto no encontrado");
        }

        // Find related products based on category and tags
        const relatedProducts = await Product.find({
            _id: { $ne: productId }, // Exclude current product
            isActive: true, // Only active products
            $or: [
                { category: product.category }, // Same category
                { productType: product.productType }, // Same type (ring, necklace, etc.)
                { tags: { $in: product.tags } } // Shared tags
            ]
        })
        .select('name description basePrice discount images productType category tags') // Select only needed fields
        .limit(6) // Limit to 6 related products
        .lean(); // Return plain JS objects for better performance

        //! Calculate finalPrice for related products
        const relatedProductsWithPrices = enrichProducts(relatedProducts); 

        // Calculate finalPrice and available stock for main product
        const productData = product.toObject();
        const hasActiveDiscount = product.isDiscountValid();
        
        res.status(200).json({
            ...productData,
            finalPrice: product.finalPrice,
            hasActiveDiscount,
            savings: hasActiveDiscount ? product.basePrice - product.finalPrice : 0,
            availableStock: product.stock - product.reserved,
            relatedProducts: relatedProductsWithPrices
        });
    }

    //TODO Check Stock Availability | before checkout to validate cart
    // static validateStock = async (req: Request, res: Response) => {

    //     res.status(200).json({
    //         message: "Stock Validated"
    //     })
    // }

    //^ Create new Product
    static createProduct = async (req: Request, res: Response) => {
        const {
            name, 
            description, 
            basePrice, 
            productType, 
            images, 
            stock, 
            category, 
            tags, 
            isActive, 
            attributes
        } = req.body; 

        // Create Product with .build() method
        const product = Product.build({
            name, 
            description, 
            basePrice, 
            productType, 
            images, 
            stock, 
            category, 
            tags, 
            isActive, 
            attributes
        })

        // Save to DB
        await product.save(); 

        res.status(201).json({ 
            message: "Producto Registrado Correctamente.", 
            product
        })                                                      
    }

    //? Update Product | Without setting discounts
    static updateProduct = async (req: Request, res: Response) => {
        const { productId } = req.params;

        const product = await Product.findById(productId);
        if (!product) {
            throw new NotFoundError("Producto no Encontrado");
        }

        const allowedUpdates = [
            "name",
            "description",
            "basePrice",
            "productType",
            "images",
            "stock",
            "category",
            "tags",
            "isActive",
        ];

        const updates: Record<string, any> = {};

        for (const field of allowedUpdates) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        const effectiveProductType =
            req.body.productType ?? product.productType;

        const allowedFields =
            AllowedProductAttributes[effectiveProductType];

        //! If attributes are sent, rebuild them safely
        if (req.body.attributes) {
            const newAttributes: Record<string, any> = {};

            for (const field of allowedFields) {
                if (req.body.attributes[field] !== undefined) {
                    newAttributes[field] =
                        req.body.attributes[field];
                }
            }

            updates.attributes = newAttributes;
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!updatedProduct) {
            throw new NotFoundError("Producto no Encontrado");
        }

        res.status(200).json({
            message: "Producto Actualizado Correctamente.",
            product: updatedProduct,
        });
    };


    //? Set product Discount
    static setProductDiscount = async (req: Request, res: Response) => {
        const { productId } = req.params; 

        // Flexible destructuring
        const { percentage, isActive, startDate, endDate } = req.body;

        // Update product & save to DB
        const product = await Product.findByIdAndUpdate(
            productId,
            { 
                discount: {
                    percentage, 
                    isActive, 
                    startDate: startDate || undefined, 
                    endDate: endDate || undefined, 
                }
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!product) {
            throw new NotFoundError("Producto no Encontrado");
        }

        res.status(200).json({ 
            message: "Descuento asignado exitosamente", 
            product
        })
    }

    //? Update Product Status (isActive: true || false)
    static updateProductStatus = async (req: Request, res: Response) => {
        const { productId } = req.params; 
        const { isActive } = req.body; 

        const product = await Product.findByIdAndUpdate(
            productId,
            { isActive },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!product) {
            throw new NotFoundError("Producto no Encontrado");
        }

        res.status(200).json({ 
            message: `Producto ${isActive ? "Activo" : "Inactivo"}`, 
            product
        })
    }

    //? Update Product Stock
    static updateProductStock = async (req: Request, res: Response) => {
        const { productId } = req.params; 
        const { stock } = req.body; 

        const product = await Product.findByIdAndUpdate(
            productId,
            { 
                stock
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!product) {
            throw new NotFoundError("Producto no Encontrado");
        }

        res.status(200).json({ 
            message: "Stock Actualizado Exitosamente", 
            product
        })
    }

    //! Delete Product | PERMANENT
    static deleteProduct = async (req: Request, res: Response) => {
        const { productId } = req.params; 

        const deletedProduct = await Product.findByIdAndDelete(productId)
        if(!deletedProduct) {
            throw new NotFoundError("Producto no Encontrado")
        }

        res.status(200).json({ 
            message: "Producto Eliminado Correctamente"
        })
    }
}