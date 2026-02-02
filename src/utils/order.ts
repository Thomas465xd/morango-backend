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

// Shipping options configuration - must match frontend definition
export const shippingOptions = [
    {
        id: "santiago",
        name: "Envío dentro de Santiago",
        price: 3990,
        estimatedDays: "2-3 días",
    },
    {
        id: "rm",
        name: "RM",
        price: 4990,
        estimatedDays: "3-5 días",
        zones: "Melipilla, María Pinto, Tiltil, San Pedro, Alhué, El Monte, Isla de Maipo, Pirque, San José de Maipo, Colina, Lampa, Curacaví, Buin, Talagante",
    },
    {
        id: "envio-s",
        name: "Envío S",
        price: 5990,
        estimatedDays: "3-5 días",
        zones: "Coquimbo, O'Higgins, Maule, Ñuble, Biobío, Valparaíso",
    },
    {
        id: "envio-m",
        name: "Envío M",
        price: 6990,
        estimatedDays: "4-6 días",
        zones: "Antofagasta, Atacama, Araucanía",
    },
    {
        id: "envio-l",
        name: "Envío L",
        price: 7990,
        estimatedDays: "5-7 días",
        zones: "Arica y Parinacota, Tarapacá, Los Ríos, Los Lagos, Magallanes",
    },
    {
        id: "aysen",
        name: "Aysén",
        price: 11990,
        estimatedDays: "7-10 días",
    },
];