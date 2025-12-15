import { ConfirmationEmail } from "./ConfirmationEmail";
import { ResetPasswordEmail } from "./ResetPasswordEmail";

//* Common exports
export class AuthEmails {
    static ConfirmAccount = {
        send: (ConfirmationEmail.sendConfirmationEmail)
    }; 

    static ResetPassword = {
        send: (ResetPasswordEmail.sendResetPasswordEmail)
    };
}