import { CancelledOrderEmail } from "./CancelledOrder";
import { DeliveredOrderEmail } from "./DeliveredOrder";
import { PendingOrderEmail } from "./PendingOrder";
import { SentOrderEmail } from "./SentOrder";

//* Common exports
export class OrderStatusEmail {
    static Pending = {
        send: (PendingOrderEmail.sendPendingOrderEmail)
    }; 

    static Sent = {
        send: (SentOrderEmail.sendSentOrderEmail)
    };

    static Delivered = {
        send: (DeliveredOrderEmail.sendDeliveredOrderEmail)
    };

    static Cancelled = {
        send: (CancelledOrderEmail.sendCancelledOrderEmail)
    }
}