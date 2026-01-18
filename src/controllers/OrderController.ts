import type { Request, Response } from "express";
import Order, { Item, OrderStatus } from "../models/Order";
import { NotFoundError } from "../errors/not-found";
import Product from "../models/Product";
import { RequestConflictError } from "../errors/conflict-error";
import Payment, { PaymentStatus } from "../models/Payment";
import { generateOrderNumber } from "../utils/order";
import { formatLean } from "../utils/json";
import { OrderStatusEmail } from "../emails/status";
import mongoose from "mongoose";

export class OrderController {
    //* Retrieve current auth user registered orders
    static getAuthUserOrders = async (req: Request, res: Response) => {
        // Get user id | IMPORTANT use _id instead of id since this is not formatted
        const userId = req.user._id; 

        // Get the page and perPage query parameters (default values if not provided)
        const page = parseInt(req.query.page as string) || 1;
        const perPage = parseInt(req.query.perPage as string) || 10;

        // Destructure possible search queries
        const { status } = req.query; 

        //! CRITICAl - Add userId to filters so that only current auth user orders are returned
        // Search Filters
        const filters: any = {
            "customer.userId": userId
        };

        //* Filter by Order status
        if (status) {
            const orderStatusMap: Record<string, string> = {
                Pending: 'Esperando Pago',
                Processing: 'Procesando',
                Sent: 'En Transito',
                Delivered: 'Entregado',
                Cancelled: 'Cancelado',
                Expired: 'Orden Expirada',
            };

        const normalizedStatus = orderStatusMap[String(status)];

            if (normalizedStatus) {
                filters.status = normalizedStatus;
            }
        }


        // Calculate skip and limit for pagination
        const skip = (page - 1) * perPage;
        const limit = perPage;

        //? Sorting logic
        const sortBy = req.query.sortBy as string 
        const sortOrder: 1 | -1 = req.query.sortOrder === "asc" ? 1 : -1;

        let sort : Record<string, 1 | -1> = { createdAt: -1 } // default sorting criteria

        //? Sorting options
        if (sortBy === "date") { // this is probably redundant
            sort = { createdAt: sortOrder }; 
        }

        // Get the total number of orders
        const totalOrders = await Order.countDocuments(filters);

        //* Sort orders by createdAt and status
        // Fetch the orders for the current page with pagination
        const orders = await Order.find(filters) 
            .skip(skip)
            .limit(limit)
            .sort(sort) // Sort by createdAt in descending product
            .lean() // Optimized JS object

        // Calculate the total number of pages
        const totalPages = Math.ceil(totalOrders / perPage);

        res.status(200).json({ 
            orders: orders.map(formatLean), 
            totalOrders,
            totalPages, 
            perPage, 
            currentPage: page, 
            filters: {
                status: status || null,
                sortBy: sortBy || 'createdAt',
                sortOrder
            }
        });
    }

    //* Get order by id (only for current authenticated user registered orders) *//
    static getAuthUserOrderById = async (req: Request, res: Response) => {
        const userId = req.user._id; 

        const { orderId } = req.params; 

        const order = await Order.findOne({ _id: orderId, "customer.userId": userId })
            .populate("paymentId") // Include payment details
            .lean(); 
        if(!order) {
            throw new NotFoundError("Orden no Encontrada")
        }

        res.status(200).json(formatLean(order));
    }

    //* Public order details, this can be seen by anyone that has the trackingNumber *// 
    static getOrderByNumber = async (req: Request, res: Response) => {
        const { trackingNumber } = req.params; 

        const order = await Order.findOne({ trackingNumber }).lean(); 
        if(!order) {
            throw new NotFoundError("Orden no Encontrada")
        }

        // Sanitize order attributes to be returned 
        // Exclude payment details & other sensitive info
        
        const publicOrder = {
            trackingNumber: order.trackingNumber, 
            status: order.status, 
            createdAt: order.createdAt, 
            deliveredAt: order.deliveredAt, 
            items: order.items.map((item: Item) => ({
                productName: item.productName, 
                productImage: item.productImage, 
                quantity: item.quantity, 
                finalPrice: item.finalPrice, 
                discount: item.discount, 
                itemTotal: item.itemTotal, 
                basePrice: item.basePrice, 
                productId: item.productId
            })),

            totals: {
                subtotal: order.subtotal, 
                shipping: order.shipping, 
                total: order.total, 
            }, 

            shippingAddress: {
                country: order.shippingAddress.country , 
                region: order.shippingAddress.region, 
                city: order.shippingAddress.city, 
                cityArea: order.shippingAddress.cityArea, 
            },

            shippingMethod: order.shippingMethod, 

            customer: {
                name: order.customer.name, 
                surname: order.customer.surname
            }
        }

        res.status(200).json(publicOrder);
    }

    //* ADMIN | Retrieve all registered Orders
    static getOrdersAdmin = async (req: Request, res: Response) => {
        // Get the page and perPage query parameters (default values if not provided)
        const page = parseInt(req.query.page as string) || 1;
        const perPage = parseInt(req.query.perPage as string) || 10;

        // Destructure possible search queries
        const { status, email, startDate, endDate } = req.query; 

        //! CRITICAl - Add userId to filters so that only current auth user orders are returned
        // Search Filters
        const filters: any = { };

        //* Filter by Order status
        if (status) {
            const orderStatusMap: Record<string, string> = {
                Pending: 'Esperando Pago',
                Processing: 'Procesando',
                Sent: 'En Transito',
                Delivered: 'Entregado',
                Cancelled: 'Cancelado',
                Expired: 'Orden Expirada',
            };

            const normalizedStatus = orderStatusMap[String(status)];

            if (normalizedStatus) {
                filters.status = normalizedStatus;
            }
        }

        //* Filter by Order customer email
        if (email) {
            // Allow email partial case-insensitive search
            filters["customer.email"] = {
                $regex: `^${email}`, 
                $options: "i", // case-insensite
            } 
        }

        //* Filter by Date Range (createdAt)
        if (startDate || endDate) {
            filters.createdAt = {};

            if (startDate) {
                filters.createdAt.$gte = new Date(startDate as string);
            }

            if (endDate) {
                filters.createdAt.$lte = new Date(endDate as string);
            }
        }

        // Calculate skip and limit for pagination
        const skip = (page - 1) * perPage;
        const limit = perPage;

        //? Sorting logic
        const sortBy = req.query.sortBy as string 
        const sortOrder: 1 | -1 = req.query.sortOrder === "asc" ? 1 : -1;

        let sort : Record<string, 1 | -1> = { createdAt: -1 } // default sorting criteria

        //? Sorting options
        if (sortBy === "date") { // this is probably redundant
            sort = { createdAt: sortOrder }; 
        }

        // Get the total number of orders
        const totalOrders = await Order.countDocuments(filters);

        //* Sort orders by createdAt and status
        // Fetch the orders for the current page with pagination
        const orders = await Order.find(filters) 
            .skip(skip)
            .limit(limit)
            .sort(sort) // Sort by createdAt in descending product
            .lean() // Optimized JS object

        // Calculate the total number of pages
        const totalPages = Math.ceil(totalOrders / perPage);

        res.status(200).json({ 
            orders: orders.map(formatLean), 
            totalOrders,
            totalPages, 
            perPage, 
            currentPage: page, 
            filters: {
                status: status || null,
                email: email || null, 
                startDate: startDate || null, 
                endDate: endDate || null, 
                sortBy: sortBy || 'createdAt',
                sortOrder
            }
        });
    }

    //* ADMIN - Get order by ID | All orders allowed
    static getOrderByIdAdmin = async (req: Request, res: Response) => {
        const { orderId } = req.params; 

        const order = await Order.findById(orderId)
            .populate("paymentId")
            .lean(); 
        if(!order) {
            throw new NotFoundError("Orden no Encontrada")
        }

        res.status(200).json(formatLean(order));
    }

    //^ POST - Create Order
    static createOrder = async (req: Request, res: Response) => {
        // Destructure request body elements
        const { items } = req.body; 

        //! Validaate all products exists and are active

        // Extrack productId's from cart items 
        const productIds = items.map(item => item.productId); 

        //& Start transaction to ensure all db operations were successfully processed
        const session = await mongoose.startSession(); 
        session.startTransaction(); 

        try {
            // Fetch only active products matching provided id's
            const products = await Product.find({
                _id: { $in: productIds }, 
                isActive: true 
            }, null, { session })
    
            if (products.length !== items.length) {
                throw new RequestConflictError("Algunos productos no estan disponibles")
            }
    
            //! Validate stock availability for each product
            const stockValidation = items.map(cartItem => {
                const product = products.find(p => p._id.toString() === cartItem.productId);
    
                // Calculate availableStock considering reserved units
                const availableStock = product.stock - product.reserved;
                
                if (availableStock < cartItem.quantity) {
                    return {
                        productId: product._id,
                        productName: product.name,
                        requested: cartItem.quantity,
                        available: availableStock,
                        isAvailable: false
                    };
                }
                
                return { productId: product._id, isAvailable: true };
            });
    
            const unavailableItems = stockValidation.filter(item => !item.isAvailable);
            
            if (unavailableItems.length > 0) {
                throw new RequestConflictError("Stock insuficiente para algunos productos")
            }
        
            //! Build normalized order items array
    
            // Create order items using current product data to prevent client side manipulation
            const orderItems = items.map(cartItem => {
                const product = products.find(p => p._id.toString() === cartItem.productId);
                const isDiscountValid = product.isDiscountValid();
                const finalPrice = isDiscountValid 
                    ? Math.round(product.basePrice * (1 - product.discount.percentage / 100))
                    : product.basePrice;
                
                return {
                    productId: product._id,
                    productName: product.name,
                    productImage: product.images[0],
                    basePrice: product.basePrice,
                    discount: isDiscountValid ? product.discount.percentage : 0,
                    finalPrice,
                    quantity: cartItem.quantity,
                    itemTotal: finalPrice * cartItem.quantity
                };
            });
    
            // Calculate totals
            const subtotal = orderItems.reduce((sum, item) => sum + item.itemTotal, 0);
            const total = subtotal + 0; // shipping value yet to be added
    
            // Generate unique order number
            const trackingNumber = await generateOrderNumber(); 
    
            // Create order with 20-minute expiration
            const expirationTime = new Date(Date.now() + 20 * 60000); // 20 minutes
    
            const order = await Order.build({
                trackingNumber,
                items: orderItems,
                subtotal,
                total,
                stockReservedAt: new Date(),
                stockReservationExpiresAt: expirationTime
            });
            
            await order.save({ session });
    
            //! Atomically reserve stock for each product
            for (const item of orderItems) {
                const result = await Product.updateOne(
                    {
                        _id: item.productId,
                        $expr: {
                            $gte: [
                                { $subtract: ["$stock", "$reserved"] },
                                item.quantity
                            ]
                        }
                    },
                    { $inc: { reserved: item.quantity } },
                    { session }
                );

                if (result.modifiedCount === 0) {
                    throw new RequestConflictError("Stock insuficiente");
                }
            }

            await session.commitTransaction(); 
    
            res.status(201).json({
                message: "Orden registrada Correctamente. Esperando pago.",
                order
                // This lets frontend use orderId of response to next
                // create the payment preference. 
            });
        } catch (error) {
                        console.log(error)
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    //? PATCH - Set/Update order checkout information before payment
    static setOrderCheckoutInfo = async (req: Request, res: Response) => {
        // Get user ID if logged in (undefined for guest checkout)
        const userId = req.user?.id; 

        // Destructure order ID from query params
        const { orderId } = req.params; 

        // Destructure request body elements
        const { customer, shippingAddress, shipping, shippingMethod, saveData } = req.body; 

        const order = await Order.findById(orderId); 

        if (!order) {
            throw new NotFoundError("Orden no encontrada");
        }

        if (order.status !== OrderStatus.Pending) {
            throw new RequestConflictError("La orden ya no puede ser modificada");
        }

        if (order.stockReservationExpiresAt < new Date()) {
            throw new RequestConflictError("La orden ha expirado");
        }

        // attach checkout info
        order.customer = {
            ...customer,
            userId: userId || null,
            isGuest: !userId,
        };

        order.shippingAddress = shippingAddress;
        order.shipping = shipping;
        order.shippingMethod = shippingMethod; 
        order.total = order.subtotal + shipping;
        order.saveData = saveData && !userId;

        await order.save(); 

        res.status(200).json({
            message: "Orden registrada Correctamente. Esperando pago.",
            order
        });
    }

    //? USER - Cancel order before payment, do not send notification email, only allowed if "Esperando Pago"
    // Release order products stock
    static cancelOrder = async (req: Request, res: Response) => {
        // Destructure orderId from query params
        const { orderId } = req.params; 

        // Get userId from request
        const userId = req.user._id;

        //& Start transaction to ensure all db operations were successfully processed
        const session = await mongoose.startSession(); 
        session.startTransaction(); 

        try {
            const order = await Order.findOne({ _id: orderId, "customer.userId": userId }, null, { session }); 
            if(!order) {
                throw new NotFoundError("Orden no Encontrada")
            }
    
            // Only allow pending orders to be cancelled
            if(order.status !== OrderStatus.Pending) {
                throw new RequestConflictError("No puedes cancelar una Orden pagada. Contacta al administrador.")
            }
    
            // Cancel order
            order.status = OrderStatus.Cancelled; 
            await order.save({ session }); 
    
            //! Release stock for each product
            for (const item of order.items) {
                await Product.updateOne(
                    { _id: item.productId },
                    { $inc: { reserved: -item.quantity } },
                    { session }
                );
            }

            // Update Payment status to Cancelled
            if (order.paymentId) {
                await Payment.updateOne(
                    { _id: order.paymentId },
                    { status: PaymentStatus.Cancelled },
                    { session }
                );
            }

            // As of now a notification email will not be send since order wasn't payed yet...
            // await OrderStatusEmail.Cancelled.send(user, order); 
    
            await session.commitTransaction(); 

            res.status(200).json({
                message: "Orden cancelada exitosamente",
            }); 
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession(); 
        }
    }

    // ! CRITICAL ENDPOINT
    //? ADMIN - Update Order status & send corresponding notification email to user
    // If status is changed to "Cancelled", then release stock
    // Changing status to "Pending" and "Expired" should not be allowed
    // Flow of statuses is Processing → Sent → Delivered and delivered along with sent cannot be cancelled
    static updateOrderStatus = async (req: Request, res: Response) => {
        // Destructure orderId from query params
        const { orderId } = req.params; 

        // Get the status from request body (alredy validated in router)
        const { status, deliveredAt } = req.body;

        const normalizedStatus = OrderStatus[status as keyof typeof OrderStatus];

       // Prevent setting to Pending or Expired manually
        if (normalizedStatus === OrderStatus.Pending || normalizedStatus === OrderStatus.Expired) {
            throw new RequestConflictError("No se puede cambiar el estado manualmente a 'Esperando Pago' o 'Orden Expirada'")
        }

        
        //& Start transaction to ensure all db operations were successfully processed
        const session = await mongoose.startSession(); 
        session.startTransaction(); 
        
        try {
            // Find order
            const order = await Order.findById(orderId).session(session); 
            if(!order) {
                throw new NotFoundError("Orden no Encontrada")
            }
    
            // Validate status transitions
            // Pending to Processing transition is managed by payment approved (payment.ts handleApprovedPayment)
            const currentStatus = order.status;
            const validTransitions: Record<string, string[]> = {
                [OrderStatus.Pending]: [OrderStatus.Cancelled],
                [OrderStatus.Processing]: [OrderStatus.Sent, OrderStatus.Cancelled],
                [OrderStatus.Sent]: [OrderStatus.Delivered, OrderStatus.Cancelled],
                [OrderStatus.Delivered]: [], // Final state
                [OrderStatus.Cancelled]: [], // Final state
                [OrderStatus.Expired]: [] // Final state
            };
    
            if (!validTransitions[currentStatus].includes(normalizedStatus)) {
                throw new RequestConflictError(`No se puede cambiar de '${currentStatus}' a '${normalizedStatus}'`)
            }
    
            if (currentStatus === normalizedStatus) {
                throw new RequestConflictError("La orden ya tiene este estado");
            }
            
            // Release reserved stock if cancelled (only release if stock not yet sold)
            if (normalizedStatus === OrderStatus.Cancelled) {
                if (currentStatus === OrderStatus.Pending) {
                    for (const item of order.items) {
                        await Product.updateOne(
                            { _id: item.productId, reserved: { $gte: item.quantity } },
                            { $inc: { reserved: -item.quantity } }, 
                            { session }
                        );
                    }
                } else {
                    // If already processing/sent, stock was already sold, then add back stock
                    if (currentStatus === OrderStatus.Processing || currentStatus === OrderStatus.Sent) {
                        for (const item of order.items) {
                            await Product.updateOne(
                                { _id: item.productId },
                                { $inc: { stock: item.quantity } },
                                { session }
                            );
                        }
                    }
                } 
    
            }
    
            // This is managed in payment approved operation
            // //! Convert reserved to sold stock when processing (payment confirmed)
            // if (normalizedStatus === OrderStatus.Processing && currentStatus === OrderStatus.Pending) {
            //     for (const item of order.items) {
            //         await Product.updateOne(
            //             { 
            //                 _id: item.productId ,
            //                 reserved: { $gte: item.quantity },
            //                 stock: { $gte: item.quantity }
            //             },
            //             {
            //                 $inc: {
            //                     stock: -item.quantity,
            //                     reserved: -item.quantity
            //                 }
            //             }, 
            //             { session }
            //         );
            //     }
            // }
        
            // Set deliveredAt date if marking as delivered
            if (normalizedStatus === OrderStatus.Delivered) {
                order.deliveredAt = deliveredAt ? new Date(deliveredAt) : new Date();
            }
    
            // Update order status
            order.status = normalizedStatus as OrderStatus;
            await order.save({ session });
    
            //! CRITICAL: EMAIL SENDING LOGIC DEPENDING ON THE STATUSES
            try {
                switch(normalizedStatus) {
                    case OrderStatus.Sent:
                        await OrderStatusEmail.Sent.send(order);
                        break;
                    case OrderStatus.Delivered:
                        await OrderStatusEmail.Delivered.send(order);
                        break;
                    case OrderStatus.Cancelled:
                        await OrderStatusEmail.Cancelled.send(order);
                        break;
                }
            } catch (emailError) {
                // Log email error but don't fail the request
                console.error("Error sending status update email:", emailError);
                // Email failed but order status was updated successfully
            }
    
            await session.commitTransaction(); 
    
            res.status(200).json({
                message: "Estado de la Orden actualizado correctamente",
                order: formatLean(order.toObject())
            });
        } catch (error) {
            await session.abortTransaction(); 
            throw error; 
        } finally {
            session.endSession();
        }

    }

    //! ADMIN - PERMANENT DELETE
    static deleteOrder = async (req: Request, res: Response) => {
        const { orderId } = req.params;

        const order = await Order.findById(orderId);
        if (!order) {
            throw new NotFoundError("Orden no Encontrada");
        }

        // Start transaction to ensure that all db operations were completed
        const session = await mongoose.startSession(); 
        session.startTransaction(); 

        try {
            // Determine stock action based on order status
            if (order.status === OrderStatus.Pending) {
                // Release reserved stock (not yet sold)
                for (const item of order.items) {
                    await Product.updateOne(
                        { _id: item.productId },
                        { $inc: { reserved: -item.quantity } }, 
                        { session }
                    );
                }
            } else if (order.status === OrderStatus.Processing || order.status === OrderStatus.Sent) {
                // Stock was sold - need to add it back to inventory
                for (const item of order.items) {
                    await Product.updateOne(
                        { _id: item.productId },
                        { $inc: { stock: item.quantity } }, 
                        { session }
                    );
                }
            }
            // Cancelled/Expired/Delivered: No stock changes needed
            // Cancelled/Expired: Stock already released
            // Delivered: Keep stock as sold (completed transaction)

            //! Delete Payment info of the order if it exists
            if (order.paymentId) {
                await Payment.deleteOne(
                    { _id: order.paymentId },
                    { session }
                );
            }
    
            await order.deleteOne({ session });

            // Once every operation has successfully processed, then approve transaction
            await session.commitTransaction(); 

            res.status(200).json({
                message: "Orden eliminada correctamente",
            });
        } catch (error) {
            // If error close transaction
            await session.abortTransaction(); 
            throw error; 
        } finally {
            // close session
            session.endSession(); 
        }
    }
}