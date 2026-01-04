import type { Request, Response } from "express";
import { NotFoundError } from "../errors/not-found";

export class PaymentController {
    // TODO: 
    //* ADMIN - get all payments
    static getPaymentsAdmin = async (req: Request, res: Response) => {
        const { orderId } = req.body; 

        res.status(200).json({ 
            message: "Payment Preference Created Successfully", 
            orderId, 
        })
    }

    // TODO: 
    //* ADMIN - get payment details 
    static getPaymentByIdAdmin = async (req: Request, res: Response) => {
        const { orderId } = req.body; 

        res.status(200).json({ 
            message: "Payment Preference Created Successfully", 
            orderId, 
        })
    }

    //* Auth user - get payment details 
    static getPaymentById = async (req: Request, res: Response) => {
        const { orderId } = req.body; 

        res.status(200).json({ 
            message: "Payment Preference Created Successfully", 
            orderId, 
        })
    }

    // TODO: 
    //* Payment success redirect
    static redirectSuccess = async (req: Request, res: Response) => {
        const { orderId } = req.body; 

        res.status(200).json({ 
            message: "Payment Preference Created Successfully", 
            orderId, 
        })
    }

    // TODO: 
    //* Payment failure redirect
    static redirectFailure = async (req: Request, res: Response) => {
        const { orderId } = req.body; 

        res.status(200).json({ 
            message: "Payment Preference Created Successfully", 
            orderId, 
        })
    }

    // TODO: 
    //* Payment pending redirect
    static redirectPending = async (req: Request, res: Response) => {
        const { orderId } = req.body; 

        res.status(200).json({ 
            message: "Payment Preference Created Successfully", 
            orderId, 
        })
    }

    // TODO: 
    //* Get order payment status for order 
    static getOrderPaymentStatus = async (req: Request, res: Response) => {
        const { orderId } = req.params; 

        res.status(200).json({ 
            message: "Payment Preference Created Successfully", 
            orderId, 
        })
    }

    // TODO: 
    //^ Create Payment Preference
    static createPreference = async (req: Request, res: Response) => {
        const { orderId } = req.body; 

        // Find order

        // Verify order is in Pending status, otherwise throw Request Conflict

        // Build items for MP

        // Create Preference

        // Create or update payment record

            // if payment found, update it

            // else create new payment & link it to order

        res.status(201).json({ 
            message: "Payment Preference Created Successfully", 
            orderId, 
        })
    }

    // TODO: 
    //^ Mercado Pago Webhook
    static mpWebhook = async (req: Request, res: Response) => {
        const { orderId } = req.body; 

        res.status(201).json({ 
            message: "Payment Preference Created Successfully", 
            orderId, 
        })
    }

    // TODO: 
    //^ Retry failed payment
    static retryPayment = async (req: Request, res: Response) => {
        const { orderId } = req.params; 

        res.status(201).json({ 
            message: "Payment Preference Created Successfully", 
            orderId, 
        })
    }

    // TODO: 
    //^ ADMIN Process Refund
    static processRefund = async (req: Request, res: Response) => {
        const { orderId } = req.body; 

        res.status(201).json({ 
            message: "Reembolso exitoso, email de notificación enviado", 
            orderId, 
        })
    }
}