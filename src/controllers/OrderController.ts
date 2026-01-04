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
}