import { NewOrderEmail } from "./NewOrderEmail";

//* Common exports
export class AdminEmails {
    static NewOrder = {
        send: (NewOrderEmail.sendNewOrderEmail)
    }; 
}