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
import { OrderStatus } from "../../../models/Order";
import { preferenceClient } from "../../../config/mercadopago";
import Payment, { PaymentStatus } from "../../../models/Payment";

//? 📋 Input Validation Tests
describe("/api/payments/create-preference Input Validation Tests", () => {
	it("Returns a 400 with invalid orderId provided in request body", async () => {
		const r1 = await request(server)
			.post(`/api/payments/create-preference`)
			.send({
				orderId: "",
			})
			.expect(400);

		expect(r1.body.errors[0].field).toEqual("orderId");
		expect(r1.body.errors.length).toEqual(2); // for invalid ID and empty orderId

		const r2 = await request(server)
			.post(`/api/payments/create-preference`)
			.send({
				orderId: "asdf",
			})
			.expect(400);

		expect(r2.body.errors[0].field).toEqual("orderId");
		expect(r2.body.errors.length).toEqual(1);
	});
});

describe("createPreference Request Handler Tests", () => {
	it("Returns a 404 Order Not Found for non existent orderId", async () => {
		const orderId = new mongoose.Types.ObjectId();

		await request(server)
			.post(`/api/payments/create-preference`)
			.send({
				orderId,
			})
			.expect(404);
	});

	it("Returns a 409 Request Conflict for expired order (order with any status other than pending)", async () => {
		const customer = await global.createUser(true, false);
		const { order } = await global.createOrder(
			customer,
			OrderStatus.Expired
		);

		await request(server)
			.post(`/api/payments/create-preference`)
			.send({
				orderId: order.id,
			})
			.expect(409);
	});

	it("Returns 201 when preference is created", async () => {
		const { order } = await global.createOrder();

		(preferenceClient.create as jest.Mock).mockResolvedValue({
			id: "mock-pref-id",
			init_point: "http://mock/init",
			sandbox_init_point: "http://mock/sandbox",
		});

		const response = await request(server)
			.post("/api/payments/create-preference")
			.send({ orderId: order.id })
			.expect(201);

        expect(response.body.orderId).toEqual(order.id); 
        expect(response.body.preferenceId).toEqual("mock-pref-id"); 
        expect(response.body.initPoint).toEqual("http://mock/init"); 
        expect(response.body.sandboxInitPoint).toEqual("http://mock/sandbox")
		expect(preferenceClient.create).toHaveBeenCalledTimes(1);

        const payment = await Payment.findById(response.body.paymentId); 
        expect(payment.orderId.toString()).toEqual(order.id); 
        expect(payment.provider).toEqual("mercadopago"); 
        expect(payment.mpPreferenceId).toEqual("mock-pref-id"); 
        expect(payment.amount).toEqual(order.total); 
        expect(payment.currency).toEqual("CLP");
        expect(payment.status).toEqual(PaymentStatus.Pending); 
	});

    it("Updates existing payment when one already exists for the order", async () => {
        const { order } = await global.createOrder();

        // Create an existing payment linked to the order
        const existingPayment = await global.createPayment(order); 

        // Mock MP preference creation
        (preferenceClient.create as jest.Mock).mockResolvedValue({
            id: "new-pref-id",
            init_point: "http://mock/init",
            sandbox_init_point: "http://mock/sandbox",
        });

        const response = await request(server)
            .post("/api/payments/create-preference")
            .send({ orderId: order.id })
            .expect(201);

        // Payment count should remain the same
        const payments = await Payment.find({ orderId: order.id });
        expect(payments.length).toBe(1);

        // Payment should be updated, not recreated
        const updatedPayment = await Payment.findById(existingPayment.id);

        expect(updatedPayment).not.toBeNull();
        expect(updatedPayment!.mpPreferenceId).toBe("new-pref-id");
        expect(updatedPayment!.amount).toBe(order.total);
        expect(updatedPayment!.provider).toBe("mercadopago");
        expect(updatedPayment!.id).toEqual(existingPayment.id);


        // MercadoPago called once
        expect(preferenceClient.create).toHaveBeenCalledTimes(1);

        // Response sanity check
        expect(response.body.preferenceId).toBe("new-pref-id");
    });
});
