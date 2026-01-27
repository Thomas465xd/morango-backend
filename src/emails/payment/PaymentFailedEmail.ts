import resend from "../../config/resend";
import { InternalServerError } from "../../errors/server-error";
import { OrderInterface } from "../../models/Order";
import { PaymentInterface } from "../../models/Payment";

export class PaymentFailedEmail {
    static sendPaymentFailedEmail  = async (order: OrderInterface, payment: PaymentInterface) => { 
        const logoUrl = process.env.LOGO_URL;

        try {
            const emailHTML = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Problema con tu Pago</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f5f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    
                    <!-- Header with Logo -->
                    <tr>
                        <td style="background-color: #000000; padding: 40px 20px; text-align: center; border-radius: 16px 16px 0 0;">
                            <img src="${logoUrl}" alt="Morango Joyas" style="width: 70px; height: auto; display: block; margin: 0 auto 15px;" />
                            <h1 style="margin: 0; font-size: 26px; font-weight: 600; color: #ffffff;">
                                Problema con tu Pago 💳
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
                                Lamentablemente, no pudimos procesar el pago de tu pedido <strong>${order.trackingNumber}</strong>. Pero no te preocupes, ¡tus productos aún te están esperando! 
                            </p>
                            
                            <!-- Payment Rejection Notice -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 25px 0; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 6px;">
                                <tr>
                                    <td style="padding: 20px 25px;">
                                        <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: 600; color: #dc2626;">
                                            ⚠️ Motivo del rechazo
                                        </p>
                                        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #991b1b;">
                                            ${payment.rejectionReason || 'No se pudo procesar el pago con el método seleccionado'}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Retry Payment CTA -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="text-align: center; padding: 10px 0 30px;">
                                        <a href="${process.env.FRONTEND_URL}/checkout/retry/${order._id}?token=${payment.retryToken}" style="display: inline-block; padding: 16px 50px; background-color: #000000; color: #ffffff; text-decoration: none; font-size: 17px; font-weight: 600; border-radius: 10px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);">
                                            Reintentar Pago Ahora
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Tips Section -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 25px 0;">
                                <tr>
                                    <td style="background-color: #f0f9ff; padding: 20px 25px; border-radius: 8px; border-left: 4px solid #0284c7;">
                                        <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #0369a1;">
                                            💡 Recomendaciones para reintentar:
                                        </p>
                                        <ul style="margin: 0; padding-left: 20px; color: #075985;">
                                            <li style="margin-bottom: 8px; font-size: 13px; line-height: 1.5;">
                                                <strong>Verifica los datos de tu tarjeta:</strong> Asegúrate que el número, fecha de vencimiento y CVV sean correctos
                                            </li>
                                            <li style="margin-bottom: 8px; font-size: 13px; line-height: 1.5;">
                                                <strong>Confirma que tengas fondos suficientes</strong> para completar la compra
                                            </li>
                                            <li style="margin-bottom: 8px; font-size: 13px; line-height: 1.5;">
                                                <strong>Contacta a tu banco:</strong> Algunas veces las tarjetas bloquean transacciones online por seguridad
                                            </li>
                                            <li style="margin-bottom: 8px; font-size: 13px; line-height: 1.5;">
                                                <strong>Prueba con otra tarjeta o método de pago</strong> si el problema persiste
                                            </li>
                                            <li style="margin: 0; font-size: 13px; line-height: 1.5;">
                                                <strong>Usa otra tarjeta de crédito o débito:</strong> Aceptamos Visa, Mastercard y más
                                            </li>
                                        </ul>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Payment Details -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 25px 0;">
                                <tr>
                                    <td style="background-color: #fafafa; padding: 20px 25px; border-radius: 6px; border: 1px solid #e5e5e5;">
                                        <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #000000;">
                                            Detalles del intento de pago:
                                        </p>
                                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="padding: 3px 0;">
                                                    <p style="margin: 0; font-size: 13px; color: #666666;">Método de pago:</p>
                                                </td>
                                                <td style="padding: 3px 0; text-align: right;">
                                                    <p style="margin: 0; font-size: 13px; font-weight: 500; color: #333333;">${payment.paymentMethod === 'master' ? 'Mastercard' : payment.paymentMethod === 'visa' ? 'Visa' : payment.paymentMethod.charAt(0).toUpperCase() + payment.paymentMethod.slice(1)}</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 3px 0;">
                                                    <p style="margin: 0; font-size: 13px; color: #666666;">ID de transacción:</p>
                                                </td>
                                                <td style="padding: 3px 0; text-align: right;">
                                                    <p style="margin: 0; font-size: 13px; font-weight: 500; color: #333333;">${payment.mpPaymentId || 'N/A'}</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 3px 0;">
                                                    <p style="margin: 0; font-size: 13px; color: #666666;">Estado:</p>
                                                </td>
                                                <td style="padding: 3px 0; text-align: right;">
                                                    <p style="margin: 0; font-size: 13px; font-weight: 600; color: #dc2626;">Rechazado</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Order Summary Box -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0 25px 0; background-color: #f9f9f9; border-radius: 10px; overflow: hidden;">
                                <tr>
                                    <td style="padding: 20px 25px; border-bottom: 2px solid #e5e5e5;">
                                        <h2 style="margin: 0 0 5px 0; font-size: 18px; font-weight: 600; color: #000000;">
                                            Tu Pedido
                                        </h2>
                                        <p style="margin: 0; font-size: 13px; color: #666666;">
                                            Número: <strong style="color: #000000;">${order.trackingNumber}</strong>
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- Order Items (First 3) -->
                                ${order.items.slice(0, 3).map(item => `
                                <tr>
                                    <td style="padding: 15px 25px; border-bottom: 1px solid #e5e5e5;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="width: 60px; vertical-align: top;">
                                                    <img src="${item.productImage}" alt="${item.productName}" style="width: 55px; height: 55px; object-fit: cover; border-radius: 6px; display: block;" />
                                                </td>
                                                <td style="vertical-align: top; padding-left: 12px;">
                                                    <p style="margin: 0 0 3px 0; font-size: 14px; font-weight: 600; color: #000000;">
                                                        ${item.productName}
                                                    </p>
                                                    <p style="margin: 0; font-size: 13px; color: #666666;">
                                                        Cantidad: ${item.quantity} × $${item.finalPrice.toLocaleString('es-CL')}
                                                    </p>
                                                </td>
                                                <td style="vertical-align: top; text-align: right; white-space: nowrap;">
                                                    <p style="margin: 0; font-size: 14px; font-weight: 600; color: #000000;">
                                                        $${item.itemTotal.toLocaleString('es-CL')}
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                `).join('')}
                                
                                ${order.items.length > 3 ? `
                                <tr>
                                    <td style="padding: 12px 25px; border-bottom: 1px solid #e5e5e5; text-align: center;">
                                        <p style="margin: 0; font-size: 13px; color: #888888; font-style: italic;">
                                            + ${order.items.length - 3} producto(s) más
                                        </p>
                                    </td>
                                </tr>
                                ` : ''}
                                
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
                            
                            <!-- Urgency Notice -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 25px 0;">
                                <tr>
                                    <td style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px 20px; border-radius: 6px;">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #b45309;">
                                            ⏰ ¡No pierdas tus productos!
                                        </p>
                                        <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #92400e;">
                                            Tus productos están reservados por tiempo limitado. Completa tu pago pronto para asegurar tu compra antes de que expire la reserva.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Secondary CTA -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="text-align: center; padding: 10px 0 20px;">
                                        <a href="${process.env.FRONTEND_URL}/checkout/retry/${order._id}" style="display: inline-block; padding: 14px 40px; background-color: #f97316; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 8px;">
                                            Completar mi Pedido
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 25px 0 0 0; font-size: 14px; line-height: 1.6; color: #888888; text-align: center;">
                                ¿Necesitas ayuda? Contáctanos respondiendo a este correo.<br/>
                                Estamos aquí para ayudarte a completar tu compra.
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
                                Estamos aquí para ayudarte 💎<br/>
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
                                No te rindas, ¡tus joyas favoritas te esperan! ✨
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
                subject: `❌📦 Pago Fallido - ${order.trackingNumber}`, 
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