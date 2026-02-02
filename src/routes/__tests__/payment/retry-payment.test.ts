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
import { OrderStatus } from "../../../models/Order";

//? 📋 Input Validation Tests
describe("/api/payments/order/retry/:orderId Input Validation Tests", () => {
	it("Returns a 400 with invalid orderId provided in request params", async () => {
		const r1 = await request(server)
			.post(`/api/payments/order/retry/asdf?token=asdf`)
			.expect(400);

		expect(r1.body.errors[0].field).toEqual("orderId");
		expect(r1.body.errors.length).toEqual(1); // for invalid orderId
	});

	it("Returns a 400 with invalid or empty token provided in request body", async () => {
		const orderId = new mongoose.Types.ObjectId();

		const r1 = await request(server)
			.post(`/api/payments/order/retry/${orderId}`)
			.expect(400);

		expect(r1.body.errors[0].field).toEqual("token");
		expect(r1.body.errors.length).toEqual(1); // for empty token query param

		const r2 = await request(server)
			.post(`/api/payments/order/retry/${orderId}?token=`)
			.expect(400);

		expect(r2.body.errors[0].field).toEqual("token");
		expect(r2.body.errors.length).toEqual(1); // for empty token query param
	});
});

describe("retryPayment Request Handler Tests", () => {
	it("Returns a 404 Order Not Found for non existent orderId", async () => {
		const orderId = new mongoose.Types.ObjectId();

		const response = await request(server)
			.post(`/api/payments/order/retry/${orderId}?token=asdf`)
			.expect(404);

        expect(response.body.errors[0].message).toEqual("Orden no Encontrada")
	});

	it("Returns a 409 Request Conflict if requested order is in a Status other than pending", async () => {
        const customer = await global.createUser(true, false);

        const { order } = await global.createOrder(customer, OrderStatus.Processing);

		const payment = await global.createPayment(order);

		(preferenceClient.create as jest.Mock).mockResolvedValue({
			id: "mock-pref-id",
			init_point: "http://mock/retry/init",
			sandbox_init_point: "http://mock/retry/sandbox",
		});

		const response = await request(server)
			.post(`/api/payments/order/retry/${order.id}?token=${payment.retryToken}`)
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

		const response = await request(server)
			.post(`/api/payments/order/retry/${order.id}?token=asdf`)
			.expect(404);

        expect(response.body.errors[0].message).toEqual("Pago no Encontrado.")
	});

	it("Returns a 401 Not Authorized if provided retry token is not equal to the one of the payment document.", async () => {
		const customer = await global.createUser(true, false);

		const { order } = await global.createOrder(customer);

        await global.createPayment(order);

		(preferenceClient.create as jest.Mock).mockResolvedValue({
			id: "mock-pref-id",
			init_point: "http://mock/init",
			sandbox_init_point: "http://mock/sandbox",
		});

		const response = await request(server)
			.post(`/api/payments/order/retry/${order.id}?token=asdf`)
			.expect(401);

        expect(response.body.errors[0].message).toEqual("No tienes permiso para reintentar este pago.")
	});

	it("Returns 201 when payment is retried successfully", async () => {
		const customer = await global.createUser(true, false);

		const { order } = await global.createOrder(customer);

		const payment = await global.createPayment(order);

		(preferenceClient.create as jest.Mock).mockResolvedValue({
			id: "mock-pref-id",
			init_point: "http://mock/retry/init",
			sandbox_init_point: "http://mock/retry/sandbox",
		});

		const response = await request(server)
			.post(`/api/payments/order/retry/${order.id}?token=${payment.retryToken}`)
			.expect(201);

		expect(response.body.orderId).toEqual(order.id);
		expect(response.body.preferenceId).toEqual("mock-pref-id");
        expect(response.body.initPoint).toEqual("http://mock/retry/init")
        expect(response.body.sandboxInitPoint).toEqual("http://mock/retry/sandbox")
        expect(response.body.amount).toEqual(payment.amount)

		const updatedPayment = await Payment.findById(response.body.paymentId);
        
		expect(updatedPayment).not.toBeNull();
		expect(updatedPayment.status).toBe(PaymentStatus.Pending);
        expect(updatedPayment.retryToken).not.toBe(payment.retryToken)
        expect(updatedPayment.id).toBe(response.body.paymentId);
        expect(updatedPayment.mpPreferenceId).toBe("mock-pref-id")
        expect(updatedPayment.amount).toBe(payment.amount)
	});
});
