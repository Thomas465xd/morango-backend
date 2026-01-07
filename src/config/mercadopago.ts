import { MercadoPagoConfig, Preference, Payment, PaymentRefund } from 'mercadopago';

// Initialize MP client
const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN!,
    options: {
        timeout: 5000,
    }
});

export const preferenceClient = new Preference(client);
export const paymentClient = new Payment(client);
export const refundClient = new PaymentRefund(client);

export default client;