import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

// Initialize MP client
const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN!,
    options: {
        timeout: 5000,
        idempotencyKey: 'idempotency-key' // not added yet
    }
});

export const preferenceClient = new Preference(client);
export const paymentClient = new Payment(client);

export default client;