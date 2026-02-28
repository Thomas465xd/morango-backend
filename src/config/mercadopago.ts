import { MercadoPagoConfig, Preference, Payment, PaymentRefund } from 'mercadopago';

// Initialize MP client
const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN!,
    options: {
        timeout: 5000,

        // Developer program ID — sent as x-integrator-id header on all API calls
        integratorId: process.env.MP_INTEGRATOR_ID,
    },
});

export const preferenceClient = new Preference(client);
export const paymentClient = new Payment(client);
export const refundClient = new PaymentRefund(client);

export default client;