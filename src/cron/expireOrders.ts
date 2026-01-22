import mongoose from 'mongoose';
import Order, { OrderStatus } from '../models/Order';
import Payment, { PaymentStatus } from '../models/Payment';
import Product from '../models/Product';
import colors from 'colors';

export async function expireOrdersJob(currentTime?: number) {
    // Start logs group | Accepts a label argument
    console.group(colors.dim("Running order expiration job..."));

    // Use provided time or current time
    const now = currentTime ? new Date(currentTime) : new Date();

    // Find expired orders
    const expiredOrders = await Order.find({
        status: OrderStatus.Pending,
        stockReservationExpiresAt: { $lt: now }
    });

    console.log(colors.red(`Found ${expiredOrders.length} expired orders`));

    //! CORE CRON JOB LOGIC
    for (const order of expiredOrders) {
        const session = await mongoose.startSession(); 
        session.startTransaction(); 

        try {
            // Reload order inside transaction
            const freshOrder = await Order.findOne(
                { _id: order._id, status: OrderStatus.Pending },
                null,
                { session }
            );

            if (!freshOrder) {
                await session.abortTransaction();
                session.endSession();
                continue;
            }
        
            // Load payment
            const payment = order.paymentId
                ? await Payment.findById(order.paymentId).session(session)
                : null;

            if (payment && payment.status === PaymentStatus.Expired) continue;

            // Approved payment always wins
            if (payment?.status === PaymentStatus.Approved) {
                console.log(
                    colors.green(
                        `Skipping order ${order.trackingNumber} — payment already approved`
                    )
                );
                await session.abortTransaction();
                session.endSession();
                continue;
            }

            // Release reserved stock
            for (const item of freshOrder.items) {
                const result = await Product.updateOne(
                    {
                        _id: item.productId,
                        reserved: { $gte: item.quantity }
                    },
                    { $inc: { reserved: -item.quantity } },
                    { session }
                );

                if (result.modifiedCount === 0) {
                    throw new Error(
                        `Stock release failed for product ${item.productId}`
                    );
                }
            }

            // Expire order
            freshOrder.status = OrderStatus.Expired;
            await freshOrder.save({ session });

            // Expire payment if exists and not final
            if (payment && payment.status !== PaymentStatus.Expired) {
                payment.status = PaymentStatus.Expired;
                await payment.save({ session });
            }

            await session.commitTransaction();

            console.log(
                colors.yellow(
                    `Order ${colors.bold(freshOrder.trackingNumber)} expired and stock released`
                )
            );
        } catch (error) {
            await session.abortTransaction();

            console.error(
                colors.red(
                    `Failed to expire order ${order.trackingNumber}: ${error.message}`
                )
            );
        } finally {
            session.endSession(); 
        }
    }

    // End logs group
    console.groupEnd();
}
