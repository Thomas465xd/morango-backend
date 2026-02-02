jest.mock("../../../config/mercadopago", () => ({
	preferenceClient: {
		create: jest.fn(),
	},
	paymentClient: {
		get: jest.fn(),
	},
    refundClient: {
        create: jest.fn(), 
    }
}));

import request from "supertest";
import server from "../../../server";
import mongoose from "mongoose";
import { OrderStatus } from "../../../models/Order";
import Payment, { PaymentStatus } from "../../../models/Payment";
import resend from "../../../config/resend";
import { refundClient } from "../../../config/mercadopago";

//? 📋 Input Validation Tests
describe("/api/payments/admin/refund/:paymentId Input Validation Tests", () => {
	it("Returns a 403 Forbidden if user trying to process refund is not an admin", async () => {
        const customer = await global.createUser(true, false); 
        const paymentId = new mongoose.Types.ObjectId; 

        // Request with non admin user (customer)
		await request(server)
			.post(`/api/payments/admin/refund/${paymentId}`)
			.send()
            .set("Cookie", global.setCookie(customer.id))
			.expect(403);

        // Request no auth whatsoever
		await request(server)
			.post(`/api/payments/admin/refund/${paymentId}`)
			.send()
			.expect(403);
	});

	it("Returns a 400 with invalid paymentId provided in request params", async () => {
        const admin = await global.createUser(true, true); 

		const response = await request(server)
			.post(`/api/payments/admin/refund/asdf`)
			.send()
            .set("Cookie", global.setCookie(admin.id))
			.expect(400);

		expect(response.body.errors[0].field).toEqual("paymentId");
		expect(response.body.errors.length).toEqual(1); // for invalid orderId
	});
});

describe("processRefund Request Handler Tests", () => {
	it("Returns a 404 payment not found for non existent payment", async () => {
        const admin = await global.createUser(true, true); 

		const paymentId = new mongoose.Types.ObjectId();

		await request(server)
			.post(`/api/payments/admin/refund/${paymentId}`)
			.send()
            .set("Cookie", global.setCookie(admin.id))
			.expect(404);
	});

	it("Test Idempotency by returning a 200 OK if payment Already refunded (PaymentStatus.Refunded)", async () => {
        const admin = await global.createUser(true, true); 

		const { order } = await global.createOrder(); 

        const payment = await global.createPayment(order); 

        payment.status = PaymentStatus.Refunded; 
        await payment.save(); 

		await request(server)
			.post(`/api/payments/admin/refund/${payment.id}`)
			.send()
            .set("Cookie", global.setCookie(admin.id))
			.expect(200);
	});

	it("Returns a 409 Request Conflict if trying to refund a not payed payment (!== PaymentStatus.Approved)", async () => {
        const admin = await global.createUser(true, true); 

		const { order } = await global.createOrder(); 

        const payment = await global.createPayment(order); 

		const response = await request(server)
			.post(`/api/payments/admin/refund/${payment.id}`)
			.send()
            .set("Cookie", global.setCookie(admin.id))
			.expect(409);

        expect(response.body.errors[0].message).toBe("Solo se pueden reembolsar pagos aprobados.")
	});

	it("Returns a 409 Request Conflict if trying to refund an order that is not Cancelled. (!== OrderStatus.Cancelled)", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@customer.com")

		const { order } = await global.createOrder(customer, OrderStatus.Processing); 
        
        const payment = await global.createPayment(order); 

		const response = await request(server)
			.post(`/api/payments/admin/refund/${payment.id}`)
			.send()
            .set("Cookie", global.setCookie(admin.id))
			.expect(409);

        expect(response.body.errors[0].message).toBe("Solo se pueden reembolsar ordenes Canceladas.")
	});

	it("Returns a 409 Conflict if mpPaymentId is provided empty to refundPayment.", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@customer.com")

		const { order } = await global.createOrder(customer); 
        
        const payment = await global.createPayment(order); 

        // Set cancelled status after order creation, or cannot attach a payment
        order.status = OrderStatus.Cancelled; 
        await order.save(); 
        
        payment.status = PaymentStatus.Approved; 
        await payment.save(); 

		const response = await request(server)
			.post(`/api/payments/admin/refund/${payment.id}`)
			.send()
            .set("Cookie", global.setCookie(admin.id))
			.expect(409);

        // Check refund was NOT called
        expect(refundClient.create).not.toHaveBeenCalled(); 

        expect(response.body.errors[0].message).toBe("mpPaymentId is required")
	});

	it("Returns a 200 if refund is processed correctly along with refund email.", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@customer.com")

		const { order } = await global.createOrder(customer); 
        
        const payment = await global.createPayment(order, "mock-mp-payment-id"); 

        // Set cancelled status after order creation, or cannot attach a payment
        order.status = OrderStatus.Cancelled; 
        await order.save(); 
        
        payment.status = PaymentStatus.Approved; 
        await payment.save(); 

		const response = await request(server)
			.post(`/api/payments/admin/refund/${payment.id}`)
			.send()
            .set("Cookie", global.setCookie(admin.id))
			.expect(200);
        
        // Check refund was called
        expect(refundClient.create).toHaveBeenCalledTimes(1); 
        expect(refundClient.create).toHaveBeenCalledWith(
            expect.objectContaining({
                payment_id: payment.mpPaymentId,
            })
        );

        // Expect resend to have been called one time for refund email
        expect(resend.emails.send).toHaveBeenCalledTimes(1); 

        expect(response.body.paymentId).toEqual(payment.id); 
        expect(response.body.orderNumber).toEqual(order.trackingNumber); 
        expect(response.body.refundAmount).toEqual(payment.amount); 

        const updatedPayment = await Payment.findById(payment.id); 
        expect(updatedPayment.status).toBe(PaymentStatus.Refunded)
        expect(updatedPayment.mpStatus).toBe("refunded")
	});
});
