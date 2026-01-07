jest.mock("../../../config/mercadopago", () => ({
	preferenceClient: {
		create: jest.fn(),
	},
	paymentClient: {
		get: jest.fn(),
	},
}));

import request from "supertest";
import server from "../../../server";
import mongoose from "mongoose";
import { preferenceClient } from "../../../config/mercadopago";
import Payment, { PaymentStatus } from "../../../models/Payment";
import { expireOrdersJob } from "../../../cron/expireOrders";

//? 📋 Input Validation Tests
describe("/api/payments/order/retry/:orderId Input Validation Tests", () => {
	it("Returns a 400 with invalid orderId provided in request params", async () => {
		const r1 = await request(server)
			.post(`/api/payments/order/retry/asdf`)
			.send({
				email: "test@test.com",
			})
			.expect(400);

		expect(r1.body.errors[0].field).toEqual("orderId");
		expect(r1.body.errors.length).toEqual(1); // for invalid orderId
	});

	it("Returns a 400 with invalid or empty email provided in request body", async () => {
		const orderId = new mongoose.Types.ObjectId();

		const r1 = await request(server)
			.post(`/api/payments/order/retry/${orderId}`)
			.send({
				email: "invalid_email",
			})
			.expect(400);

		expect(r1.body.errors[0].field).toEqual("email");
		expect(r1.body.errors.length).toEqual(1); // for invalid email

		const r2 = await request(server)
			.post(`/api/payments/order/retry/${orderId}`)
			.send({
				email: "",
			})
			.expect(400);

		expect(r2.body.errors[0].field).toEqual("email");
		expect(r2.body.errors.length).toEqual(2); // for invalid and empty email
	});
});

describe("retryPayment Request Handler Tests", () => {
	it("Returns a 404 Order Not Found for non existent orderId & order not belonging to user", async () => {
		const orderId = new mongoose.Types.ObjectId();

		await request(server)
			.post(`/api/payments/order/retry/${orderId}`)
			.send({
				email: "test@test.com",
			})
			.expect(404);
	});

	it("Returns a 409 Request Conflict for expired order (order with any status other than pending is almost certainly expired)", async () => {
        const customer = await global.createUser(true, false);

        const { order } = await global.createOrder();

		await global.createPayment(order);
        
        // Run expiration job (pass time in future to force expiration)
        const futureTime =
            order.stockReservationExpiresAt.getTime() + 1000;
        await expireOrdersJob(futureTime);

		(preferenceClient.create as jest.Mock).mockResolvedValue({
			id: "mock-pref-id",
			init_point: "http://mock/retry/init",
			sandbox_init_point: "http://mock/retry/sandbox",
		});

		const response = await request(server)
			.post(`/api/payments/order/retry/${order.id}`)
			.send({ email: customer.email })
			.expect(409);

        expect(response.body.errors[0].message).toBe("Orden Expirada")
	});

	it("Returns a 404 Payment Record Not Found if payment for requested order does not exists", async () => {
		const customer = await global.createUser(true, false);

		const { order } = await global.createOrder(customer);

        // Payment is not registered
        //await global.createPayment(order); // Uncomment this to validate this test fails if payment found (201)

		(preferenceClient.create as jest.Mock).mockResolvedValue({
			id: "mock-pref-id",
			init_point: "http://mock/init",
			sandbox_init_point: "http://mock/sandbox",
		});

		await request(server)
			.post(`/api/payments/order/retry/${order.id}`)
			.send({ 
                email: customer.email 
            })
			.expect(404);
	});

	it("Returns 201 when payment is retried successfully", async () => {
		const customer = await global.createUser(true, false);

		const { order } = await global.createOrder(customer);

		await global.createPayment(order);

		(preferenceClient.create as jest.Mock).mockResolvedValue({
			id: "mock-pref-id",
			init_point: "http://mock/retry/init",
			sandbox_init_point: "http://mock/retry/sandbox",
		});

		const response = await request(server)
			.post(`/api/payments/order/retry/${order.id}`)
			.send({ email: customer.email })
			.expect(201);

		expect(response.body.orderId).toEqual(order.id);
		expect(response.body.preferenceId).toEqual("mock-pref-id");
        expect(response.body.initPoint).toEqual("http://mock/retry/init")
        expect(response.body.sandboxInitPoint).toEqual("http://mock/retry/sandbox")

		const payment = await Payment.findById(response.body.paymentId);
		expect(payment).not.toBeNull();
		expect(payment.status).toBe(PaymentStatus.Pending);
        expect(payment.id).toBe(response.body.paymentId);
        expect(payment.mpPreferenceId).toBe("mock-pref-id")
	});
});
