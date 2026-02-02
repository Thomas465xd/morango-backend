import resend from "../../config/resend";
import { InternalServerError } from "../../errors/server-error";
import { OrderInterface } from "../../models/Order";

export class DeliveredOrderEmail {
    static sendDeliveredOrderEmail = async (order: OrderInterface) => { 
        try {
            // Determine if it was a pickup or delivery
            const isPickup = order.shippingMethod === "Retiro Domicilio";
            
            const emailHTML = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${isPickup ? '¡Pedido Retirado!' : '¡Pedido Entregado!'}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f5f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    
                    <!-- Header with Logo -->
                    <tr>
                        <td style="background-color: #000000; padding: 40px 20px; text-align: center; border-radius: 16px 16px 0 0;">
                            <img src="${process.env.LOGO_URL}" alt="Morango Joyas" style="width: 70px; height: auto; display: block; margin: 0 auto 15px;" />
                            <h1 style="margin: 0; font-size: 26px; font-weight: 600; color: #ffffff;">
                                ${isPickup ? '¡Pedido Retirado!' : '¡Pedido Entregado!'}
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px 35px; background-color: #ffffff;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                                Hola <strong style="color: #000000;">${order.customer.name}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 25px 0; font-size: 15px; line-height: 1.7; color: #555555;">
                                ${isPickup 
                                    ? '¡Gracias por retirar tu pedido! Esperamos que disfrutes tus joyas de Morango.'
                                    : '¡Tu pedido ha sido entregado exitosamente! Gracias por confiar en nosotros. Esperamos que disfrutes tus joyas de Morango.'}
                            </p>
                            
                            <!-- Order Summary Box -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 25px 0; background-color: #f9f9f9; border-radius: 10px; overflow: hidden;">
                                <tr>
                                    <td style="padding: 20px 25px; border-bottom: 2px solid #e5e5e5;">
                                        <h2 style="margin: 0 0 5px 0; font-size: 18px; font-weight: 600; color: #000000;">
                                            Resumen del Pedido
                                        </h2>
                                        <p style="margin: 0; font-size: 13px; color: #666666;">
                                            Número de seguimiento: <strong style="color: #000000;">${order.trackingNumber}</strong>
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- Order Items -->
                                ${order.items.map(item => `
                                <tr>
                                    <td style="padding: 20px 25px; border-bottom: 1px solid #e5e5e5;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="width: 80px; vertical-align: top;">
                                                    <img src="${item.productImage}" alt="${item.productName}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 8px; display: block;" />
                                                </td>
                                                <td style="vertical-align: top; padding-left: 15px;">
                                                    <p style="margin: 0 0 5px 0; font-size: 15px; font-weight: 600; color: #000000;">
                                                        ${item.productName}
                                                    </p>
                                                    <p style="margin: 0 0 3px 0; font-size: 13px; color: #666666;">
                                                        Cantidad: ${item.quantity}
                                                    </p>
                                                    ${item.discount && item.discount > 0 ? `
                                                    <p style="margin: 0; font-size: 13px; color: #666666;">
                                                        <span style="text-decoration: line-through; color: #999999;">$${item.basePrice.toLocaleString('es-CL')}</span>
                                                        <span style="color: #16a34a; font-weight: 600; margin-left: 5px;">-${item.discount}%</span>
                                                    </p>
                                                    ` : ''}
                                                    <p style="margin: 5px 0 0 0; font-size: 15px; font-weight: 600; color: #000000;">
                                                        $${item.itemTotal.toLocaleString('es-CL')}
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                `).join('')}
                                
                                <!-- Totals -->
                                <tr>
                                    <td style="padding: 20px 25px;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="padding: 5px 0;">
                                                    <p style="margin: 0; font-size: 14px; color: #666666;">Subtotal:</p>
                                                </td>
                                                <td style="padding: 5px 0; text-align: right;">
                                                    <p style="margin: 0; font-size: 14px; color: #666666;">$${order.subtotal.toLocaleString('es-CL')}</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 5px 0;">
                                                    <p style="margin: 0; font-size: 14px; color: #666666;">Envío:</p>
                                                </td>
                                                <td style="padding: 5px 0; text-align: right;">
                                                    <p style="margin: 0; font-size: 14px; color: #666666;">${order.shipping === 0 ? 'GRATIS' : '$' + order.shipping.toLocaleString('es-CL')}</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 15px 0 0 0; border-top: 2px solid #e5e5e5;">
                                                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: #000000;">Total:</p>
                                                </td>
                                                <td style="padding: 15px 0 0 0; text-align: right; border-top: 2px solid #e5e5e5;">
                                                    <p style="margin: 0; font-size: 18px; font-weight: 700; color: #000000;">$${order.total.toLocaleString('es-CL')}</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Delivery Confirmation -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 25px 0; background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 6px;">
                                <tr>
                                    <td style="padding: 20px 25px;">
                                        <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: 600; color: #16a34a;">
                                            ✓ ${isPickup ? 'Pedido Retirado' : 'Pedido Entregado'}
                                        </p>
                                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="padding: 5px 0;">
                                                    <p style="margin: 0; font-size: 13px; color: #166534;">Estado:</p>
                                                </td>
                                                <td style="padding: 5px 0; text-align: right;">
                                                    <p style="margin: 0; font-size: 13px; font-weight: 600; color: #16a34a;">${isPickup ? 'Retirado' : 'Entregado'}</p>
                                                </td>
                                            </tr>
                                            ${order.deliveredAt ? `
                                            <tr>
                                                <td style="padding: 5px 0;">
                                                    <p style="margin: 0; font-size: 13px; color: #166534;">Fecha:</p>
                                                </td>
                                                <td style="padding: 5px 0; text-align: right;">
                                                    <p style="margin: 0; font-size: 13px; font-weight: 600; color: #166534;">${new Date(order.deliveredAt).toLocaleDateString('es-CL')}</p>
                                                </td>
                                            </tr>
                                            ` : ''}
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Track Order Button -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="text-align: center; padding: 10px 0 25px;">
                                        <a href="${process.env.FRONTEND_URL}/home/orders/public/${order.trackingNumber}" style="display: inline-block; padding: 15px 45px; background-color: #000000; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 10px;">
                                            Ver Detalles del Pedido
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Account Creation Prompt (if no userId) -->
                            ${!order.customer.userId ? `
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 25px 0; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px;">
                                <tr>
                                    <td style="padding: 20px 25px;">
                                        <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: 600; color: #b45309;">
                                            🎁 Crea tu Cuenta y Obtén Ofertas Exclusivas
                                        </p>
                                        <p style="margin: 0 0 15px 0; font-size: 13px; line-height: 1.6; color: #92400e;">
                                            Regístrate en Morango Joyas para disfrutar de ofertas especiales, ver el historial de todos tus pedidos, acceder a tus pagos y recibir notificaciones sobre nuevos productos.
                                        </p>
                                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="text-align: center;">
                                                    <a href="${process.env.FRONTEND_URL}/auth/register" style="display: inline-block; padding: 12px 35px; background-color: #f59e0b; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 8px;">
                                                        Crear Cuenta Ahora
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            ` : `
                            <!-- Repeat Customer Encouragement -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 25px 0; background-color: #e0f2fe; border-left: 4px solid #0284c7; border-radius: 6px;">
                                <tr>
                                    <td style="padding: 20px 25px;">
                                        <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: 600; color: #0369a1;">
                                            💎 ¡Vuelve Pronto!
                                        </p>
                                        <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #0c4a6e;">
                                            Nos encantaría volver a verte en Morango Joyas. Explora nuestras nuevas colecciones y encuentra la joya perfecta para ti o como regalo. Cada compra es especial para nosotros.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            `}
                            
                            <p style="margin: 25px 0 0 0; font-size: 14px; line-height: 1.6; color: #888888; text-align: center;">
                                Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos respondiendo a este correo.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #000000; padding: 30px 35px; text-align: center; border-radius: 0 0 16px 16px;">
                            <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 600; color: #ffffff;">
                                Morango Joyas
                            </p>
                            <p style="margin: 0 0 15px 0; font-size: 13px; color: #cccccc; line-height: 1.6;">
                                Gracias por confiar en nosotros 💎<br/>
                                Envío GRATIS sobre $90.000 🎁
                            </p>
                            <p style="margin: 0; font-size: 11px; color: #888888; line-height: 1.5;">
                                Este correo fue enviado a ${order.customer.email}<br/>
                                © ${new Date().getFullYear()} Morango Joyas. Todos los derechos reservados.
                            </p>
                        </td>
                    </tr>
                    
                </table>
                
                <!-- Bottom Notice -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 20px auto 0;">
                    <tr>
                        <td style="text-align: center; padding: 0 20px;">
                            <p style="margin: 0; font-size: 11px; color: #999999; line-height: 1.5;">
                                Gracias por elegir Morango Joyas ✨
                            </p>
                        </td>
                    </tr>
                </table>
                
            </td>
        </tr>
    </table>
</body>
</html>
            `;

            const mailOptions = {
                from: `"Morango Joyas" <${process.env.NOREPLY_EMAIL}>`,
                to: [order.customer.email], 
                subject: `${isPickup ? '✅ Pedido Retirado' : '✅ Pedido Entregado'} - ${order.customer.name}`, 
                html: emailHTML
            }

            const response = await resend.emails.send(mailOptions); 
            console.log("✅ Email sent successfully", order.customer.email);
            console.log(response)
        } catch (error) {
            console.error("❌ Error sending email:", error);
            throw new InternalServerError(); 
        }
    }
}