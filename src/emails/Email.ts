import { response } from "express";
import resend from "../config/resend";

interface EmailInterface {
    to: string;
    subject: string;
    html: string;
}

export class BasicEmail {
    static sendEmail = async (email: EmailInterface) => {
        try {
            const emailHTML = `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2 style="color: #333;">${email.subject}</h2>
                    <p style="color: #555;">${email.html}</p>
                    <p style="color: #777;">Best regards,</p>
                    <p style="color: #777;">Your Company Name</p>
                </div>
            `

            const mailOptions = {
                from: `"Your Business Name" <${process.env.NOREPLY_EMAIL}>`,
                to: email.to, // Replace with user.email once the controller logic is implementes
                subject: "Email Subject Here",
                html: emailHTML,
            };

            try {
                const response = await resend.emails.send(mailOptions);
                console.log("✅ Email sent successfully");
                console.log(response)
            } catch (error) {
                console.log("❌ Error sending email:", error);
            }
        } catch (error) {
            console.error("Error sending email:", error);
            throw new Error("Failed to send email");
        }
    }
}