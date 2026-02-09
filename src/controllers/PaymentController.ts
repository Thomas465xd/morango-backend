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
import { PaymentEmails } from "../emails/payment";
import { createToken } from "../utils/token";
import { NotAuthorizedError } from "../errors/not-authorized";
import { InternalServerError } from "../errors/server-error";

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

        //* Filter by Payment status
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
        } else if (sortBy === "amount") {
            sort = { amount: sortOrder }
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
            .populate({
                path: 'orderId',
                select: 'trackingNumber customer.email customer.name customer.surname total status'
            })
            .lean(); 
        if(!payment) {
            throw new NotFoundError("Pago no Encontrado")
        }

        const order = await Order.findById(payment.orderId )
            .lean(); 

        if(!order) {
            throw new NotFoundError("Orden no Encontrada"); 
        }

        res.status(200).json(formatLean(payment));
    }

    //* Auth user - get payment details 
    static getPaymentById = async (req: Request, res: Response) => {
        const { paymentId } = req.params; 
        const userId = req.user._id; 

        const payment = await Payment.findById(paymentId)
            .populate({
                path: 'orderId',
                select: 'trackingNumber customer.email customer.name customer.surname total status'
            })
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

        res.status(200).json(formatLean(payment));
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

        const payment = await Payment.findOne({ orderId: order._id })
            .sort({ createdAt: -1 }) // in case another payment is tied to this order (this should not happen, so just securing the thing)
            .lean();
        if(!payment) {
            throw new NotFoundError("Referencia de pago no Encontrada")
        }

        res.status(200).json({ 
            orderStatus: order.status, 
            trackingNumber: order.trackingNumber, 
            paymentId: payment._id, 
            retryToken: payment.retryToken, 
            paymentStatus: payment.status, 
            mpStatus: payment.mpStatus, 
            rejectionReason: payment.rejectionReason ? payment.rejectionReason : null,
            paymentMethod: payment.paymentMethod, 
            amount: payment.amount 
        })
    }

    //^ Create Payment Preference
    static createPreference = async (req: Request, res: Response) => {
        const { orderId } = req.body; 
        
        const isTest = process.env.NODE_ENV !== "production";

        // Find order
        const order = await Order.findById(orderId); 
        if(!order) {
            throw new NotFoundError("Orden no Encontrada")
        }

        // console.log(order); 

        // Verify order is in Pending status, otherwise throw Request Conflict (order expired)
        if(order.status !== OrderStatus.Pending) {
            throw new RequestConflictError("Orden Expirada")
        }

        // Verify Order info is set for checkout 
        if(!order.customer.email || !order.shippingAddress.region || order.shipping === null || !order.shippingMethod) {
            throw new RequestConflictError("Faltan datos en la Orden")
        }

        if (order.stockReservationExpiresAt < new Date()) {
            throw new RequestConflictError("La orden ha expirado");
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

        //! This need verification from a real payment, since finalPrice should already include shipping costs... 
        // Include shipping cost as a line item so MP total matches order.total
        if (order.shipping > 0) {
            items.push({
                id: "shipping",
                title: `Envío ${order.shippingMethod}`,
                description: `Costo de envío vía ${order.shippingMethod}`,
                picture_url: "",
                category_id: "services",
                quantity: 1,
                unit_price: order.shipping,
                currency_id: "CLP"
            });
        }

        // Create Preference
        const preference = await preferenceClient.create({
            body: {
                items,
                payer: isTest
                ? {
                    name: "Test",
                    surname: "APRO", // controla resultado
                    email: `test_${Date.now()}@example.com`,
                    }
                : {
                    name: order.customer.name,
                    surname: order.customer.surname,
                    email: order.customer.email,
                    phone: order.customer.phone
                        ? { number: order.customer.phone }
                        : undefined,
                    },
                back_urls: {
                    success: `${process.env.FRONTEND_URL}/checkout/success/${order._id}`,
                    failure: `${process.env.FRONTEND_URL}/checkout/failure/${order._id}`,
                    pending: `${process.env.FRONTEND_URL}/checkout/pending/${order._id}`
                },
                ...(isTest
                ? {}
                : {
                    shipments: {
                        receiver_address: {
                            zip_code: order.shippingAddress.zipCode ?? undefined,
                            street_name: order.shippingAddress.street,
                            city_name: order.shippingAddress.city,
                            state_name: order.shippingAddress.region.toString(),
                            country_name: order.shippingAddress.country,
                        },
                    },
                }),

                auto_return: process.env.NODE_ENV === "production" ? "all" : undefined,
                notification_url: process.env.NODE_ENV === "production" ? `${process.env.BACKEND_URL}/api/payments/webhook` : process.env.NGROK_URL,
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
                retryToken: createToken(), 
                retryTokenExpiresAt: order.stockReservationExpiresAt, 
                amount: order.total, 
                currency: "CLP", 
                status: PaymentStatus.Pending
            })
            
            // Link payment to order
            order.paymentId = payment.id;
            
            await order.save()
        }

        res.status(201).json({ 
            message: "Preferencia de pago creada exitosamente 📋🎉", 
            orderId, 
            paymentId: payment.id,
            preferenceId: preference.id, 
            initPoint: preference.init_point, 
            sandboxInitPoint: preference.sandbox_init_point
        })
    }

    static createPayment = async (req: Request, res: Response) => {
        const {
            token,
            payment_method_id,
            installments,
            issuer_id,
            payer,
            orderId
        } = req.body;

        // Buscar orden
        const order = await Order.findById(orderId);
        if (!order) {
            throw new NotFoundError("Orden no encontrada");
        }

        if (order.status !== OrderStatus.Pending) {
            throw new RequestConflictError("Orden no válida para pago");
        }

        if (order.stockReservationExpiresAt < new Date()) {
            throw new RequestConflictError("Orden expirada");
        }

        // Crear payment en Mercado Pago
        let mpPayment;
        try {
            mpPayment = await paymentClient.create({
                body: {
                    // CLP requires integer amounts — ensure no decimals
                    transaction_amount: Math.round(order.total),
                    token,
                    description: `Orden ${order.trackingNumber} — Morango Joyas`,
                    statement_descriptor: "Morango Joyas",
                    payment_method_id,
                    installments: Number(installments),
                    issuer_id: issuer_id,
                    payer: {
                        email: payer.email,
                        identification: {
                            type: String(payer.identification.type),
                            number: String(payer.identification.number),
                        }
                    },
                    external_reference: order.trackingNumber,
                    notification_url: process.env.NODE_ENV === "production" ? `${process.env.BACKEND_URL}/api/payments/webhook` : process.env.NGROK_URL,
                }, 
                requestOptions: {
                    idempotencyKey: `create-payment-${order.id}-${Date.now()}`
                }
            });
        } catch (mpError: any) {
            console.error("MercadoPago create payment error:", {
                message: mpError?.message,
                cause: mpError?.cause,
                status: mpError?.status || mpError?.statusCode,
                body: mpError?.body || mpError?.response?.data,
                orderId: order.id,
                trackingNumber: order.trackingNumber,
            });
            throw new InternalServerError(
                mpError?.message || "Error al procesar el pago con MercadoPago"
            );
        }

        // Persistir mpPaymentId
        const payment = await Payment.findOne({ orderId: order.id });
        if (!payment) {
            throw new NotFoundError("Payment record in DB not found");
        }

        payment.mpPaymentId = mpPayment.id!.toString();
        payment.mpStatus = mpPayment.status!;
        await payment.save();

        res.status(200).json({
            paymentId: payment.id,
            mpPaymentId: mpPayment.id,
            status: mpPayment.status,
        });
    };

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

        //! Fetch payment details from MP
        let mpPayment;
        try {
            mpPayment = await paymentClient.get({ id: paymentId });
        } catch (error) {
            // MP payment does not exist or temporary error
            console.warn("MP payment not found or error fetching payment", {
                paymentId,
                error: error?.message,
            });
        
            res.status(200).send("OK");
            return; 
        }


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
            console.warn(`Order ${externalReference} not found`);
            res.status(200).send("OK");
            return; 
        }

        // Find or create payment record
        let payment = await Payment.findOne({ orderId: order.id }); 

        if(!payment) {
            console.warn(`Payment not found for ${order.id}`)
            res.status(200).send("OK") 
            return
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

        //! Store rejection reason ONLY for rejected/cancelled | UX
        if (mpPayment.status === 'rejected' || mpPayment.status === 'cancelled') {
            const rejectionMessages: Record<string, string> = {
                cc_rejected_insufficient_amount: "Fondos insuficientes",
                cc_rejected_bad_filled_card_number: "Número de tarjeta inválido",
                cc_rejected_bad_filled_security_code: "Código de seguridad incorrecto",
                cc_rejected_card_disabled: "Tarjeta deshabilitada",
                cc_rejected_call_for_authorize: "El banco requiere autorización",
                default: "El pago fue rechazado"
            };

            const userMessage = rejectionMessages[mpPayment.status_detail] || rejectionMessages.default

            payment.rejectionReason = userMessage; 
        }

        await payment.save();
        
        //& Handle payment outcome (wrapped in try/catch to guarantee 200 response to MP)
        try {
            if (mpPayment.status === 'approved') {

                //! EDGE CASE Order already expired → refund path
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

                    console.warn("Pago Reembolsado (orden expirada).")
                    res.status(200).send("OK")
                    return
                }

                //* Normal flow
                await handleApprovedPayment(order, payment);
            } else if (mpPayment.status === 'rejected' || mpPayment.status === 'cancelled') { 
                await handleFailedPayment(order, payment); // payment.rejectionReason for payment rejection reason in email 
            }
        } catch (handlerError) {
            // Log the error but still return 200 to MP to prevent excessive retries.
            // Payment status is already saved above, so the core data is persisted.
            console.error("Error in webhook payment handler:", handlerError);
        }

        res.status(200).send("OK")
    }

    //^ Retry failed payment
    static retryPayment = async (req: Request, res: Response) => {
        const { orderId } = req.params; 
        const { token } = req.query; 
        
        // Get associated order
        const order = await Order.findById(orderId); 
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
        const paymentRecord = await Payment.findOne({ 
            orderId: order._id,     
        });

        if (!paymentRecord) {
            throw new NotFoundError("Pago no Encontrado.");
        }

        // validate retryToken in the request to check user ownership of the order
        if (paymentRecord.retryToken !== token) {
            throw new NotAuthorizedError("No tienes permiso para reintentar este pago.")
        }

        // Validate retry token is not expired
        // probably redundant since it should already throw with order expiration validation since same timestampt
        if (paymentRecord.retryTokenExpiresAt < new Date()) {
            throw new ResourceExpiredError("El reintento de pago ha expirado.")
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

        // Include shipping cost as a line item so MP total matches order.total
        if (order.shipping > 0) {
            items.push({
                id: "shipping",
                title: `Envío ${order.shippingMethod}`,
                description: `Costo de envío vía ${order.shippingMethod}`,
                picture_url: "",
                category_id: "services",
                quantity: 1,
                unit_price: order.shipping,
                currency_id: "CLP"
            });
        }

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
                    success: `${process.env.FRONTEND_URL}/checkout/success/${order._id}`,
                    failure: `${process.env.FRONTEND_URL}/checkout/failure/${order._id}`,
                    pending: `${process.env.FRONTEND_URL}/checkout/pending/${order._id}`
                },
                auto_return: process.env.NODE_ENV === "production" ? "all" : undefined,
                notification_url: process.env.NODE_ENV === "production" ? `${process.env.BACKEND_URL}/api/payments/webhook` : process.env.NGROK_URL,
                external_reference: order.trackingNumber,
                statement_descriptor: "Morango Joyas",
                expires: true,
                expiration_date_from: new Date().toISOString(),
                expiration_date_to: order.stockReservationExpiresAt.toISOString()
            }, 
            requestOptions: {
                idempotencyKey: `retry-preference-${order.id}-${paymentRecord.retryToken}`
            }
        });

        paymentRecord.mpPreferenceId = preference.id!;
        paymentRecord.status = PaymentStatus.Pending;

        // Rotate token after each payment retry 
        paymentRecord.retryToken = createToken(); 
        paymentRecord.retryTokenExpiresAt = order.stockReservationExpiresAt;
        await paymentRecord.save();

        res.status(201).json({ 
            message: "Preferencia de Pago Actualizada Exitosamente. 🎉", 
            orderId,
            amount: paymentRecord.amount, 
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

        if (payment.mpStatus === "refunded") {
            res.status(200).json({ message: "El pago ya fue reembolsado (MP)" });
            return
        }


        const order = await Order.findOne({ paymentId: payment.id });

        if (!order) {
            throw new NotFoundError("Orden asociada no encontrada");
        }

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