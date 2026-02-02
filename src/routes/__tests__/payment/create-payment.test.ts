jest.mock("../../../config/mercadopago", () => ({
    paymentClient: {
        create: jest.fn(),
        get: jest.fn(),
    },
}));

import request from "supertest"
import server from "../../../server"
import mongoose from "mongoose";
import { OrderStatus } from "../../../models/Order";
import { paymentClient } from "../../../config/mercadopago";

//? 📋 Input Validation Tests
describe("/api/payments/create-payment Input Validation Tests", () => {
	it("Returns a 400 with empty request body provided or fields provided empty", async () => {
		const r1 = await request(server)
			.post(`/api/payments/create-payment`)
			.send()
			.expect(400);

		const r2 = await request(server)
			.post(`/api/payments/create-payment`)
			.send({
                orderId: "", 
                token: "", 
                issuer_id: "", 
                payment_method_id: "", 
                installments: "", 
                payer: {
                    email: "", 
                    identification: ""
                }, 
            })
			.expect(400);

		expect(r1.body.errors.length).toEqual(9); 
        expect(r2.body.errors.length).toEqual(8); // One less since payer object was not empty 
	});

	it("Returns a 400 with invalid orderId provided in request body (not objectId)", async () => {
		const response = await request(server)
			.post(`/api/payments/create-payment`)
			.send({
                orderId: "asdf", 
                token: "asdf", 
                issuer_id: "asdf", 
                payment_method_id: "asdf", 
                installments: 1, 
                payer: {
                    email: "customer@customer.com", 
                    identification: "231657746"
                }, 
            })
			.expect(400);

        expect(response.body.errors[0].field).toEqual("orderId")
        expect(response.body.errors.length).toEqual(1);
	});

	it("Returns a 400 with invalid installments provided in request body (not a number or lower than 0)", async () => {
        const orderId = new mongoose.Types.ObjectId(); 

		const r1 = await request(server)
			.post(`/api/payments/create-payment`)
			.send({
                orderId, 
                token: "asdf", 
                issuer_id: "asdf", 
                payment_method_id: "asdf", 
                installments: "one", 
                payer: {
                    email: "customer@customer.com", 
                    identification: "231657746"
                }, 
            })
			.expect(400);

        const r2 = await request(server)
			.post(`/api/payments/create-payment`)
			.send({
                orderId, 
                token: "asdf", 
                issuer_id: "asdf", 
                payment_method_id: "asdf", 
                installments: -1, 
                payer: {
                    email: "customer@customer.com", 
                    identification: "231657746"
                }, 
            })
			.expect(400);

        expect(r1.body.errors[0].field).toEqual("installments")
        expect(r1.body.errors.length).toEqual(1);

        expect(r2.body.errors[0].field).toEqual("installments")
        expect(r2.body.errors.length).toEqual(1);
	});
})

describe("createPayment Request Handler Tests", () => {
	it("Returns a 404 Order not found", async () => {
        const orderId = new mongoose.Types.ObjectId(); 

		const response = await request(server)
			.post(`/api/payments/create-payment`)
			.send({
                orderId, 
                token: "token", 
                issuer_id: "123456", 
                payment_method_id: "visa", 
                installments: 1, 
                payer: {
                    email: "customer@customer.com", 
                    identification: "231657746"
                }, 
            })
			.expect(404);

        expect(response.body.errors[0].message).toContain("no encontrada"); 
	});

	it("Returns a 409 Request Conflict if order status is other than Pending (probably expired)", async () => {
        const customer = await global.createUser(true, false, "customer@customer.com"); 
        const { order } = await global.createOrder(customer, OrderStatus.Processing); 

		const response = await request(server)
			.post(`/api/payments/create-payment`)
			.send({
                orderId: order.id, 
                token: "token", 
                issuer_id: "123456", 
                payment_method_id: "visa", 
                installments: 1, 
                payer: {
                    email: "customer@customer.com", 
                    identification: "231657746"
                }, 
            })
			.expect(409);

        expect(response.body.errors[0].message).toContain("no válida"); 
	});

	it("Returns a 404 Payment record not found", async () => {
        const { order } = await global.createOrder(); 

        (paymentClient.create as jest.Mock).mockResolvedValue({
            id: "mp-payment-id",
            status: "approved",
        });

		const response = await request(server)
			.post(`/api/payments/create-payment`)
			.send({
                orderId: order.id, 
                token: "token", 
                issuer_id: "123456", 
                payment_method_id: "visa", 
                installments: 1, 
                payer: {
                    email: "customer@customer.com", 
                    identification: "231657746"
                }, 
            })
			.expect(404);

        expect(response.body.errors[0].message).toEqual("Payment record in DB not found"); 
	});

	it("Returns a 200 OK response for successful MP payment creation.", async () => {
        const { order } = await global.createOrder(); 
        const payment = await global.createPayment(order); 

        (paymentClient.create as jest.Mock).mockResolvedValue({
            id: "mp-payment-id",
            status: "approved",
        });

		const response = await request(server)
			.post(`/api/payments/create-payment`)
			.send({
                orderId: order.id, 
                token: "token", 
                issuer_id: "123456", 
                payment_method_id: "visa", 
                installments: 1, 
                payer: {
                    email: "customer@customer.com", 
                    identification: "231657746"
                }, 
            })
			.expect(200);

        expect(response.body.paymentId).toEqual(payment.id); 
        expect(response.body.mpPaymentId).toEqual("mp-payment-id"); 
        expect(response.body.status).toEqual("approved")
	});
}); 