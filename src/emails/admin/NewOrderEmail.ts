import resend from "../../config/resend";
import { InternalServerError } from "../../errors/server-error";
import { OrderInterface } from "../../models/Order";
import { PaymentInterface } from "../../models/Payment";

export class NewOrderEmail {
    static sendNewOrderEmail = async (order: OrderInterface, payment: PaymentInterface) => { 
        try {
            const manageOrderUrl = `${process.env.FRONTEND_URL}/admin/orders?trackingNumber=${order.trackingNumber}`;
            const managePaymentUrl = `${process.env.FRONTEND_URL}/admin/payments/${payment.id}`;
            
            const emailHTML = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nueva Orden Pagada</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f5f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 700px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); padding: 40px 20px; text-align: center; border-radius: 16px 16px 0 0;">
                            <img src="${process.env.LOGO_URL}" alt="Morango Joyas" style="width: 70px; height: auto; display: block; margin: 0 auto 15px;" />
                            <h1 style="margin: 0; font-size: 26px; font-weight: 600; color: #ffffff;">
                                Nueva Orden Pagada 🎉
                            </h1>
                            <p style="margin: 8px 0 0 0; font-size: 14px; color: #cccccc;">
                                Una nueva orden requiere tu atención
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px 35px; background-color: #ffffff;">
                            <!-- Alert Box -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 30px 0; background-color: #fef08a; border-left: 4px solid #f59e0b; border-radius: 6px;">
                                <tr>
                                    <td style="padding: 15px 20px;">
                                        <p style="margin: 0; font-size: 14px; font-weight: 600; color: #b45309;">
                                            ⚡ ACCIÓN REQUERIDA: Nueva orden pagada necesita procesamiento
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Order Header Info -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 25px 0;">
                                <tr>
                                    <td style="background-color: #f9f9f9; padding: 20px 25px; border-radius: 10px; border: 1px solid #e5e5e5;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="width: 50%; padding-right: 20px;">
                                                    <p style="margin: 0 0 5px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #666666; font-weight: 600;">Número de Orden</p>
                                                    <p style="margin: 0; font-size: 18px; font-weight: 700; color: #000000;">${order.trackingNumber}</p>
                                                </td>
                                                <td style="width: 50%; padding-left: 20px; border-left: 2px solid #e5e5e5;">
                                                    <p style="margin: 0 0 5px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #666666; font-weight: 600;">Estado</p>
                                                    <p style="margin: 0; font-size: 16px; font-weight: 700; color: #3b82f6;">Procesando</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Customer Info -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 25px 0; background-color: #f9f9f9; border-radius: 10px; padding: 20px 25px;">
                                <tr>
                                    <td>
                                        <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #000000;">👤 Información del Cliente</p>
                                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="padding: 5px 0;">
                                                    <p style="margin: 0; font-size: 13px; color: #666666;">Nombre:</p>
                                                </td>
                                                <td style="padding: 5px 0; text-align: right;">
                                                    <p style="margin: 0; font-size: 13px; font-weight: 600; color: #000000;">${order.customer.name} ${order.customer.surname}</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 5px 0;">
                                                    <p style="margin: 0; font-size: 13px; color: #666666;">Email:</p>
                                                </td>
                                                <td style="padding: 5px 0; text-align: right;">
                                                    <p style="margin: 0; font-size: 13px; font-weight: 600; color: #000000;">${order.customer.email}</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 5px 0;">
                                                    <p style="margin: 0; font-size: 13px; color: #666666;">Teléfono:</p>
                                                </td>
                                                <td style="padding: 5px 0; text-align: right;">
                                                    <p style="margin: 0; font-size: 13px; font-weight: 600; color: #000000;">${order.customer.phone || 'No proporcionado'}</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 5px 0;">
                                                    <p style="margin: 0; font-size: 13px; color: #666666;">Tipo:</p>
                                                </td>
                                                <td style="padding: 5px 0; text-align: right;">
                                                    <p style="margin: 0; font-size: 13px; font-weight: 600; color: #000000;">${order.customer.isGuest ? 'Invitado' : 'Registrado'}</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Order Items -->
                            <p style="margin: 25px 0 15px 0; font-size: 16px; font-weight: 600; color: #000000;">📦 Artículos de la Orden (${order.items.length})</p>
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 25px 0; background-color: #f9f9f9; border-radius: 10px; overflow: hidden;">
                                ${order.items.map((item, index) => `
                                <tr>
                                    <td style="padding: 20px 25px; ${index < order.items.length - 1 ? 'border-bottom: 1px solid #e5e5e5;' : ''}">
                                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="width: 70px; vertical-align: top;">
                                                    <img src="${item.productImage}" alt="${item.productName}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; display: block;" />
                                                </td>
                                                <td style="vertical-align: top; padding-left: 15px; padding-right: 15px;">
                                                    <p style="margin: 0 0 5px 0; font-size: 14px; font-weight: 600; color: #000000;">
                                                        ${item.productName}
                                                    </p>
                                                    <p style="margin: 0; font-size: 12px; color: #666666;">
                                                        Stock Vendido: <strong>${item.quantity}</strong> unidad${item.quantity > 1 ? 'es' : ''}
                                                    </p>
                                                </td>
                                                <td style="text-align: right; vertical-align: top;">
                                                    <p style="margin: 0 0 5px 0; font-size: 13px; color: #666666;">
                                                        <span style="text-decoration: line-through; color: #999999;">$${item.basePrice.toLocaleString('es-CL')}</span>
                                                    </p>
                                                    <p style="margin: 0 0 3px 0; font-size: 14px; font-weight: 600; color: #000000;">
                                                        $${item.finalPrice.toLocaleString('es-CL')} c/u
                                                    </p>
                                                    <p style="margin: 0; font-size: 12px; font-weight: 600; color: #3b82f6;">
                                                        Subtotal: $${item.itemTotal.toLocaleString('es-CL')}
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                `).join('')}
                            </table>

                            <!-- Order Totals -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 25px 0; background-color: #000000; border-radius: 10px; padding: 20px 25px;">
                                <tr>
                                    <td>
                                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <p style="margin: 0; font-size: 14px; color: #cccccc;">Subtotal:</p>
                                                </td>
                                                <td style="padding: 8px 0; text-align: right;">
                                                    <p style="margin: 0; font-size: 14px; color: #cccccc;">$${order.subtotal.toLocaleString('es-CL')}</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <p style="margin: 0; font-size: 14px; color: #cccccc;">Envío (${order.shippingMethod}):</p>
                                                </td>
                                                <td style="padding: 8px 0; text-align: right;">
                                                    <p style="margin: 0; font-size: 14px; color: #cccccc;">${order.shipping === 0 ? 'GRATIS' : '$' + order.shipping.toLocaleString('es-CL')}</p>
                                                </td>
                                            </tr>
                                            <tr style="border-top: 2px solid #444444;">
                                                <td style="padding: 12px 0;">
                                                    <p style="margin: 0; font-size: 16px; font-weight: 700; color: #ffffff;">Total:</p>
                                                </td>
                                                <td style="padding: 12px 0; text-align: right;">
                                                    <p style="margin: 0; font-size: 18px; font-weight: 700; color: #fbbf24;">$${order.total.toLocaleString('es-CL')}</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Payment Information Section -->
                            <p style="margin: 25px 0 15px 0; font-size: 16px; font-weight: 600; color: #000000;">💳 Información del Pago</p>
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 25px 0; background-color: #f9f9f9; border-radius: 10px; padding: 20px 25px;">
                                <tr>
                                    <td>
                                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="padding: 5px 0;">
                                                    <p style="margin: 0; font-size: 13px; color: #666666;">ID de Pago:</p>
                                                </td>
                                                <td style="padding: 5px 0; text-align: right;">
                                                    <p style="margin: 0; font-size: 13px; font-weight: 600; color: #000000; font-family: monospace;">${payment.mpPaymentId || 'Pendiente'}</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 5px 0;">
                                                    <p style="margin: 0; font-size: 13px; color: #666666;">Proveedor:</p>
                                                </td>
                                                <td style="padding: 5px 0; text-align: right;">
                                                    <p style="margin: 0; font-size: 13px; font-weight: 600; color: #000000; text-transform: capitalize;">${payment.provider}</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 5px 0;">
                                                    <p style="margin: 0; font-size: 13px; color: #666666;">Método de Pago:</p>
                                                </td>
                                                <td style="padding: 5px 0; text-align: right;">
                                                    <p style="margin: 0; font-size: 13px; font-weight: 600; color: #000000; text-transform: capitalize;">${payment.paymentMethod || 'No especificado'}</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 5px 0;">
                                                    <p style="margin: 0; font-size: 13px; color: #666666;">Monto Pagado:</p>
                                                </td>
                                                <td style="padding: 5px 0; text-align: right;">
                                                    <p style="margin: 0; font-size: 13px; font-weight: 600; color: #16a34a;">$${payment.amount.toLocaleString('es-CL')}</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 5px 0;">
                                                    <p style="margin: 0; font-size: 13px; color: #666666;">Estado MP:</p>
                                                </td>
                                                <td style="padding: 5px 0; text-align: right;">
                                                    <p style="margin: 0; font-size: 13px; font-weight: 600; color: #16a34a; text-transform: capitalize;">${payment.mpStatus || 'No disponible'}</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Shipping Address -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 25px 0;">
                                <tr>
                                    <td style="background-color: #f9f9f9; padding: 20px 25px; border-radius: 10px;">
                                        <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #000000;">
                                            📍 Dirección de Envío
                                        </p>
                                        <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #555555;">
                                            ${order.customer.name} ${order.customer.surname}<br/>
                                            ${order.shippingAddress.street}<br/>
                                            ${order.shippingAddress.cityArea ? order.shippingAddress.cityArea + ', ' : ''}${order.shippingAddress.city}<br/>
                                            ${order.shippingAddress.region}, ${order.shippingAddress.country}<br/>
                                            ${order.shippingAddress.zipCode ? 'CP: ' + order.shippingAddress.zipCode + '<br/>' : ''}
                                            ${order.shippingAddress.reference ? '<span style="color: #888888; font-size: 12px; display: block; margin-top: 8px;"><strong>Referencia:</strong> ' + order.shippingAddress.reference + '</span>' : ''}
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Management Buttons -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="text-align: center; padding: 0 0 30px;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="width: 50%; padding-right: 10px;">
                                                    <a href="${manageOrderUrl}" style="display: inline-block; padding: 14px 30px; background-color: #3b82f6; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                                                        Orden
                                                    </a>
                                                </td>
                                                <td style="width: 50%; padding-left: 10px;">
                                                    <a href="${managePaymentUrl}" style="display: inline-block; padding: 14px 30px; background-color: #fbbf24; color: #000000; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                                                        Pago
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Quick Actions -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0;">
                                <tr>
                                    <td style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px 20px; border-radius: 6px;">
                                        <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600; color: #1e40af;">
                                            📋 Próximos Pasos Sugeridos:
                                        </p>
                                        <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #1e3a8a; line-height: 1.8;">
                                            <li>Verificar disponibilidad de stock para cada producto</li>
                                            <li>Confirmar dirección de envío</li>
                                            <li>Preparar paquete para envío (${order.shippingMethod})</li>
                                            <li>Actualizar estado del pedido cuando sea enviado</li>
                                        </ul>
                                    </td>
                                </tr>
                            </table>

                            <!-- Payment Confirmation -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 6px;">
                                <tr>
                                    <td style="padding: 15px 20px;">
                                        <p style="margin: 0 0 5px 0; font-size: 13px; font-weight: 600; color: #166534;">
                                            ✓ Pago Confirmado
                                        </p>
                                        <p style="margin: 0; font-size: 12px; color: #166534;">
                                            El cliente ha completado el pago. El monto de <strong>$${order.total.toLocaleString('es-CL')}</strong> ha sido recibido exitosamente.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #000000; padding: 30px 35px; text-align: center; border-radius: 0 0 16px 16px;">
                            <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #ffffff;">
                                Morango Joyas - Panel de Administración
                            </p>
                            <p style="margin: 0 0 15px 0; font-size: 12px; color: #cccccc; line-height: 1.6;">
                                Nueva orden recibida: ${new Date().toLocaleString('es-CL')}<br/>
                                Debes procesarla dentro de las próximas 24 horas
                            </p>
                            <p style="margin: 0; font-size: 11px; color: #888888; line-height: 1.5;">
                                Este es un correo automatizado del sistema Morango Joyas<br/>
                                © ${new Date().getFullYear()} Morango Joyas. Todos los derechos reservados.
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
                from: `"Morango Joyas - Admin" <${process.env.NOREPLY_EMAIL}>`,
                to: [process.env.ADMIN_EMAIL], 
                subject: `🎉 Nueva Orden Pagada - ${order.trackingNumber} - $${order.total.toLocaleString('es-CL')}`, 
                html: emailHTML
            }

            const response = await resend.emails.send(mailOptions); 
            console.log("✅ Admin notification email sent successfully", process.env.ADMIN_EMAIL);
            console.log(response)
        } catch (error) {
            console.error("❌ Error sending admin notification email:", error);
            throw new InternalServerError(); 
        }
    }
}