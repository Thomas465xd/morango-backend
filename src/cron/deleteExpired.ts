import colors from "colors";
import Order, { OrderStatus } from "../models/Order";
import Payment, { PaymentStatus } from "../models/Payment";

export async function deleteExpiredJob(currentTime?: number) {
    try {
        // Start logs group | Accepts a label argument
        console.group(colors.dim("Running order deletion job..."));

        // Use provided time or current time
        const now = currentTime ? new Date(currentTime) : new Date();

        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // Find expired Orders
        const expiredOrders = await Order.find({
            status: OrderStatus.Expired, 
            stockReservationExpiresAt: { $lt: now}, 
            // updatedAt: { $lte: oneWeekAgo }
        })

        console.log(colors.red(`Found ${expiredOrders.length} expired orders`));

        for (const order of expiredOrders) {
            // Load payment
            const payment = order.paymentId
                ? await Payment.findById(order.paymentId)
                : null;

            // never delete approved payments/orders
            if (payment?.status === PaymentStatus.Approved) {
                console.log(
                    colors.green(
                        `Skipping deletion for order ${order.trackingNumber} — payment approved`
                    )
                );

                continue
            }

            // Delete associated Payment record if it exists
            if(payment) {
                await payment.deleteOne(); 
            }

            // Delete Expired Order
            await order.deleteOne(); 

            console.log(
                colors.yellow(
                    `Order ${colors.yellow.bold(order.trackingNumber)} deleted` +
                    (payment
                        ? ` along with ${colors.yellow.bold(payment.id)} payment record`
                        : " (no payment record found)")
                )
            );
        }

        // End logs group
        console.groupEnd();
    } catch (error) {
        console.error('Error in order expiration job:', error);
    }
}