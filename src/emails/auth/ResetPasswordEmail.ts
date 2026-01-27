import resend from "../../config/resend";
import { InternalServerError } from "../../errors/server-error";
import { UserInterface } from "../../models/User";

export class ResetPasswordEmail {
    static sendResetPasswordEmail = async (user: UserInterface, token: string) => { 
        try {
            const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;
            const logoUrl = process.env.LOGO_URL;
            
            const emailHTML = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Restablece tu contraseña</title>
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
                                Restablece tu contraseña 🔐
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px 35px; background-color: #ffffff;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                                Hola <strong style="color: #000000;">${user.name}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 25px 0; font-size: 15px; line-height: 1.7; color: #555555;">
                                Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en Morango Joyas. Haz clic en el botón a continuación para crear una nueva contraseña:
                            </p>
                            
                            <!-- CTA Button -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="text-align: center; padding: 10px 0 25px;">
                                        <a href="${resetUrl}" style="display: inline-block; padding: 15px 45px; background-color: #000000; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 10px;">
                                            Restablecer Contraseña
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Important Notice -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 25px 0;">
                                <tr>
                                    <td style="background-color: #f9f9f9; border-left: 4px solid #000000; padding: 15px 20px; border-radius: 6px;">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #000000;">
                                            Importante:
                                        </p>
                                        <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #666666;">
                                            Si no solicitaste este cambio, puedes ignorar este mensaje. Tu contraseña actual seguirá siendo la misma.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 25px 0 10px 0; font-size: 13px; line-height: 1.6; color: #888888;">
                                Si el botón no funciona, copia y pega este enlace en tu navegador:
                            </p>
                            
                            <p style="margin: 0; font-size: 12px; word-break: break-all; color: #999999; background-color: #f5f5f5; padding: 12px; border-radius: 6px;">
                                <a href="${resetUrl}" style="color: #666666; text-decoration: none;">
                                    ${resetUrl}
                                </a>
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
                                Explora nuestras joyas exclusivas<br/>
                                Envío GRATIS sobre $90.000 🎁
                            </p>
                            <p style="margin: 0; font-size: 11px; color: #888888; line-height: 1.5;">
                                Este correo fue enviado a ${user.email}<br/>
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
                                Gracias por usar Morango Joyas.
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
                to: [user.email], 
                subject: `🔐 Restablece tu contraseña - ${user.name}`, 
                html: emailHTML
            }

            const response = await resend.emails.send(mailOptions); 
            console.log("✅ Email sent successfully", user.email);
            console.log(response)
        } catch (error) {
            console.error("❌ Error sending email:", error);
            throw new InternalServerError(); 
        }
    }
}