import resend from "../../config/resend";
import { InternalServerError } from "../../errors/server-error";
import { OrderInterface } from "../../models/Order";
import { PaymentInterface } from "../../models/Payment";

export class PaymentFailedEmail {
    static sendPaymentFailedEmail  = async (order: OrderInterface, payment: PaymentInterface) => { 
        try {
            const emailHTML = ``;

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