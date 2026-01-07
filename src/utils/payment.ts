import { OrderInterface, OrderStatus } from '../models/Order';
import Product from '../models/Product';
import { PaymentInterface } from '../models/Payment';
import { PaymentEmails } from '../emails/payment';
import { refundClient } from '../config/mercadopago';
import { RequestConflictError } from '../errors/conflict-error';

export async function handleApprovedPayment(order: OrderInterface, payment: PaymentInterface) {
    try {
        console.log(`Processing approved payment for order ${order.trackingNumber}`);
        
        // 1. Update order status
        order.status = OrderStatus.Processing;
        await order.save();
        
        // 2. Convert reserved stock to sold stock
        for (const item of order.items) {
            await Product.updateOne(
                { 
                    _id: item.productId, 
                    reserved: { $gte: item.quantity },
                    stock: { $gte: item.quantity } 
                },
                {
                    $inc: {
                        stock: -item.quantity,      // Decrease actual stock
                        reserved: -item.quantity    // Release reservation
                    }
                }
            );
        }
        
        console.log(`Stock updated for order ${order.trackingNumber}`);
        
        // 3. Send order successful payment email
        await PaymentEmails.Approved.send(order, payment);
        
        console.log(`Payment processed successfully for order ${order.trackingNumber}`);
        
    } catch (error) {
        console.error('Error handling approved payment:', error);
        throw error;
    }
}

export async function handleFailedPayment(order: OrderInterface, payment: PaymentInterface) {
    try {
        console.log(`Processing failed payment for order ${order.trackingNumber}`);
        
        // 1. Release reserved stock (only if still in Pending status)
        if (order.status === OrderStatus.Pending) {
            for (const item of order.items) {
                await Product.updateOne(
                    { _id: item.productId },
                    { $inc: { reserved: -item.quantity } }
                );
            }
        }
        
        // 2. Update order status to cancelled
        order.status = OrderStatus.Cancelled;
        await order.save();
        
        console.log(`Stock released for failed order ${order.trackingNumber}`);
        
        // 3. Send payment failed email
        await PaymentEmails.Failed.send(order, payment);
        
    } catch (error) {
        console.error('Error handling failed payment:', error);
        throw error;
    }
}

export async function refundPayment(
    mpPaymentId: string,
    amount?: number
) {
    if(!mpPaymentId) {
        throw new RequestConflictError("mpPaymentId is required")
    }

    return refundClient.create({
        payment_id: mpPaymentId,
        body: amount ? { amount } : undefined,
        requestOptions: {
            idempotencyKey: `refund-${mpPaymentId}`
        }
    });
}