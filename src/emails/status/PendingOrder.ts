import resend from "../../config/resend";
import { InternalServerError } from "../../errors/server-error";
import { OrderInterface } from "../../models/Order";
import { UserInterface } from "../../models/User";

export class PendingOrderEmail {
    static sendPendingOrderEmail = async (user: UserInterface, order: OrderInterface) => { 
        try {
            const emailHTML = ``;

            const mailOptions = {
                from: `"Morango Joyas" <${process.env.NOREPLY_EMAIL}>`,
                to: [user.email], 
                subject: `✨📦 Orden Registrada - ${user.name}`, 
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