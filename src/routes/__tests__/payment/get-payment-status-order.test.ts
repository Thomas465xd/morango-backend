import request from "supertest"
import server from "../../../server"
import mongoose from "mongoose";
import { OrderStatus } from "../../../models/Order";

//? 📋 Input Validation Tests
describe("/api/payments/order/status/:orderId Input Validation Tests", () => {
	it("Returns a 400 with invalid orderId provided in request params", async () => {
		const response = await request(server)
			.get(`/api/payments/order/status/asdf`)
			.send()
			.expect(400);

		expect(response.body.errors[0].field).toEqual("orderId");
		expect(response.body.errors.length).toEqual(1); // for invalid orderId
	});
})

describe("getOrderPaymentStatus Request Handler Tests", () => {
    it("Returns a 404 Order Not found for non existing order", async () => {
        const orderId = new mongoose.Types.ObjectId; 

		const response = await request(server)
			.get(`/api/payments/order/status/${orderId}`)
			.send()
			.expect(404);

        expect(response.body.errors[0].message).toEqual("Orden no Encontrada")
    })

    it("Returns a 404 Payment Not found for non existing payment", async () => {
        const { order } = await global.createOrder(); 

        // const payment = await global.createPayment(order); 

		const response = await request(server)
			.get(`/api/payments/order/status/${order.id}`)
			.send()
			.expect(404);

        expect(response.body.errors[0].message).toEqual("Referencia de pago no Encontrada")
    })

    it("Returns 200 OK with correct payment info & order info", async () => {
        const { order } = await global.createOrder(); 

        const payment = await global.createPayment(order); 

		const response = await request(server)
			.get(`/api/payments/order/status/${order.id}`)
			.send()
			.expect(200);

        // Order Info
        expect(response.body.orderStatus).toEqual(OrderStatus.Pending); 

        // Payment info
        expect(response.body.paymentStatus).toEqual(payment.status);
        expect(response.body.mpStatus).toEqual(payment.mpStatus); 
        expect(response.body.paymentMethod).toEqual(payment.paymentMethod); 
        expect(response.body.amount).toEqual(payment.amount)
        expect(response.body.rejectionReason).toEqual(null)
    })
}); 