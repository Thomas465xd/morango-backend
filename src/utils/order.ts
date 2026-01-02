import Order from "../models/Order";

export async function generateOrderNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Count orders today
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const ordersToday = await Order.countDocuments({
        createdAt: { $gte: startOfDay }
    });
    
    const sequence = String(ordersToday + 1).padStart(6, '0');
    
    return `ORD-${year}${month}${day}-${sequence}`;
    // Example: ORD-20241220-000042
}

export async function calculateShipping(
    method: string, 
): Promise<number> {
    const shippingRates = {
        'santiago': 3990,
        'rm': 4990,
        'envio_s': 5990,
        'envio_m': 6990,
        'envio_l': 7990
    };
    
    return shippingRates[method] || 0;
}