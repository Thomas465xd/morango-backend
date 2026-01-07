import type { Request, Response } from "express";
import { NotFoundError } from "../errors/not-found";
import Order, { OrderStatus } from "../models/Order";
import { RequestConflictError } from "../errors/conflict-error";
import { paymentClient, preferenceClient } from "../config/mercadopago";
import Payment, { PaymentStatus } from "../models/Payment";
import { handleApprovedPayment, handleFailedPayment, refundPayment } from "../utils/payment";
import { ForbiddenError } from "../errors/forbidden-error";
import { ResourceExpiredError } from "../errors/resource-expired-error";
import { formatLean } from "../utils/json";
import Product from "../models/Product";
import { PaymentEmails } from "../emails/payment";

export class PaymentController {
    //* ADMIN - get all payments
    // This will be used to have a history of all payments ever done
    // The orderId of the payment will serve to see the associated order in the frontend
    // by going to dedicated order page
    static getPaymentsAdmin = async (req: Request, res: Response) => {
        // Get the page and perPage query parameters (default values if not provided)
        const page = parseInt(req.query.page as string) || 1;
        const perPage = parseInt(req.query.perPage as string) || 10;

        // Destructure possible search queries
        // Search query param could be either email or order number
        const { status, search, startDate, endDate } = req.query; 

        const filters : any = { };

        //* Filter by Order status
        if (status) {
            filters.status = status; 
        }

        //* Search by order
        if (search) {
            const orders = await Order.find({
                $or: [
                    { trackingNumber: { $regex: search, $options: 'i' } },
                    { 'customer.email': { $regex: search, $options: 'i' } }
                ]
            }).select('_id');

            const orderIds = orders.map(o => o._id);
            filters.orderId = { $in: orderIds };
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
        if (sortBy === "date") {
            sort = { createdAt: sortOrder }; 
        }

        // Get the total number of payments
        const totalPayments = await Payment.countDocuments(filters);

        //* Sort payments by createdAt and status
        // Fetch the payments for the current page with pagination
        const payments = await Payment.find(filters) 
            .populate({
                path: 'orderId',
                select: 'trackingNumber customer.email customer.name customer.surname total status'
            })
            .skip(skip)
            .limit(limit)
            .sort(sort) // Sort by createdAt in descending product
            .lean() // Optimized JS object

        // Calculate the total number of pages
        const totalPages = Math.ceil(totalPayments / perPage);

        res.status(200).json({ 
            payments: payments.map(formatLean),
            totalPayments,
            totalPages, 
            perPage, 
            currentPage: page, 
            filters: {
                status: status || null,
                search: search || null,
                startDate: startDate || null, 
                endDate: endDate || null, 
                sortBy: sortBy || 'createdAt',
                sortOrder
            } 
        })
    }

    //* ADMIN - get payment details 
    static getPaymentByIdAdmin = async (req: Request, res: Response) => {
        const { paymentId } = req.params; 

        const payment = await Payment.findById(paymentId)
            .lean(); 
        if(!payment) {
            throw new NotFoundError("Pago no Encontrado")
        }

        const order = await Order.findById(payment.orderId )
            .lean(); 

        if(!order) {
            throw new NotFoundError("Orden no Encontrada"); 
        }

        res.status(200).json({
            orderStatus: order.status,
            trackingNumber: order.trackingNumber,
            payment: formatLean(payment),
        });
    }

    //* Auth user - get payment details 
    static getPaymentById = async (req: Request, res: Response) => {
        const { paymentId } = req.params; 
        const userId = req.user._id; 

        const payment = await Payment.findById(paymentId)
            .lean(); 
        if(!payment) {
            throw new NotFoundError("Pago no Encontrado")
        }

        const order = await Order.findById(payment.orderId)
            .lean(); 

        if(!order) {
            throw new NotFoundError("Orden no Encontrada"); 
        }

        // Check if user owns this order
        if (order.customer.userId.toString() !== userId.toString()) {
            throw new ForbiddenError("No tienes permiso para ver este pago")
        }

        res.status(200).json({
            orderStatus: order.status,
            trackingNumber: order.trackingNumber,
            payment: formatLean(payment),
        });
    }

    //* Get order payment status for order 
    // Used for polling on frontend
    // Returns payment info and order status
    static getOrderPaymentStatus = async (req: Request, res: Response) => {
        const { orderId } = req.params; 

        const order = await Order.findById(orderId).lean(); 
        if(!order) { 
            throw new NotFoundError("Orden no Encontrada")
        }

        const payment = await Payment.findOne({ orderId: order._id }).lean();
        if(!payment) {
            throw new NotFoundError("Referencia de pago no Encontrada")
        }

        res.status(200).json({ 
            orderStatus: order.status, 
            paymentStatus: payment.status, 
            mpStatus: payment.mpStatus, 
            paymentMethod: payment.paymentMethod, 
            amount: payment.amount 
        })
    }

    //^ Create Payment Preference
    static createPreference = async (req: Request, res: Response) => {
        const { orderId } = req.body; 

        // Find order
        const order = await Order.findById(orderId); 
        if(!order) {
            throw new NotFoundError("Orden no Encontrada")
        }

        // Verify order is in Pending status, otherwise throw Request Conflict (order expired)
        if(order.status !== OrderStatus.Pending) {
            throw new RequestConflictError("Orden Expirada")
        }

        // Build items for MP
        const items = order.items.map(item => ({
            id: item.productId.toString(),
            title: item.productName,
            description: `${item.productName}`,
            picture_url: item.productImage,
            category_id: "jewelry",
            quantity: item.quantity,
            unit_price: item.finalPrice,
            currency_id: "CLP"
        }));

        // Create Preference
        const preference = await preferenceClient.create({
            body: {
                items,
                payer: {
                    name: order.customer.name,
                    surname: order.customer.surname,
                    email: order.customer.email,
                    phone: {
                        number: order.customer.phone
                    }
                },
                back_urls: {
                    success: `${process.env.FRONTEND_URL}/payment/success`,
                    failure: `${process.env.FRONTEND_URL}/payment/failure`,
                    pending: `${process.env.FRONTEND_URL}/payment/pending`
                },
                auto_return: "approved",
                notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
                external_reference: order.trackingNumber,
                statement_descriptor: "Morango Joyas",
                expires: true,
                expiration_date_from: new Date().toISOString(),
                expiration_date_to: order.stockReservationExpiresAt.toISOString()
            }, 
            requestOptions: {
                idempotencyKey: `create-preference-${order.id}`
            }
        });

        // console.log(preference)

        // Create or update payment record
        let payment = await Payment.findOne({ orderId: order._id })

        if(payment) {
            // if payment found, update it
            payment.mpPreferenceId = preference.id; 
            await payment.save(); 
        } else {
            // else create new payment & link it to order
            payment = await Payment.create({
                orderId: order.id, 
                provider: "mercadopago", 
                mpPreferenceId: preference.id, 
                amount: order.total, 
                currency: "CLP", 
                status: PaymentStatus.Pending
            })
            
            // Link payment to order
            order.paymentId = payment.id;
            
            await order.save()
        }

        res.status(201).json({ 
            message: "Payment Preference Created Successfully", 
            orderId, 
            paymentId: payment.id,
            preferenceId: preference.id, 
            initPoint: preference.init_point, 
            sandboxInitPoint: preference.sandbox_init_point
        })
    }

    //^ Mercado Pago Webhook
    static mpWebhook = async (req: Request, res: Response) => {
        // MP sends notifications for various events
        const { type, data } = req.body; 

        console.log("Webhook received", { type, data })

        // We only care about payment notifications
        if(type !== "payment") {
            res.status(200).send("OK")
            return
        }

        // Get Payment ID from notification
        const paymentId = data.id; 

        // Fetch payment details from MP
        const mpPayment = await paymentClient.get({ id: paymentId }); 

        console.log('MP Payment details:', mpPayment);

        // Find payment in our database by preference ID or external reference 
        const externalReference = mpPayment.external_reference; 
        if (!externalReference) {
            res.status(200).send("OK");
            return
        }

        const order = await Order.findOne({ trackingNumber: externalReference }); 

        // Check if order exists
        if(!order) {
            throw new NotFoundError(`Order "${externalReference}" not Found`)
        }

        // Find or create payment record
        let payment = await Payment.findOne({ orderId: order.id }); 

        if(!payment) {
            throw new NotFoundError(`Payment not found for ${order.id}`)
        }

        // Idempotency: do nothing if final state already reached
        if (payment.status === PaymentStatus.Approved || payment.status === PaymentStatus.Refunded) {
            res.status(200).send("OK")
            return
        }

        // Update payment with MP data
        payment.mpPaymentId = mpPayment.id.toString();
        payment.mpStatus = mpPayment.status!;
        payment.paymentMethod = mpPayment.payment_method_id || 'unknown';
        payment.metadata = mpPayment as any;
        
        // Map MP status to our status
        const statusMap: Record<string, PaymentStatus> = {
            'approved': PaymentStatus.Approved,
            'rejected': PaymentStatus.Rejected,
            'cancelled': PaymentStatus.Cancelled,
            'in_process': PaymentStatus.Pending,
            'pending': PaymentStatus.Pending
        };
        
        payment.status = statusMap[mpPayment.status!] || PaymentStatus.Pending;
        await payment.save();
        
        // Handle payment outcome
        if (mpPayment.status === 'approved') {

            // Order already expired → refund path
            if (order.status === OrderStatus.Expired) {
                console.warn(
                    `Late approved payment for expired order ${order.trackingNumber}`
                );

                // Process refund through MP API
                const refund = await refundPayment(payment.mpPaymentId);

                // mark order/payment
                payment.status = PaymentStatus.Refunded;
                payment.mpStatus = "refunded"; 
                payment.metadata = {
                    ...payment.metadata,
                    refund
                };
                await payment.save();

                //* Send refund notification email
                await PaymentEmails.Refunded.send(order, payment); 

                throw new ResourceExpiredError("Pago Reembolsado (orden expirada).")
            }

            // ✅ Normal flow
            await handleApprovedPayment(order, payment);
        } else if (mpPayment.status === 'rejected' || mpPayment.status === 'cancelled') { 
            await handleFailedPayment(order, payment); 
        }

        res.status(200).send("OK")
    }

    //^ Retry failed payment
    static retryPayment = async (req: Request, res: Response) => {
        const { orderId } = req.params; 
        const { email } = req.body; 
        
        // Get associated order
        const order = await Order.findOne({ _id: orderId, "customer.email": email }); 
        if(!order) {
            throw new NotFoundError("Orden no Encontrada")
        }

        // Can only retry if order is still pending and not expired
        if (order.status !== OrderStatus.Pending) {
            throw new RequestConflictError("Orden Expirada")
        }

        // Check if order expired | not redundant
        if (new Date() > order.stockReservationExpiresAt) {
            throw new ResourceExpiredError("Orden Expirada")
        }

        // Check if order has associated payment record 
        const paymentRecord = await Payment.findOne({ orderId: order._id });

        if (!paymentRecord) {
            throw new NotFoundError("Pago no Encontrado");
        }

        // Create new preference (same as createPreference logic)
        const items = order.items.map(item => ({
            id: item.productId.toString(),
            title: item.productName,
            description: `${item.productName}`,
            picture_url: item.productImage,
            category_id: "jewelry",
            quantity: item.quantity,
            unit_price: item.finalPrice,
            currency_id: "CLP"
        }));

        const preference = await preferenceClient.create({
            body: {
                items,
                payer: {
                    name: order.customer.name,
                    surname: order.customer.surname,
                    email: order.customer.email,
                    phone: {
                        number: order.customer.phone
                    }
                },
                back_urls: {
                    success: `${process.env.FRONTEND_URL}/payment/success`,
                    failure: `${process.env.FRONTEND_URL}/payment/failure`,
                    pending: `${process.env.FRONTEND_URL}/payment/pending`
                },
                auto_return: "approved",
                notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
                external_reference: order.trackingNumber,
                statement_descriptor: "Morango Joyas",
                expires: true,
                expiration_date_from: new Date().toISOString(),
                expiration_date_to: order.stockReservationExpiresAt.toISOString()
            }, 
            requestOptions: {
                idempotencyKey: `create-preference-${order.id}`
            }
        });

        paymentRecord.mpPreferenceId = preference.id!;
        paymentRecord.status = PaymentStatus.Pending;
        await paymentRecord.save();

        res.status(201).json({ 
            message: "Pago Registrado Exitosamente.", 
            orderId,
            paymentId: paymentRecord.id,
            preferenceId: preference.id,
            initPoint: preference.init_point,
            sandboxInitPoint: preference.sandbox_init_point 
        })
    }

    //^ ADMIN Process Refund
    static processRefund = async (req: Request, res: Response) => {
        const { paymentId } = req.params;

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            throw new NotFoundError("Pago no Encontrado")
        }

        // Idempotency
        if (payment.status === PaymentStatus.Refunded) {
            res.status(200).json({ message: "El Pago ya fue reembolsado"})
            return
        }

        // Check if payment was approved
        if (payment.status !== PaymentStatus.Approved) {
            throw new RequestConflictError("Solo se pueden reembolsar pagos aprobados.")
        }

        const order = await Order.findOne({ paymentId: payment.id });

        // Check if order can be refunded | order should be cancelled before being refunded, 
        // since that manages the stock releases and solds.
        if (order.status !== OrderStatus.Cancelled) {
            throw new RequestConflictError("Solo se pueden reembolsar ordenes Canceladas.")
        }

        // Process refund through MP API
        const refund = await refundPayment(payment.mpPaymentId);

        // // Return stock to inventory (if order was Processing or Sent) 
        // deprecated since flow should be admin cancels order, then refund becomes available, it separates logic
        // if (order.status === OrderStatus.Processing || order.status === OrderStatus.Sent) {
        //     for (const item of order.items) {
        //         await Product.updateOne(
        //             { _id: item.productId },
        //             { $inc: { stock: item.quantity } }
        //         );
        //     }
        //}

        // Update payment status
        payment.status = PaymentStatus.Refunded;
        payment.mpStatus = "refunded";
        payment.metadata = {
            ...payment.metadata,
            refund
        };
        await payment.save();

        // Update order status
        // order.status = OrderStatus.Cancelled;
        // await order.save();

        //* Send refund notification email
        await PaymentEmails.Refunded.send(order, payment); 

        res.status(200).json({
            message: "Reembolso procesado exitosamente",
            paymentId: payment.id,
            paymentStatus: payment.status,
            orderNumber: order.trackingNumber,
            refundAmount: payment.amount // for partial refunds refund.amount
        });
    }
}