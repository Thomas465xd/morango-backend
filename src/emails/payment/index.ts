import { PaymentApprovedEmail } from "./PaymentApprovedEmail";
import { PaymentFailedEmail } from "./PaymentFailedEmail";
import { PaymentRefundedEmail } from "./PaymentRefundedEmail";

//* Common exports
export class PaymentEmails {
    static Approved = {
        send: (PaymentApprovedEmail.sendPaymentApprovedEmail)
    };

    static Failed = {
        send: (PaymentFailedEmail.sendPaymentFailedEmail)
    }; 

    static Refunded = {
        send: (PaymentRefundedEmail.sendPaymentRefunded)
    }
}