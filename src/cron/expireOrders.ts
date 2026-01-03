import Order, { OrderStatus } from '../models/Order';
import Product from '../models/Product';
import colors from 'colors';

export async function expireOrdersJob(currentTime?: number) {
    try {
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

        for (const order of expiredOrders) {
            // Release reserved stock
            for (const item of order.items) {
                await Product.updateOne(
                    { _id: item.productId },
                    { $inc: { reserved: -item.quantity } }
                );
            }

            // Update order statu
            order.status = OrderStatus.Expired;
            await order.save();

            console.log(colors.yellow(`Order ${colors.yellow.bold(order.trackingNumber)} expired and stock released`));
        }

        // End logs group
        console.groupEnd();
    } catch (error) {
        console.error('Error in order expiration job:', error);
    }
}
